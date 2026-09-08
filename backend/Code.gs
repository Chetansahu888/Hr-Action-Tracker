/**
 * =========================================================================
 * HR Action Tracker — Google Apps Script Production Backend (JavaScript / .gs)
 * Tab Name: "Action Tracker HR Department"
 * Master Tab: "Master" (Column A for Assign By list)
 * =========================================================================
 */

const SHEET_NAME = '1 Action Tracker HR Department';
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_HERE';

// Standard 10-Column Schema matching the user's Google Sheet:
// Col A: Planned (Task Assignment / Creation Date & Time)
// Col B: Actual (Task Completion Date & Time - auto on 100%)
// Col C: S. No.
// Col D: Problem / Task
// Col E: Assign By
// Col F: Name Of Doer
// Col G: Expected Target Date & Time
// Col H: Committed Due Date & Tim
// Col I: Status
// Col J: Weekly Review
const COL = {
  PLANNED: 1,       // Col A: Planned (Task Given / Assigned Date & Time)
  ACTUAL: 2,        // Col B: Actual (Task Completion Date & Time)
  SNO: 3,           // Col C: S. No.
  PROBLEM: 4,       // Col D: Problem / Task
  ASSIGNED_BY: 5,   // Col E: Assign By (Task Giver)
  DOER: 6,          // Col F: Name Of Doer
  EXPECTED: 7,      // Col G: Expected Target Date & Time
  COMMITTED: 8,     // Col H: Committed Due Date & Tim
  STATUS: 9,        // Col I: Status
  REVIEW: 10        // Col J: Weekly Review
};

/**
 * Universal Formula-Safe Date Formatter for Google Sheets
 * Format: "MM/dd/yyyy HH:mm:ss" (e.g. "09/08/2026 10:49:33")
 */
function formatFormulaDate_(dateObj) {
  if (!dateObj) return '';
  if (typeof dateObj === 'string') {
    const trimmed = dateObj.trim();
    if (!trimmed) return '';
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    } else {
      return trimmed;
    }
  }
  try {
    return Utilities.formatDate(dateObj, Session.getScriptTimeZone() || "GMT+5:30", "MM/dd/yyyy HH:mm:ss");
  } catch (e) {
    try {
      const d = new Date(dateObj);
      if (!isNaN(d.getTime())) {
        return Utilities.formatDate(d, "GMT+5:30", "MM/dd/yyyy HH:mm:ss");
      }
    } catch (e2) {}
    return String(dateObj);
  }
}

/**
 * Serves pure JSON REST API for GET requests or serves HTML UI if accessed directly
 */
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  if (params.action) {
    return handleApiRequest_(params.action, params);
  }
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('HR Action Tracker')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  } catch (err) {
    return handleApiRequest_('getInitialData', params);
  }
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
          sheetName: getSheet().getName(),
          timestamp: new Date().toISOString()
        });

      case 'getInitialData':
        return jsonResponse_({
          success: true,
          tasks: getTasks(),
          dashboard: dashboardData(),
          assigners: getMasterAssigners_(),
          users: getUsers_()
        });

      case 'getUsers':
        return jsonResponse_({
          success: true,
          users: getUsers_()
        });

      case 'saveUser':
      case 'addUser': {
        const userData = params.user || params;
        const res = saveUser_(userData);
        return jsonResponse_(res);
      }

      case 'deleteUser': {
        const userId = params.userId || params.id;
        const res = deleteUser_(userId);
        return jsonResponse_(res);
      }

      case 'syncUsers': {
        const usersList = params.users || [];
        const res = syncUsers_(usersList);
        return jsonResponse_(res);
      }

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
        const modifiedBy = params.modifiedBy || 'User';
        const res = updateStatus(sno, status, modifiedBy);
        return jsonResponse_(res);
      }

      case 'deleteTask': {
        const sno = Number(params.sno);
        const modifiedBy = params.modifiedBy || 'Admin';
        const res = deleteTask(sno, modifiedBy);
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
 * Returns the target Google Sheet, checking for '1 Action Tracker HR Department' or 'Action Tracker HR Department'
 */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Active spreadsheet not accessible. Ensure script is bound to the Google Sheet.");
  
  // 1. Direct name lookup
  let sheet = ss.getSheetByName('1 Action Tracker HR Department') || 
              ss.getSheetByName('Action Tracker HR Department');
  if (sheet) return sheet;

  // 2. Look for tab containing 'Action Tracker'
  const sheets = ss.getSheets();
  for (let s of sheets) {
    const n = s.getName().trim().toLowerCase();
    if (n.includes('action tracker') || n.includes('hr tracker') || n.includes('action_tracker')) {
      return s;
    }
  }

  // 3. Look for first tracker sheet (excluding Master, Login page, Audit History)
  for (let s of sheets) {
    const n = s.getName().trim().toLowerCase();
    if (n !== 'master' && !n.includes('login') && !n.includes('audit')) {
      return s;
    }
  }

  // 4. Create default sheet if none found
  sheet = ss.insertSheet('1 Action Tracker HR Department');
  initSheetHeader_(sheet);
  return sheet;
}

