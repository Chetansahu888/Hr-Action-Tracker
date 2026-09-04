/**
 * =========================================================================
 * HR Action Tracker — Google Apps Script Production Backend (JavaScript / .gs)
 * Tab Name: "Action Tracker HR Department"
 * Master Tab: "Master" (Column A for Assign By list)
 * =========================================================================
 */

const SHEET_NAME = 'Action Tracker HR Department';
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_HERE';

// Standard Column Indices (Default 9-column schema)
const COL = {
  PLANNED: 1,     // Col A: Planned / Due Date
  ACTUAL: 2,      // Col B: Actual Completion Date & Time
  SNO: 3,         // Col C: S.No.
  PROBLEM: 4,     // Col D: Problem / Task
  ASSIGNED_BY: 5, // Col E: Assign By (Task Giver)
  DOER: 6,        // Col F: Name Of Doer
  STATUS: 7,      // Col G: Status
  REVIEW: 8,      // Col H: Weekly Review
  EXPECTED: 9     // Col I: Expected Date
};

/**
 * Serves pure JSON REST API for GET requests (No HTML file required)
 */
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = params.action || 'getInitialData';
  return handleApiRequest_(action, params);
}

/**
 * Handles POST API requests from React Standalone/Web Client
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || (e && e.parameter && e.parameter.action);
    return handleApiRequest_(action, payload);
  } catch (err) {
    return jsonResponse_({ success: false, error: err.toString() });
  }
}

/**
 * Central API router for Web App requests
 */
function handleApiRequest_(action, params) {
  try {
    switch (action) {
      case 'ping':
      case 'test':
        return jsonResponse_({
          success: true,
          message: 'Google Apps Script API Connected successfully!',
          sheetName: SHEET_NAME,
          timestamp: new Date().toISOString()
        });

      case 'getInitialData':
        return jsonResponse_({
          success: true,
          tasks: getTasks(),
          dashboard: dashboardData(),
          assigners: getMasterAssigners_()
        });

      case 'getMasterData':
      case 'getAssigners':
        return jsonResponse_({
          success: true,
          assigners: getMasterAssigners_()
        });

      case 'getTasks':
        return jsonResponse_({
          success: true,
          tasks: getTasks()
        });

      case 'getAuditLogs':
        return jsonResponse_({
          success: true,
          auditLogs: getAuditLogs()
        });

      case 'getDashboard':
        return jsonResponse_({
          success: true,
          dashboard: dashboardData()
        });

      case 'addTask': {
        const taskData = params.task || params;
        const res = addTask(taskData);
        return jsonResponse_(res);
      }

      case 'updateTask': {
        const taskData = params.task || params;
        const res = updateTask(taskData);
        return jsonResponse_(res);
      }

      case 'updateStatus': {
        const sno = Number(params.sno);
        const status = params.status;
        const res = updateStatus(sno, status);
        return jsonResponse_(res);
      }

      case 'deleteTask': {
        const sno = Number(params.sno);
        const res = deleteTask(sno);
        return jsonResponse_(res);
      }

      case 'deleteAuditLog': {
        const logId = params.logId;
        const res = deleteAuditLog(logId);
        return jsonResponse_(res);
      }

      case 'clearAllAuditLogs': {
        const res = clearAllAuditLogs();
        return jsonResponse_(res);
      }

      default:
        return jsonResponse_({ success: false, error: 'Unknown API action: ' + action });
    }
  } catch (err) {
    return jsonResponse_({ success: false, error: err.toString() });
  }
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Returns the target Google Sheet, creating it if it doesn't exist
 */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    initSheetHeader_(sheet);
  }
  return sheet;
}

/**
 * Initializes Sheet Header formatting matching user's layout:
 * Col A: Planned / Due Date
 * Col B: Actual
 * Col C: S.No.
 * Col D: Problem / Task
 * Col E: Assign By
 * Col F: Name Of Doer
 * Col G: Status
 * Col H: Weekly Review
 * Col I: Expected Date
 */
