import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User, UserRole } from '../types/auth';
import { DEFAULT_USERS, getUserAvatarBg } from '../types/auth';
import { taskService } from '../services/taskService';
import { formatDateTimeFormulaSafe } from '../lib/utils';


interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  users: User[];
  isSyncingUsers: boolean;
  login: (user: User) => void;
  loginWithCredentials: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  refreshUsers: () => Promise<User[]>;
  addUser: (userData: { username: string; name: string; password?: string; role: UserRole; title?: string }) => { success: boolean; error?: string };
  updateUser: (userData: User) => { success: boolean; error?: string };
  deleteUser: (userId: string) => { success: boolean; error?: string };
  canViewTask: (taskDoer?: string) => boolean;
  canUpdateStatus: (taskDoer?: string) => boolean;
  canManageTasks: boolean;
}

const STORAGE_AUTH_USER_KEY = 'hr_tracker_auth_user_v3';
const STORAGE_USERS_LIST_KEY = 'hr_tracker_users_list_v3';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncingUsers, setIsSyncingUsers] = useState<boolean>(false);

  // Load managed users list with consistent avatarBg
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USERS_LIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u: any) => ({
            ...u,
            avatarBg: getUserAvatarBg(u),
          }));
        }
      }
    } catch { /* ignore */ }
    return DEFAULT_USERS.map(u => ({ ...u, avatarBg: getUserAvatarBg(u) }));
  });

  // Load currently logged in user
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_AUTH_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          return {
            ...parsed,
            avatarBg: getUserAvatarBg(parsed),
          };
        }
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_USERS[0], avatarBg: getUserAvatarBg(DEFAULT_USERS[0]) }; // Default to Admin
  });

  const userRef = useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const saveUsersList = useCallback((newUsers: User[]) => {
    const prepared = newUsers.map(u => ({
      ...u,
      avatarBg: getUserAvatarBg(u),
    }));
    setUsers(prepared);
    try {
      localStorage.setItem(STORAGE_USERS_LIST_KEY, JSON.stringify(prepared));
    } catch { /* ignore */ }
  }, []);

  // Fetch users from Google Sheet and update state
  const refreshUsers = useCallback(async (): Promise<User[]> => {
    try {
      setIsSyncingUsers(true);
      const remoteUsers = await taskService.getUsers();
      if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
        const preparedUsers: User[] = remoteUsers.map((u: any) => ({
          id: String(u.id || ('user-' + Date.now())),
          username: String(u.username || u.name || '').trim(),
          name: String(u.name || u.username || '').trim(),
          password: String(u.password || '1234'),
          role: (String(u.role || 'user').toLowerCase().includes('admin') ? 'admin' : 'user') as UserRole,
          email: u.email || `${String(u.username || u.name || '').toLowerCase().replace(/\s+/g, '.')}@hr-dept.internal`,
          title: String(u.title || (String(u.role || 'user').toLowerCase().includes('admin') ? 'System Administrator' : 'HR Team Member')),
          avatarBg: getUserAvatarBg(u),
          createdAt: u.createdAt || '',
        }));

        setUsers(preparedUsers);
        try {
          localStorage.setItem(STORAGE_USERS_LIST_KEY, JSON.stringify(preparedUsers));
        } catch { /* ignore */ }

        // If currently logged in user is updated in Google Sheet, sync changes to active session!
        const currentUser = userRef.current;
        if (currentUser) {
          const matchedRemote = preparedUsers.find(
            ru => ru.id.toLowerCase() === currentUser.id.toLowerCase() ||
                  ru.username.toLowerCase() === currentUser.username.toLowerCase()
          );

          if (matchedRemote) {
            const hasChanged = 
              matchedRemote.name !== currentUser.name ||
              matchedRemote.role !== currentUser.role ||
              matchedRemote.title !== currentUser.title ||
              matchedRemote.password !== currentUser.password;

            if (hasChanged) {
              const updatedSession = {
                ...currentUser,
                name: matchedRemote.name,
                role: matchedRemote.role,
                title: matchedRemote.title,
                password: matchedRemote.password,
                avatarBg: getUserAvatarBg(matchedRemote),
              };
              setUser(updatedSession);
              try {
                localStorage.setItem(STORAGE_AUTH_USER_KEY, JSON.stringify(updatedSession));
              } catch { /* ignore */ }
            }
          }
        }

        return preparedUsers;
      } else {
        // If sheet is empty (only header row), auto-populate sheet with default/current accounts!
        const usersToSync = users.length > 0 ? users : DEFAULT_USERS;
        taskService.syncUsers(usersToSync).catch(err => console.warn('Auto-seed users error:', err));
      }
    } catch (err) {

      console.warn('refreshUsers error:', err);
    } finally {
      setIsSyncingUsers(false);
    }
    return users;
  }, [users]);

  // Initial fetch and periodic background polling to detect any changes in Google Sheet
  useEffect(() => {
    let isMounted = true;
    
    // Initial sync
    refreshUsers().catch(() => {});

    // Periodic sync every 10 seconds to catch changes made directly in the Google Sheet
    const interval = setInterval(() => {
      if (isMounted) {
        refreshUsers().catch(() => {});
      }
    }, 10000);

    // Sync when browser tab becomes active again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        refreshUsers().catch(() => {});
      }
    };

    const handleFocus = () => {
      if (isMounted) {
        refreshUsers().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshUsers]);

  const login = (newUser: User) => {
    const preparedUser = {
      ...newUser,
      avatarBg: getUserAvatarBg(newUser),
    };
    setUser(preparedUser);
    try {
      localStorage.setItem(STORAGE_AUTH_USER_KEY, JSON.stringify(preparedUser));
    } catch { /* ignore */ }
  };

  const loginWithCredentials = async (
    username: string, 
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) return { success: false, error: 'Please enter your username.' };
    if (!trimmedPass) return { success: false, error: 'Please enter your password.' };

    // 1. Check local state first
    let currentUsersList = users;
    let found = currentUsersList.find(
      u => u.username.toLowerCase() === trimmedUser.toLowerCase() || u.name.toLowerCase() === trimmedUser.toLowerCase()
    );

    // 2. If not found or password doesn't match, fetch live from Google Sheet in case it was updated!
    if (!found || (found.password && found.password !== trimmedPass)) {
      try {
        const freshUsers = await refreshUsers();
        if (freshUsers && freshUsers.length > 0) {
          currentUsersList = freshUsers;
          found = currentUsersList.find(
            u => u.username.toLowerCase() === trimmedUser.toLowerCase() || u.name.toLowerCase() === trimmedUser.toLowerCase()
          );
        }
      } catch { /* ignore */ }
    }

    if (!found) {
      return { success: false, error: `User "${trimmedUser}" not found in system.` };
    }

    if (found.password && found.password !== trimmedPass) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    login(found);
    return { success: true, user: found };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_AUTH_USER_KEY);
    } catch { /* ignore */ }
  };

  const addUser = (userData: { username: string; name: string; password?: string; role: UserRole; title?: string }) => {
    const username = userData.username.trim();
    const name = userData.name.trim() || username;
    const password = userData.password?.trim() || '1234';

    if (!username) return { success: false, error: 'Username is required' };

    const exists = users.some(
      u => u.username.toLowerCase() === username.toLowerCase() || u.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      return { success: false, error: `User "${username}" already exists.` };
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      name,
      password,
      role: userData.role,
      email: `${username.toLowerCase().replace(/\s+/g, '.')}@hr-dept.internal`,
      title: userData.title?.trim() || (userData.role === 'admin' ? 'HR Administrator' : 'HR Team Member'),
      avatarBg: getUserAvatarBg(username),
      createdAt: formatDateTimeFormulaSafe(new Date()),
    };


    const updated = [...users, newUser];
    saveUsersList(updated);
    taskService.saveUser(newUser).catch(err => console.warn('Failed to save user to sheet:', err));
    return { success: true };
  };

  const updateUser = (userData: User) => {
    const prepared = {
      ...userData,
      avatarBg: getUserAvatarBg(userData),
    };
    const updated = users.map(u => (u.id === userData.id ? { ...u, ...prepared } : u));
    saveUsersList(updated);
    if (user?.id === userData.id) {
      login(prepared);
    }
    taskService.saveUser(prepared).catch(err => console.warn('Failed to update user in sheet:', err));
    return { success: true };
  };

  const deleteUser = (userId: string) => {
    if (userId.toLowerCase() === 'admin') {
      return { success: false, error: 'Default Admin account cannot be deleted.' };
    }
    const updated = users.filter(u => u.id !== userId);
    saveUsersList(updated);
    taskService.deleteUser(userId).catch(err => console.warn('Failed to delete user in sheet:', err));
    return { success: true };
  };

  const isAdmin = user?.role === 'admin';
  const canManageTasks = isAdmin;

  // Task isolation rule:
  // - Admin can see ALL tasks.
  // - User only sees tasks where their name/username is in the Doer(s) field (supports multiple doers like "Deepak, Bhupendra")
  const canViewTask = (taskDoer?: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!taskDoer) return false;

    const doerList = taskDoer.split(/[,/]/).map(d => d.trim().toLowerCase());
    const myName = user.name.toLowerCase();
    const myUsername = user.username.toLowerCase();

    return doerList.includes(myName) || doerList.includes(myUsername);
  };

  // Status update rule:
  // - Admin can update any status.
  // - User can ONLY update status if task is assigned to them.
  const canUpdateStatus = (taskDoer?: string): boolean => {
    return canViewTask(taskDoer);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        users,
        isSyncingUsers,
        login,
        loginWithCredentials,
        logout,
        refreshUsers,
        addUser,
        updateUser,
        deleteUser,
        canViewTask,
        canUpdateStatus,
        canManageTasks,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

