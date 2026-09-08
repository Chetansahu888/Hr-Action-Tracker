import { formatDateTimeFormulaSafe } from '../lib/utils';
import type { Task, TaskStatus, TaskAuditLog, AuditChange, DashboardData } from '../types/task';


const STORAGE_KEY = 'hr_tasks_storage';
const STORAGE_AUDIT_KEY = 'hr_audit_logs_v2';
const RETENTION_DAYS = 30;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const calculateReview = (
  dueDateTime: string,
  actualCompletionTime: string,
  expectedDateTime?: string
): string => {
  if (!actualCompletionTime) return '';
  try {
    const actualTime = new Date(actualCompletionTime).getTime();
    if (isNaN(actualTime)) return '';

    const expectedTime = expectedDateTime ? new Date(expectedDateTime).getTime() : NaN;
    const dueTime = dueDateTime ? new Date(dueDateTime).getTime() : NaN;

    // 1. If completed on or before Expected Date & Time
    if (!isNaN(expectedTime) && actualTime <= expectedTime) {
      return '⭐⭐⭐⭐⭐ Excellent (On Expected Time)';
    }

    // 2. If completed on or before Due Date & Time (after expected date or if expected date not set)
    if (!isNaN(dueTime) && actualTime <= dueTime) {
      return '⭐⭐⭐⭐⭐ Excellent (On Time)';
    }

    // Reference deadline for calculating delay
    const refDeadline = !isNaN(dueTime) ? dueTime : expectedTime;
    if (isNaN(refDeadline)) return '⭐⭐⭐⭐⭐ Excellent (On Time)';

    // Calculate delay in days past Due Date
    const delayDays = (actualTime - refDeadline) / (1000 * 60 * 60 * 24);

    if (delayDays <= 1.0) return '⭐⭐⭐⭐ Very Good (Minor Delay)';
    if (delayDays <= 3.0) return '⭐⭐⭐ Good (Delayed)';
    if (delayDays <= 7.0) return '⭐⭐ Needs Improvement (Late)';
    return '⭐ Poor (Overdue)';
  } catch {
    return '⭐⭐⭐⭐ Very Good';
  }
};

export const getTaskDueStatus = (dueDateTime: string, status: TaskStatus): {
  isOverdue: boolean;
  text: string;
  color: string;
  bg: string;
} => {
  if (status === 'Complete 100%') {
    return { isOverdue: false, text: 'Completed', color: '#059669', bg: '#ecfdf5' };
  }
  if (!dueDateTime) {
    return { isOverdue: false, text: 'No Deadline', color: '#64748b', bg: '#f1f5f9' };
  }
  try {
    const now = Date.now();
    const due = new Date(dueDateTime).getTime();
    if (isNaN(due)) return { isOverdue: false, text: 'No Deadline', color: '#64748b', bg: '#f1f5f9' };

    const diffMs = due - now;
    if (diffMs < 0) {
      const overdueDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      const overdueHours = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const label = overdueDays > 0 ? `${overdueDays}d overdue` : `${overdueHours}h overdue`;
      return { isOverdue: true, text: `⚠️ Overdue (${label})`, color: '#dc2626', bg: '#fef2f2' };
    }

    const remDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const remHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const label = remDays > 0 ? `${remDays}d left` : `${remHours}h left`;
    return { isOverdue: false, text: `Due in ${label}`, color: '#059669', bg: '#ecfdf5' };
  } catch {
    return { isOverdue: false, text: 'Active', color: '#059669', bg: '#ecfdf5' };
  }
};

