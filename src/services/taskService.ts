import type { Task, TaskStatus, TaskAuditLog, AuditChange, DashboardData } from '../types/task';

const STORAGE_KEY = 'hr_tasks_storage';
const STORAGE_AUDIT_KEY = 'hr_audit_logs_v2';
const RETENTION_DAYS = 30;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const calculateReview = (plannedDate: string, actualDate: string): string => {
  if (!plannedDate || !actualDate) return '';
  const diffDays = Math.abs(new Date(actualDate).getTime() - new Date(plannedDate).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 2.5) return '⭐⭐⭐⭐⭐ Excellent';
  if (diffDays <= 5) return '⭐⭐⭐⭐ Very Good';
  if (diffDays <= 7) return '⭐⭐⭐ Good';
  if (diffDays <= 10) return '⭐⭐ Needs Improvement';
  return '⭐ Poor';
};

const INITIAL_TASKS: Task[] = [
  {
    rowIndex: 2,
    sno: 1,
    planned: new Date(Date.now() - 6 * 86400000).toISOString(),
    actual: new Date(Date.now() - 4 * 86400000).toISOString(),
    problem: 'Process Monthly Attendance and Leave Reconciliation for Production Unit',
    doer: 'Bhupendra',
    status: 'Complete 100%',
    review: '⭐⭐⭐⭐⭐ Excellent',
  },
  {
    rowIndex: 3,
    sno: 2,
    planned: new Date(Date.now() - 5 * 86400000).toISOString(),
    actual: '',
    problem: 'Conduct Background Verification for 12 newly joined Warehouse Associates',
    doer: 'Deepak',
    status: 'Progress 75%',
    review: '',
  },
  {
    rowIndex: 4,
    sno: 3,
    planned: new Date(Date.now() - 4 * 86400000).toISOString(),
    actual: '',
    problem: 'Coordinate Annual Statutory Compliance Audit with external auditor',
    doer: 'MD Alaudin',
    status: 'Progress 50%',
    review: '',
  },
  {
    rowIndex: 5,
    sno: 4,
    planned: new Date(Date.now() - 3 * 86400000).toISOString(),
    actual: '',
    problem: 'Prepare Employee ESIC & PF monthly remittance challan report',
    doer: 'Deepak',
    status: 'Pending',
    review: '',
  },
  {
    rowIndex: 6,
    sno: 5,
    planned: new Date(Date.now() - 2 * 86400000).toISOString(),
    actual: '',
    problem: 'Schedule Second Round Technical Interviews for Senior DevOps Engineer position',
    doer: 'Bhupendra, Deepak',
    status: 'Progress 25%',
    review: '',
  },
];

const INITIAL_AUDIT_LOGS: TaskAuditLog[] = [
  {
    id: 'log-init-1',
    taskSno: 1,
    problem: 'Process Monthly Attendance and Leave Reconciliation for Production Unit',
    doer: 'Bhupendra',
    action: 'STATUS_CHANGED',
    timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
    changes: [
      { field: 'status', fieldLabel: 'Status', oldValue: 'Progress 75%', newValue: 'Complete 100%' },
      { field: 'actual', fieldLabel: 'Actual Completion', oldValue: '—', newValue: 'Completed on Time' },
      { field: 'review', fieldLabel: 'Weekly Review', oldValue: '—', newValue: '⭐⭐⭐⭐⭐ Excellent' }
    ]
  },
  {
    id: 'log-init-2',
    taskSno: 2,
    problem: 'Conduct Background Verification for 12 newly joined Warehouse Associates',
    doer: 'Deepak',
    action: 'STATUS_CHANGED',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    changes: [
      { field: 'status', fieldLabel: 'Status', oldValue: 'Progress 50%', newValue: 'Progress 75%' }
    ]
  },
  {
    id: 'log-init-3',
    taskSno: 5,
    problem: 'Schedule Second Round Technical Interviews for Senior DevOps Engineer position',
    doer: 'Bhupendra, Deepak',
    action: 'CREATED',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    changes: [
      { field: 'problem', fieldLabel: 'Task Problem', oldValue: '—', newValue: 'Schedule Second Round Technical Interviews for Senior DevOps Engineer position' },
      { field: 'doer', fieldLabel: 'Assigned Doer(s)', oldValue: '—', newValue: 'Bhupendra, Deepak' },
      { field: 'status', fieldLabel: 'Initial Status', oldValue: '—', newValue: 'Progress 25%' }
    ]
  },
];

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
      return filterRetentionLogs(parsed);
    }
  } catch (e) { /* ignore */ }
  return filterRetentionLogs([...INITIAL_AUDIT_LOGS]);
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
  changes: AuditChange[]
) => {
  const newEntry: TaskAuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    taskSno,
    problem,
    doer: doer || '',
    action,
    timestamp: new Date().toISOString(),
    changes,
  };
  mockAuditLogs = filterRetentionLogs([newEntry, ...mockAuditLogs]);
  saveStoredAuditLogs(mockAuditLogs);
};

const GAS_API_STORAGE_KEY = 'hr_gas_web_app_url';

