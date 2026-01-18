export const generateGoogleSheetsScript = (
  webhookUrl: string,
) => `// Helper function to get all sheet data as array of objects
function getAllSheetData(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow < 2 || lastCol < 1) return [];
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
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
  return result;
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

  // Get all sheet data for full context
  var allData = getAllSheetData(sheet);

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
    allData: allData  // Full sheet data for summarization
  };

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

  // Get all sheet data for full context
  var allData = getAllSheetData(sheet);

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
    allData: allData  // Full sheet data for summarization
  };

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

