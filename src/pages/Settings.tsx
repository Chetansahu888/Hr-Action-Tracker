import React, { useState } from 'react';
import {
  Database, Bell, Shield, CheckCircle2, Lock, FileSpreadsheet,
  Server, Users, UserPlus, Trash2, Key, Eye, EyeOff, ShieldCheck,
  AlertTriangle, Edit2, X, Save, Loader2, Globe, RefreshCw, Check, Link, ExternalLink,
  Sparkles, Calendar, Clock, Star, HelpCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { User, UserRole } from '../types/auth';
import { taskService } from '../services/taskService';
import { toast } from 'sonner';

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e8ecf0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  overflow: 'hidden',
};

const COLS = [
  { col: 'A', name: 'Planned / Due Date', desc: 'Committed deadline date & time' },
  { col: 'B', name: 'Actual', desc: 'Completion timestamp (auto on 100%)' },
  { col: 'C', name: 'S.No.', desc: 'Unique sequential identifier' },
  { col: 'D', name: 'Problem / Task', desc: 'Task description / problem statement' },
  { col: 'E', name: 'Name of Doer', desc: 'Comma-separated HR assignees' },
  { col: 'F', name: 'Status', desc: 'Pending, 25%, 50%, 75%, 100%' },
  { col: 'G', name: 'Weekly Review', desc: 'Auto SLA rating (⭐⭐⭐⭐⭐ - ⭐)' },
  { col: 'H', name: 'Expected Date', desc: 'Task Assigner target goal date & time' },
  { col: 'I', name: 'Assign By', desc: 'Task Assigner / Giver (from Master Sheet Col A)' },
];