function initSheetHeader_(sheet) {
  const headers = [
    ['Planned / Due Date', 'Actual', 'S.No.', 'Problem / Task', 'Assign By', 'Name Of Doer', 'Status', 'Weekly Review', 'Expected Date']
  ];
  sheet.getRange(1, 1, 1, 9).setValues(headers)
    .setBackground('#0d1b2e')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontFamily('Arial')
    .setHorizontalAlignment('center');
  
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150); // Planned / Due Date
  sheet.setColumnWidth(2, 140); // Actual
  sheet.setColumnWidth(3, 70);  // S.No.
  sheet.setColumnWidth(4, 340); // Problem
  sheet.setColumnWidth(5, 160); // Assign By (Col E)
  sheet.setColumnWidth(6, 180); // Name Of Doer (Col F)
  sheet.setColumnWidth(7, 140); // Status (Col G)
  sheet.setColumnWidth(8, 210); // Weekly Review (Col H)
  sheet.setColumnWidth(9, 150); // Expected Date (Col I)
}

/**
 * Dynamically resolves column indices based on Row 1 headers
 */
function getColumnMap_(sheet) {
  const map = {
    PLANNED: COL.PLANNED,
    ACTUAL: COL.ACTUAL,
    SNO: COL.SNO,
    PROBLEM: COL.PROBLEM,
    ASSIGNED_BY: COL.ASSIGNED_BY,
    DOER: COL.DOER,
    STATUS: COL.STATUS,
    REVIEW: COL.REVIEW,
    EXPECTED: COL.EXPECTED
  };
  try {
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) return map;
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || '').trim().toLowerCase();
      if (h.includes('planned') || h.includes('due date')) map.PLANNED = i + 1;
      else if (h === 'actual' || h.includes('actual completion')) map.ACTUAL = i + 1;
      else if (h.includes('s.no') || h.includes('sno') || h.includes('sr')) map.SNO = i + 1;
      else if (h.includes('problem') || h.includes('task')) map.PROBLEM = i + 1;
      else if (h.includes('assign by') || h.includes('assigned by') || h.includes('task giver')) map.ASSIGNED_BY = i + 1;
      else if (h.includes('doer') || h.includes('assignee')) map.DOER = i + 1;
      else if (h === 'status' || h.includes('progress')) map.STATUS = i + 1;
      else if (h.includes('review') || h.includes('rating')) map.REVIEW = i + 1;
      else if (h.includes('expected')) map.EXPECTED = i + 1;
    }
  } catch(e) {}
  return map;
}

/**
 * Fetches the list of Assigner names from "Master" sheet Column A
 */
function getMasterAssigners_() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Master') || ss.getSheetByName('master') || ss.getSheetByName('MASTER');
    if (!sheet) {
      const sheets = ss.getSheets();
      for (let s of sheets) {
        if (s.getName().trim().toLowerCase() === 'master') {
          sheet = s;
          break;
        }
      }
    }
    
    if (!sheet) {
      sheet = ss.insertSheet('Master');
      sheet.getRange(1, 1, 9, 1).setValues([
        ['Assign By (Task Assigner)'],
        ['Management'],
        ['Director'],
        ['HOD'],
        ['HR Head'],
        ['Admin'],
        ['MD Alaudin'],
        ['Bhupendra'],
        ['Deepak']
      ]).setBackground('#0d1b2e').setFontColor('#ffffff').setFontWeight('bold');
      sheet.getRange(2, 1, 8, 1).setBackground('#ffffff').setFontColor('#000000').setFontWeight('normal');
      sheet.setColumnWidth(1, 220);
      return ['Management', 'Director', 'HOD', 'HR Head', 'Admin', 'MD Alaudin', 'Bhupendra', 'Deepak'];
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) return ['Management', 'Director', 'HOD', 'HR Head', 'Admin', 'MD Alaudin', 'Bhupendra', 'Deepak'];
    
    const values = sheet.getRange(1, 1, lastRow, 1).getValues();
    const names = [];
    const ignoreList = ['assign by', 'assigned by', 'assigner', 'name', 'names', 's.no', 'sr no', 'sr. no.', 'sr.no.', 'task giver', 'doer', 'header'];
    for (let i = 0; i < values.length; i++) {
      const val = String(values[i][0] || '').trim();
      if (val && !ignoreList.includes(val.toLowerCase())) {
        if (!names.includes(val)) {
          names.push(val);
        }
      }
    }
    return names.length > 0 ? names : ['Management', 'Director', 'HOD', 'HR Head', 'Admin', 'MD Alaudin', 'Bhupendra', 'Deepak'];
  } catch (err) {
    console.error('getMasterAssigners_ error:', err);
    return ['Management', 'Director', 'HOD', 'HR Head', 'Admin', 'MD Alaudin', 'Bhupendra', 'Deepak'];
  }
}