const INITIAL_TASKS: Task[] = [
  {
    rowIndex: 2,
    sno: 1,
    planned: formatDateTimeFormulaSafe(new Date(Date.now() - 6 * 86400000)),
    expectedDate: formatDateTimeFormulaSafe(new Date(Date.now() - 5 * 86400000)),
    committedDate: formatDateTimeFormulaSafe(new Date(Date.now() - 4 * 86400000)),
    dueDate: formatDateTimeFormulaSafe(new Date(Date.now() - 4 * 86400000)),
    actual: formatDateTimeFormulaSafe(new Date(Date.now() - 4 * 86400000)),
    problem: 'Process Monthly Attendance and Leave Reconciliation for Production Unit',
    doer: 'Bhupendra',
    assignedBy: 'Management',
    status: 'Complete 100%',
    review: '⭐⭐⭐⭐⭐ Excellent (On Time)',
  },
  {
    rowIndex: 3,
    sno: 2,
    planned: formatDateTimeFormulaSafe(new Date(Date.now() - 5 * 86400000)),
    expectedDate: formatDateTimeFormulaSafe(new Date(Date.now() - 3 * 86400000)),
    committedDate: formatDateTimeFormulaSafe(new Date(Date.now() - 2 * 86400000)),
    dueDate: formatDateTimeFormulaSafe(new Date(Date.now() - 2 * 86400000)),
    actual: '',
    problem: 'Conduct Background Verification for 12 newly joined Warehouse Associates',
    doer: 'Deepak',
    assignedBy: 'HR Head',
    status: 'Progress 75%',
    review: '',
  },
  {
    rowIndex: 4,
    sno: 3,
    planned: formatDateTimeFormulaSafe(new Date(Date.now() - 4 * 86400000)),
    expectedDate: formatDateTimeFormulaSafe(new Date(Date.now() - 2 * 86400000)),
    committedDate: formatDateTimeFormulaSafe(new Date(Date.now() - 1 * 86400000)),
    dueDate: formatDateTimeFormulaSafe(new Date(Date.now() - 1 * 86400000)),
    actual: '',
    problem: 'Coordinate Annual Statutory Compliance Audit with external auditor',
    doer: 'MD Alaudin',
    assignedBy: 'Director',
    status: 'Progress 50%',
    review: '',
  },
  {
    rowIndex: 5,
    sno: 4,
    planned: formatDateTimeFormulaSafe(new Date(Date.now() - 3 * 86400000)),
    expectedDate: formatDateTimeFormulaSafe(new Date(Date.now() + 1 * 86400000)),
    committedDate: formatDateTimeFormulaSafe(new Date(Date.now() + 2 * 86400000)),
    dueDate: formatDateTimeFormulaSafe(new Date(Date.now() + 2 * 86400000)),
    actual: '',
    problem: 'Prepare Employee ESIC & PF monthly remittance challan report',
    doer: 'Deepak',
    assignedBy: 'Admin',
    status: 'Pending',
    review: '',
  },
  {
    rowIndex: 6,
    sno: 5,
    planned: formatDateTimeFormulaSafe(new Date(Date.now() - 2 * 86400000)),
    expectedDate: formatDateTimeFormulaSafe(new Date(Date.now() + 2 * 86400000)),
    committedDate: formatDateTimeFormulaSafe(new Date(Date.now() + 3 * 86400000)),
    dueDate: formatDateTimeFormulaSafe(new Date(Date.now() + 3 * 86400000)),
    actual: '',
    problem: 'Schedule Second Round Technical Interviews for Senior DevOps Engineer position',
    doer: 'Bhupendra, Deepak',
    assignedBy: 'HOD',
    status: 'Progress 25%',
    review: '',
  },
];

const INITIAL_AUDIT_LOGS: TaskAuditLog[] = [];

const isGAS = typeof window !== 'undefined' && Boolean((window as any).google?.script?.run);

const filterRetentionLogs = (logs: TaskAuditLog[]): TaskAuditLog[] => {
  const thirtyDaysAgo = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return logs.filter(log => {
    try {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= thirtyDaysAgo;
    } catch {
      return true;
    }
  });
};

const getStoredTasks = (): Task[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return [...INITIAL_TASKS];
};

const saveStoredTasks = (tasks: Task[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) { /* ignore */ }
};

const getStoredAuditLogs = (): TaskAuditLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_AUDIT_KEY);
    if (raw) {
      const parsed: TaskAuditLog[] = JSON.parse(raw);
      const filtered = parsed.filter(l => !l.id?.startsWith('log-init-'));
      return filterRetentionLogs(filtered);
    }
  } catch (e) { /* ignore */ }
  return [];
};

const saveStoredAuditLogs = (logs: TaskAuditLog[]) => {
  try {
    const cleaned = filterRetentionLogs(logs);
    localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(cleaned));
  } catch (e) { /* ignore */ }
};

let mockTasks = getStoredTasks();
let mockAuditLogs = getStoredAuditLogs();