/**
 * Initializes Sheet Header formatting matching user's exact 10-column layout:
 * Col A: Planned (Pink)
 * Col B: Actual (Pink)
 * Col C: S. No. (Green)
 * Col D: Problem / Task (Green)
 * Col E: Assign By (Green)
 * Col F: Name Of Doer (Green)
 * Col G: Expected Target Date & Time (Green)
 * Col H: Committed Due Date & Tim (Green)
 * Col I: Status (Green)
 * Col J: Weekly Review (Green)
 */
function initSheetHeader_(sheet) {
  const headers = [
    ['Planned', 'Actual', 'S. No.', 'Problem / Task', 'Assign By', 'Name Of Doer', 'Expected Target Date & Time', 'Committed Due Date & Tim', 'Status', 'Weekly Review']
  ];
  sheet.getRange(1, 1, 1, 10).setValues(headers)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontFamily('Arial')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  
  // Col A & B: Pink background (#c27ba0 or #d5a6bd)
  sheet.getRange(1, 1, 1, 2).setBackground('#c27ba0');
  
  // Col C to J: Green background (#274e13 or #38761d)
  sheet.getRange(1, 3, 1, 8).setBackground('#38761d');
  
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160); // Planned (Col A)
  sheet.setColumnWidth(2, 160); // Actual (Col B)
  sheet.setColumnWidth(3, 70);  // S. No. (Col C)
  sheet.setColumnWidth(4, 320); // Problem / Task (Col D)
  sheet.setColumnWidth(5, 160); // Assign By (Col E)
  sheet.setColumnWidth(6, 180); // Name Of Doer (Col F)
  sheet.setColumnWidth(7, 190); // Expected Target Date & Time (Col G)
  sheet.setColumnWidth(8, 190); // Committed Due Date & Tim (Col H)
  sheet.setColumnWidth(9, 130); // Status (Col I)
  sheet.setColumnWidth(10, 210); // Weekly Review (Col J)
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
    EXPECTED: COL.EXPECTED,
    COMMITTED: COL.COMMITTED,
    STATUS: COL.STATUS,
    REVIEW: COL.REVIEW
  };
  try {
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) return map;
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || '').trim().toLowerCase();
      if (h === 'planned' || h.includes('planned date') || h.includes('task date') || h.includes('assign date') || h.includes('assigned on')) {
        map.PLANNED = i + 1;
      } else if (h === 'actual' || h.includes('actual completion') || h.includes('actual date')) {
        map.ACTUAL = i + 1;
      } else if (h.includes('s.no') || h.includes('sno') || h.includes('sr.') || h.includes('s. no') || h.includes('sr no')) {
        map.SNO = i + 1;
      } else if (h.includes('problem') || h.includes('task')) {
        map.PROBLEM = i + 1;
      } else if (h.includes('assign by') || h.includes('assigned by') || h.includes('task giver')) {
        map.ASSIGNED_BY = i + 1;
      } else if (h.includes('doer') || h.includes('name of doer') || h.includes('assignee')) {
        map.DOER = i + 1;
      } else if (h.includes('expected') || h.includes('target date')) {
        map.EXPECTED = i + 1;
      } else if (h.includes('committed') || h.includes('due date') || h.includes('due & tim') || h.includes('due & time')) {
        map.COMMITTED = i + 1;
      } else if (h === 'status' || h.includes('progress')) {
        map.STATUS = i + 1;
      } else if (h.includes('review') || h.includes('weekly review') || h.includes('rating')) {
        map.REVIEW = i + 1;
      }
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
    const maxCols = Math.max(sheet.getLastColumn(), 10);
    const data = sheet.getRange(2, 1, lastRow - 1, maxCols).getValues();
    
    return data.map((row, index) => {
      // Col A: Planned (Task Assigned / Given Date)
      let plannedStr = '';
      if (row[colMap.PLANNED - 1]) {
        try { plannedStr = new Date(row[colMap.PLANNED - 1]).toISOString(); }
        catch (e) { plannedStr = String(row[colMap.PLANNED - 1]); }
      }
      
      // Col B: Actual (Task Completion Date)
      let actualStr = '';
      if (row[colMap.ACTUAL - 1]) {
        try { actualStr = new Date(row[colMap.ACTUAL - 1]).toISOString(); }
        catch (e) { actualStr = String(row[colMap.ACTUAL - 1]); }
      }

      // Col G: Expected Target Date & Time
      let expectedStr = '';
      if (colMap.EXPECTED && row[colMap.EXPECTED - 1]) {
        try { expectedStr = new Date(row[colMap.EXPECTED - 1]).toISOString(); }
        catch (e) { expectedStr = String(row[colMap.EXPECTED - 1]); }
      }

      // Col H: Committed Due Date & Tim
      let committedStr = '';
      if (colMap.COMMITTED && row[colMap.COMMITTED - 1]) {
        try { committedStr = new Date(row[colMap.COMMITTED - 1]).toISOString(); }
        catch (e) { committedStr = String(row[colMap.COMMITTED - 1]); }
      } else {
        committedStr = expectedStr || plannedStr;
      }

      // Col E: Assign By
      let assignedByStr = '';
      if (colMap.ASSIGNED_BY && row[colMap.ASSIGNED_BY - 1]) {
        assignedByStr = String(row[colMap.ASSIGNED_BY - 1] || '');
      }
      
      return {
        rowIndex: index + 2,
        planned: plannedStr,               // Col A: Planned (Task Given Date)
        actual: actualStr,                 // Col B: Actual (Completion Date)
        sno: Number(row[colMap.SNO - 1]) || (index + 1), // Col C: S. No.
        problem: String(row[colMap.PROBLEM - 1] || ''),   // Col D: Problem / Task
        assignedBy: assignedByStr,         // Col E: Assign By
        doer: String(row[colMap.DOER - 1] || ''), // Col F: Name Of Doer
        expectedDate: expectedStr,         // Col G: Expected Target Date & Time
        committedDate: committedStr,       // Col H: Committed Due Date & Tim
        dueDate: committedStr,             // Alias
        status: String(row[colMap.STATUS - 1] || 'Pending'), // Col I: Status
        review: String(row[colMap.REVIEW - 1] || '')         // Col J: Weekly Review
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
  
  // Col A: Planned = Date & Time when task is given/assigned
  let plannedDate = new Date();
  if (task.planned) {
    try {
      const parsed = new Date(task.planned);
      if (!isNaN(parsed.getTime())) plannedDate = parsed;
    } catch(e) {}
  }

  // Col G: Expected Target Date
  let expectedDate = '';
  if (task.expectedDate) {
    try {
      const parsed = new Date(task.expectedDate);
      if (!isNaN(parsed.getTime())) expectedDate = parsed;
    } catch(e) {}
  }

  // Col H: Committed Due Date
  let committedDate = '';
  const dueVal = task.committedDate || task.dueDate;
  if (dueVal) {
    try {
      const parsed = new Date(dueVal);
      if (!isNaN(parsed.getTime())) committedDate = parsed;
    } catch(e) {}
  } else {
    committedDate = expectedDate || plannedDate;
  }

  const assignedBy = task.assignedBy || 'Management';
  const doer = task.doer || '';
  const status = task.status || 'Pending';
  
  const maxCol = Math.max(sheet.getLastColumn(), 10);
  const rowData = new Array(maxCol).fill('');
  
  // Col A: Planned (Task Given Date)
  rowData[colMap.PLANNED - 1] = formatFormulaDate_(plannedDate);
  
  // Col B: Actual (Completion Date - empty on creation unless 100%)
  if (status === 'Complete 100%') {
    rowData[colMap.ACTUAL - 1] = formatFormulaDate_(new Date());
  } else {
    rowData[colMap.ACTUAL - 1] = '';
  }

  // Col C: S. No.
  rowData[colMap.SNO - 1] = nextSno;
  
  // Col D: Problem / Task
  rowData[colMap.PROBLEM - 1] = task.problem || '';
  
  // Col E: Assign By
  if (colMap.ASSIGNED_BY) rowData[colMap.ASSIGNED_BY - 1] = assignedBy;
  
  // Col F: Name Of Doer
  if (colMap.DOER) rowData[colMap.DOER - 1] = doer;
  
  // Col G: Expected Target Date & Time
  if (colMap.EXPECTED) rowData[colMap.EXPECTED - 1] = expectedDate ? formatFormulaDate_(expectedDate) : '';

  // Col H: Committed Due Date & Tim
  if (colMap.COMMITTED) rowData[colMap.COMMITTED - 1] = committedDate ? formatFormulaDate_(committedDate) : '';

  // Col I: Status
  if (colMap.STATUS) rowData[colMap.STATUS - 1] = status;
  
  // Col J: Weekly Review
  if (colMap.REVIEW) {
    if (status === 'Complete 100%') {
      rowData[colMap.REVIEW - 1] = calculateRating_(committedDate, new Date(), expectedDate);
    } else {
      rowData[colMap.REVIEW - 1] = '';
    }
  }
  
  sheet.appendRow(rowData);
  SpreadsheetApp.flush();
  
  // Send Telegram alert
  sendTelegramNotification(nextSno, task.problem, doer, plannedDate);
  
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
  const oldCommitted = colMap.COMMITTED ? sheet.getRange(rowIndex, colMap.COMMITTED).getValue() : null;
  const oldAssignedBy = colMap.ASSIGNED_BY ? sheet.getRange(rowIndex, colMap.ASSIGNED_BY).getValue() : '';
  const oldProblem = sheet.getRange(rowIndex, colMap.PROBLEM).getValue();
  const oldDoer = sheet.getRange(rowIndex, colMap.DOER).getValue();
  const oldStatus = sheet.getRange(rowIndex, colMap.STATUS).getValue();
  
  // Update Planned (Col A) if supplied
  if (task.planned) {
    try {
      const parsed = new Date(task.planned);
      if (!isNaN(parsed.getTime())) sheet.getRange(rowIndex, colMap.PLANNED).setValue(formatFormulaDate_(parsed));
    } catch(e) {}
  }

  // Update Expected Date (Col G)
  if (task.expectedDate && colMap.EXPECTED) {
    try {
      const parsed = new Date(task.expectedDate);
      if (!isNaN(parsed.getTime())) sheet.getRange(rowIndex, colMap.EXPECTED).setValue(formatFormulaDate_(parsed));
    } catch(e) {}
  }

  // Update Committed Due Date (Col H)
  const dueVal = task.committedDate || task.dueDate;
  if (dueVal && colMap.COMMITTED) {
    try {
      const parsed = new Date(dueVal);
      if (!isNaN(parsed.getTime())) sheet.getRange(rowIndex, colMap.COMMITTED).setValue(formatFormulaDate_(parsed));
    } catch(e) {}
  }

  if (task.assignedBy !== undefined && colMap.ASSIGNED_BY) {
    sheet.getRange(rowIndex, colMap.ASSIGNED_BY).setValue(task.assignedBy || '');
  }
  if (task.problem !== undefined) {
    sheet.getRange(rowIndex, colMap.PROBLEM).setValue(task.problem || '');
  }
  if (task.doer !== undefined) {
    sheet.getRange(rowIndex, colMap.DOER).setValue(task.doer || '');
  }
  if (task.status !== undefined) {
    sheet.getRange(rowIndex, colMap.STATUS).setValue(task.status || 'Pending');
  }
  
  // Handle completion timestamp in Col B & Weekly Review in Col J
  if (oldStatus !== 'Complete 100%' && task.status === 'Complete 100%') {
    handleActualTimestamp_(sheet, rowIndex, true);
  } else if (oldStatus === 'Complete 100%' && task.status !== 'Complete 100%') {
    handleActualTimestamp_(sheet, rowIndex, false);
  } else if (task.status === 'Complete 100%') {
    computeWeeklyReview_(sheet, rowIndex);
  }

  SpreadsheetApp.flush();
  
  const changes = [];
  if (task.assignedBy !== undefined && String(oldAssignedBy || '') !== String(task.assignedBy || '')) {
    changes.push({ field: 'assignedBy', fieldLabel: 'Assign By', oldValue: String(oldAssignedBy || '—'), newValue: String(task.assignedBy || '—') });
  }
  if (task.expectedDate && String(oldExpected) !== String(task.expectedDate)) {
    changes.push({ field: 'expectedDate', fieldLabel: 'Expected Target Date & Time', oldValue: String(oldExpected || '—'), newValue: String(task.expectedDate) });
  }
  if (dueVal && String(oldCommitted) !== String(dueVal)) {
    changes.push({ field: 'committedDate', fieldLabel: 'Committed Due Date & Tim', oldValue: String(oldCommitted || '—'), newValue: String(dueVal) });
  }
  if (oldProblem !== task.problem) changes.push({ field: 'problem', fieldLabel: 'Problem Statement', oldValue: String(oldProblem || '—'), newValue: String(task.problem || '—') });
  if (oldDoer !== task.doer) changes.push({ field: 'doer', fieldLabel: 'Name Of Doer', oldValue: String(oldDoer || 'Unassigned'), newValue: String(task.doer || 'Unassigned') });
  if (oldStatus !== task.status) changes.push({ field: 'status', fieldLabel: 'Status', oldValue: String(oldStatus), newValue: String(task.status) });
  
  if (changes.length > 0) {
    logAuditEntry_(task.sno, task.problem, task.doer, 'EDITED', changes, task.modifiedBy || 'Admin');
  }
  
  return { success: true };
}

/**
 * Updates status and auto-computes Weekly Review rating
 */
function updateStatus(sno, status, modifiedBy) {
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

  SpreadsheetApp.flush();
  
  logAuditEntry_(sno, String(problem), String(doer), 'STATUS_CHANGED', [
    { field: 'status', fieldLabel: 'Status', oldValue: String(oldStatus), newValue: String(status) }
  ], modifiedBy || 'User');
  
  return { success: true };
}

/**
 * Deletes a task row by S.No.
 */
function deleteTask(sno, modifiedBy) {
  const sheet = getSheet();
  if (!sheet) throw new Error("Sheet not found");
  
  const colMap = getColumnMap_(sheet);
  const rowIndex = findRowIndexBySno(sno, sheet);
  if (rowIndex === -1) throw new Error("Task not found");
  
  const problem = sheet.getRange(rowIndex, colMap.PROBLEM).getValue();
  const doer = sheet.getRange(rowIndex, colMap.DOER).getValue();
  
  sheet.deleteRow(rowIndex);
  SpreadsheetApp.flush();
  
  logAuditEntry_(sno, String(problem), String(doer), 'DELETED', [
    { field: 'task', fieldLabel: 'Task Removed', oldValue: String(problem), newValue: 'Deleted' }
  ], modifiedBy || 'Admin');
  
  return { success: true };
}

/**
 * Formats structured changes array into clean, plain human-readable text
 */
function formatCleanChangesText_(action, changes, problem) {
  if (!changes || !Array.isArray(changes) || changes.length === 0) {
    if (action === 'DELETED') return 'Task was deleted from the tracker';
    if (action === 'CREATED') return 'New task created: ' + (problem || '');
    return 'Task details updated';
  }
  
  if (action === 'STATUS_CHANGED') {
    const st = changes.find(function(c) { return c.field === 'status'; });
    if (st) return 'Status updated: "' + (st.oldValue || '—') + '" ➔ "' + (st.newValue || '—') + '"';
  }
  
  if (action === 'CREATED') {
    const parts = [];
    changes.forEach(function(c) {
      if (c.newValue && c.newValue !== '—') {
        let val = c.newValue;
        if (typeof val === 'string' && (val.includes('T') || val.includes('-'))) {
          try {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              val = formatFormulaDate_(d);
            }
          } catch(e) {}
        }
        parts.push(c.fieldLabel + ': ' + val);
      }
    });
    return parts.length > 0 ? parts.join(' | ') : ('New Task Created: ' + (problem || ''));
  }
  
  const diffs = [];
  changes.forEach(function(c) {
    let oldVal = c.oldValue || '—';
    let newVal = c.newValue || '—';
    if (typeof oldVal === 'string' && (oldVal.includes('T') || oldVal.includes('-'))) {
      try {
        const d = new Date(oldVal);
        if (!isNaN(d.getTime())) oldVal = formatFormulaDate_(d);
      } catch(e) {}
    }
    if (typeof newVal === 'string' && (newVal.includes('T') || newVal.includes('-'))) {
      try {
        const d = new Date(newVal);
        if (!isNaN(d.getTime())) newVal = formatFormulaDate_(d);
      } catch(e) {}
    }
    diffs.push(c.fieldLabel + ': "' + oldVal + '" ➔ "' + newVal + '"');
  });
  return diffs.join(' | ');
}

/**
 * Returns the Audit History Google Sheet tab, creating and styling it if needed
 */
function getAuditSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return null;
  let sheet = ss.getSheetByName('Audit History') || ss.getSheetByName('Audit Logs') || ss.getSheetByName('History');
  if (!sheet) {
    sheet = ss.insertSheet('Audit History');
  }
  
  // Format Headers: 8 Columns with Modified By
  const headers = [['Timestamp', 'Task S.No.', 'Problem / Task', 'Name Of Doer', 'Modified By (User)', 'Action Type', 'Modification Details', 'Log ID']];
  sheet.getRange(1, 1, 1, 8).setValues(headers)
    .setBackground('#0d1b2e')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontFamily('Arial')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 180); // Timestamp
  sheet.setColumnWidth(2, 90);  // S.No.
  sheet.setColumnWidth(3, 260); // Problem
  sheet.setColumnWidth(4, 150); // Doer
  sheet.setColumnWidth(5, 160); // Modified By (User)
  sheet.setColumnWidth(6, 140); // Action Type
  sheet.setColumnWidth(7, 400); // Clean Modification Details
  sheet.setColumnWidth(8, 130); // Log ID
  
  return sheet;
}