/**
 * Initial batch load for fast frontend mounting
 */
function getInitialData() {
  return {
    tasks: getTasks(),
    dashboard: dashboardData(),
    assigners: getMasterAssigners_()
  };
}

/**
 * Fetches all HR tasks from the Google Sheet
 */
function getTasks() {
  try {
    const sheet = getSheet();
    if (!sheet) return [];
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    
    const colMap = getColumnMap_(sheet);
    const maxCols = Math.max(sheet.getLastColumn(), 9);
    const data = sheet.getRange(2, 1, lastRow - 1, maxCols).getValues();
    
    return data.map((row, index) => {
      let plannedStr = '';
      if (row[colMap.PLANNED - 1]) {
        try { plannedStr = new Date(row[colMap.PLANNED - 1]).toISOString(); }
        catch (e) { plannedStr = String(row[colMap.PLANNED - 1]); }
      }
      let actualStr = '';
      if (row[colMap.ACTUAL - 1]) {
        try { actualStr = new Date(row[colMap.ACTUAL - 1]).toISOString(); }
        catch (e) { actualStr = String(row[colMap.ACTUAL - 1]); }
      }
      let expectedStr = '';
      if (colMap.EXPECTED && row[colMap.EXPECTED - 1]) {
        try { expectedStr = new Date(row[colMap.EXPECTED - 1]).toISOString(); }
        catch (e) { expectedStr = String(row[colMap.EXPECTED - 1]); }
      } else {
        expectedStr = plannedStr;
      }
      let assignedByStr = '';
      if (colMap.ASSIGNED_BY && row[colMap.ASSIGNED_BY - 1]) {
        assignedByStr = String(row[colMap.ASSIGNED_BY - 1] || '');
      }
      
      return {
        rowIndex: index + 2,
        planned: plannedStr,
        expectedDate: expectedStr,
        actual: actualStr,
        sno: Number(row[colMap.SNO - 1]) || (index + 1),
        problem: String(row[colMap.PROBLEM - 1] || ''),
        assignedBy: assignedByStr,
        doer: String(row[colMap.DOER - 1] || ''),
        status: String(row[colMap.STATUS - 1] || 'Pending'),
        review: String(row[colMap.REVIEW - 1] || '')
      };
    }).reverse(); // Latest tasks first
  } catch (err) {
    console.error('getTasks error:', err);
    return [];
  }
}

/**
 * Appends a new HR task to the Google Sheet
 */
