export const generateGoogleSheetsScript = (
  webhookUrl: string,
  options?: { includeFullData?: boolean; maxRows?: number }
) => {
  const includeFullData = options?.includeFullData ?? false;
  const maxRows = options?.maxRows ?? 1000;

  return `// Configuration
var INCLUDE_FULL_DATA = ${includeFullData}; // Set to true to include all sheet data
var MAX_ROWS = ${maxRows}; // Maximum rows to fetch (prevents payload limits)

// Helper function to get sheet data with optional row limit
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

function onEdit(e) {
  // Get the range that was edited
  var range = e.range;
  var sheet = range.getSheet();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get old and new values
  var oldValue = e.oldValue || '';
  var newValue = e.value || '';
  
  // Get the row data for context
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

  // Prepare webhook payload
  var payload = {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    sheetName: sheet.getName(),
    range: range.getA1Notation(),
    changeType: 'edit',
    changedRow: row,
    changedColumn: range.getColumn(),
    oldValue: oldValue,
    newValue: newValue,
    changedBy: Session.getActiveUser().getEmail(),
    timestamp: new Date().toISOString(),
    rowData: rowData,
    totalRows: sheet.getLastRow() - 1
  };

  // Only include full sheet data if explicitly enabled
  if (INCLUDE_FULL_DATA) {
    var sheetDataResult = getSheetData(sheet, MAX_ROWS);
    payload.allData = sheetDataResult.data;
    payload.allDataTruncated = sheetDataResult.truncated;
  }

  // Send to webhook
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
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
  // Handle form submissions that add rows
  var range = e.range;
  var sheet = range.getSheet();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
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
    oldValue: null,
    newValue: null,
    changedBy: e.namedValues ? e.namedValues['Email Address'] : null,
    timestamp: new Date().toISOString(),
    rowData: rowData,
    totalRows: sheet.getLastRow() - 1
  };

  // Only include full sheet data if explicitly enabled
  if (INCLUDE_FULL_DATA) {
    var sheetDataResult = getSheetData(sheet, MAX_ROWS);
    payload.allData = sheetDataResult.data;
    payload.allDataTruncated = sheetDataResult.truncated;
  }

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
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