/**
 * Fetches all audit logs directly from the 'Audit History' sheet tab
 */
function getAuditLogs() {
  try {
    const sheet = getAuditSheet_();
    if (!sheet) return [];
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    
    const maxCols = Math.max(sheet.getLastColumn(), 8);
    const data = sheet.getRange(2, 1, lastRow - 1, maxCols).getValues();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const logs = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      let ts = '';
      try {
        ts = row[0] ? formatFormulaDate_(row[0]) : '';
      } catch (e) {
        ts = String(row[0] || '');
      }
      
      let modifiedByStr = 'Admin';
      let actionStr = 'EDITED';
      let detailsRaw = '';
      let logIdStr = 'log-' + (i + 1);

      if (maxCols >= 8 && row[4] && (row[5] === 'CREATED' || row[5] === 'EDITED' || row[5] === 'STATUS_CHANGED' || row[5] === 'DELETED')) {
        modifiedByStr = String(row[4] || 'Admin');
        actionStr = String(row[5] || 'EDITED');
        detailsRaw = String(row[6] || '');
        logIdStr = String(row[7] || ('log-' + (i + 1)));
      } else {
        // Fallback for legacy 7-column logs
        actionStr = String(row[4] || 'EDITED');
        detailsRaw = String(row[5] || '');
        logIdStr = String(row[6] || ('log-' + (i + 1)));
      }

      let parsedChanges = [];
      try {
        if (detailsRaw && detailsRaw.startsWith('[')) {
          parsedChanges = JSON.parse(detailsRaw);
        } else if (detailsRaw) {
          parsedChanges = [{ field: 'detail', fieldLabel: 'Details', oldValue: '—', newValue: detailsRaw }];
        }
      } catch (e) {
        parsedChanges = [{ field: 'detail', fieldLabel: 'Details', oldValue: '—', newValue: detailsRaw }];
      }

      logs.push({
        id: logIdStr,
        taskSno: Number(row[1]) || 0,
        problem: String(row[2] || ''),
        doer: String(row[3] || ''),
        modifiedBy: modifiedByStr,
        action: actionStr,
        timestamp: ts,
        changes: parsedChanges
      });
    }

    // Filter by 30-day retention and return latest first
    return logs.filter(function(l) {
      try { return new Date(l.timestamp).getTime() >= thirtyDaysAgo; } catch(e) { return true; }
    }).reverse();
  } catch (e) {
    console.error('getAuditLogs error:', e);
    return [];
  }
}

