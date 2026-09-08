import { formatDateTimeFormulaSafe } from '../lib/utils';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  name: string;
  password?: string;
  role: UserRole;
  email?: string;
  title: string;
  avatarBg?: string;
  createdAt?: string;
}

export const AVATAR_PALETTE = [
  '#2563eb', // Blue
  '#3b82f6', // Sky Blue
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

export function getUserAvatarBg(userOrName?: string | { username?: string; name?: string; avatarBg?: string }): string {
  if (!userOrName) return '#2563eb';
  if (typeof userOrName === 'object') {
    if (userOrName.avatarBg) return userOrName.avatarBg;
    const str = userOrName.username || userOrName.name || '';
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < userOrName.length; i++) hash = userOrName.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
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
    createdAt: formatDateTimeFormulaSafe(new Date()),
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
    createdAt: formatDateTimeFormulaSafe(new Date()),
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
    createdAt: formatDateTimeFormulaSafe(new Date()),
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
    createdAt: formatDateTimeFormulaSafe(new Date()),
  },
];


