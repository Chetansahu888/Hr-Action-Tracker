import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, Clock, PlayCircle, BarChart2, ListTodo, PauseCircle,
  TrendingUp, Users, RefreshCw, ArrowUpRight, PlusCircle, FileSpreadsheet,
  Layers, ShieldCheck, Target, Award, Sparkles
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { taskService, computeDashboard } from '../services/taskService';
import type { Task, DashboardData } from '../types/task';
import { StatusBadge } from '../components/common/StatusBadge';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#f97316', '#8b5cf6', '#10b981'];

const computeDoerStats = (tasks: Task[]) => {
  const map = new Map<string, { name: string; total: number; pending: number; progress: number; completed: number }>();
  tasks.forEach(t => {
    (t.doer ? t.doer.split(/[,/]/).map(d => d.trim()).filter(Boolean) : ['Unassigned']).forEach(name => {
      if (!map.has(name)) map.set(name, { name, total: 0, pending: 0, progress: 0, completed: 0 });
      const s = map.get(name)!;
      s.total++;
      if (t.status === 'Pending') s.pending++;
      else if (t.status === 'Complete 100%') s.completed++;
      else s.progress++;
    });
  });
  return Array.from(map.values()).map(s => ({ ...s, pct: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0 })).sort((a, b) => b.total - a.total);
};