export const Settings: React.FC = () => {
  const { user, isAdmin, users, addUser, updateUser, deleteUser } = useAuth();

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');

  // Delete user confirmation modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // History deletion permission state
  const [allowHistoryDeletion, setAllowHistoryDeletion] = useState<boolean>(
    taskService.getAllowHistoryDeletion()
  );

  // Google Apps Script Web App API URL state
  const [gasApiUrl, setGasApiUrlState] = useState(taskService.getGasApiUrl());
  const [isTestingGas, setIsTestingGas] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; sheetName?: string } | null>(null);

  const handleSaveGasUrl = () => {
    taskService.setGasApiUrl(gasApiUrl);
    toast.success('Google Apps Script Web App URL saved successfully!');
  };

  const handleTestConnection = async () => {
    if (!gasApiUrl.trim()) {
      toast.error('Please enter a Web App URL first');
      return;
    }
    setIsTestingGas(true);
    setTestResult(null);
    try {
      const res = await taskService.testConnection(gasApiUrl);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message || 'Connected to Google Apps Script successfully!');
      } else {
        toast.error('Connection failed');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection failed' });
      toast.error(err.message || 'Failed to connect to Google Apps Script');
    } finally {
      setIsTestingGas(false);
    }
  };

  const handleToggleHistoryDeletion = () => {
    const nextVal = !allowHistoryDeletion;
    setAllowHistoryDeletion(nextVal);
    taskService.setAllowHistoryDeletion(nextVal);
    if (nextVal) {
      toast.success('History Deletion Action Enabled: Delete option will now appear in the History table.');
    } else {
      toast.info('History Deletion Action Disabled: History records are now protected.');
    }
  };

  const toggleShowPassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditPassword(u.password || '');
    setEditTitle(u.title || '');
    setEditRole(u.role);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    if (!editPassword.trim()) {
      toast.error('Password cannot be empty');
      return;
    }

    const updated: User = {
      ...editingUser,
      name: editName.trim(),
      username: editName.trim(),
      password: editPassword.trim(),
      title: editTitle.trim(),
      role: editingUser.id === 'admin' ? 'admin' : editRole,
    };

    const res = updateUser(updated);
    if (res.success) {
      toast.success(`User "${updated.name}" credentials updated successfully!`);
      setEditingUser(null);
    } else {
      toast.error(res.error || 'Failed to update user');
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }
    if (!newPassword.trim()) {
      toast.error('Please enter a password');
      return;
    }

    const res = addUser({
      username: newUsername.trim(),
      name: newUsername.trim(),
      password: newPassword.trim(),
      role: newRole,
      title: newTitle.trim() || (newRole === 'admin' ? 'HR Administrator' : 'HR Executive'),
    });

    if (res.success) {
      toast.success(`User "${newUsername.trim()}" created successfully!`);
      setNewUsername('');
      setNewPassword('');
      setNewTitle('');
      setNewRole('user');
    } else {
      toast.error(res.error || 'Failed to create user');
    }
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    setDeleting(true);
    const res = deleteUser(userToDelete.id);
    setDeleting(false);

    if (res.success) {
      toast.success(`User "${userToDelete.name}" deleted successfully!`);
      setUserToDelete(null);
    } else {
      toast.error(res.error || 'Failed to delete user');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 880, fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          System Settings & Administration
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          User credentials management, audit history deletion controls, and Google Sheet schema.
        </p>
      </div>

      {/* ── Administration & User Management ─────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #e8ecf0', background: 'linear-gradient(135deg, #0d1b2e, #1a2e52)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Administration &amp; User Credentials</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Manage system accounts, roles, and login passwords</div>
            </div>
          </div>

          <span
            style={{
              padding: '3px 10px',
              borderRadius: 99,
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: '#2563eb',
              color: '#ffffff',
            }}
          >
            {users.length} Users Registered
          </span>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Admin Policy Notice */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 12,
              fontSize: 12,
              color: '#1e40af',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <ShieldCheck size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <b>Administration Controls:</b><br />
              • Only Administrator accounts have access to this Settings &amp; Administration section.<br />
              • You can create new accounts, edit usernames, update passwords, and manage roles anytime below.
            </div>
          </div>

          {/* Add New User Form (Admin Only) */}
          {isAdmin && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserPlus size={15} color="#2563eb" /> Create New HR User Account
              </div>

              <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Username / Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Neha Sharma"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                      backgroundColor: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Password *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1234 or SecretPass"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                      backgroundColor: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HR Executive"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                      backgroundColor: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Role
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as 'user' | 'admin')}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="user">Doer User (Status Only)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      height: 38,
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <UserPlus size={14} /> Add User
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Registered Users Table */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Existing System Accounts
            </label>

            <div style={{ border: '1px solid #e8ecf0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8ecf0' }}>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>User / Profile</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Role</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Designation</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Password</th>
                    {isAdmin && (
                      <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isAdm = u.role === 'admin';
                    const showPass = visiblePasswords[u.id];

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        
                        {/* Name & Avatar */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                backgroundColor: u.avatarBg || '#2563eb',
                                color: '#ffffff',
                                fontSize: 11,
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isAdm ? <ShieldCheck size={14} /> : u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>@{u.username}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 99,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              backgroundColor: isAdm ? '#eff6ff' : '#ecfdf5',
                              color: isAdm ? '#1d4ed8' : '#047857',
                              border: `1px solid ${isAdm ? '#bfdbfe' : '#a7f3d0'}`,
                            }}
                          >
                            {isAdm ? 'Admin' : 'Doer User'}
                          </span>
                        </td>

                        {/* Designation */}
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                          {u.title || 'HR Member'}
                        </td>

                        {/* Password */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            <Key size={12} color="#64748b" />
                            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                              {showPass ? u.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(u.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#94a3b8' }}
                            >
                              {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </td>

                        {/* Actions (Edit & Delete) */}
                        {isAdmin && (
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              
                              {/* Edit User Button */}
                              <button
                                type="button"
                                title="Edit Username & Password"
                                onClick={() => handleOpenEdit(u)}
                                style={{
                                  padding: 6,
                                  borderRadius: 6,
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#2563eb',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* Delete User Button */}
                              {u.id !== 'admin' ? (
                                <button
                                  type="button"
                                  title="Delete user"
                                  onClick={() => setUserToDelete(u)}
                                  style={{
                                    padding: 6,
                                    borderRadius: 6,
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              ) : null}

                            </div>
                          </td>
                        )}

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ── HOW THIS SYSTEM WORKS & SLA EVALUATION GUIDE ── */}
      <div style={cardStyle}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #e8ecf0', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>How This System Works &amp; SLA Guide</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Workflow rules, dual-deadline tracking &amp; Weekly Review auto-rating logic</div>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: 99 }}>
            System Architecture
          </span>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Dual-Deadline & Workflow Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {/* 1. Expected vs Due Date */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#166534', fontSize: 13, fontWeight: 700 }}>
                <Calendar size={16} color="#16a34a" /> 1. Dual-Deadline Tracking Mechanism
              </div>
              <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <strong style={{ color: '#166534' }}>• Expected Target Date &amp; Time (Assigner Goal):</strong> Task assign karne wale (Manager/Admin) ke according ideal completion time. Agar task is time ke andar complete hota hai to highest <b>⭐⭐⭐⭐⭐ Excellent (On Expected Time)</b> rating milti hai.
                </div>
                <div>
                  <strong style={{ color: '#047857' }}>• Committed Due Date &amp; Time (Final Deadline):</strong> Assigned HR person ke dwara commit ki gayi final deadline. Iske andar complete karne par <b>⭐⭐⭐⭐⭐ Excellent (On Time)</b> rating milti hai.
                </div>
              </div>
            </div>

            {/* 2. Live Progress Workflow */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#2563eb', fontSize: 13, fontWeight: 700 }}>
                <CheckCircle2 size={16} color="#2563eb" /> 2. Table-Operated Live Workflow
              </div>
              <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <strong>• Default State:</strong> Task create hote hi initial status <b>Pending</b> set hota hai.
                </div>
                <div>
                  <strong>• Real-time Update:</strong> Assigned doer direct Tasks table dropdown se live progress (<b>25%</b>, <b>50%</b>, <b>75%</b>, <b>100%</b>) update kar sakte hain.
                </div>
                <div>
                  <strong>• Auto Timestamp:</strong> <b>Complete 100%</b> hote hi Actual Completion Time record hota hai aur Weekly Review rating auto-calculate ho jati hai.
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Review Star Rating Rules Matrix */}
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#854d0e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Star size={16} color="#eab308" /> Weekly Review Performance Star Rating Rules
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
              <div style={{ background: '#ffffff', border: '1px solid #fde047', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d' }}>⭐⭐⭐⭐⭐ Excellent (On Expected Time)</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Completed on or before Assigner's Expected Target Date &amp; Time.</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #fde047', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#047857' }}>⭐⭐⭐⭐⭐ Excellent (On Time)</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Completed past Expected Target, but on or before Committed Due Date &amp; Time.</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #fde047', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#2563eb' }}>⭐⭐⭐⭐ Very Good (Minor Delay)</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Delayed by ≤ 1 day past the Committed Due Date.</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #fde047', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#b45309' }}>⭐⭐⭐ Good (Delayed)</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Delayed by ≤ 3 days past the Committed Due Date.</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #fde047', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#c2410c' }}>⭐⭐ Needs Improvement (Late)</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Delayed by ≤ 7 days past the Committed Due Date.</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #fde047', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>⭐ Poor (Overdue)</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Delayed by &gt; 7 days past the Committed Due Date.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Audit History Deletion Controls ─────────────────────────────── */}
      {isAdmin && (
        <div style={cardStyle}>
          <div
            style={{
              padding: '16px 22px',
              borderBottom: '1px solid #e8ecf0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: allowHistoryDeletion ? '#fef2f2' : '#f1f5f9',
                  border: `1px solid ${allowHistoryDeletion ? '#fecaca' : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: allowHistoryDeletion ? '#dc2626' : '#64748b',
                }}
              >
                <Trash2 size={16} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Audit History Deletion Controls
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Enable or hide the Delete action column on the Task Modifications &amp; Audit History page
                </div>
              </div>
            </div>

            <span
              style={{
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: allowHistoryDeletion ? '#fef2f2' : '#f1f5f9',
                color: allowHistoryDeletion ? '#dc2626' : '#64748b',
                border: `1px solid ${allowHistoryDeletion ? '#fecaca' : '#cbd5e1'}`,
              }}
            >
              {allowHistoryDeletion ? 'Delete Action Active' : 'Protected / Hidden'}
            </span>
          </div>

          <div style={{ padding: 22 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px',
                background: allowHistoryDeletion ? '#fff5f5' : '#f8fafc',
                border: `1px solid ${allowHistoryDeletion ? '#fed7d7' : '#e2e8f0'}`,
                borderRadius: 12,
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  Show Delete Action Column in History Table
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>
                  Turn this <b>ON</b> to display an <b>Action</b> column with <b>Delete (🗑️)</b> buttons in the History table so old modification records can be removed. Turn <b>OFF</b> to protect audit trails.
                </div>
              </div>

              {/* Modern Switch Button */}
              <button
                type="button"
                onClick={handleToggleHistoryDeletion}
                style={{
                  position: 'relative',
                  width: 52,
                  height: 30,
                  borderRadius: 99,
                  backgroundColor: allowHistoryDeletion ? '#dc2626' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  flexShrink: 0,
                  padding: 3,
                  outline: 'none',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                    transform: allowHistoryDeletion ? 'translateX(22px)' : 'translateX(0px)',
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ────────────────────────────── */}
      {editingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setEditingUser(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: '#ffffff',
              borderRadius: 20,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid #e8ecf0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Edit User Credentials
                  </h3>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>
                    Update username, password, or title for @{editingUser.username}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Username / Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Password *
                </label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Designation / Job Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>

              {editingUser.id !== 'admin' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as UserRole)}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="user">Doer User (Status Only)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    border: 'none',
                    boxShadow: '0 3px 10px rgba(37,99,235,0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Save size={14} /> Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── Delete User Confirmation Modal ──────────────── */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 95,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !deleting && setUserToDelete(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: '#ffffff',
              borderRadius: 18,
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.25)',
              padding: 24,
              animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Delete User "{userToDelete.name}"?
                </h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                  This user will no longer be able to log in.
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 13,
                color: '#334155',
                lineHeight: 1.4,
                marginBottom: 20,
              }}
            >
              Account: <b>@{userToDelete.username}</b> ({userToDelete.title || 'HR Member'})
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setUserToDelete(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteUser}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                  border: 'none',
                  boxShadow: '0 3px 10px rgba(220,38,38,0.3)',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};

export default Settings;