/**
 * Appends a new audit log row to the 'Audit History' Google Sheet in clean plain readable text
 */
function logAuditEntry_(taskSno, problem, doer, action, changes, modifiedBy) {
  try {
    const sheet = getAuditSheet_();
    if (!sheet) return;

    const logId = 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const now = new Date();
    const formattedDate = formatFormulaDate_(now);
    const cleanDetails = formatCleanChangesText_(action, changes, problem);
    const userStr = String(modifiedBy || 'Admin').trim();

    sheet.appendRow([
      formattedDate,
      taskSno,
      problem || '',
      doer || '',
      userStr,
      action || 'EDITED',
      cleanDetails,
      logId
    ]);
    SpreadsheetApp.flush();
  } catch (e) {
    console.error('logAuditEntry_ error:', e);
  }
}

/**
 * Deletes a specific audit log from the 'Audit History' Google Sheet by Log ID
 */
function deleteAuditLog(logId) {
  try {
    const sheet = getAuditSheet_();
    if (!sheet) return { success: true };
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true };
    
    const maxCols = Math.max(sheet.getLastColumn(), 8);
    const idColIndex = maxCols >= 8 ? 8 : 7;
    const idValues = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
    for (let i = 0; i < idValues.length; i++) {
      if (String(idValues[i][0]) === String(logId)) {
        sheet.deleteRow(i + 2);
        SpreadsheetApp.flush();
        return { success: true };
      }
    }
    return { success: true };
  } catch (e) {
    console.error('deleteAuditLog error:', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Clears all audit logs from the 'Audit History' Google Sheet
 */
function clearAllAuditLogs() {
  try {
    const sheet = getAuditSheet_();
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
      SpreadsheetApp.flush();
    }
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
  
  const sName = sheet.getName().trim().toLowerCase();
  if (sName === 'master') return; // Ignore edits on Master sheet
  
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
      { field: 'doer', fieldLabel: 'Name Of Doer', oldValue: String(oldValue || 'Unassigned'), newValue: String(newValue) }
    ]);
  }
}