export const getGasApiUrl = (): string => {
  try {
    const fromStorage = localStorage.getItem(GAS_API_STORAGE_KEY);
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  } catch { /* ignore */ }
  const fromEnv = (import.meta as any).env?.VITE_GAS_API_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  return '';
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

export const taskService = {
  getGasApiUrl,
  setGasApiUrl,

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

  addTask: async (task: Partial<Task>): Promise<{ success: boolean; sno: number }> => {
    let nextSno = mockTasks.length > 0 ? Math.max(...mockTasks.map(t => t.sno)) + 1 : 1;

    if (isGAS) {
      try {
        const res = await gasCall<{ success: boolean; sno: number }>('addTask', task);
        if (res && res.sno) nextSno = res.sno;
      } catch (err) {
        console.warn('addTask GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        const res = await callGasApi<{ success: boolean; sno: number }>('addTask', { task });
        if (res && res.sno) nextSno = res.sno;
      } catch (err) {
        console.warn('addTask Web App API error:', err);
      }
    } else {
      await delay(300);
    }

    const planned = new Date().toISOString();
    const newTask: Task = {
      rowIndex: mockTasks.length + 2,
      sno: nextSno,
      planned,
      actual: '',
      problem: task.problem || '',
      doer: task.doer || '',
      status: task.status || 'Pending',
      review: '',
    };
    if (newTask.status === 'Complete 100%') {
      newTask.actual = new Date().toISOString();
      newTask.review = calculateReview(planned, newTask.actual);
    }
    mockTasks = [newTask, ...mockTasks.filter(t => t.sno !== nextSno)];
    saveStoredTasks(mockTasks);

    // Audit log
    logAudit(nextSno, newTask.problem, newTask.doer, 'CREATED', [
      { field: 'problem', fieldLabel: 'Task Problem', oldValue: '—', newValue: newTask.problem },
      { field: 'doer', fieldLabel: 'Assigned Doer(s)', oldValue: '—', newValue: newTask.doer || 'Unassigned' },
      { field: 'status', fieldLabel: 'Initial Status', oldValue: '—', newValue: newTask.status },
    ]);

    return { success: true, sno: nextSno };
  },

  updateTask: async (task: Task): Promise<{ success: boolean }> => {
    const old = mockTasks.find(t => t.sno === task.sno);

    // Compute diffs
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
          fieldLabel: 'Name of Doer(s)',
          oldValue: old.doer || 'Unassigned',
          newValue: task.doer || 'Unassigned',
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
    } else {
      changes.push({
        field: 'problem',
        fieldLabel: 'Problem Statement',
        oldValue: 'Previous task',
        newValue: task.problem || '—',
      });
      changes.push({
        field: 'status',
        fieldLabel: 'Status',
        oldValue: 'Pending',
        newValue: task.status || 'Pending',
      });
    }

    if (changes.length > 0) {
      logAudit(task.sno, task.problem, task.doer, 'EDITED', changes);
    }

    if (isGAS) {
      try {
        await gasCall('updateTask', task);
      } catch (err) {
        console.warn('updateTask GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('updateTask', { task });
      } catch (err) {
        console.warn('updateTask Web App API error:', err);
      }
    } else {
      await delay(300);
    }

    const index = mockTasks.findIndex(t => t.sno === task.sno);
    if (index !== -1) {
      const existing = mockTasks[index];
      const updated: Task = { ...existing, ...task };
      if (existing.status !== 'Complete 100%' && task.status === 'Complete 100%') {
        updated.actual = new Date().toISOString();
        updated.review = calculateReview(updated.planned, updated.actual);
      } else if (existing.status === 'Complete 100%' && task.status !== 'Complete 100%') {
        updated.actual = '';
        updated.review = '';
      }
      mockTasks[index] = updated;
      saveStoredTasks(mockTasks);
    }

    return { success: true };
  },

  updateStatus: async (sno: number, status: TaskStatus): Promise<{ success: boolean }> => {
    const existing = mockTasks.find(t => t.sno === sno);
    const oldStatus = existing?.status || 'Pending';
    const problem = existing?.problem || `Task #${sno}`;
    const doer = existing?.doer || '';

    const changes: AuditChange[] = [
      { field: 'status', fieldLabel: 'Status', oldValue: oldStatus, newValue: status }
    ];

    if (oldStatus !== 'Complete 100%' && status === 'Complete 100%') {
      const planned = existing?.planned || new Date().toISOString();
      const actual = new Date().toISOString();
      const review = calculateReview(planned, actual);
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

    logAudit(sno, problem, doer, 'STATUS_CHANGED', changes);

    if (isGAS) {
      try {
        await gasCall('updateStatus', sno, status);
      } catch (err) {
        console.warn('updateStatus GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('updateStatus', { sno, status });
      } catch (err) {
        console.warn('updateStatus Web App API error:', err);
      }
    } else {
      await delay(200);
    }

    const index = mockTasks.findIndex(t => t.sno === sno);
    if (index !== -1) {
      const updated = { ...mockTasks[index], status };
      if (oldStatus !== 'Complete 100%' && status === 'Complete 100%') {
        updated.actual = new Date().toISOString();
        updated.review = calculateReview(updated.planned, updated.actual);
      } else if (oldStatus === 'Complete 100%' && status !== 'Complete 100%') {
        updated.actual = '';
        updated.review = '';
      }
      mockTasks[index] = updated;
      saveStoredTasks(mockTasks);
    }

    return { success: true };
  },

  deleteTask: async (sno: number): Promise<{ success: boolean }> => {
    const taskToDelete = mockTasks.find(t => t.sno === sno);
    const problem = taskToDelete?.problem || `Task #${sno}`;
    const doer = taskToDelete?.doer || '';

    logAudit(sno, problem, doer, 'DELETED', [
      { field: 'task', fieldLabel: 'Task Removed', oldValue: problem, newValue: 'Deleted' }
    ]);

    if (isGAS) {
      try {
        await gasCall('deleteTask', sno);
      } catch (err) {
        console.warn('deleteTask GAS error:', err);
      }
    } else if (getGasApiUrl()) {
      try {
        await callGasApi('deleteTask', { sno });
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
  }
};
