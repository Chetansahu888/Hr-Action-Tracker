import React, { useState } from 'react';
import { X, Loader2, Plus, Sparkles, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import type { Task, TaskStatus } from '../../types/task';
import { MultiSelect } from '../common/MultiSelect';
import { toast } from 'sonner';

interface TaskModalProps {
  title: string;
  task?: Task;
  doerOptions: string[];
  onClose: () => void;
  onSave: (task: Partial<Task>) => Promise<void>;
}

const toLocalDatetimeInput = (iso?: string, fallbackDays = 2.5): string => {
  if (!iso) {
    const d = new Date(Date.now() + fallbackDays * 86400000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      const fallback = new Date(Date.now() + fallbackDays * 86400000);
      return new Date(fallback.getTime() - fallback.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  } catch {
    const fallback = new Date(Date.now() + fallbackDays * 86400000);
    return new Date(fallback.getTime() - fallback.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
};

export const TaskModal: React.FC<TaskModalProps> = ({ title, task, doerOptions, onClose, onSave }) => {
  const [problem, setProblem] = useState(task?.problem || '');
  const [doer, setDoer] = useState<string[]>(
    task?.doer ? task.doer.split(/[,/]/).map(d => d.trim()).filter(Boolean) : []
  );
  const [expectedDateTime, setExpectedDateTime] = useState<string>(
    toLocalDatetimeInput(task?.expectedDate || task?.planned, 2.5)
  );
  const [dueDateTime, setDueDateTime] = useState<string>(
    toLocalDatetimeInput(task?.planned, 3.0)
  );
  const [saving, setSaving] = useState(false);

  const applyExpectedPreset = (daysFromNow: number, setHour = 18, setMinute = 0) => {
    const target = new Date(Date.now() + daysFromNow * 86400000);
    if (setHour !== undefined) {
      target.setHours(setHour, setMinute, 0, 0);
    }
    const val = new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setExpectedDateTime(val);
  };

  const applyDuePreset = (daysFromNow: number, setHour = 18, setMinute = 0) => {
    const target = new Date(Date.now() + daysFromNow * 86400000);
    if (setHour !== undefined) {
      target.setHours(setHour, setMinute, 0, 0);
    }
    const val = new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setDueDateTime(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) {
      toast.error('Please enter a problem or task description');
      return;
    }
    if (!expectedDateTime) {
      toast.error('Please set an Expected Date & Time');
      return;
    }
    if (!dueDateTime) {
      toast.error('Please set a Committed Due Date & Time');
      return;
    }

    setSaving(true);
    try {
      const plannedIso = new Date(dueDateTime).toISOString();
      const expectedIso = new Date(expectedDateTime).toISOString();
      await onSave({
        ...(task || {}),
        problem: problem.trim(),
        doer: doer.join(', '),
        planned: plannedIso,
        dueDate: plannedIso,
        expectedDate: expectedIso,
        status: task?.status || 'Pending',
      });
    } catch {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.2)',
          position: 'relative',
          overflowY: 'auto',
          animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e8ecf0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            borderRadius: '20px 20px 0 0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
              {task ? `Editing Task #${task.sno}` : 'Create a new action item with Expected & Due Date SLA targets'}
            </p>
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* S.No. (Readonly for edit) */}
          {task?.sno && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Task Identifier (S.No.)
              </label>
              <input
                type="text"
                disabled
                value={`#${task.sno}`}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'not-allowed',
                }}
              />
            </div>
          )}

          {/* Problem / Task Description input */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Problem / Task Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              required
              rows={3}
              value={problem}
              onChange={e => setProblem(e.target.value)}
              placeholder="e.g. Conduct Q3 HR compliance audit & onboarding checklist..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontFamily: 'inherit',
                color: '#0f172a',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#047857';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(4,120,87,0.15)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* ── 1. Expected Date & Time (Assigner Target) ── */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} color="#16a34a" />
                Expected Target Date &amp; Time (Task Assigner) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '2px 8px', borderRadius: 6 }}>
                ⭐⭐⭐⭐⭐ On Expected Time
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#166534', margin: '0 0 8px', lineHeight: 1.4 }}>
              Task assign karne wale ke according ideal time (e.g. standard 2.5 din SLA target).
            </p>

            <input
              type="datetime-local"
              required
              value={expectedDateTime}
              onChange={e => setExpectedDateTime(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid #86efac',
                fontSize: 13,
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                background: '#ffffff',
              }}
            />

            {/* Quick Presets for Expected Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>Presets:</span>
              {[
                { label: '+2.5 Days (SLA)', action: () => applyExpectedPreset(2.5, 18, 0) },
                { label: 'Today (6 PM)', action: () => applyExpectedPreset(0, 18, 0) },
                { label: 'Tomorrow (6 PM)', action: () => applyExpectedPreset(1, 18, 0) },
                { label: '+3 Days', action: () => applyExpectedPreset(3, 18, 0) },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={p.action}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#ffffff',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 2. Committed Due Date & Time (Deadline) ── */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="#047857" />
                Committed Due Date &amp; Time (Deadline) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <span style={{ fontSize: 11, color: '#047857', fontWeight: 700, background: '#ecfdf5', padding: '2px 8px', borderRadius: 6 }}>
                ⭐⭐⭐⭐⭐ On Time
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px', lineHeight: 1.4 }}>
              Assigned person ke according committed date & time jab tak complete hona compulsory hai.
            </p>

            <input
              type="datetime-local"
              required
              value={dueDateTime}
              onChange={e => setDueDateTime(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                background: '#ffffff',
              }}
            />

            {/* Quick Presets for Due Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Presets:</span>
              {[
                { label: 'Same as Expected', action: () => setDueDateTime(expectedDateTime) },
                { label: '+3 Days (6 PM)', action: () => applyDuePreset(3, 18, 0) },
                { label: '+5 Days (6 PM)', action: () => applyDuePreset(5, 18, 0) },
                { label: '+1 Week', action: () => applyDuePreset(7, 18, 0) },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={p.action}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* SLA Rating Evaluation Matrix Guide */}
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              📊 Weekly Review Star Rating Rules
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: '#713f12' }}>
              <div>• <b>Within Expected Date:</b> ⭐⭐⭐⭐⭐ (On Expected Time)</div>
              <div>• <b>Within Due Date:</b> ⭐⭐⭐⭐⭐ (On Time)</div>
              <div>• <b>Delay ≤ 1 Day:</b> ⭐⭐⭐⭐ (Minor Delay)</div>
              <div>• <b>Delay ≤ 3 Days:</b> ⭐⭐⭐ (Delayed)</div>
              <div>• <b>Delay ≤ 7 Days:</b> ⭐⭐ (Needs Improvement)</div>
              <div>• <b>Delay &gt; 7 Days:</b> ⭐ (Poor / Overdue)</div>
            </div>
          </div>

          {/* Assign Doers (with custom MultiSelect) */}
          <div style={{ position: 'relative', zIndex: 50 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Assign Doer(s)
            </label>
            <MultiSelect
              options={doerOptions}
              selected={doer}
              onChange={setDoer}
              placeholder="Select registered HR person(s)..."
            />
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>
              Assign one or more registered HR team members.
            </p>
          </div>

          {/* Informational SLA badge */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <Sparkles size={16} color="#047857" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
              <strong>Table-Operated Workflow:</strong> Task initial status is set to <b>Pending</b>. You can update the live progress (25%, 50%, 75%, 100%) anytime directly from the Tasks table dropdown.
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 6, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
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
              disabled={saving}
              style={{
                padding: '9px 22px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                background: '#047857',
                border: 'none',
                boxShadow: '0 4px 14px rgba(4,120,87,0.3)',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                  Saving...
                </>
              ) : task ? (
                'Save Changes'
              ) : (
                <>
                  <Plus size={15} />
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
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

export default TaskModal;
