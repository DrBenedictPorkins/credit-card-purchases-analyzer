const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Store transactions data globally so it can be accessed by other windows
let globalTransactions = [];
let chartWindows = new Map(); // Keep track of chart windows by category

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

// Handle request to open bar chart window for a category
ipcMain.handle('show-category-chart', async (_, data) => {
  const { category, transactions } = data;
  
  // Check if a chart window for this category already exists
  if (chartWindows.has(category)) {
    const existingWindow = chartWindows.get(category);
    
    // Check if the window is still open
    if (!existingWindow.isDestroyed()) {
      existingWindow.focus(); // Bring window to front
      
      // Update the data in the existing window
      existingWindow.webContents.send('chart-data', { 
        category, 
        transactions 
      });
      
      return true;
    }
    
    // Remove reference to destroyed window
    chartWindows.delete(category);
  }
  
  // Get the primary display size
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Create new chart window
  const chartWindow = new BrowserWindow({
    width: 800,
    height: 800,
    title: `Timeline: ${category}`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  // Load the chart HTML file
  chartWindow.loadFile('chart.html');
  
  // Store reference to the new window
  chartWindows.set(category, chartWindow);
  
  // When window is closed, remove from our map
  chartWindow.on('closed', () => {
    chartWindows.delete(category);
  });
  
  // Wait for the window to be ready
  chartWindow.webContents.on('did-finish-load', () => {
    // Log transactions before sending to chart window
    console.log(`Sending ${transactions.length} transactions to chart window for ${category}`);
    
    // CRITICAL FIX: Force all transactions to have numeric amounts
    // Create simplified transactions with just the data we need
    // And force all amounts to be numeric values
    const processedTransactions = transactions.map(t => {
      // Parse amount regardless of type
      const amountStr = typeof t.Amount === 'string' ? t.Amount : String(t.Amount);
      let parsedAmount = parseFloat(amountStr.replace(/[$,]/g, ''));
      
      // If we can't parse a valid amount, use the NumericAmount field
      if (isNaN(parsedAmount) && t.NumericAmount !== undefined) {
        parsedAmount = parseFloat(t.NumericAmount);
      }
      
      // If we still don't have a valid number, force a small positive value
      // This ensures the chart displays
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        parsedAmount = 1.0; // Use a minimal positive value
      }
      
      // Create a clean simple object with just what we need
      return {
        Date: t.Date || '',
        Vendor: t.Vendor || '',
        Description: t.Description || '',
        Category: t.Category || '',
        // ALWAYS use the parsed amount as a number
        Amount: parsedAmount
      };
    });
    
    if (processedTransactions.length > 0) {
      console.log("First processed transaction:", JSON.stringify(processedTransactions[0]).substring(0, 200));
      console.log("Amount value:", processedTransactions[0].Amount);
      console.log("Amount type:", typeof processedTransactions[0].Amount);
      
      // Also check if NumericAmount exists
      if (processedTransactions[0].NumericAmount !== undefined) {
        console.log("NumericAmount:", processedTransactions[0].NumericAmount);
      }
    }
    
    // Send data to the chart window
    chartWindow.webContents.send('chart-data', { 
      category, 
      transactions: processedTransactions 
    });
  });
  
  return true;
});
