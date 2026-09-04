import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { taskService, computeDashboard } from '../services/taskService';
import type { Task, DashboardData } from '../types/task';
import { Loader2, RefreshCw, TrendingUp, Users, Award, Star, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const PIE_COLORS = ['#94a3b8', '#f59e0b', '#f97316', '#818cf8', '#10b981'];

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e8ecf0',
  padding: '20px 22px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const computeDoerStats = (tasks: Task[]) => {
  const map = new Map<string, { name: string; total: number; pending: number; progress: number; completed: number }>();
  tasks.forEach(t => {
    const names = t.doer ? t.doer.split(/[,/]/).map(d => d.trim()).filter(Boolean) : ['Unassigned'];
    names.forEach(name => {
      if (!map.has(name)) map.set(name, { name, total: 0, pending: 0, progress: 0, completed: 0 });
      const s = map.get(name)!;
      s.total++;
      if (t.status === 'Pending') s.pending++;
      else if (t.status === 'Complete 100%') s.completed++;
      else s.progress++;
    });
  });
  return Array.from(map.values()).map(s => ({
    ...s,
    pct: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', color: '#f1f5f9', padding: '8px 12px', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
      {label && <p style={{ color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? '#60a5fa', margin: '2px 0' }}>
          {p.name}: <b>{p.value}</b>
        </p>
      ))}
    </div>
  );
};

export const Reports: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await taskService.getTasks();
      setTasks(res);
    } catch {
      toast.error('Failed to load report analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const kpi = useMemo(() => computeDashboard(tasks), [tasks]);
  const doerStats = useMemo(() => computeDoerStats(tasks), [tasks]);
  const completionPct = kpi.total > 0 ? Math.round((kpi.completed / kpi.total) * 100) : 0;
  const inProgressTotal = kpi.prog25 + kpi.prog50 + kpi.prog75;

  const pieData = useMemo(() => [
    { name: 'Pending',      value: kpi.pending },
    { name: 'Progress 25%', value: kpi.prog25 },
    { name: 'Progress 50%', value: kpi.prog50 },
    { name: 'Progress 75%', value: kpi.prog75 },
    { name: 'Completed',    value: kpi.completed },
  ].filter(d => d.value > 0), [kpi]);

  const reviewDist = useMemo(() => {
    const m: Record<string, number> = { 'Excellent': 0, 'Very Good': 0, 'Good': 0, 'Needs Improvement': 0, 'Poor': 0 };
    tasks.forEach(t => {
      if (!t.review) return;
      if (t.review.includes('Excellent')) m['Excellent']++;
      else if (t.review.includes('Very Good')) m['Very Good']++;
      else if (t.review.includes('Good')) m['Good']++;
      else if (t.review.includes('Needs Improvement')) m['Needs Improvement']++;
      else if (t.review.includes('Poor')) m['Poor']++;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const doerBarData = useMemo(() =>
    doerStats.map(d => ({
      name: d.name,
      Completed: d.completed,
      'In Progress': d.progress,
      Pending: d.pending,
    })),
    [doerStats]
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Loading HR analytics…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            HR Analytics & Reports
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Performance benchmarks, workload distribution, and completion trends.
          </p>
        </div>

        <button
          onClick={() => load(true)}
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

      {/* Executive Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        
        <div style={{ ...cardStyle, borderColor: '#bfdbfe' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Total HR Tasks
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#2563eb', lineHeight: 1 }}>{kpi.total}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Across all department doers</div>
        </div>

        <div style={{ ...cardStyle, borderColor: '#a7f3d0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Completed Tasks
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#059669', lineHeight: 1 }}>{kpi.completed}</div>
          <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 6 }}>{completionPct}% completion rate</div>
        </div>

        <div style={{ ...cardStyle, borderColor: '#ddd6fe' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Active in Progress
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#7c3aed', lineHeight: 1 }}>{inProgressTotal}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>25%, 50%, 75% milestones</div>
        </div>

        <div style={{ ...cardStyle, borderColor: '#e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Pending Queue
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#475569', lineHeight: 1 }}>{kpi.pending}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Waiting for action</div>
        </div>

      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        
        {/* Donut */}
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            Task Status Breakdown
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Review Bar */}
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            Weekly Review Rating Quality
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reviewDist} margin={{ top: 4, right: 4, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Tasks" fill="#818cf8" radius={[5, 5, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Stacked Workload Chart */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={14} color="#2563eb" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            HR Personnel Workload & Completion Breakdown
          </span>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={doerBarData} margin={{ top: 4, right: 16, bottom: 4, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Bar dataKey="Completed" stackId="a" fill="#10b981" />
            <Bar dataKey="In Progress" stackId="a" fill="#818cf8" />
            <Bar dataKey="Pending" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leaderboard Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8ecf0', display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc' }}>
          <Award size={16} color="#d97706" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            HR Doer Performance Summary
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8ecf0' }}>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Doer Name</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Total</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Pending</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>In Progress</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Done</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Completion Rate</th>
              </tr>
            </thead>

            <tbody>
              {doerStats.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px 18px', textAlign: 'center', color: '#94a3b8' }}>
                    No doer statistics available
                  </td>
                </tr>
              ) : (
                doerStats.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{d.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{d.total}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'center', color: '#64748b' }}>{d.pending}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'center', color: '#7c3aed', fontWeight: 600 }}>{d.progress}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'center', color: '#059669', fontWeight: 700 }}>{d.completed}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${d.pct}%`, background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', minWidth: 32 }}>{d.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Reports;