function addTask(task) {
  const sheet = getSheet();
  if (!sheet) throw new Error("Sheet not found");
  
  const colMap = getColumnMap_(sheet);
  const lastRow = sheet.getLastRow();
  let nextSno = 1;
  if (lastRow > 1) {
    const lastVal = sheet.getRange(lastRow, colMap.SNO).getValue();
    nextSno = (Number(lastVal) || (lastRow - 1)) + 1;
  }
  
  let plannedDate = new Date();
  if (task.planned) {
    try {
      const parsed = new Date(task.planned);
      if (!isNaN(parsed.getTime())) plannedDate = parsed;
    } catch(e) {}
  }
  let expectedDate = plannedDate;
  if (task.expectedDate) {
    try {
      const parsed = new Date(task.expectedDate);
      if (!isNaN(parsed.getTime())) expectedDate = parsed;
    } catch(e) {}
  }
  const assignedBy = task.assignedBy || '';
  
  const maxCol = Math.max(sheet.getLastColumn(), 9);
  const rowData = new Array(maxCol).fill('');
  rowData[colMap.PLANNED - 1] = plannedDate;
  rowData[colMap.ACTUAL - 1] = '';
  rowData[colMap.SNO - 1] = nextSno;
  rowData[colMap.PROBLEM - 1] = task.problem || '';
  if (colMap.ASSIGNED_BY) rowData[colMap.ASSIGNED_BY - 1] = assignedBy;
  if (colMap.DOER) rowData[colMap.DOER - 1] = task.doer || '';
  if (colMap.STATUS) rowData[colMap.STATUS - 1] = task.status || 'Pending';
  if (colMap.REVIEW) rowData[colMap.REVIEW - 1] = '';
  if (colMap.EXPECTED) rowData[colMap.EXPECTED - 1] = expectedDate;
  
  sheet.appendRow(rowData);
  
  // Log creation audit
  logAuditEntry_(nextSno, task.problem || '', task.doer || '', 'CREATED', [
    { field: 'problem', fieldLabel: 'Task Problem', oldValue: '—', newValue: task.problem || '' },
    { field: 'assignedBy', fieldLabel: 'Assign By', oldValue: '—', newValue: assignedBy || '—' },
    { field: 'doer', fieldLabel: 'Assigned Doer(s)', oldValue: '—', newValue: task.doer || 'Unassigned' },
    { field: 'expectedDate', fieldLabel: 'Expected Date & Time', oldValue: '—', newValue: expectedDate.toISOString() },
    { field: 'planned', fieldLabel: 'Due Date & Time', oldValue: '—', newValue: plannedDate.toISOString() },
    { field: 'status', fieldLabel: 'Initial Status', oldValue: '—', newValue: task.status || 'Pending' }
  ]);
  
  // Send Telegram alert
  sendTelegramNotification(nextSno, task.problem, task.doer, plannedDate);
  
  return { success: true, sno: nextSno };
}

/**
 * Updates an existing task
 */
function updateTask(task) {
  const sheet = getSheet();
  if (!sheet) throw new Error("Sheet not found");
  
  const colMap = getColumnMap_(sheet);
  const rowIndex = findRowIndexBySno(task.sno, sheet);
  if (rowIndex === -1) throw new Error("Task not found");
  
  const oldPlanned = sheet.getRange(rowIndex, colMap.PLANNED).getValue();
  const oldExpected = colMap.EXPECTED ? sheet.getRange(rowIndex, colMap.EXPECTED).getValue() : null;
  const oldAssignedBy = colMap.ASSIGNED_BY ? sheet.getRange(rowIndex, colMap.ASSIGNED_BY).getValue() : '';
  const oldProblem = sheet.getRange(rowIndex, colMap.PROBLEM).getValue();
  const oldDoer = sheet.getRange(rowIndex, colMap.DOER).getValue();
  const oldStatus = sheet.getRange(rowIndex, colMap.STATUS).getValue();
  
  if (task.planned) {
    try {
      const parsed = new Date(task.planned);
      if (!isNaN(parsed.getTime())) {
        sheet.getRange(rowIndex, colMap.PLANNED).setValue(parsed);
      }
    } catch(e) {}
  }
  if (task.expectedDate && colMap.EXPECTED) {
    try {
      const parsed = new Date(task.expectedDate);
      if (!isNaN(parsed.getTime())) {
        sheet.getRange(rowIndex, colMap.EXPECTED).setValue(parsed);
      }
    } catch(e) {}
  }
  if (task.assignedBy !== undefined && colMap.ASSIGNED_BY) {
    sheet.getRange(rowIndex, colMap.ASSIGNED_BY).setValue(task.assignedBy || '');
  }
  sheet.getRange(rowIndex, colMap.PROBLEM).setValue(task.problem || '');
  sheet.getRange(rowIndex, colMap.DOER).setValue(task.doer || '');
  sheet.getRange(rowIndex, colMap.STATUS).setValue(task.status || 'Pending');
  
  if (oldStatus !== 'Complete 100%' && task.status === 'Complete 100%') {
    handleActualTimestamp_(sheet, rowIndex, true);
  } else if (oldStatus === 'Complete 100%' && task.status !== 'Complete 100%') {
    handleActualTimestamp_(sheet, rowIndex, false);
  } else if (task.status === 'Complete 100%') {
    computeWeeklyReview_(sheet, rowIndex);
  }
  
  const changes = [];
  if (task.assignedBy !== undefined && String(oldAssignedBy || '') !== String(task.assignedBy || '')) {
    changes.push({ field: 'assignedBy', fieldLabel: 'Assign By', oldValue: String(oldAssignedBy || '—'), newValue: String(task.assignedBy || '—') });
  }
  if (task.expectedDate && String(oldExpected) !== String(task.expectedDate)) {
    changes.push({ field: 'expectedDate', fieldLabel: 'Expected Date & Time', oldValue: String(oldExpected || '—'), newValue: String(task.expectedDate) });
  }
  if (task.planned && String(oldPlanned) !== String(task.planned)) {
    changes.push({ field: 'planned', fieldLabel: 'Due Date & Time', oldValue: String(oldPlanned || '—'), newValue: String(task.planned) });
  }
  if (oldProblem !== task.problem) changes.push({ field: 'problem', fieldLabel: 'Problem Statement', oldValue: String(oldProblem || '—'), newValue: String(task.problem || '—') });
  if (oldDoer !== task.doer) changes.push({ field: 'doer', fieldLabel: 'Name of Doer(s)', oldValue: String(oldDoer || 'Unassigned'), newValue: String(task.doer || 'Unassigned') });
  if (oldStatus !== task.status) changes.push({ field: 'status', fieldLabel: 'Status', oldValue: String(oldStatus), newValue: String(task.status) });
  
  if (changes.length > 0) {
    logAuditEntry_(task.sno, task.problem, task.doer, 'EDITED', changes);
  }
  
  return { success: true };
}

