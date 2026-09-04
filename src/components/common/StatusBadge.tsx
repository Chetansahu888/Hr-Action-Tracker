import React from 'react';

export interface StatusConfig {
  label: string;
  bg: string;
  color: string;
  border: string;
  dot: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  'Pending': {
    label: 'Pending',
    bg: '#f8fafc',
    color: '#475569',
    border: '#e2e8f0',
    dot: '#94a3b8'
  },
  'Progress 25%': {
    label: 'Progress 25%',
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
    dot: '#f59e0b'
  },
  'Progress 50%': {
    label: 'Progress 50%',
    bg: '#fff7ed',
    color: '#c2410c',
    border: '#fed7aa',
    dot: '#f97316'
  },
  'Progress 75%': {
    label: 'Progress 75%',
    bg: '#f5f3ff',
    color: '#6d28d9',
    border: '#ddd6fe',
    dot: '#8b5cf6'
  },
  'Complete 100%': {
    label: 'Complete 100%',
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0',
    dot: '#10b981'
  },
};

export const getStatusConfig = (status: string): StatusConfig =>
  STATUS_CONFIG[status] ?? {
    label: status,
    bg: '#f8fafc',
    color: '#475569',
    border: '#e2e8f0',
    dot: '#94a3b8'
  };

interface StatusBadgeProps {
  status: string;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const cfg = getStatusConfig(status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: cfg.dot,
          display: 'inline-block',
          flexShrink: 0
        }}
      />
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
