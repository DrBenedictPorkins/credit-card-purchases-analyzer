const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
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

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });

  if (!result.canceled) {
    const filePath = result.filePaths[0];
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    // Filter out negative amounts (credits/payments)
    const filteredRecords = records.filter(record => parseFloat(record.Amount) > 0);
    return filteredRecords;
  }
  return null;
});