const logAudit = (
  taskSno: number,
  problem: string,
  doer: string,
  action: 'CREATED' | 'EDITED' | 'STATUS_CHANGED' | 'DELETED',
  changes: AuditChange[],
  modifiedBy?: string
) => {
  const newEntry: TaskAuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    taskSno,
    problem,
    doer: doer || '',
    modifiedBy: modifiedBy || 'Admin',
    action,
    timestamp: new Date().toISOString(),
    changes,
  };
  mockAuditLogs = filterRetentionLogs([newEntry, ...mockAuditLogs]);
  saveStoredAuditLogs(mockAuditLogs);
};

const GAS_API_STORAGE_KEY = 'hr_gas_web_app_url';
export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwPBNIsaFci80unGI0gUhCY0p06DAvMksOZFAvhy5koPOGcRUfKGYxO0UGeH-mQVsEn/exec';

export const getGasApiUrl = (): string => {
  try {
    const fromStorage = localStorage.getItem(GAS_API_STORAGE_KEY);
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  } catch { /* ignore */ }
  const fromEnv = (import.meta as any).env?.VITE_GAS_API_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  return DEFAULT_GAS_URL;
};

export const setGasApiUrl = (url: string): void => {
  try {
    if (url && url.trim()) {
      localStorage.setItem(GAS_API_STORAGE_KEY, url.trim());
    } else {
      localStorage.removeItem(GAS_API_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('hr-gas-api-url-changed', { detail: { url } }));
  } catch { /* ignore */ }
};

const callGasApi = async <T = any>(action: string, payload: any = {}): Promise<T> => {
  const apiUrl = getGasApiUrl();
  if (!apiUrl) throw new Error('No Web App API URL configured');

  const res = await fetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data as T;
};

export const computeDashboard = (tasks: Task[]): DashboardData => {
  return tasks.reduce(
    (acc, t) => {
      acc.total++;
      if (t.status === 'Pending') acc.pending++;
      else if (t.status === 'Progress 25%') acc.prog25++;
      else if (t.status === 'Progress 50%') acc.prog50++;
      else if (t.status === 'Progress 75%') acc.prog75++;
      else if (t.status === 'Complete 100%') acc.completed++;
      return acc;
    },
    { total: 0, pending: 0, prog25: 0, prog50: 0, prog75: 0, completed: 0 }
  );
};

const gasCall = <T>(fn: string, ...args: any[]): Promise<T> =>
  new Promise((resolve, reject) =>
    (window as any).google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      [fn](...args)
  );

export const isGasConfigured = (): boolean => {
  return isGAS || Boolean(getGasApiUrl());
};

export const taskService = {
  getGasApiUrl,
  setGasApiUrl,
  isGasConfigured,

  syncAllLocalTasksToGas: async (): Promise<{ success: boolean; count: number; message: string }> => {
    const apiUrl = getGasApiUrl();
    if (!apiUrl && !isGAS) {
      throw new Error('Google Sheet Web App URL is not set. Please paste your URL in Settings.');
    }
    const localTasks = getStoredTasks();
    if (localTasks.length === 0) {
      return { success: true, count: 0, message: 'No local tasks found to sync.' };
    }
    let successCount = 0;
    for (const t of [...localTasks].reverse()) {
      try {
        if (isGAS) {
          await gasCall('addTask', t);
        } else {
          await callGasApi('addTask', { task: t });
        }
        successCount++;
      } catch (err) {
        console.error('Failed to sync task to sheet:', t, err);
      }
    }
    return {
      success: true,
      count: successCount,
      message: `Successfully synced ${successCount} tasks directly to your Google Sheet!`,
    };
  },

  testConnection: async (url?: string): Promise<{ success: boolean; message: string; sheetName?: string }> => {
    const targetUrl = (url || getGasApiUrl()).trim();
    if (!targetUrl) {
      throw new Error('Please enter a Google Apps Script Web App URL');
    }
    const res = await fetch(targetUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'ping' }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return data;
  },

  getInitialData: async (): Promise<{ tasks: Task[]; dashboard: DashboardData }> => {
    // 1. If running inside Google Sheets HTML Dialog/Sidebar
    if (isGAS) {
      try {
        const res = await gasCall<{ tasks: Task[]; dashboard: DashboardData }>('getInitialData');
        if (res && Array.isArray(res.tasks)) {
          mockTasks = res.tasks;
          saveStoredTasks(res.tasks);
          return { tasks: res.tasks, dashboard: res.dashboard || computeDashboard(res.tasks) };
        }
      } catch (err) {
        console.warn('getInitialData GAS error/fallback:', err);
      }
    }

    // 2. If configured with Google Apps Script Web App API URL
    const apiUrl = getGasApiUrl();
    if (apiUrl) {
      try {
        const res = await callGasApi<{ success: boolean; tasks: Task[]; dashboard?: DashboardData }>('getInitialData');
        if (res && res.success && Array.isArray(res.tasks)) {
          mockTasks = res.tasks;
          saveStoredTasks(res.tasks);
          return { tasks: res.tasks, dashboard: res.dashboard || computeDashboard(res.tasks) };
        }
      } catch (err) {
        console.warn('getInitialData Web App API fetch failed, falling back to local storage:', err);
      }
    }

    // 3. Standalone / Mock fallback
    await delay(200);
    const tasks = [...mockTasks].reverse();
    return { tasks, dashboard: computeDashboard(mockTasks) };
  },

  getTasks: async (): Promise<Task[]> => {
    if (isGAS) {
      try {
        const tasks = await gasCall<Task[]>('getTasks');
        if (Array.isArray(tasks)) {
          mockTasks = tasks;
          saveStoredTasks(tasks);
          return tasks;
        }
      } catch (err) {
        console.warn('getTasks GAS error/fallback:', err);
      }
    }

    const apiUrl = getGasApiUrl();
    if (apiUrl) {
      try {
        const res = await callGasApi<{ success: boolean; tasks: Task[] }>('getTasks');
        if (res && res.success && Array.isArray(res.tasks)) {
          mockTasks = res.tasks;
          saveStoredTasks(res.tasks);
          return res.tasks;
        }
      } catch (err) {
        console.warn('getTasks Web App API fetch failed, falling back to local storage:', err);
      }
    }

    await delay(150);
    return [...mockTasks].reverse();
  },

  getAuditLogs: async (): Promise<TaskAuditLog[]> => {
    let serverLogs: TaskAuditLog[] = [];
    if (isGAS) {
      try {
        const logs = await gasCall<TaskAuditLog[]>('getAuditLogs');
        if (Array.isArray(logs)) serverLogs = logs;
      } catch (err) {
        console.warn('getAuditLogs GAS error/fallback:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        const res = await callGasApi<{ success: boolean; auditLogs: TaskAuditLog[] }>('getAuditLogs');
        if (res && res.success && Array.isArray(res.auditLogs)) {
          serverLogs = res.auditLogs;
        }
      } catch (err) {
        console.warn('getAuditLogs Web App API fetch failed:', err);
      }
    }
    const localLogs = getStoredAuditLogs();
    const mergedMap = new Map<string, TaskAuditLog>();
    serverLogs.forEach(l => mergedMap.set(l.id, l));
    localLogs.forEach(l => {
      if (!mergedMap.has(l.id)) mergedMap.set(l.id, l);
    });
    const combined = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const filtered = filterRetentionLogs(combined);
    mockAuditLogs = filtered;
    saveStoredAuditLogs(filtered);
    return [...filtered];
  },

  deleteAuditLog: async (logId: string): Promise<{ success: boolean }> => {
    if (isGAS) {
      try {
        await gasCall('deleteAuditLog', logId);
      } catch (err) {
        console.warn('deleteAuditLog GAS fallback:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('deleteAuditLog', { logId });
      } catch (err) {
        console.warn('deleteAuditLog Web App API error:', err);
      }
    }
    await delay(100);
    mockAuditLogs = mockAuditLogs.filter(l => l.id !== logId);
    saveStoredAuditLogs(mockAuditLogs);
    return { success: true };
  },

  clearAllAuditLogs: async (): Promise<{ success: boolean }> => {
    if (isGAS) {
      try {
        await gasCall('clearAllAuditLogs');
      } catch (err) {
        console.warn('clearAllAuditLogs GAS fallback:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('clearAllAuditLogs');
      } catch (err) {
        console.warn('clearAllAuditLogs Web App API error:', err);
      }
    }
    await delay(150);
    mockAuditLogs = [];
    saveStoredAuditLogs([]);
    return { success: true };
  },

  getAllowHistoryDeletion: (): boolean => {
    try {
      return localStorage.getItem('hr_allow_history_deletion') === 'true';
    } catch {
      return false;
    }
  },

  setAllowHistoryDeletion: (enabled: boolean): void => {
    try {
      localStorage.setItem('hr_allow_history_deletion', enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('hr-history-deletion-changed', { detail: { enabled } }));
    } catch { /* ignore */ }
  },

  addTask: async (task: Partial<Task>, modifiedBy?: string): Promise<{ success: boolean; sno: number }> => {
    let nextSno = mockTasks.length > 0 ? Math.max(...mockTasks.map(t => t.sno)) + 1 : 1;

    const planned = task.planned ? formatDateTimeFormulaSafe(task.planned) : formatDateTimeFormulaSafe(new Date());
    const expectedDate = task.expectedDate ? formatDateTimeFormulaSafe(task.expectedDate) : '';
    const committedDate = task.committedDate ? formatDateTimeFormulaSafe(task.committedDate) : (task.dueDate ? formatDateTimeFormulaSafe(task.dueDate) : planned);
    const assignedBy = task.assignedBy || 'Management';
    const doer = task.doer || '';
    const status = task.status || 'Pending';
    const userStr = modifiedBy || assignedBy || 'Admin';

    if (isGAS) {
      try {
        const res = await gasCall<{ success: boolean; sno: number }>('addTask', {
          ...task,
          planned,
          expectedDate,
          committedDate,
          assignedBy,
          doer,
          status,
          modifiedBy: userStr,
        });
        if (res && res.sno) nextSno = res.sno;
      } catch (err) {
        console.warn('addTask GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        const res = await callGasApi<{ success: boolean; sno: number }>('addTask', {
          task: {
            ...task,
            planned,
            expectedDate,
            committedDate,
            assignedBy,
            doer,
            status,
            modifiedBy: userStr,
          }
        });
        if (res && res.sno) nextSno = res.sno;
      } catch (err) {
        console.warn('addTask Web App API error:', err);
      }
    } else {
      await delay(300);
    }

    const newTask: Task = {
      rowIndex: mockTasks.length + 2,
      sno: nextSno,
      planned,
      actual: '',
      problem: task.problem || '',
      assignedBy,
      doer,
      expectedDate,
      committedDate,
      dueDate: committedDate,
      status,
      review: '',
    };
    if (newTask.status === 'Complete 100%') {
      newTask.actual = formatDateTimeFormulaSafe(new Date());
      newTask.review = calculateReview(committedDate || planned, newTask.actual, expectedDate);
    }
    mockTasks = [newTask, ...mockTasks.filter(t => t.sno !== nextSno)];
    saveStoredTasks(mockTasks);

    return { success: true, sno: nextSno };
  },

  updateTask: async (task: Task, modifiedBy?: string): Promise<{ success: boolean }> => {
    const index = mockTasks.findIndex(t => t.sno === task.sno);
    const existing = index !== -1 ? mockTasks[index] : undefined;
    const old = existing || mockTasks.find(t => t.sno === task.sno);
    const userStr = modifiedBy || 'Admin';

    const changes: AuditChange[] = [];
    if (old) {
      if (old.problem !== task.problem) {
        changes.push({
          field: 'problem',
          fieldLabel: 'Problem Statement',
          oldValue: old.problem || '—',
          newValue: task.problem || '—',
        });
      }
      if (old.doer !== task.doer) {
        changes.push({
          field: 'doer',
          fieldLabel: 'Name of Doer',
          oldValue: old.doer || 'Unassigned',
          newValue: task.doer || 'Unassigned',
        });
      }
      if (old.assignedBy !== task.assignedBy) {
        changes.push({
          field: 'assignedBy',
          fieldLabel: 'Assign By',
          oldValue: old.assignedBy || '—',
          newValue: task.assignedBy || '—',
        });
      }
      if (old.status !== task.status) {
        changes.push({
          field: 'status',
          fieldLabel: 'Status',
          oldValue: old.status,
          newValue: task.status,
        });
      }
      if (task.expectedDate && old.expectedDate !== task.expectedDate) {
        changes.push({
          field: 'expectedDate',
          fieldLabel: 'Expected Target Date',
          oldValue: old.expectedDate || '—',
          newValue: task.expectedDate,
        });
      }
      if (task.committedDate && old.committedDate !== task.committedDate) {
        changes.push({
          field: 'committedDate',
          fieldLabel: 'Committed Due Date',
          oldValue: old.committedDate || '—',
          newValue: task.committedDate,
        });
      }
    }

    if (changes.length > 0) {
      logAudit(task.sno, task.problem, task.doer || '', 'EDITED', changes, userStr);
    }

    const payloadTask: Task = {
      ...task,
      planned: task.planned ? formatDateTimeFormulaSafe(task.planned) : (existing?.planned || formatDateTimeFormulaSafe(new Date())),
      expectedDate: task.expectedDate ? formatDateTimeFormulaSafe(task.expectedDate) : '',
      committedDate: task.committedDate ? formatDateTimeFormulaSafe(task.committedDate) : (task.dueDate ? formatDateTimeFormulaSafe(task.dueDate) : ''),
    };


    if (isGAS) {
      try {
        await gasCall('updateTask', payloadTask, userStr);
      } catch (err) {
        console.warn('updateTask GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('updateTask', { task: { ...payloadTask, modifiedBy: userStr } });
      } catch (err) {
        console.warn('updateTask Web App API error:', err);
      }
    } else {
      await delay(300);
    }

    if (index !== -1 && existing) {
      const updated: Task = { ...existing, ...payloadTask };

      const deadline = updated.committedDate || updated.dueDate || updated.planned;
      if (existing.status !== 'Complete 100%' && task.status === 'Complete 100%') {
        updated.actual = formatDateTimeFormulaSafe(new Date());
        updated.review = calculateReview(deadline, updated.actual, updated.expectedDate);
      } else if (existing.status === 'Complete 100%' && task.status !== 'Complete 100%') {
        updated.actual = '';
        updated.review = '';
      }
      mockTasks[index] = updated;
      saveStoredTasks(mockTasks);
    }


    return { success: true };
  },

  updateStatus: async (sno: number, status: TaskStatus, modifiedBy?: string): Promise<{ success: boolean }> => {
    const existing = mockTasks.find(t => t.sno === sno);
    const oldStatus = existing?.status || 'Pending';
    const problem = existing?.problem || `Task #${sno}`;
    const doer = existing?.doer || '';
    const userStr = modifiedBy || 'User';

    const changes: AuditChange[] = [
      { field: 'status', fieldLabel: 'Status', oldValue: oldStatus, newValue: status }
    ];

    if (oldStatus !== 'Complete 100%' && status === 'Complete 100%') {
      const deadline = existing?.committedDate || existing?.dueDate || existing?.planned || formatDateTimeFormulaSafe(new Date());
      const actual = formatDateTimeFormulaSafe(new Date());
      const review = calculateReview(deadline, actual, existing?.expectedDate);
      changes.push({
        field: 'actual',
        fieldLabel: 'Actual Completion',
        oldValue: '—',
        newValue: 'Completed on Time',
      });
      changes.push({
        field: 'review',
        fieldLabel: 'Weekly Review',
        oldValue: existing?.review || '—',
        newValue: review,
      });
    } else if (oldStatus === 'Complete 100%' && status !== 'Complete 100%') {
      changes.push({
        field: 'review',
        fieldLabel: 'Weekly Review',
        oldValue: existing?.review || '—',
        newValue: 'Cleared (Reverted)',
      });
    }

    logAudit(sno, problem, doer, 'STATUS_CHANGED', changes, userStr);

    if (isGAS) {
      try {
        await gasCall('updateStatus', sno, status, userStr);
      } catch (err) {
        console.warn('updateStatus GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('updateStatus', { sno, status, modifiedBy: userStr });
      } catch (err) {
        console.warn('updateStatus Web App API error:', err);
      }
    } else {
      await delay(200);
    }

    const index = mockTasks.findIndex(t => t.sno === sno);
    if (index !== -1) {
      const updated = { ...mockTasks[index], status };
      const deadline = updated.committedDate || updated.dueDate || updated.planned;
      if (oldStatus !== 'Complete 100%' && status === 'Complete 100%') {
        updated.actual = formatDateTimeFormulaSafe(new Date());
        updated.review = calculateReview(deadline, updated.actual, updated.expectedDate);
      } else if (oldStatus === 'Complete 100%' && status !== 'Complete 100%') {
        updated.actual = '';
        updated.review = '';
      }
      mockTasks[index] = updated;
      saveStoredTasks(mockTasks);
    }

    return { success: true };
  },

  deleteTask: async (sno: number, modifiedBy?: string): Promise<{ success: boolean }> => {
    const taskToDelete = mockTasks.find(t => t.sno === sno);
    const problem = taskToDelete?.problem || `Task #${sno}`;
    const doer = taskToDelete?.doer || '';
    const userStr = modifiedBy || 'Admin';

    logAudit(sno, problem, doer, 'DELETED', [
      { field: 'task', fieldLabel: 'Task Removed', oldValue: problem, newValue: 'Deleted' }
    ], userStr);

    if (isGAS) {
      try {
        await gasCall('deleteTask', sno, userStr);
      } catch (err) {
        console.warn('deleteTask GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('deleteTask', { sno, modifiedBy: userStr });
      } catch (err) {
        console.warn('deleteTask Web App API error:', err);
      }
    } else {
      await delay(250);
    }

    mockTasks = mockTasks.filter(t => t.sno !== sno);
    saveStoredTasks(mockTasks);

    return { success: true };
  },

  clearAuditLogs: async (): Promise<{ success: boolean }> => {
    mockAuditLogs = [];
    saveStoredAuditLogs([]);
    return { success: true };
  },

  getAssigners: async (): Promise<string[]> => {
    const DEFAULT_ASSIGNERS = ['Management', 'Director', 'HOD', 'HR Head', 'Admin', 'MD Alaudin', 'Bhupendra', 'Deepak'];
    const MASTER_KEY = 'hr_master_assigners_cache';

    if (isGAS) {
      try {
        const res = await gasCall<{ success: boolean; assigners: string[] }>('getMasterData');
        if (res?.assigners && Array.isArray(res.assigners) && res.assigners.length > 0) {
          localStorage.setItem(MASTER_KEY, JSON.stringify(res.assigners));
          return res.assigners;
        }
      } catch (err) {
        console.warn('getAssigners GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        const res = await callGasApi<{ success: boolean; assigners: string[] }>('getMasterData');
        if (res?.assigners && Array.isArray(res.assigners) && res.assigners.length > 0) {
          localStorage.setItem(MASTER_KEY, JSON.stringify(res.assigners));
          return res.assigners;
        }
      } catch (err) {
        console.warn('getAssigners Web App API error:', err);
      }
    }

    try {
      const cached = localStorage.getItem(MASTER_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }

    return DEFAULT_ASSIGNERS;
  },

  saveMasterAssigners: (assigners: string[]): void => {
    try {
      localStorage.setItem('hr_master_assigners_cache', JSON.stringify(assigners));
    } catch { /* ignore */ }
  },

  getUsers: async (): Promise<any[]> => {
    if (isGAS) {
      try {
        const res = await gasCall<{ success: boolean; users: any[] }>('getUsers');
        if (res?.users && Array.isArray(res.users) && res.users.length > 0) return res.users;
      } catch (err) {
        console.warn('getUsers GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        const res = await callGasApi<{ success: boolean; users: any[] }>('getUsers');
        if (res?.users && Array.isArray(res.users) && res.users.length > 0) return res.users;
      } catch (err) {
        console.warn('getUsers Web App API error:', err);
      }
    }
    return [];
  },

  saveUser: async (user: any): Promise<{ success: boolean }> => {
    if (isGAS) {
      try {
        await gasCall('saveUser', user);
      } catch (err) {
        console.warn('saveUser GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('saveUser', { user });
      } catch (err) {
        console.warn('saveUser Web App API error:', err);
      }
    }
    return { success: true };
  },

  deleteUser: async (userId: string): Promise<{ success: boolean }> => {
    if (isGAS) {
      try {
        await gasCall('deleteUser', userId);
      } catch (err) {
        console.warn('deleteUser GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('deleteUser', { userId });
      } catch (err) {
        console.warn('deleteUser Web App API error:', err);
      }
    }
    return { success: true };
  },

  syncUsers: async (users: any[]): Promise<{ success: boolean }> => {
    if (isGAS) {
      try {
        await gasCall('syncUsers', users);
      } catch (err) {
        console.warn('syncUsers GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('syncUsers', { users });
      } catch (err) {
        console.warn('syncUsers Web App API error:', err);
      }
    }
    return { success: true };
  }
};