const Tt = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', color: '#f1f5f9', padding: '8px 12px', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
      {label && <p style={{ color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>{label}</p>}
      {payload.map((p: any, i: number) => <p key={i} style={{ color: p.color ?? '#60a5fa' }}>{p.name}: <b>{p.value}</b></p>)}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, canViewTask } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (s = false) => {
    s ? setRefreshing(true) : setLoading(true);
    try {
      const r = await taskService.getInitialData();
      setTasks(r.tasks);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      s ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const userTasks = useMemo(() => {
    if (isAdmin) return tasks;
    return tasks.filter(t => canViewTask(t.doer));
  }, [tasks, isAdmin, canViewTask]);

  const kpi = useMemo(() => computeDashboard(userTasks), [userTasks]);
  const doerStats = useMemo(() => computeDoerStats(userTasks), [userTasks]);
  const pct = kpi.total > 0 ? Math.round((kpi.completed / kpi.total) * 100) : 0;
  const pendingInPipeline = kpi.pending + kpi.prog25 + kpi.prog50 + kpi.prog75;

  const recent = userTasks.slice(0, 5);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTopColor: '#047857', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>Loading Action Tracker…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>

      {/* ── TOP HERO BANNER (MATCHING SCREENSHOT) ───────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
          borderRadius: 16,
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 4px 20px rgba(4, 120, 87, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.4px', margin: 0 }}>
            Action Tracker System
          </h1>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'background 0.15s',
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? 'Syncing...' : 'Syncing...'}</span>
          </button>

          <button
            onClick={() => navigate('/tasks')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 10,
              background: '#ffffff',
              color: '#047857',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
          >
            <PlusCircle size={16} color="#047857" />
            <span>New Action Task</span>
          </button>

          <button
            onClick={() => navigate('/reports')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {/* ── 4 STATUS & STAGE KPI CARDS (MATCHING SCREENSHOT) ───────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        
        {/* Card 1: VERIFICATION / PENDING (Amber Stripe) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e8ecf0',
            borderTop: '4px solid #f59e0b',
            padding: '20px 22px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              PENDING / NEW
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 6 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PENDING</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#b45309', marginTop: 2 }}>{kpi.pending}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STAGE 25%</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#047857', marginTop: 2 }}>{kpi.prog25}</div>
            </div>
          </div>
        </div>

        {/* Card 2: IN PROGRESS 50% (Blue Stripe) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e8ecf0',
            borderTop: '4px solid #3b82f6',
            padding: '20px 22px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              IN PROGRESS
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 6 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STAGE 50%</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#c2410c', marginTop: 2 }}>{kpi.prog50}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIVE</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#047857', marginTop: 2 }}>{kpi.prog25 + kpi.prog50 + kpi.prog75}</div>
            </div>
          </div>
        </div>

        {/* Card 3: 75% IN REVIEW (Purple Stripe) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e8ecf0',
            borderTop: '4px solid #8b5cf6',
            padding: '20px 22px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              REVIEW & SLA
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <PauseCircle size={16} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 6 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STAGE 75%</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#6d28d9', marginTop: 2 }}>{kpi.prog75}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TARGET TAT</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#047857', marginTop: 6 }}>2.5 Days</div>
            </div>
          </div>
        </div>

        {/* Card 4: COMPLETED 100% (Emerald Green Stripe) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e8ecf0',
            borderTop: '4px solid #10b981',
            padding: '20px 22px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              COMPLETED (100%)
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 6 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DONE</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#047857', marginTop: 2 }}>{kpi.completed}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RATING</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginTop: 8 }}>⭐⭐⭐⭐⭐</div>
            </div>
          </div>
        </div>

      </div>

      {/* ── OVERVIEW & PIPELINE DISTRIBUTION ROW (MATCHING SCREENSHOT) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Card Left: Action Performance Overview */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e8ecf0',
            padding: '22px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857' }}>
                <Target size={16} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Performance Overview</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Real-time Total</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Box 1: Total Completed */}
            <div
              style={{
                padding: '16px',
                borderRadius: 12,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                TOTAL COMPLETED
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#047857', marginTop: 4 }}>
                {kpi.completed}
              </div>
              <div style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 500 }}>
                {pct}% success rate
              </div>
            </div>

            {/* Box 2: Pending in Pipeline */}
            <div
              style={{
                padding: '16px',
                borderRadius: 12,
                background: '#fffbeb',
                border: '1px solid #fde68a',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                PENDING IN PIPELINE
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#b45309', marginTop: 4 }}>
                {pendingInPipeline}
              </div>
              <div style={{ fontSize: 11, color: '#d97706', marginTop: 4, fontWeight: 500 }}>
                active department tasks
              </div>
            </div>
          </div>
        </div>

        {/* Card Right: Workflow Pipeline Distribution */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e8ecf0',
            padding: '22px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857' }}>
                <Layers size={16} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Workflow Pipeline Distribution</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{kpi.total} Total Tasks</span>
          </div>

          {/* Multi-segment Progress Pipeline Bar */}
          <div style={{ height: 12, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', display: 'flex', marginBottom: 20 }}>
            {kpi.total > 0 ? (
              <>
                <div style={{ width: `${(kpi.pending / kpi.total) * 100}%`, background: '#f59e0b' }} title={`Pending: ${kpi.pending}`} />
                <div style={{ width: `${(kpi.prog25 / kpi.total) * 100}%`, background: '#3b82f6' }} title={`Prog 25%: ${kpi.prog25}`} />
                <div style={{ width: `${(kpi.prog50 / kpi.total) * 100}%`, background: '#f97316' }} title={`Prog 50%: ${kpi.prog50}`} />
                <div style={{ width: `${(kpi.prog75 / kpi.total) * 100}%`, background: '#8b5cf6' }} title={`Prog 75%: ${kpi.prog75}`} />
                <div style={{ width: `${(kpi.completed / kpi.total) * 100}%`, background: '#10b981' }} title={`Completed: ${kpi.completed}`} />
              </>
            ) : (
              <div style={{ width: '100%', background: '#e2e8f0' }} />
            )}
          </div>

          {/* Pipeline Legend Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, fontWeight: 600, color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <span>Pending ({kpi.pending})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
              <span>Prog 25% ({kpi.prog25})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
              <span>Prog 50% ({kpi.prog50})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
              <span>Prog 75% ({kpi.prog75})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <span>Done ({kpi.completed})</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── BOTTOM DOER & RECENT ACTIVITY ROW ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        
        {/* Doer Performance */}
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e8ecf0', padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857' }}>
              <Users size={15} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Doer Performance Breakdown</span>
          </div>
          {doerStats.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13 }}>No assignees</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {doerStats.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>{d.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{d.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#047857' }}>{d.pct}% Complete</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${d.pct}%`, background: 'linear-gradient(90deg, #10b981, #047857)', borderRadius: 99, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                      <span>{d.total} total</span>
                      <span style={{ color: '#d97706' }}>{d.pending} pending</span>
                      <span style={{ color: '#059669' }}>{d.completed} completed</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent HR Tasks */}
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e8ecf0', padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Recent Action Tasks</span>
            <Link to="/tasks" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#047857', textDecoration: 'none' }}>
              View all <ArrowUpRight size={13} />
            </Link>
          </div>
          {recent.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13 }}>No tasks recorded yet</p> : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recent.map(t => (
                <div key={t.sno} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#047857', flexShrink: 0 }}>#{t.sno}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.problem}</p>
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{t.doer || 'Unassigned'}</p>
                  </div>
                  <StatusBadge status={t.status} className="flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

