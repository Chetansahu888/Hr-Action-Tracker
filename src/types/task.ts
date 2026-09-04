export type TaskStatus = 'Pending' | 'Progress 25%' | 'Progress 50%' | 'Progress 75%' | 'Complete 100%';

export interface Task {
  rowIndex: number;
  sno: number;
  planned: string; // ISO date-time string (Planned / Due Date & Time)
  actual: string;  // ISO date-time string (Actual Completion Date & Time)
  problem: string;
  doer: string;
  status: TaskStatus;
  review: string;
  dueDate?: string; // Optional alias for planned due date & time
  expectedDate?: string; // ISO date-time string for Assigner Target Expected Date & Time
}

export interface DashboardData {
  total: number;
  pending: number;
  prog25: number;
  prog50: number;
  prog75: number;
  completed: number;
}

export type SortField = 'sno' | 'status' | 'doer' | 'planned';
export type SortDir = 'asc' | 'desc';

export interface AuditChange {
  field: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
}

export interface TaskAuditLog {
  id: string;
  taskSno: number;
  problem: string;
  doer?: string;
  action: 'CREATED' | 'EDITED' | 'STATUS_CHANGED' | 'DELETED';
  timestamp: string;
  changes: AuditChange[];
}