/**
 * Handles Actual Completion Date and Weekly Review calculation
 */
function handleActualTimestamp_(sheet, rowIndex, isComplete) {
  const colMap = getColumnMap_(sheet);
  if (isComplete) {
    const actualDate = formatFormulaDate_(new Date());
    sheet.getRange(rowIndex, colMap.ACTUAL).setValue(actualDate);
    computeWeeklyReview_(sheet, rowIndex);
  } else {
    sheet.getRange(rowIndex, colMap.ACTUAL).clearContent();
    if (colMap.REVIEW) sheet.getRange(rowIndex, colMap.REVIEW).clearContent();
  }
}

/**
 * Evaluates SLA Turnaround Time and sets Star Rating in Col J
 */
function computeWeeklyReview_(sheet, rowIndex) {
  const colMap = getColumnMap_(sheet);
  if (!colMap.REVIEW) return;
  
  const committed = colMap.COMMITTED ? sheet.getRange(rowIndex, colMap.COMMITTED).getValue() : null;
  const planned = sheet.getRange(rowIndex, colMap.PLANNED).getValue();
  const actual = sheet.getRange(rowIndex, colMap.ACTUAL).getValue();
  let expected = null;
  if (colMap.EXPECTED) {
    expected = sheet.getRange(rowIndex, colMap.EXPECTED).getValue();
  }
  
  if (!actual) return;
  
  const reviewText = calculateRating_(committed || planned, actual, expected);
  sheet.getRange(rowIndex, colMap.REVIEW).setValue(reviewText);
}

