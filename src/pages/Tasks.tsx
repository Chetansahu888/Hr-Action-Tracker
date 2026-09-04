import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, Plus, RefreshCw, Edit2, Trash2,
  ChevronUp, ChevronDown, Loader2, ExternalLink,
  SlidersHorizontal, CheckSquare, X, AlertTriangle, ShieldCheck, User as UserIcon, Lock
} from 'lucide-react';
import { taskService, computeDashboard, getTaskDueStatus } from '../services/taskService';
import type { Task, TaskStatus, SortField, SortDir, DashboardData } from '../types/task';
import TaskDrawer from '../components/tasks/TaskDrawer';
import TaskModal from '../components/tasks/TaskModal';
import { getStatusConfig, StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const STATUS_OPTIONS: TaskStatus[] = ['Pending', 'Progress 25%', 'Progress 50%', 'Progress 75%', 'Complete 100%'];

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const fmtDateTime = (iso: string) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return iso;
  }
};

const DOER_COLORS = [
  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', avatarBg: '#3b82f6' },
  { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', avatarBg: '#8b5cf6' },
  { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', avatarBg: '#10b981' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', avatarBg: '#f97316' },
];

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e8ecf0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

/* ─── KPI Strip ─────────────── */
const KpiStrip = ({ kpi }: { kpi: DashboardData }) => {
  const items = [
    { label: 'Total',      value: kpi.total,     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'Pending',    value: kpi.pending,   color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
    { label: 'Prog 25%',   value: kpi.prog25,    color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    { label: 'Prog 50%',   value: kpi.prog50,    color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
    { label: 'Prog 75%',   value: kpi.prog75,    color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
    { label: 'Completed',  value: kpi.completed, color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
      {items.map(item => (
        <div
          key={item.label}
          style={{
            ...cardStyle,
            padding: '14px 16px',
            borderColor: item.border,
            transition: 'transform 0.15s ease',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginTop: 4 }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export const Tasks: React.FC = () => {
  const { user, isAdmin, users, canViewTask, canUpdateStatus } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [doerFilter, setDoerFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('sno');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [drawerTask, setDrawerTask] = useState<Task | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const data = await taskService.getTasks();
      setTasks(data);
    } catch {
      toast.error('Failed to load HR tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    autoRef.current = setInterval(() => {
      if (!document.hidden) loadTasks(true);
    }, 60000);
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [loadTasks]);

  // Registered system users as doer options
  const doerOptions = useMemo(() => {
    return users.map(u => u.name).filter(Boolean).sort();
  }, [users]);

  // Isolate tasks: Admin sees all tasks; normal User sees only tasks where their name is assigned
  const visibleTasks = useMemo(() => {
    if (isAdmin) return tasks;
    return tasks.filter(t => canViewTask(t.doer));
  }, [tasks, isAdmin, canViewTask]);

  const filtered = useMemo(() => {
    let r = [...visibleTasks];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(t => t.problem?.toLowerCase().includes(q) || t.doer?.toLowerCase().includes(q));
    }
    if (statusFilter !== 'All') r = r.filter(t => t.status === statusFilter);
    if (doerFilter !== 'All')   r = r.filter(t => t.doer?.includes(doerFilter));

    r.sort((a, b) => {
      const va = sortField === 'sno' ? a.sno : sortField === 'status' ? a.status : sortField === 'planned' ? a.planned : a.doer;
      const vb = sortField === 'sno' ? b.sno : sortField === 'status' ? b.status : sortField === 'planned' ? b.planned : b.doer;
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return r;
  }, [visibleTasks, search, statusFilter, doerFilter, sortField, sortDir]);

  const kpi = useMemo(() => computeDashboard(filtered), [filtered]);

  const handleStatusChange = async (sno: number, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.sno === sno ? { ...t, status: newStatus } : t));
    try {
      await taskService.updateStatus(sno, newStatus);
      toast.success('Status updated');
      loadTasks(true);
    } catch {
      toast.error('Failed to update status');
      loadTasks(true);
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      await taskService.deleteTask(taskToDelete.sno);
      toast.success(`Task #${taskToDelete.sno} deleted successfully`);
      setTasks(prev => prev.filter(t => t.sno !== taskToDelete.sno));
      if (drawerTask?.sno === taskToDelete.sno) setDrawerTask(null);
      setTaskToDelete(null);
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} color="#cbd5e1" style={{ marginLeft: 4 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} color="#2563eb" style={{ marginLeft: 4 }} />
      : <ChevronDown size={12} color="#2563eb" style={{ marginLeft: 4 }} />;
  };

  const hasFilters = search || statusFilter !== 'All' || doerFilter !== 'All';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: "'Inter', sans-serif" }}>

      {/* ─ Header ─ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            HR Action Items
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {isAdmin ? (
              <span style={{ color: '#047857', fontWeight: 600 }}>Admin Mode: Full access to add, edit, delete and update any task.</span>
            ) : (
              <span>Logged in as <b>{user?.name}</b> (Doer) — You can update status for tasks assigned to you.</span>
            )}
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => loadTasks(true)}
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

          {/* Add Task Button (Admin Only) */}
          {isAdmin && (
            <button
              onClick={() => setAddOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                background: '#047857',
                border: 'none',
                borderRadius: 10,
                boxShadow: '0 4px 14px rgba(4,120,87,0.3)',
                cursor: 'pointer',
                transition: 'transform 0.15s',
              }}
            >
              <Plus size={16} /> Add Action Task
            </button>
          )}
        </div>
      </div>

      {/* ─ KPI Summary Strip ─ */}
      <KpiStrip kpi={kpi} />

      {/* ─ Toolbar ─ */}
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
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200, maxWidth: 360 }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search task or doer name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 38,
              paddingLeft: 36,
              paddingRight: search ? 32 : 12,
              fontSize: 13,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#0f172a',
              outline: 'none',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            height: 38,
            padding: '0 12px',
            fontSize: 13,
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#334155',
            fontWeight: 500,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        {/* Doer Filter */}
        <select
          value={doerFilter}
          onChange={e => setDoerFilter(e.target.value)}
          style={{
            height: 38,
            padding: '0 12px',
            fontSize: 13,
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#334155',
            fontWeight: 500,
            outline: 'none',
            cursor: 'pointer',
            maxWidth: 160,
          }}
        >
          <option value="All">All Doers</option>
          {doerOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        {/* Quick My Tasks Filter for Doers */}
        {!isAdmin && user && (
          <button
            onClick={() => setDoerFilter(doerFilter === user.name ? 'All' : user.name)}
            style={{
              height: 38,
              padding: '0 14px',
              fontSize: 12,
              fontWeight: 700,
              color: doerFilter === user.name ? '#ffffff' : '#2563eb',
              background: doerFilter === user.name ? '#2563eb' : '#eff6ff',
              border: `1px solid ${doerFilter === user.name ? '#2563eb' : '#bfdbfe'}`,
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <UserIcon size={13} /> {doerFilter === user.name ? 'Showing My Tasks' : 'My Assigned Tasks'}
          </button>
        )}

        {/* Sort Controls */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 38,
            padding: '0 10px',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <SlidersHorizontal size={13} color="#64748b" />
          <select
            value={sortField}
            onChange={e => { setSortField(e.target.value as SortField); setSortDir('asc'); }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="sno">S.No.</option>
            <option value="planned">Due Date & Time</option>
            <option value="status">Status</option>
            <option value="doer">Doer</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              padding: 2,
            }}
          >
            {sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Clear filter button */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('All'); setDoerFilter('All'); }}
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
            <X size={13} /> Reset
          </button>
        )}
      </div>

      {/* ─ Main Tasks Table ─ */}
      <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8ecf0' }}>
                <th
                  onClick={() => toggleSort('sno')}
                  style={{
                    padding: '12px 18px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>S.No. <SortIcon field="sno" /></span>
                </th>

                <th
                  style={{
                    padding: '12px 18px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    minWidth: 260,
                  }}
                >
                  Problem / Task
                </th>

                <th
                  onClick={() => toggleSort('doer')}
                  style={{
                    padding: '12px 18px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Doer(s) <SortIcon field="doer" /></span>
                </th>

                <th
                  onClick={() => toggleSort('planned')}
                  style={{
                    padding: '12px 18px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Due Date & Time <SortIcon field="planned" /></span>
                </th>

                <th
                  style={{
                    padding: '12px 18px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Actual
                </th>

                <th
                  onClick={() => toggleSort('status')}
                  style={{
                    padding: '12px 18px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Status <SortIcon field="status" /></span>
                </th>

                <th
                  style={{
                    padding: '12px 18px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    minWidth: 160,
                  }}
                >
                  Weekly Review
                </th>

                {isAdmin && (
                  <th
                    style={{
                      padding: '12px 18px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Admin Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td colSpan={isAdmin ? 8 : 7} style={{ padding: '16px 18px' }}>
                      <div style={{ height: 18, background: '#f1f5f9', borderRadius: 6 }} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckSquare size={24} color="#94a3b8" />
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>No tasks found</p>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Try clearing filters or check back later.</p>
                      {isAdmin && (
                        <button
                          onClick={() => setAddOpen(true)}
                          style={{
                            marginTop: 6,
                            padding: '8px 16px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#ffffff',
                            background: '#2563eb',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                        >
                          + Add Task
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(task => {
                  const cfg = getStatusConfig(task.status);
                  const doers = task.doer ? task.doer.split(/[,/]/).map(d => d.trim()).filter(Boolean) : [];
                  const userCanChangeThisStatus = canUpdateStatus(task.doer);

                  return (
                    <tr
                      key={task.sno}
                      onClick={() => setDrawerTask(task)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      {/* S.No. */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 28,
                            height: 24,
                            padding: '0 6px',
                            borderRadius: 6,
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          #{task.sno}
                        </span>
                      </td>

                      {/* Problem / Task */}
                      <td style={{ padding: '14px 18px', maxWidth: 340 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
                            {task.problem}
                          </span>
                          <ExternalLink size={12} color="#cbd5e1" style={{ flexShrink: 0, marginTop: 3 }} />
                        </div>
                      </td>

                      {/* Doer Chips */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {doers.length > 0 ? (
                            doers.map((d, i) => {
                              const col = DOER_COLORS[i % DOER_COLORS.length];
                              const isMe = user?.name.toLowerCase() === d.toLowerCase();
                              return (
                                <span
                                  key={i}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '3px 8px',
                                    borderRadius: 99,
                                    fontSize: 12,
                                    fontWeight: isMe ? 800 : 600,
                                    backgroundColor: col.bg,
                                    color: col.text,
                                    border: isMe ? '1.5px solid #2563eb' : `1px solid ${col.border}`,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      backgroundColor: col.avatarBg,
                                      color: '#ffffff',
                                      fontSize: 9,
                                      fontWeight: 800,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {d.charAt(0).toUpperCase()}
                                  </span>
                                  <span>{d}{isMe ? ' (You)' : ''}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Due Date & Time */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                          {fmtDateTime(task.planned)}
                        </div>
                        {task.status !== 'Complete 100%' && task.planned ? (() => {
                          const dueSt = getTaskDueStatus(task.planned, task.status);
                          return (
                            <div style={{ marginTop: 3 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: dueSt.color,
                                  backgroundColor: dueSt.bg,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                }}
                              >
                                {dueSt.text}
                              </span>
                            </div>
                          );
                        })() : null}
                      </td>

                      {/* Actual Date */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {task.actual ? (
                          <span style={{ color: '#047857', fontWeight: 600 }}>{fmtDate(task.actual)}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>In progress</span>
                        )}
                      </td>

                      {/* Status Dropdown (Editable if Admin OR Assigned Doer) */}
                      <td style={{ padding: '14px 18px' }} onClick={e => e.stopPropagation()}>
                        {userCanChangeThisStatus ? (
                          <select
                            value={task.status}
                            onChange={e => handleStatusChange(task.sno, e.target.value as TaskStatus)}
                            title="Click to update progress"
                            style={{
                              padding: '4px 10px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 700,
                              backgroundColor: cfg.bg,
                              color: cfg.color,
                              border: `1.5px solid ${cfg.dot}`,
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <div title="Only assigned doer or Admin can update this status">
                            <StatusBadge status={task.status} />
                          </div>
                        )}
                      </td>

                      {/* Weekly Review */}
                      <td style={{ padding: '14px 18px' }}>
                        {task.review ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#854d0e' }}>
                            {task.review}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' }}>
                            Auto-calculates on done
                          </span>
                        )}
                      </td>

                      {/* Admin Actions (Edit / Delete) */}
                      {isAdmin && (
                        <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            
                            {/* Edit Button */}
                            <button
                              title="Edit task"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTask(task);
                              }}
                              style={{
                                padding: 6,
                                borderRadius: 8,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.background = '#eff6ff';
                                (e.currentTarget as HTMLElement).style.color = '#2563eb';
                                (e.currentTarget as HTMLElement).style.borderColor = '#bfdbfe';
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                                (e.currentTarget as HTMLElement).style.color = '#475569';
                                (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                              }}
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Delete Button */}
                            <button
                              title="Delete task"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToDelete(task);
                              }}
                              style={{
                                padding: 6,
                                borderRadius: 8,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.background = '#fef2f2';
                                (e.currentTarget as HTMLElement).style.color = '#dc2626';
                                (e.currentTarget as HTMLElement).style.borderColor = '#fecaca';
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                                (e.currentTarget as HTMLElement).style.color = '#ef4444';
                                (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                              }}
                            >
                              <Trash2 size={13} />
                            </button>

                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        {!loading && filtered.length > 0 && (
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
            <span>Showing <b>{filtered.length}</b> of <b>{tasks.length}</b> HR tasks</span>
            {refreshing && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2563eb', fontWeight: 600 }}>
                <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Auto-syncing...
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ──────────────── */}
      {taskToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !deleting && setTaskToDelete(null)}
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
                  Delete Task #{taskToDelete.sno}?
                </h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: '#334155',
                lineHeight: 1.4,
                marginBottom: 20,
                maxHeight: 80,
                overflowY: 'auto',
              }}
            >
              "{taskToDelete.problem}"
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setTaskToDelete(null)}
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
                onClick={confirmDelete}
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
                    Delete Task
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer */}
      <TaskDrawer
        task={drawerTask}
        onClose={() => setDrawerTask(null)}
        onStatusChange={(sno, st) => handleStatusChange(sno, st)}
      />

      {/* Add Modal (Admin Only) */}
      {isAdmin && addOpen && (
        <TaskModal
          title="Add HR Action Task"
          doerOptions={doerOptions}
          onClose={() => setAddOpen(false)}
          onSave={async taskData => {
            try {
              await taskService.addTask(taskData);
              toast.success('HR task created successfully');
              setAddOpen(false);
              loadTasks(true);
            } catch {
              toast.error('Failed to create task');
            }
          }}
        />
      )}

      {/* Edit Modal (Admin Only) */}
      {isAdmin && editTask && (
        <TaskModal
          title="Edit HR Action Task"
          task={editTask}
          doerOptions={doerOptions}
          onClose={() => setEditTask(null)}
          onSave={async taskData => {
            try {
              await taskService.updateTask(taskData as Task);
              toast.success('HR task updated successfully');
              setEditTask(null);
              loadTasks(true);
              if (drawerTask?.sno === editTask.sno) setDrawerTask(null);
            } catch {
              toast.error('Failed to update task');
            }
          }}
        />
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

export default Tasks;
