import React, { useState } from 'react';
import { X, Loader2, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
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

export const TaskModal: React.FC<TaskModalProps> = ({ title, task, doerOptions, onClose, onSave }) => {
  const [problem, setProblem] = useState(task?.problem || '');
  const [doer, setDoer] = useState<string[]>(
    task?.doer ? task.doer.split(/[,/]/).map(d => d.trim()).filter(Boolean) : []
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) {
      toast.error('Please enter a problem or task description');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...(task || {}),
        problem: problem.trim(),
        doer: doer.join(', '),
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
          maxWidth: 520,
          backgroundColor: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.2)',
          position: 'relative',
          overflow: 'visible',
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
          }}
        >
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
              {task ? `Editing Task #${task.sno}` : 'Create a new action item for HR Department'}
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

          {/* Problem / Task input */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
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
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Assign Doers (with custom MultiSelect) */}
          <div style={{ position: 'relative', zIndex: 50 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Assign Doer(s)
            </label>
            <MultiSelect
              options={doerOptions}
              selected={doer}
              onChange={setDoer}
              placeholder="Select registered HR person(s)..."
            />
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>
              Assign one or more registered HR team members. (To create new users, go to Settings &gt; Administration).
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
            <Sparkles size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
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
                padding: '9px 20px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
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