/**
 * Pure Rating Calculator
 */
function calculateRating_(dueDateVal, actualDateVal, expectedDateVal) {
  if (!actualDateVal) return '';
  const aDate = new Date(actualDateVal);
  if (isNaN(aDate.getTime())) return '';

  const eDate = expectedDateVal ? new Date(expectedDateVal) : null;
  const dDate = dueDateVal ? new Date(dueDateVal) : null;

  // 1. If completed on or before Assigner's Expected Target Date & Time
  if (eDate && !isNaN(eDate.getTime()) && aDate.getTime() <= eDate.getTime()) {
    return '⭐⭐⭐⭐⭐ Excellent (On Expected Time)';
  }

  // 2. If completed on or before Committed Due Date & Time
  if (dDate && !isNaN(dDate.getTime()) && aDate.getTime() <= dDate.getTime()) {
    return '⭐⭐⭐⭐⭐ Excellent (On Time)';
  }

  const refDate = (dDate && !isNaN(dDate.getTime())) ? dDate : eDate;
  if (!refDate || isNaN(refDate.getTime())) {
    return '⭐⭐⭐⭐⭐ Excellent (On Time)';
  }

  const delayDays = (aDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);

  if (delayDays <= 1.0) {
    return '⭐⭐⭐⭐ Very Good (Minor Delay)';
  } else if (delayDays <= 3.0) {
    return '⭐⭐⭐ Good (Delayed)';
  } else if (delayDays <= 7.0) {
    return '⭐⭐ Needs Improvement (Late)';
  } else {
    return '⭐ Poor (Overdue)';
  }
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
*Assigned On:* ${formatFormulaDate_(plannedDate)}
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

/**
 * =========================================================================
 * LOGIN PAGE & USER CREDENTIALS MANAGEMENT (Google Sheet Tab: "Login page")
 * =========================================================================
 */

/**
 * Returns or initializes the 'Login page' Google Sheet tab (7-Column Schema)
 * Col A: User ID
 * Col B: Username
 * Col C: Full Name
 * Col D: Role
 * Col E: Designation / Title
 * Col F: Password
 * Col G: Created Date
 */
function getLoginSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return null;
  let sheet = ss.getSheetByName('Login page') || ss.getSheetByName('Login Page') || ss.getSheetByName('login page') || ss.getSheetByName('Users');
  
  const headers = [['User ID', 'Username', 'Full Name', 'Role', 'Designation / Title', 'Password', 'Created Date']];
  
  if (!sheet) {
    sheet = ss.insertSheet('Login page');
    sheet.getRange(1, 1, 1, 7).setValues(headers)
      .setBackground('#0d1b2e')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontFamily('Arial')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120); // User ID
    sheet.setColumnWidth(2, 140); // Username
    sheet.setColumnWidth(3, 160); // Full Name
    sheet.setColumnWidth(4, 110); // Role
    sheet.setColumnWidth(5, 230); // Designation
    sheet.setColumnWidth(6, 130); // Password
    sheet.setColumnWidth(7, 170); // Created Date
  } else {
    // If existing sheet has 'Avatar Color' column, auto-remove it to keep clean 7-column schema
    try {
      const lastCol = sheet.getLastColumn();
      if (lastCol > 0) {
        const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        for (let c = headerRow.length - 1; c >= 0; c--) {
          const colName = String(headerRow[c] || '').toLowerCase();
          if (colName.includes('avatar')) {
            sheet.deleteColumn(c + 1);
          }
        }
      }
    } catch (cleanErr) {
      console.warn('Avatar Color cleanup error:', cleanErr);
    }
  }

  // If sheet is empty (only header row or 0 rows), auto populate default system accounts!
  if (sheet.getLastRow() <= 1) {
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 7).setValues(headers)
        .setBackground('#0d1b2e')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setFontFamily('Arial')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');
      sheet.setFrozenRows(1);
    }
    const defaultData = [
      ['admin', 'Admin', 'Admin', 'admin', 'System Administrator (Full Access)', '1234', formatFormulaDate_(new Date())],
      ['user-1', 'Deepak', 'Deepak', 'user', 'HR Executive', '1234', formatFormulaDate_(new Date())],
      ['user-2', 'Bhupendra', 'Bhupendra', 'user', 'HR Operations Lead', '1234', formatFormulaDate_(new Date())],
      ['user-3', 'MD Alaudin', 'MD Alaudin', 'user', 'HR Specialist', '1234', formatFormulaDate_(new Date())]
    ];
    sheet.getRange(2, 1, defaultData.length, 7).setValues(defaultData);
    SpreadsheetApp.flush();
  }
  return sheet;
}