/**
 * Updates status and auto-computes Weekly Review rating
 */
function updateStatus(sno, status) {
  const sheet = getSheet();
  if (!sheet) throw new Error("Sheet not found");
  
  const colMap = getColumnMap_(sheet);
  const rowIndex = findRowIndexBySno(sno, sheet);
  if (rowIndex === -1) throw new Error("Task not found");
  
  const oldStatus = sheet.getRange(rowIndex, colMap.STATUS).getValue();
  const problem = sheet.getRange(rowIndex, colMap.PROBLEM).getValue();
  const doer = sheet.getRange(rowIndex, colMap.DOER).getValue();
  
  sheet.getRange(rowIndex, colMap.STATUS).setValue(status);
  
  if (oldStatus !== 'Complete 100%' && status === 'Complete 100%') {
    handleActualTimestamp_(sheet, rowIndex, true);
  } else if (oldStatus === 'Complete 100%' && status !== 'Complete 100%') {
    handleActualTimestamp_(sheet, rowIndex, false);
  }
  
  logAuditEntry_(sno, String(problem), String(doer), 'STATUS_CHANGED', [
    { field: 'status', fieldLabel: 'Status', oldValue: String(oldStatus), newValue: String(status) }
  ]);
  
  return { success: true };
}

/**
 * Deletes a task row by S.No.
 */
function deleteTask(sno) {
  const sheet = getSheet();
  if (!sheet) throw new Error("Sheet not found");
  
  const colMap = getColumnMap_(sheet);
  const rowIndex = findRowIndexBySno(sno, sheet);
  if (rowIndex === -1) throw new Error("Task not found");
  
  const problem = sheet.getRange(rowIndex, colMap.PROBLEM).getValue();
  const doer = sheet.getRange(rowIndex, colMap.DOER).getValue();
  
  sheet.deleteRow(rowIndex);
  
  logAuditEntry_(sno, String(problem), String(doer), 'DELETED', [
    { field: 'task', fieldLabel: 'Task Removed', oldValue: String(problem), newValue: 'Deleted' }
  ]);
  
  return { success: true };
}

/**
 * Audit log management in Script Properties
 */
function getAuditLogs() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('AUDIT_LOGS_V2');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('getAuditLogs error:', e);
  }
  return [];
}

