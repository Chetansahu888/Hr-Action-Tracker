export type TaskStatus = 'Pending' | 'Progress 25%' | 'Progress 50%' | 'Progress 75%' | 'Complete 100%';

export interface Task {
  rowIndex: number;
  sno: number;
  planned: string; // ISO date-time string: Task Assigned / Given Date (Col A)
  actual: string;  // ISO date-time string: Actual Completion Date & Time (Col B)
  problem: string; // Problem / Task description (Col D)
  assignedBy?: string; // Name of person who assigned the task (Col E)
  doer: string;    // Name of Doer (Col F)
  expectedDate?: string; // ISO date-time string for Assigner Target Expected Date & Time (Col G)
  committedDate?: string; // ISO date-time string for Doer Committed Due Date & Time (Col H)
  dueDate?: string; // Optional alias for committed due date & time
  status: TaskStatus; // Status (Col I)
  review: string;  // Weekly Review SLA rating (Col J)
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
  modifiedBy?: string; // Logged-in user who made the change
  action: 'CREATED' | 'EDITED' | 'STATUS_CHANGED' | 'DELETED';
  timestamp: string;
  changes: AuditChange[];
}

