/**
 * =========================================================================
 * HR Action Tracker — Google Apps Script Production Backend
 * Tab Name: "Action Tracker HR Department"
 * Architecture: 7-Column Schema (Planned, Actual, S.No, Problem, Doer, Status, Review)
 * =========================================================================
 */

const SHEET_NAME = 'Action Tracker HR Department';
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_HERE';

const COL = {
  PLANNED: 1, // Col A (Committed Due Date & Time)
  ACTUAL: 2,  // Col B (Actual Completion Date & Time)
  SNO: 3,     // Col C
  PROBLEM: 4, // Col D
  DOER: 5,    // Col E
  STATUS: 6,  // Col F
  REVIEW: 7,  // Col G (Weekly Review Star Rating)
  EXPECTED: 8 // Col H (Expected Target Date & Time)
};

/**
 * Serves the React Web Application or handles REST API calls
 */
function doGet(e) {
  // If API request with action parameter
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest_(e.parameter.action, e.parameter);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('HR Action Tracker — Department System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
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
          dashboard: dashboardData()
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
 * Initializes Sheet Header formatting
 */
function initSheetHeader_(sheet) {
  const headers = [
    ['Planned / Due Date', 'Actual', 'S.No.', 'Problem / Task', 'Name of Doer', 'Status', 'Weekly Review', 'Expected Date']
  ];
  sheet.getRange(1, 1, 1, 8).setValues(headers)
    .setBackground('#0d1b2e')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontFamily('Arial')
    .setHorizontalAlignment('center');
  
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150); // Planned / Due Date
  sheet.setColumnWidth(2, 140); // Actual
  sheet.setColumnWidth(3, 70);  // S.No.
  sheet.setColumnWidth(4, 360); // Problem
  sheet.setColumnWidth(5, 180); // Doer
  sheet.setColumnWidth(6, 140); // Status
  sheet.setColumnWidth(7, 210); // Review
  sheet.setColumnWidth(8, 150); // Expected Date
}

/**
 * Initial batch load for fast frontend mounting
 */
function getInitialData() {
  return {
    tasks: getTasks(),
    dashboard: dashboardData()
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
    
    const maxCols = Math.max(sheet.getLastColumn(), 8);
    const data = sheet.getRange(2, 1, lastRow - 1, maxCols).getValues();
    
    return data.map((row, index) => {
      let plannedStr = '';
      if (row[COL.PLANNED - 1]) {
        try { plannedStr = new Date(row[COL.PLANNED - 1]).toISOString(); }
        catch (e) { plannedStr = String(row[COL.PLANNED - 1]); }
      }
      let actualStr = '';
      if (row[COL.ACTUAL - 1]) {
        try { actualStr = new Date(row[COL.ACTUAL - 1]).toISOString(); }
        catch (e) { actualStr = String(row[COL.ACTUAL - 1]); }
      }
      let expectedStr = '';
      if (row[COL.EXPECTED - 1]) {
        try { expectedStr = new Date(row[COL.EXPECTED - 1]).toISOString(); }
        catch (e) { expectedStr = String(row[COL.EXPECTED - 1]); }
      } else {
        expectedStr = plannedStr;
      }
      
      return {
        rowIndex: index + 2,
        planned: plannedStr,
        expectedDate: expectedStr,
        actual: actualStr,
        sno: Number(row[COL.SNO - 1]) || (index + 1),
        problem: String(row[COL.PROBLEM - 1] || ''),
        doer: String(row[COL.DOER - 1] || ''),
        status: String(row[COL.STATUS - 1] || 'Pending'),
        review: String(row[COL.REVIEW - 1] || '')
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
  
  const lastRow = sheet.getLastRow();
  let nextSno = 1;
  if (lastRow > 1) {
    const lastVal = sheet.getRange(lastRow, COL.SNO).getValue();
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
  const newRow = [
    plannedDate,
    '',
    nextSno,
    task.problem || '',
    task.doer || '',
    task.status || 'Pending',
    '',
    expectedDate
  ];
  
  sheet.appendRow(newRow);
  
  // Log creation audit
  logAuditEntry_(nextSno, task.problem || '', task.doer || '', 'CREATED', [
    { field: 'problem', fieldLabel: 'Task Problem', oldValue: '—', newValue: task.problem || '' },
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
  
  const rowIndex = findRowIndexBySno(task.sno, sheet);
  if (rowIndex === -1) throw new Error("Task not found");
  
  const oldPlanned = sheet.getRange(rowIndex, COL.PLANNED).getValue();
  const oldExpected = sheet.getLastColumn() >= COL.EXPECTED ? sheet.getRange(rowIndex, COL.EXPECTED).getValue() : null;
  const oldProblem = sheet.getRange(rowIndex, COL.PROBLEM).getValue();
  const oldDoer = sheet.getRange(rowIndex, COL.DOER).getValue();
  const oldStatus = sheet.getRange(rowIndex, COL.STATUS).getValue();
  
  if (task.planned) {
    try {
      const parsed = new Date(task.planned);
      if (!isNaN(parsed.getTime())) {
        sheet.getRange(rowIndex, COL.PLANNED).setValue(parsed);
      }
    } catch(e) {}
  }
  if (task.expectedDate) {
    try {
      const parsed = new Date(task.expectedDate);
      if (!isNaN(parsed.getTime())) {
        sheet.getRange(rowIndex, COL.EXPECTED).setValue(parsed);
      }
    } catch(e) {}
  }
  sheet.getRange(rowIndex, COL.PROBLEM).setValue(task.problem || '');
  sheet.getRange(rowIndex, COL.DOER).setValue(task.doer || '');
  sheet.getRange(rowIndex, COL.STATUS).setValue(task.status || 'Pending');
  
  if (oldStatus !== 'Complete 100%' && task.status === 'Complete 100%') {
    handleActualTimestamp_(sheet, rowIndex, true);
  } else if (oldStatus === 'Complete 100%' && task.status !== 'Complete 100%') {
    handleActualTimestamp_(sheet, rowIndex, false);
  } else if (task.status === 'Complete 100%') {
    computeWeeklyReview_(sheet, rowIndex);
  }
  
  const changes = [];
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
  
  const rowIndex = findRowIndexBySno(sno, sheet);
  if (rowIndex === -1) throw new Error("Task not found");
  
  const oldStatus = sheet.getRange(rowIndex, COL.STATUS).getValue();
  const problem = sheet.getRange(rowIndex, COL.PROBLEM).getValue();
  const doer = sheet.getRange(rowIndex, COL.DOER).getValue();
  
  sheet.getRange(rowIndex, COL.STATUS).setValue(status);
  
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
  
  const rowIndex = findRowIndexBySno(sno, sheet);
  if (rowIndex === -1) throw new Error("Task not found");
  
  const problem = sheet.getRange(rowIndex, COL.PROBLEM).getValue();
  const doer = sheet.getRange(rowIndex, COL.DOER).getValue();
  
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
  
  const statuses = sheet.getRange(2, COL.STATUS, lastRow - 1, 1).getValues();
  
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
  
  const snoValues = sheet.getRange(2, COL.SNO, lastRow - 1, 1).getValues();
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
  
  const col = e.range.getColumn();
  const newValue = e.value !== undefined ? e.value : e.range.getValue();
  const oldValue = e.oldValue !== undefined ? e.oldValue : '';
  const sno = sheet.getRange(row, COL.SNO).getValue();
  const problem = sheet.getRange(row, COL.PROBLEM).getValue();
  const doer = sheet.getRange(row, COL.DOER).getValue();
  
  // Status column edited
  if (col === COL.STATUS) {
    if (newValue === 'Complete 100%') {
      handleActualTimestamp_(sheet, row, true);
    } else if (oldValue === 'Complete 100%' && newValue !== 'Complete 100%') {
      handleActualTimestamp_(sheet, row, false);
    }
    logAuditEntry_(sno, String(problem), String(doer), 'STATUS_CHANGED', [
      { field: 'status', fieldLabel: 'Status', oldValue: String(oldValue || '—'), newValue: String(newValue) }
    ]);
  } else if (col === COL.PROBLEM) {
    logAuditEntry_(sno, String(newValue), String(doer), 'EDITED', [
      { field: 'problem', fieldLabel: 'Problem Statement', oldValue: String(oldValue || '—'), newValue: String(newValue) }
    ]);
  } else if (col === COL.DOER) {
    logAuditEntry_(sno, String(problem), String(newValue), 'EDITED', [
      { field: 'doer', fieldLabel: 'Name of Doer(s)', oldValue: String(oldValue || 'Unassigned'), newValue: String(newValue) }
    ]);
  }
}

/**
 * Handles Actual Completion Date and Weekly Review calculation
 */
function handleActualTimestamp_(sheet, rowIndex, isComplete) {
  if (isComplete) {
    const actualDate = new Date();
    sheet.getRange(rowIndex, COL.ACTUAL).setValue(actualDate);
    computeWeeklyReview_(sheet, rowIndex);
  } else {
    sheet.getRange(rowIndex, COL.ACTUAL).clearContent();
    sheet.getRange(rowIndex, COL.REVIEW).clearContent();
  }
}

/**
 * Evaluates SLA Turnaround Time and sets Star Rating
 */
function computeWeeklyReview_(sheet, rowIndex) {
  const planned = sheet.getRange(rowIndex, COL.PLANNED).getValue();
  const actual = sheet.getRange(rowIndex, COL.ACTUAL).getValue();
  let expected = null;
  if (sheet.getLastColumn() >= COL.EXPECTED) {
    expected = sheet.getRange(rowIndex, COL.EXPECTED).getValue();
  }
  
  if (!actual) return;
  
  const aDate = new Date(actual);
  if (isNaN(aDate.getTime())) return;
  
  const pDate = planned ? new Date(planned) : null;
  const eDate = expected ? new Date(expected) : null;
  
  // 1. If completed on or before Assigner's Expected Date
  if (eDate && !isNaN(eDate.getTime()) && aDate.getTime() <= eDate.getTime()) {
    sheet.getRange(rowIndex, COL.REVIEW).setValue('⭐⭐⭐⭐⭐ Excellent (On Expected Time)');
    return;
  }
  
  // 2. If completed on or before Committed Due Date
  if (pDate && !isNaN(pDate.getTime()) && aDate.getTime() <= pDate.getTime()) {
    sheet.getRange(rowIndex, COL.REVIEW).setValue('⭐⭐⭐⭐⭐ Excellent (On Time)');
    return;
  }
  
  const refDate = (pDate && !isNaN(pDate.getTime())) ? pDate : eDate;
  if (!refDate || isNaN(refDate.getTime())) {
    sheet.getRange(rowIndex, COL.REVIEW).setValue('⭐⭐⭐⭐⭐ Excellent (On Time)');
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
  
  sheet.getRange(rowIndex, COL.REVIEW).setValue(review);
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
