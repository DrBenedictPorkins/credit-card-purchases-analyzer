const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Store transactions data globally so it can be accessed by the detail window
let globalTransactions = [];

function createWindow() {
  const win = new BrowserWindow({
    width: 780,
    height: 1230,
    minWidth: 800,   // Minimum width
    minHeight: 600,  // Minimum height
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Create a window to show transactions with the same filter criteria
function createDetailWindow(filterValue, filterField) {
  // Get the primary display size
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  const title = filterField === 'vendor' ? `Vendor: ${filterValue}` : `Description: ${filterValue}`;
  
  // Create the detail window, making it smaller than the main window
  const detailWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: title,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  // Load the detail HTML file
  detailWindow.loadFile('detail.html');
  
  // Wait for the window to be ready
  detailWindow.webContents.on('did-finish-load', () => {
    // Debug the data we have
    console.log(`Looking for ${filterField}: "${filterValue}"`);
    console.log(`Total transactions available: ${globalTransactions.length}`);
    if (globalTransactions.length > 0) {
      console.log(`Sample transaction ${filterField}: "${globalTransactions[0][filterField === 'vendor' ? 'Vendor' : 'Description']}"`);
    }
    
    // Filter transactions that match the criteria (case-insensitive match)
    const fieldKey = filterField === 'vendor' ? 'Vendor' : 'Description';
    
    const matchingTransactions = globalTransactions.filter(
      transaction => {
        const transValue = transaction[fieldKey] || "";
        const searchValue = filterValue || "";
        return transValue.toLowerCase() === searchValue.toLowerCase();
      }
    );
    
    console.log(`Found ${matchingTransactions.length} matching transactions`);
    
    // Send the matching transactions to the renderer
    detailWindow.webContents.send('detail-data', {
      description: filterValue, // Keep same parameter name for compatibility with existing detail.html
      transactions: matchingTransactions
    });
  });
}

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });

  if (!result.canceled) {
    const filePath = result.filePaths[0];
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    // Filter out negative amounts (credits/payments) and remove quotes from Description field
    const filteredRecords = records.filter(record => parseFloat(record.Amount) > 0)
      .map(record => {
        // Remove double quotes from Description field if present
        if (record.Description) {
          record.Description = record.Description.replace(/["]/g, '');
        }
        return record;
      });
    
    // Store transactions globally for access by detail window
    globalTransactions = filteredRecords;
    
    return filteredRecords;
  }
  return null;
});

// Handler to store transactions from renderer process
ipcMain.handle('store-transactions', async (_, transactions) => {
  console.log(`Received ${transactions.length} transactions from renderer`);
  globalTransactions = transactions;
  return true;
});

// Handle request to open the description detail window
ipcMain.handle('show-description-detail', async (_, description) => {
  createDetailWindow(description, 'description');
  return true;
});

// Handle request to open the vendor detail window
ipcMain.handle('show-vendor-detail', async (_, vendor) => {
  createDetailWindow(vendor, 'vendor');
  return true;
});