/**
 * Manual helper to initialize or re-populate Login page accounts in Google Sheet
 */
function initLoginSheet() {
  const sheet = getLoginSheet_();
  return { success: true, rows: sheet ? sheet.getLastRow() : 0 };
}


/**
 * Fetches all system users from the 'Login page' sheet (7 columns)
 */
function getUsers_() {
  try {
    const sheet = getLoginSheet_();
    if (!sheet) return [];
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    
    const lastCol = Math.max(sheet.getLastColumn(), 7);
    const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const users = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const id = String(row[0] || ('user-' + (i + 1))).trim();
      const username = String(row[1] || '').trim();
      if (!username) continue;
      
      const roleStr = String(row[3] || 'user').toLowerCase().trim();
      const role = (roleStr === 'admin' || roleStr.includes('admin')) ? 'admin' : 'user';
      const name = String(row[2] || username).trim();
      const title = String(row[4] || (role === 'admin' ? 'System Administrator' : 'HR Team Member')).trim();
      const password = String(row[5] || '1234').trim();
      const createdAt = String(row[6] || '');
      
      users.push({
        id: id,
        username: username,
        name: name,
        role: role,
        title: title,
        password: password,
        email: username.toLowerCase().replace(/\s+/g, '.') + '@hr-dept.internal',
        createdAt: createdAt
      });
    }
    return users;
  } catch (e) {
    console.error('getUsers_ error:', e);
    return [];
  }
}

