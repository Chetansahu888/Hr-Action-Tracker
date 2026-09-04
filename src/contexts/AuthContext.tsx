import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types/auth';
import { DEFAULT_USERS } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  users: User[];
  login: (user: User) => void;
  loginWithCredentials: (username: string, password: string) => { success: boolean; error?: string; user?: User };
  logout: () => void;
  addUser: (userData: { username: string; name: string; password?: string; role: UserRole; title?: string }) => { success: boolean; error?: string };
  updateUser: (userData: User) => { success: boolean; error?: string };
  deleteUser: (userId: string) => { success: boolean; error?: string };
  canViewTask: (taskDoer?: string) => boolean;
  canUpdateStatus: (taskDoer?: string) => boolean;
  canManageTasks: boolean;
}

const STORAGE_AUTH_USER_KEY = 'hr_tracker_auth_user_v3';
const STORAGE_USERS_LIST_KEY = 'hr_tracker_users_list_v3';

const AVATAR_COLORS = ['#2563eb', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load managed users list
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USERS_LIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { /* ignore */ }
    return DEFAULT_USERS;
  });

  // Load currently logged in user
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_AUTH_USER_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return DEFAULT_USERS[0]; // Default to Admin
  });

  const saveUsersList = (newUsers: User[]) => {
    setUsers(newUsers);
    try {
      localStorage.setItem(STORAGE_USERS_LIST_KEY, JSON.stringify(newUsers));
    } catch (e) { /* ignore */ }
  };

  const login = (newUser: User) => {
    setUser(newUser);
    try {
      localStorage.setItem(STORAGE_AUTH_USER_KEY, JSON.stringify(newUser));
    } catch (e) { /* ignore */ }
  };

  const loginWithCredentials = (username: string, password: string): { success: boolean; error?: string; user?: User } => {
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) return { success: false, error: 'Please enter your username.' };
    if (!trimmedPass) return { success: false, error: 'Please enter your password.' };

    const found = users.find(
      u => u.username.toLowerCase() === trimmedUser.toLowerCase() || u.name.toLowerCase() === trimmedUser.toLowerCase()
    );

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
    } catch (e) { /* ignore */ }
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

    const randomColor = AVATAR_COLORS[users.length % AVATAR_COLORS.length];
    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      name,
      password,
      role: userData.role,
      email: `${username.toLowerCase().replace(/\s+/g, '.')}@hr-dept.internal`,
      title: userData.title?.trim() || (userData.role === 'admin' ? 'HR Administrator' : 'HR Team Member'),
      avatarBg: randomColor,
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    saveUsersList(updated);
    return { success: true };
  };

  const updateUser = (userData: User) => {
    const updated = users.map(u => (u.id === userData.id ? { ...u, ...userData } : u));
    saveUsersList(updated);
    if (user?.id === userData.id) {
      login(userData);
    }
    return { success: true };
  };

  const deleteUser = (userId: string) => {
    if (userId === 'admin') {
      return { success: false, error: 'Default Admin account cannot be deleted.' };
    }
    const updated = users.filter(u => u.id !== userId);
    saveUsersList(updated);
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
        login,
        loginWithCredentials,
        logout,
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
