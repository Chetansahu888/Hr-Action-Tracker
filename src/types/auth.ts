export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  name: string;
  password?: string;
  role: UserRole;
  email?: string;
  title: string;
  avatarBg: string;
  createdAt?: string;
}

export const DEFAULT_USERS: User[] = [
  {
    id: 'admin',
    username: 'Admin',
    name: 'Admin',
    password: 'Admin2026',
    role: 'admin',
    email: 'admin@hr-dept.internal',
    title: 'System Administrator (Full Access)',
    avatarBg: '#2563eb',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'deepak',
    username: 'Deepak',
    name: 'Deepak',
    password: '1234',
    role: 'user',
    email: 'deepak@hr-dept.internal',
    title: 'HR Executive',
    avatarBg: '#3b82f6',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bhupendra',
    username: 'Bhupendra',
    name: 'Bhupendra',
    password: '1234',
    role: 'user',
    email: 'bhupendra@hr-dept.internal',
    title: 'HR Operations Lead',
    avatarBg: '#8b5cf6',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'md_alaudin',
    username: 'MD Alaudin',
    name: 'MD Alaudin',
    password: '1234',
    role: 'user',
    email: 'alaudin@hr-dept.internal',
    title: 'HR Specialist',
    avatarBg: '#10b981',
    createdAt: new Date().toISOString(),
  },
];
