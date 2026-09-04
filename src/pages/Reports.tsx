import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { taskService, computeDashboard } from '../services/taskService';
import type { Task, DashboardData } from '../types/task';
import {
  Loader2, RefreshCw, TrendingUp, Users, Award, Star, CheckCircle2,
  Trophy, Medal, Sparkles, Check, Clock, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';

const PIE_COLORS = ['#94a3b8', '#f59e0b', '#f97316', '#818cf8', '#10b981'];

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e8ecf0',
  padding: '20px 22px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

export interface DoerRatingStat {
  name: string;
  total: number;
  completed: number;
  pending: number;
  progress: number;
  pct: number;
  onExpectedCount: number;
  onTimeCount: number;
  minorDelayCount: number;
  delayedCount: number;
  ratingCount: number;
  totalStars: number;
  avgRating: number;
  slaAdherencePct: number;
  rank?: number;
}

const getRatingScore = (review: string): number | null => {
  if (!review) return null;
  if (review.includes('⭐⭐⭐⭐⭐')) return 5;
  if (review.includes('⭐⭐⭐⭐')) return 4;
  if (review.includes('⭐⭐⭐')) return 3;
  if (review.includes('⭐⭐')) return 2;
  if (review.includes('⭐')) return 1;
  return null;
};

const computeDoerRatingStats = (tasks: Task[]): DoerRatingStat[] => {
  const map = new Map<string, {
    name: string;
    total: number;
    completed: number;
    pending: number;
    progress: number;
    onExpectedCount: number;
    onTimeCount: number;
    minorDelayCount: number;
    delayedCount: number;
    ratingCount: number;
    totalStars: number;
  }>();

  tasks.forEach(t => {
    const names = t.doer ? t.doer.split(/[,/]/).map(d => d.trim()).filter(Boolean) : ['Unassigned'];
    names.forEach(name => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          total: 0,
          completed: 0,
          pending: 0,
          progress: 0,
          onExpectedCount: 0,
          onTimeCount: 0,
          minorDelayCount: 0,
          delayedCount: 0,
          ratingCount: 0,
          totalStars: 0,
        });
      }
      const s = map.get(name)!;
      s.total++;
      if (t.status === 'Pending') s.pending++;
      else if (t.status === 'Complete 100%') {
        s.completed++;
        if (t.review) {
          const score = getRatingScore(t.review);
          if (score !== null) {
            s.ratingCount++;
            s.totalStars += score;
          }
          if (t.review.includes('On Expected Time')) s.onExpectedCount++;
          else if (t.review.includes('On Time')) s.onTimeCount++;
          else if (t.review.includes('Minor Delay')) s.minorDelayCount++;
          else s.delayedCount++;
        }
      } else {
        s.progress++;
      }
    });
  });

  const list: DoerRatingStat[] = Array.from(map.values()).map(s => {
    const avgRating = s.ratingCount > 0 ? Number((s.totalStars / s.ratingCount).toFixed(1)) : 0;
    const onTimeTotal = s.onExpectedCount + s.onTimeCount;
    const slaAdherencePct = s.completed > 0 ? Math.round((onTimeTotal / s.completed) * 100) : 0;
    const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
    return {
      ...s,
      pct,
      avgRating,
      slaAdherencePct,
    };
  });

  // Sort primarily by avgRating descending, then completed count descending
  list.sort((a, b) => {
    if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
    if (b.completed !== a.completed) return b.completed - a.completed;
    return b.total - a.total;
  });

  list.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return list;
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
  const doerStats = useMemo(() => computeDoerRatingStats(tasks), [tasks]);
  const completionPct = kpi.total > 0 ? Math.round((kpi.completed / kpi.total) * 100) : 0;
  const inProgressTotal = kpi.prog25 + kpi.prog50 + kpi.prog75;

  const top3Doers = useMemo(() => doerStats.slice(0, 3), [doerStats]);

  const [leaderboardSort, setLeaderboardSort] = useState<'rating' | 'completed' | 'sla'>('rating');

  const sortedDoerStats = useMemo(() => {
    const list = [...doerStats];
    if (leaderboardSort === 'rating') {
      list.sort((a, b) => (b.avgRating !== a.avgRating ? b.avgRating - a.avgRating : b.completed - a.completed));
    } else if (leaderboardSort === 'completed') {
      list.sort((a, b) => b.completed - a.completed);
    } else if (leaderboardSort === 'sla') {
      list.sort((a, b) => b.slaAdherencePct - a.slaAdherencePct);
    }
    return list;
  }, [doerStats, leaderboardSort]);

  const pieData = useMemo(() => [
    { name: 'Pending',      value: kpi.pending },
    { name: 'Progress 25%', value: kpi.prog25 },
    { name: 'Progress 50%', value: kpi.prog50 },
    { name: 'Progress 75%', value: kpi.prog75 },
    { name: 'Completed',    value: kpi.completed },
  ].filter(d => d.value > 0), [kpi]);

  const reviewDist = useMemo(() => {
    const m: Record<string, number> = {
      'On Expected Time': 0,
      'On Time': 0,
      'Minor Delay': 0,
      'Delayed': 0,
      'Needs Improvement': 0,
      'Poor': 0
    };
    tasks.forEach(t => {
      if (!t.review) return;
      if (t.review.includes('On Expected Time')) m['On Expected Time']++;
      else if (t.review.includes('On Time')) m['On Time']++;
      else if (t.review.includes('Minor Delay')) m['Minor Delay']++;
      else if (t.review.includes('Delayed')) m['Delayed']++;
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
        <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTopColor: '#047857', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Loading HR analytics &amp; rating benchmarks…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            HR Performance &amp; SLA Rating Reports
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Weekly review star ratings, doer rankings, and turnaround time efficiency.
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

      {/* Top Performers Spotlight Podium */}
      {top3Doers.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)', borderRadius: 18, padding: '22px 24px', color: '#ffffff', boxShadow: '0 10px 28px rgba(4,120,87,0.18)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={20} color="#facc15" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>Top Performing HR Doers</div>
                <div style={{ fontSize: 12, color: '#a7f3d0' }}>Ranked by Weekly Review SLA Star Ratings &amp; On-Time Delivery</div>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, background: '#facc15', color: '#713f12', padding: '4px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🌟 SLA Performance Leaders
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {top3Doers.map((doer, idx) => {
              const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
              const rankBg = idx === 0 ? 'rgba(250, 204, 21, 0.15)' : idx === 1 ? 'rgba(226, 232, 240, 0.15)' : 'rgba(251, 146, 60, 0.15)';
              const rankBorder = idx === 0 ? '#facc15' : idx === 1 ? '#cbd5e1' : '#fb923c';

              return (
                <div
                  key={doer.name}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: `1.5px solid ${rankBorder}`,
                    borderRadius: 14,
                    padding: '16px 18px',
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{rankIcon}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: doer.avgRating >= 4.5 ? '#10b981' : '#3b82f6',
                        color: '#ffffff',
                      }}
                    >
                      {doer.avgRating > 0 ? `${doer.avgRating} ★ Rating` : 'New'}
                    </span>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>
                    {doer.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#a7f3d0', marginBottom: 12 }}>
                    <b>{doer.completed}</b> completed tasks ({doer.slaAdherencePct}% on-time SLA)
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#e2e8f0', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 8 }}>
                    <Star size={12} color="#facc15" fill="#facc15" />
                    <span><b>{doer.onExpectedCount + doer.onTimeCount}</b> On-Time / <b>{doer.delayedCount}</b> Delayed</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* ── Main Doer Rating & Performance Leaderboard Table ── */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e8ecf0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857' }}>
              <Award size={18} />
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                HR Doer Rating &amp; Performance Ranking
              </span>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Identifies top contributors, star rating quality, and SLA deadline adherence
              </div>
            </div>
          </div>

          {/* Leaderboard Sort Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
            <button
              onClick={() => setLeaderboardSort('rating')}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: leaderboardSort === 'rating' ? '#ffffff' : 'transparent',
                color: leaderboardSort === 'rating' ? '#047857' : '#64748b',
                boxShadow: leaderboardSort === 'rating' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              ⭐ Top Rating
            </button>
            <button
              onClick={() => setLeaderboardSort('completed')}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: leaderboardSort === 'completed' ? '#ffffff' : 'transparent',
                color: leaderboardSort === 'completed' ? '#047857' : '#64748b',
                boxShadow: leaderboardSort === 'completed' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              ✅ Most Completed
            </button>
            <button
              onClick={() => setLeaderboardSort('sla')}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: leaderboardSort === 'sla' ? '#ffffff' : 'transparent',
                color: leaderboardSort === 'sla' ? '#047857' : '#64748b',
                boxShadow: leaderboardSort === 'sla' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              🎯 Highest SLA %
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8ecf0' }}>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', width: 60, textAlign: 'center' }}>Rank</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>HR Person (Doer)</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Performance Rating</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>On Expected (5★)</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>On Time (5★)</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Delayed</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Done / Total</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>SLA Adherence</th>
              </tr>
            </thead>

            <tbody>
              {sortedDoerStats.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 18px', textAlign: 'center', color: '#94a3b8' }}>
                    No doer statistics available
                  </td>
                </tr>
              ) : (
                sortedDoerStats.map((d, i) => {
                  const rankBadge = i === 0 ? '🥇 #1' : i === 1 ? '🥈 #2' : i === 2 ? '🥉 #3' : `#${i + 1}`;
                  const isTop = i === 0;

                  return (
                    <tr
                      key={d.name}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isTop ? '#f0fdf4' : 'transparent',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={e => { if (!isTop) (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={e => { if (!isTop) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      {/* Rank */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 800, color: i < 3 ? '#047857' : '#64748b' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: i === 0 ? '#dcfce7' : i === 1 ? '#f1f5f9' : i === 2 ? '#ffedd5' : '#f8fafc',
                            fontSize: 12,
                          }}
                        >
                          {rankBadge}
                        </span>
                      </td>

                      {/* Doer Name */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: isTop ? '#047857' : '#2563eb',
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isTop ? '0 2px 8px rgba(4,120,87,0.3)' : 'none',
                            }}
                          >
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              {d.name}
                              {isTop && (
                                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                                  TOP PERFORMER
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {d.completed} of {d.total} completed ({d.pct}%)
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Performance Rating */}
                      <td style={{ padding: '14px 18px' }}>
                        {d.avgRating > 0 ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 900, color: '#854d0e' }}>
                                {d.avgRating}
                              </span>
                              <div style={{ display: 'flex', gap: 2 }}>
                                {[1, 2, 3, 4, 5].map(starNum => (
                                  <Star
                                    key={starNum}
                                    size={13}
                                    color="#facc15"
                                    fill={starNum <= Math.round(d.avgRating) ? '#facc15' : 'none'}
                                  />
                                ))}
                              </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#a16207', marginTop: 2 }}>
                              From {d.ratingCount} rated task{d.ratingCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>No completed tasks</span>
                        )}
                      </td>

                      {/* On Expected */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: 12 }}>
                          {d.onExpectedCount}
                        </span>
                      </td>

                      {/* On Time */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, background: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: 12 }}>
                          {d.onTimeCount}
                        </span>
                      </td>

                      {/* Delayed */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, background: d.delayedCount > 0 ? '#fef2f2' : '#f8fafc', color: d.delayedCount > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                          {d.delayedCount + d.minorDelayCount}
                        </span>
                      </td>

                      {/* Done / Total */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                        <span style={{ color: '#059669' }}>{d.completed}</span> / {d.total}
                      </td>

                      {/* SLA Adherence */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 70, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${d.slaAdherencePct}%`,
                                background: d.slaAdherencePct >= 80 ? 'linear-gradient(90deg, #10b981, #047857)' : d.slaAdherencePct >= 50 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : '#ef4444',
                                borderRadius: 99,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: d.slaAdherencePct >= 80 ? '#047857' : '#d97706', minWidth: 36 }}>
                            {d.slaAdherencePct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row */}
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

        {/* Weekly Review Quality Bar */}
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            Weekly Review Rating Quality Distribution
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reviewDist} margin={{ top: 4, right: 4, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Tasks" fill="#047857" radius={[5, 5, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Stacked Workload Chart */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={14} color="#047857" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            HR Personnel Workload &amp; Completion Breakdown
          </span>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={doerBarData} margin={{ top: 4, right: 16, bottom: 4, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Bar dataKey="Completed" stackId="a" fill="#047857" />
            <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Pending" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Reports;
