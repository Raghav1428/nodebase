export interface TriggerOptions {
  includeFullData?: boolean;
  maxRows?: number;
  sheetName?: string;             // Only trigger on this sheet/tab
  triggerValue?: string;          // Only trigger when cell changes to this value
  debounceSeconds?: number;       // Minimum seconds between triggers
}

export const generateGoogleSheetsScript = (
  webhookUrl: string,
  secret?: string,
  options?: TriggerOptions
) => {
  const includeFullData = options?.includeFullData ?? false;
  const maxRows = options?.maxRows ?? 1000;
  const sheetName = options?.sheetName ?? '';
  const triggerValue = options?.triggerValue ?? '';
  const debounceSeconds = options?.debounceSeconds ?? 0;

  return `// ===== CONFIGURATION =====
var INCLUDE_FULL_DATA = ${includeFullData}; // Include all sheet data in payload
var MAX_ROWS = ${maxRows}; // Maximum rows to fetch

// Trigger Filters (leave empty to trigger on any change)
var SHEET_NAME = '${sheetName}'; // Only trigger on this sheet/tab (e.g., 'Orders')
var TRIGGER_VALUE = '${triggerValue}'; // Only trigger when cell changes TO this value (e.g., 'Complete')

// Debounce (prevents rapid triggering)
var DEBOUNCE_SECONDS = ${debounceSeconds}; // Minimum seconds between triggers (0 = disabled)

// ===== HELPER FUNCTIONS =====

// Check if trigger should fire based on filters
function shouldTrigger(sheet, newValue) {
  // Check sheet name filter
  if (SHEET_NAME && sheet.getName() !== SHEET_NAME) {
    return false; // Not the target sheet
  }
  
  // Check value filter
  if (TRIGGER_VALUE && String(newValue) !== TRIGGER_VALUE) {
    return false; // Value doesn't match
  }
  
  return true;
}

// Debounce using Script Properties
function checkDebounce() {
  if (DEBOUNCE_SECONDS <= 0) return true;
  
  var props = PropertiesService.getScriptProperties();
  var lastTrigger = props.getProperty('lastTriggerTime');
  var now = new Date().getTime();
  
  if (lastTrigger) {
    var elapsed = (now - parseInt(lastTrigger)) / 1000;
    if (elapsed < DEBOUNCE_SECONDS) {
      return false; // Still in debounce period
    }
  }
  
  props.setProperty('lastTriggerTime', String(now));
  return true;
}

// Get sheet data with row limit
function getSheetData(sheet, maxRows) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow < 2 || lastCol < 1) return { data: [], truncated: false, totalRows: 0 };
  
  var totalDataRows = lastRow - 1;
  var rowsToFetch = Math.min(totalDataRows, maxRows);
  var truncated = totalDataRows > maxRows;
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var dataRange = sheet.getRange(2, 1, rowsToFetch, lastCol).getValues();
  
  var result = [];
  for (var i = 0; i < dataRange.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j]) {
        row[headers[j]] = dataRange[i][j];
      }
    }
    result.push(row);
  }
  return { data: result, truncated: truncated, totalRows: totalDataRows };
}

// ===== TRIGGER FUNCTIONS =====

function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  var oldValue = e.oldValue || '';
  var newValue = e.value || '';
  
  // Check filters
  if (!shouldTrigger(sheet, newValue)) {
    return; // Filtered out
  }
  
  // Check debounce
  if (!checkDebounce()) {
    return; // Still in debounce period
  }
  
  // Get row data
  var row = range.getRow();
  var columnIndex = range.getColumn();
  var lastCol = sheet.getLastColumn();
  var rowData = {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rowValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  
  for (var i = 0; i < headers.length; i++) {
    if (headers[i]) {
      rowData[headers[i]] = rowValues[i];
    }
  }

  var payload = {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    sheetName: sheet.getName(),
    range: range.getA1Notation(),
    changeType: 'edit',
    changedRow: row,
    changedColumn: columnIndex,
    changedColumnName: headers[columnIndex - 1] || null,
    oldValue: oldValue,
    newValue: newValue,
    changedBy: Session.getActiveUser().getEmail(),
    timestamp: new Date().toISOString(),
    rowData: rowData,
    totalRows: sheet.getLastRow() - 1
  };

  if (INCLUDE_FULL_DATA) {
    var sheetDataResult = getSheetData(sheet, MAX_ROWS);
    payload.allData = sheetDataResult.data;
    payload.allDataTruncated = sheetDataResult.truncated;
  }

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'headers': {
      'X-Secret': ${JSON.stringify(secret || "")}
    },
    'muteHttpExceptions': true
  };

  var WEBHOOK_URL = '${webhookUrl}';

  try {
    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch(error) {
    console.error('Webhook failed:', error);
  }
}

function onFormSubmit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Check debounce (no column/value filter for form submissions)
  if (!checkDebounce()) {
    return;
  }
  
  var row = range.getRow();
  var lastCol = sheet.getLastColumn();
  var rowData = {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rowValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  
  for (var i = 0; i < headers.length; i++) {
    if (headers[i]) {
      rowData[headers[i]] = rowValues[i];
    }
  }

  var payload = {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    sheetName: sheet.getName(),
    range: range.getA1Notation(),
    changeType: 'formSubmit',
    changedRow: row,
    changedColumn: null,
    changedColumnName: null,
    oldValue: null,
    newValue: null,
    changedBy: e.namedValues ? e.namedValues['Email Address'] : null,
    timestamp: new Date().toISOString(),
    rowData: rowData,
    totalRows: sheet.getLastRow() - 1
  };

  if (INCLUDE_FULL_DATA) {
    var sheetDataResult = getSheetData(sheet, MAX_ROWS);
    payload.allData = sheetDataResult.data;
    payload.allDataTruncated = sheetDataResult.truncated;
  }

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'headers': {
      'X-Secret': ${JSON.stringify(secret || "")}
    },
    'muteHttpExceptions': true
  };

  var WEBHOOK_URL = '${webhookUrl}';

  try {
    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch(error) {
    console.error('Webhook failed:', error);
  }
}`;
};