/**
 * Saves or updates a user in the 'Login page' sheet (7 columns)
 */
function saveUser_(userData) {
  try {
    const sheet = getLoginSheet_();
    if (!sheet) throw new Error("Login page sheet not found");
    
    const userId = String(userData.id || ('user-' + Date.now())).trim();
    const username = String(userData.username || userData.name || '').trim();
    const name = String(userData.name || username).trim();
    const role = String(userData.role || 'user').toLowerCase().includes('admin') ? 'admin' : 'user';
    const title = String(userData.title || '').trim();
    const password = String(userData.password || '1234').trim();
    const createdDate = formatFormulaDate_(userData.createdAt || new Date());
    
    const lastRow = sheet.getLastRow();
    let rowIndex = -1;
    if (lastRow > 1) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).toLowerCase() === userId.toLowerCase() || String(ids[i][1]).toLowerCase() === username.toLowerCase()) {
          rowIndex = i + 2;
          break;
        }
      }
    }
    
    if (rowIndex > 1) {
      sheet.getRange(rowIndex, 1, 1, 6).setValues([[userId, username, name, role, title, password]]);
    } else {
      sheet.appendRow([userId, username, name, role, title, password, createdDate]);
    }
    SpreadsheetApp.flush();
    return { 
      success: true, 
      user: { 
        id: userId, 
        username: username, 
        name: name, 
        role: role, 
        title: title, 
        password: password, 
        createdAt: createdDate 
      } 
    };
  } catch (e) {
    console.error('saveUser_ error:', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Deletes a user from the 'Login page' sheet
 */
function deleteUser_(userId) {
  try {
    const sheet = getLoginSheet_();
    if (!sheet) return { success: true };
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true };
    
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).toLowerCase() === String(userId).toLowerCase()) {
        sheet.deleteRow(i + 2);
        SpreadsheetApp.flush();
        return { success: true };
      }
    }
    return { success: true };
  } catch (e) {
    console.error('deleteUser_ error:', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Syncs a full list of users to the 'Login page' sheet (7 columns)
 */
function syncUsers_(usersList) {
  try {
    const sheet = getLoginSheet_();
    if (!sheet) return { success: false, error: "Sheet not found" };
    
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    
    const rows = usersList.map(function(u) {
      return [
        u.id || ('user-' + Date.now()),
        u.username || u.name || '',
        u.name || u.username || '',
        String(u.role || 'user').toLowerCase().includes('admin') ? 'admin' : 'user',
        u.title || '',
        u.password || '1234',
        formatFormulaDate_(u.createdAt || new Date())
      ];
    });
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 7).setValues(rows);
      SpreadsheetApp.flush();
    }
    return { success: true, count: rows.length };
  } catch (e) {
    console.error('syncUsers_ error:', e);
    return { success: false, error: e.toString() };
  }
}
