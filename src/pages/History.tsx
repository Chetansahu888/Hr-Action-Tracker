import React, { useState, useEffect, useMemo } from 'react';
import {
  History as HistoryIcon, Search, RefreshCw, ArrowRight,
  Filter, Clock, CheckCircle2, Edit3, PlusCircle, Trash2,
  FileText, ShieldCheck, X, User as UserIcon, AlertTriangle, Loader2
} from 'lucide-react';
import { taskService } from '../services/taskService';
import type { TaskAuditLog, AuditChange, Task } from '../types/task';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e8ecf0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const formatTime = (iso: string) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
};

const getRelativeTime = (iso: string) => {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
};

const ACTION_CONFIG = {
  STATUS_CHANGED: {
    label: 'Status Updated',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: CheckCircle2,
  },
  EDITED: {
    label: 'Task Edited',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: Edit3,
  },
  CREATED: {
    label: 'Task Created',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: PlusCircle,
  },
  DELETED: {
    label: 'Task Deleted',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: Trash2,
  },
};

export const History: React.FC = () => {
  const { user, isAdmin, canViewTask } = useAuth();
  const [logs, setLogs] = useState<TaskAuditLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  
  // History deletion toggle state
  const [allowDeletion, setAllowDeletion] = useState<boolean>(
    taskService.getAllowHistoryDeletion()
  );

  // Single log deletion modal state
  const [logToDelete, setLogToDelete] = useState<TaskAuditLog | null>(null);
  const [deletingLog, setDeletingLog] = useState(false);

  // Clear all logs modal state
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.enabled !== undefined) {
        setAllowDeletion(e.detail.enabled);
      } else {
        setAllowDeletion(taskService.getAllowHistoryDeletion());
      }
    };
    window.addEventListener('hr-history-deletion-changed', handler);
    return () => window.removeEventListener('hr-history-deletion-changed', handler);
  }, []);

  const confirmDeleteLog = async () => {
    if (!logToDelete) return;
    setDeletingLog(true);
    try {
      await taskService.deleteAuditLog(logToDelete.id);
      setLogs(prev => prev.filter(l => l.id !== logToDelete.id));
      toast.success('Audit history record deleted successfully');
      setLogToDelete(null);
    } catch {
      toast.error('Failed to delete audit record');
    } finally {
      setDeletingLog(false);
    }
  };

  const confirmClearAll = async () => {
    setClearingAll(true);
    try {
      await taskService.clearAllAuditLogs();
      setLogs([]);
      toast.success('All audit history records have been cleared.');
      setShowClearAllModal(false);
    } catch {
      toast.error('Failed to clear audit history');
    } finally {
      setClearingAll(false);
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [auditLogs, taskList] = await Promise.all([
        taskService.getAuditLogs(),
        taskService.getTasks(),
      ]);
      setLogs(auditLogs);
      setTasks(taskList);
    } catch {
      toast.error('Failed to load modification history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Isolate logs based on logged-in user permissions
  const userLogs = useMemo(() => {
    if (isAdmin) return logs;
    return logs.filter(l => {
      // Direct doer field match
      if (l.doer && canViewTask(l.doer)) return true;
      // Cross-reference with task list
      const matchingTask = tasks.find(t => t.sno === l.taskSno);
      if (matchingTask && canViewTask(matchingTask.doer)) return true;
      // Check changes diffs
      if (user) {
        const myName = user.name.toLowerCase();
        const myUsername = user.username.toLowerCase();
        if (
          l.changes.some(
            c =>
              c.oldValue?.toLowerCase().includes(myName) ||
              c.newValue?.toLowerCase().includes(myName) ||
              c.oldValue?.toLowerCase().includes(myUsername) ||
              c.newValue?.toLowerCase().includes(myUsername)
          )
        ) {
          return true;
        }
      }
      return false;
    });
  }, [logs, tasks, isAdmin, user, canViewTask]);

  const filteredLogs = useMemo(() => {
    let list = [...userLogs];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        l =>
          l.problem.toLowerCase().includes(q) ||
          `#${l.taskSno}`.includes(q) ||
          (l.doer && l.doer.toLowerCase().includes(q)) ||
          l.changes.some(c =>
            c.fieldLabel.toLowerCase().includes(q) ||
            c.oldValue.toLowerCase().includes(q) ||
            c.newValue.toLowerCase().includes(q)
          )
      );
    }
    if (actionFilter !== 'All') {
      list = list.filter(l => l.action === actionFilter);
    }
    return list;
  }, [userLogs, search, actionFilter]);

  // KPIs computed strictly for the logged-in user
  const stats = useMemo(() => {
    let statusChanges = 0;
    let edits = 0;
    let created = 0;
    userLogs.forEach(l => {
      if (l.action === 'STATUS_CHANGED') statusChanges++;
      else if (l.action === 'EDITED') edits++;
      else if (l.action === 'CREATED') created++;
    });
    return {
      total: userLogs.length,
      statusChanges,
      edits,
      created,
    };
  }, [userLogs]);

  // Helper to resolve display doers for a log
  const getLogDoer = (log: TaskAuditLog): string => {
    if (log.doer) return log.doer;
    const task = tasks.find(t => t.sno === log.taskSno);
    if (task?.doer) return task.doer;
    const doerChange = log.changes.find(c => c.field === 'doer');
    if (doerChange) return doerChange.newValue !== '—' ? doerChange.newValue : doerChange.oldValue;
    return 'HR Team';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>

      {/* ─ Header ─ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2, margin: 0 }}>
              Task Modifications & Audit History
            </h1>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 99,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                fontSize: 11,
                fontWeight: 700,
                color: '#1d4ed8',
              }}
            >
              <Clock size={12} color="#2563eb" />
              30-Day Auto Retention
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {isAdmin
              ? 'Administrator Audit Trail — Showing modifications across all department tasks.'
              : `Showing modification records and status transitions for tasks assigned to ${user?.name}.`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ─ KPI Strip ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        
        <div style={{ ...cardStyle, padding: '14px 16px', borderColor: '#bfdbfe' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#2563eb', lineHeight: 1 }}>{stats.total}</div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginTop: 4 }}>
            Total Logged Events
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '14px 16px', borderColor: '#a7f3d0' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#059669', lineHeight: 1 }}>{stats.statusChanges}</div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginTop: 4 }}>
            Status Transitions
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '14px 16px', borderColor: '#ddd6fe' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#7c3aed', lineHeight: 1 }}>{stats.edits}</div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginTop: 4 }}>
            Task Details Edits
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '14px 16px', borderColor: '#fed7aa' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#ea580c', lineHeight: 1 }}>{stats.created}</div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginTop: 4 }}>
            New Tasks Added
          </div>
        </div>

      </div>

      {/* ─ Search & Filter Toolbar ─ */}
      <div
        style={{
          ...cardStyle,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 220, maxWidth: 400 }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by Task #, problem, or modified value..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 38,
              paddingLeft: 36,
              paddingRight: 12,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              fontSize: 13,
              outline: 'none',
              backgroundColor: '#f8fafc',
            }}
          />
        </div>

        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          style={{
            height: 38,
            padding: '0 12px',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            backgroundColor: '#f8fafc',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="All">All Action Types</option>
          <option value="STATUS_CHANGED">Status Updates</option>
          <option value="EDITED">Task Edits</option>
          <option value="CREATED">Tasks Created</option>
          <option value="DELETED">Tasks Deleted</option>
        </select>

        {(search || actionFilter !== 'All') && (
          <button
            onClick={() => { setSearch(''); setActionFilter('All'); }}
            style={{
              height: 38,
              padding: '0 12px',
              fontSize: 12,
              fontWeight: 600,
              color: '#ef4444',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <X size={13} /> Reset Filter
          </button>
        )}
      </div>

      {/* ─ Audit Trail Comparison Table ─ */}
      <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8ecf0' }}>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', width: 170 }}>
                  Timestamp
                </th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', width: 90 }}>
                  Task #
                </th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 200 }}>
                  Problem / Task
                </th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 150 }}>
                  Doer(s)
                </th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', width: 130 }}>
                  Action Type
                </th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 360 }}>
                  Modification Diffs (Previous vs. Current)
                </th>
                {allowDeletion && (
                  <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', width: 90, textAlign: 'center' }}>
                    Action
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td colSpan={allowDeletion ? 7 : 6} style={{ padding: '16px 18px' }}>
                      <div style={{ height: 20, background: '#f1f5f9', borderRadius: 6 }} />
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={allowDeletion ? 7 : 6} style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HistoryIcon size={24} color="#94a3b8" />
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>No modification logs found for your account</p>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                        {isAdmin
                          ? 'Any future edit or status change will automatically record here.'
                          : 'Modifications to tasks assigned to you will automatically appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const actCfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.EDITED;
                  const IconComp = actCfg.icon;
                  const doerText = getLogDoer(log);
                  const doerNames = doerText.split(/[,/]/).map(d => d.trim()).filter(Boolean);

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                          {formatTime(log.timestamp)}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> {getRelativeTime(log.timestamp)}
                        </div>
                      </td>

                      {/* Task Ref */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 32,
                            height: 24,
                            padding: '0 8px',
                            borderRadius: 6,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          #{log.taskSno}
                        </span>
                      </td>

                      {/* Problem Statement */}
                      <td style={{ padding: '14px 18px', maxWidth: 240 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>
                          {log.problem}
                        </div>
                      </td>

                      {/* Doer(s) */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {doerNames.map((dName, dIdx) => {
                            const isMe = user?.name.toLowerCase() === dName.toLowerCase() || user?.username.toLowerCase() === dName.toLowerCase();
                            return (
                              <span
                                key={dIdx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 8px',
                                  borderRadius: 99,
                                  fontSize: 11,
                                  fontWeight: isMe ? 700 : 600,
                                  background: isMe ? '#eff6ff' : '#f1f5f9',
                                  color: isMe ? '#1d4ed8' : '#334155',
                                  border: `1px solid ${isMe ? '#bfdbfe' : '#e2e8f0'}`,
                                }}
                              >
                                <span
                                  style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    background: isMe ? '#2563eb' : '#64748b',
                                    color: '#fff',
                                    fontSize: 8,
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {dName.charAt(0).toUpperCase()}
                                </span>
                                {dName} {isMe ? '(You)' : ''}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Action Type */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: actCfg.bg,
                            color: actCfg.color,
                            border: `1px solid ${actCfg.border}`,
                          }}
                        >
                          <IconComp size={12} />
                          {actCfg.label}
                        </span>
                      </td>

                      {/* Modifications (Previous vs Current) */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {log.changes.map((ch, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                flexWrap: 'wrap',
                                fontSize: 12,
                                background: '#f8fafc',
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid #e8ecf0',
                              }}
                            >
                              {/* Field Name */}
                              <span style={{ fontWeight: 700, color: '#475569', minWidth: 90 }}>
                                {ch.fieldLabel}:
                              </span>

                              {/* Previous Value */}
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                <span style={{ fontSize: 10, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>OLD:</span>
                                <s>{ch.oldValue}</s>
                              </span>

                              {/* Arrow */}
                              <ArrowRight size={13} color="#94a3b8" style={{ flexShrink: 0 }} />

                              {/* Current Value */}
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: '#ecfdf5',
                                  border: '1px solid #a7f3d0',
                                  color: '#047857',
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                <span style={{ fontSize: 10, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>NEW:</span>
                                {ch.newValue}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Action Column (when enabled in Settings) */}
                      {allowDeletion && (
                        <td style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            title="Delete this history record"
                            onClick={() => setLogToDelete(log)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {!loading && filteredLogs.length > 0 && (
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #e8ecf0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#64748b',
            }}
          >
            <span>Showing <b>{filteredLogs.length}</b> of <b>{userLogs.length}</b> logged modification records</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {allowDeletion && isAdmin && userLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: '#fff',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={12} /> Clear All History
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600 }}>
                <ShieldCheck size={14} /> Audit Trail Live
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Single Log Delete Confirmation Modal ──────────────── */}
      {logToDelete && (
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
          onClick={() => !deletingLog && setLogToDelete(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 440,
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
                  Delete History Log Record?
                </h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                  Are you sure you want to remove this modification record?
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 12,
                color: '#334155',
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              <div><b>Task #{logToDelete.taskSno}:</b> {logToDelete.problem}</div>
              <div style={{ color: '#64748b', marginTop: 4 }}><b>Timestamp:</b> {formatTime(logToDelete.timestamp)}</div>
              <div style={{ color: '#64748b', marginTop: 2 }}><b>Action:</b> {logToDelete.action}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                disabled={deletingLog}
                onClick={() => setLogToDelete(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  cursor: deletingLog ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deletingLog}
                onClick={confirmDeleteLog}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                  border: 'none',
                  boxShadow: '0 3px 10px rgba(220,38,38,0.3)',
                  cursor: deletingLog ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {deletingLog ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear All History Modal ─────────────────────────── */}
      {showClearAllModal && (
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
          onClick={() => !clearingAll && setShowClearAllModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 440,
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
                  Clear All History Records?
                </h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                  This will remove all {userLogs.length} audit history logs from the system.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                disabled={clearingAll}
                onClick={() => setShowClearAllModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  cursor: clearingAll ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={clearingAll}
                onClick={confirmClearAll}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                  border: 'none',
                  boxShadow: '0 3px 10px rgba(220,38,38,0.3)',
                  cursor: clearingAll ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {clearingAll ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Clear All Records
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

export default History;
