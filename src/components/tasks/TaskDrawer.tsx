import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, User, Clock, CheckCircle2, Star, Hash, Check, Lock, AlertCircle } from 'lucide-react';
import type { Task, TaskStatus } from '../../types/task';
import { getStatusConfig, StatusBadge } from '../common/StatusBadge';
import { getTaskDueStatus } from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onStatusChange?: (sno: number, status: TaskStatus) => void;
}

const fmt = (iso: string) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const timeDiff = (planned: string, actual: string) => {
  if (!planned || !actual) return null;
  try {
    const diff = Math.abs(new Date(actual).getTime() - new Date(planned).getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (days === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${days} day${days !== 1 ? 's' : ''}${remHours > 0 ? ` ${remHours}h` : ''}`;
  } catch {
    return null;
  }
};

const DOER_COLORS = [
  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', avatarBg: '#3b82f6' },
  { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', avatarBg: '#8b5cf6' },
  { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', avatarBg: '#10b981' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', avatarBg: '#f97316' },
];

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ task, onClose, onStatusChange }) => {
  const navigate = useNavigate();
  const { canUpdateStatus, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setTimeout(() => setIsOpen(true), 20);
    } else {
      setIsOpen(false);
    }
  }, [task]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!task) return null;

  const doers = task.doer ? task.doer.split(/[,/]/).map(d => d.trim()).filter(Boolean) : [];
  const duration = task.actual ? timeDiff(task.planned, task.actual) : null;
  const isComplete = task.status === 'Complete 100%';
  const cfg = getStatusConfig(task.status);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 460,
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.15)',
          zIndex: 65,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e8ecf0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#2563eb',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                <Hash size={11} /> Task {task.sno}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 9px',
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
                {task.status}
              </span>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.4, margin: 0 }}>
              {task.problem}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: 8,
              background: '#f1f5f9',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#e2e8f0';
              (e.currentTarget as HTMLElement).style.color = '#0f172a';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
              (e.currentTarget as HTMLElement).style.color = '#64748b';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Status quick select */}
          {onStatusChange && (
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e8ecf0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Update Status
                </div>
                {!canUpdateStatus(task.doer) && (
                  <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Lock size={10} /> Assigned Doer Only
                  </span>
                )}
              </div>

              {canUpdateStatus(task.doer) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 }}>
                  {(['Pending', 'Progress 25%', 'Progress 50%', 'Progress 75%', 'Complete 100%'] as TaskStatus[]).map(st => {
                    const active = task.status === st;
                    const stCfg = getStatusConfig(st);
                    return (
                      <button
                        key={st}
                        onClick={() => onStatusChange(task.sno, st)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          border: active ? `2px solid ${stCfg.dot}` : '1px solid #e2e8f0',
                          background: active ? stCfg.bg : '#ffffff',
                          color: active ? stCfg.color : '#64748b',
                          transition: 'all 0.15s',
                        }}
                      >
                        {active && <Check size={12} color={stCfg.dot} />}
                        {st}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <StatusBadge status={task.status} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>View only</span>
                </div>
              )}
            </div>
          )}

          {/* Assigned Doers */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              <User size={13} color="#64748b" /> Assigned HR Doer(s)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {doers.length > 0 ? (
                doers.map((d, i) => {
                  const col = DOER_COLORS[i % DOER_COLORS.length];
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 12px',
                        background: col.bg,
                        border: `1px solid ${col.border}`,
                        borderRadius: 99,
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: col.avatarBg,
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {d.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: col.text }}>{d}</span>
                    </div>
                  );
                })
              ) : (
                <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No one assigned yet</span>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9' }} />

          {/* Timeline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              <Calendar size={13} color="#64748b" /> Timeline & Execution
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              {/* Expected Date */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#166534', fontWeight: 700, marginBottom: 4 }}>
                  Expected Target
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#14532d' }}>
                  {fmt(task.expectedDate || task.planned)}
                </div>
                <div style={{ fontSize: 10, color: '#15803d', marginTop: 4 }}>
                  Assigner Goal
                </div>
              </div>

              {/* Due Date & Time */}
              <div style={{ background: '#f8fafc', border: '1px solid #e8ecf0', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Committed Due Date</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmt(task.planned)}</div>
                {task.status !== 'Complete 100%' && task.planned && (() => {
                  const dueSt = getTaskDueStatus(task.planned, task.status);
                  return (
                    <div style={{ marginTop: 4 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: dueSt.color,
                          backgroundColor: dueSt.bg,
                          padding: '2px 8px',
                          borderRadius: 99,
                          display: 'inline-block',
                        }}
                      >
                        {dueSt.text}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Actual Date */}
              <div
                style={{
                  background: isComplete ? '#ecfdf5' : '#f8fafc',
                  border: `1px solid ${isComplete ? '#a7f3d0' : '#e8ecf0'}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: 11, color: isComplete ? '#047857' : '#64748b', fontWeight: 600, marginBottom: 4 }}>
                  Actual Completion
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isComplete ? '#047857' : '#94a3b8' }}>
                  {task.actual ? fmt(task.actual) : 'In Progress'}
                </div>
              </div>
            </div>

            {duration && (
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                <Clock size={15} color="#0284c7" />
                <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 500 }}>
                  Completion Turnaround Time: <b>{duration}</b>
                </span>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9' }} />

          {/* Weekly Review Rating */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              <Star size={13} color="#eab308" /> Weekly Review Performance
            </div>

            {task.review ? (
              <div
                style={{
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: '#854d0e', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {task.review}
                </div>
                <div style={{ fontSize: 11, color: '#a16207', marginTop: 4 }}>
                  Evaluated against Assigner's Expected Date and Committed Due Date SLA standards.
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e8ecf0',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <CheckCircle2 size={16} color="#94a3b8" />
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Weekly review star rating will automatically calculate when task is marked <b>Complete 100%</b> (Evaluates Expected Target &amp; Due Date).
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e8ecf0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/history');
            }}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#2563eb',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 8px',
              borderRadius: 8,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#eff6ff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <Clock size={14} /> View Audit History
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default TaskDrawer;