function logAuditEntry_(taskSno, problem, doer, action, changes) {
  try {
    const logs = getAuditLogs();
    const newEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      taskSno: taskSno,
      problem: problem,
      doer: doer || '',
      action: action,
      timestamp: new Date().toISOString(),
      changes: changes
    };
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const updated = [newEntry].concat(logs).filter(function(l) {
      try { return new Date(l.timestamp).getTime() >= thirtyDaysAgo; } catch(e) { return true; }
    }).slice(0, 500);
    
    PropertiesService.getScriptProperties().setProperty('AUDIT_LOGS_V2', JSON.stringify(updated));
  } catch (e) {
    console.error('logAuditEntry_ error:', e);
  }
}

/**
 * Deletes a specific audit log by ID
 */
function deleteAuditLog(logId) {
  try {
    const logs = getAuditLogs();
    const updated = logs.filter(function(l) { return l.id !== logId; });
    PropertiesService.getScriptProperties().setProperty('AUDIT_LOGS_V2', JSON.stringify(updated));
    return { success: true };
  } catch (e) {
    console.error('deleteAuditLog error:', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Clears all audit logs
 */
function clearAllAuditLogs() {
  try {
    PropertiesService.getScriptProperties().setProperty('AUDIT_LOGS_V2', JSON.stringify([]));
    return { success: true };
  } catch (e) {
    console.error('clearAllAuditLogs error:', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Computes dashboard statistics from the Sheet
 */
function dashboardData() {
  const sheet = getSheet();
  if (!sheet) return { total: 0, pending: 0, prog25: 0, prog50: 0, prog75: 0, completed: 0 };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { total: 0, pending: 0, prog25: 0, prog50: 0, prog75: 0, completed: 0 };
  
  const colMap = getColumnMap_(sheet);
  const statuses = sheet.getRange(2, colMap.STATUS, lastRow - 1, 1).getValues();
  
  let total = 0, pending = 0, prog25 = 0, prog50 = 0, prog75 = 0, completed = 0;
  
  statuses.forEach(row => {
    const status = row[0];
    if (status) {
      total++;
      if (status === 'Pending') pending++;
      else if (status === 'Progress 25%') prog25++;
      else if (status === 'Progress 50%') prog50++;
      else if (status === 'Progress 75%') prog75++;
      else if (status === 'Complete 100%') completed++;
    }
  });
  
  return { total, pending, prog25, prog50, prog75, completed };
}

/**
 * Finds Row Index in the Sheet by S.No.
 */
function findRowIndexBySno(sno, sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  
  const colMap = getColumnMap_(sheet);
  const snoValues = sheet.getRange(2, colMap.SNO, lastRow - 1, 1).getValues();
  for (let i = 0; i < snoValues.length; i++) {
    if (Number(snoValues[i][0]) === Number(sno)) {
      return i + 2;
    }
  }
  return -1;
}

/**
 * On-Sheet Edit Trigger handler
 */
function handleSheetEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.source.getActiveSheet();
  
  if (sheet.getName() !== SHEET_NAME) return;
  const row = e.range.getRow();
  if (row <= 1) return;
  
  const colMap = getColumnMap_(sheet);
  const col = e.range.getColumn();
  const newValue = e.value !== undefined ? e.value : e.range.getValue();
  const oldValue = e.oldValue !== undefined ? e.oldValue : '';
  const sno = sheet.getRange(row, colMap.SNO).getValue();
  const problem = sheet.getRange(row, colMap.PROBLEM).getValue();
  const doer = sheet.getRange(row, colMap.DOER).getValue();
  
  // Status column edited
  if (col === colMap.STATUS) {
    if (newValue === 'Complete 100%') {
      handleActualTimestamp_(sheet, row, true);
    } else if (oldValue === 'Complete 100%' && newValue !== 'Complete 100%') {
      handleActualTimestamp_(sheet, row, false);
    }
    logAuditEntry_(sno, String(problem), String(doer), 'STATUS_CHANGED', [
      { field: 'status', fieldLabel: 'Status', oldValue: String(oldValue || '—'), newValue: String(newValue) }
    ]);
  } else if (col === colMap.PROBLEM) {
    logAuditEntry_(sno, String(newValue), String(doer), 'EDITED', [
      { field: 'problem', fieldLabel: 'Problem Statement', oldValue: String(oldValue || '—'), newValue: String(newValue) }
    ]);
  } else if (col === colMap.DOER) {
    logAuditEntry_(sno, String(problem), String(newValue), 'EDITED', [
      { field: 'doer', fieldLabel: 'Name of Doer(s)', oldValue: String(oldValue || 'Unassigned'), newValue: String(newValue) }
    ]);
  }
}

/**
 * Handles Actual Completion Date and Weekly Review calculation
 */
function handleActualTimestamp_(sheet, rowIndex, isComplete) {
  const colMap = getColumnMap_(sheet);
  if (isComplete) {
    const actualDate = new Date();
    sheet.getRange(rowIndex, colMap.ACTUAL).setValue(actualDate);
    computeWeeklyReview_(sheet, rowIndex);
  } else {
    sheet.getRange(rowIndex, colMap.ACTUAL).clearContent();
    sheet.getRange(rowIndex, colMap.REVIEW).clearContent();
  }
}

/**
 * Evaluates SLA Turnaround Time and sets Star Rating
 */
function computeWeeklyReview_(sheet, rowIndex) {
  const colMap = getColumnMap_(sheet);
  const planned = sheet.getRange(rowIndex, colMap.PLANNED).getValue();
  const actual = sheet.getRange(rowIndex, colMap.ACTUAL).getValue();
  let expected = null;
  if (colMap.EXPECTED && sheet.getLastColumn() >= colMap.EXPECTED) {
    expected = sheet.getRange(rowIndex, colMap.EXPECTED).getValue();
  }
  
  if (!actual) return;
  
  const aDate = new Date(actual);
  if (isNaN(aDate.getTime())) return;
  
  const pDate = planned ? new Date(planned) : null;
  const eDate = expected ? new Date(expected) : null;
  
  // 1. If completed on or before Assigner's Expected Date
  if (eDate && !isNaN(eDate.getTime()) && aDate.getTime() <= eDate.getTime()) {
    sheet.getRange(rowIndex, colMap.REVIEW).setValue('⭐⭐⭐⭐⭐ Excellent (On Expected Time)');
    return;
  }
  
  // 2. If completed on or before Committed Due Date
  if (pDate && !isNaN(pDate.getTime()) && aDate.getTime() <= pDate.getTime()) {
    sheet.getRange(rowIndex, colMap.REVIEW).setValue('⭐⭐⭐⭐⭐ Excellent (On Time)');
    return;
  }
  
  const refDate = (pDate && !isNaN(pDate.getTime())) ? pDate : eDate;
  if (!refDate || isNaN(refDate.getTime())) {
    sheet.getRange(rowIndex, colMap.REVIEW).setValue('⭐⭐⭐⭐⭐ Excellent (On Time)');
    return;
  }
  
  const delayDays = (aDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);
  
  let review = '';
  if (delayDays <= 1.0) {
    review = '⭐⭐⭐⭐ Very Good (Minor Delay)';
  } else if (delayDays <= 3.0) {
    review = '⭐⭐⭐ Good (Delayed)';
  } else if (delayDays <= 7.0) {
    review = '⭐⭐ Needs Improvement (Late)';
  } else {
    review = '⭐ Poor (Overdue)';
  }
  
  sheet.getRange(rowIndex, colMap.REVIEW).setValue(review);
}

/**
 * Installs the onEdit trigger automatically
 */
function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'handleSheetEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger('handleSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
}

/**
 * Telegram notification dispatcher
 */
function sendTelegramNotification(sno, problem, doer, plannedDate) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') return;
  if (!TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === 'YOUR_CHAT_ID_HERE') return;
  
  const message = `
🆕 *New HR Action Task Assigned*
*S.No.:* #${sno}
*Task:* ${problem}
*Doer(s):* ${doer}
*Assigned On:* ${plannedDate.toLocaleDateString()}
*Expected TAT:* 2.5 days
  `.trim();
  
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown'
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.error('Failed to send Telegram notification', e);
  }
}
