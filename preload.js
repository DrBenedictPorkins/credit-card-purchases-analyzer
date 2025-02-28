const { contextBridge, ipcRenderer } = require('electron');

// Set up the context bridge with the IPC functions
contextBridge.exposeInMainWorld('electronAPI', {
  // Main functions
  showOpenDialog: () => ipcRenderer.invoke('dialog:openFile'),
  openFile: (filePath) => ipcRenderer.invoke('file:open', filePath),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  storeTransactions: (transactions) => ipcRenderer.invoke('store-transactions', transactions),
  
  // Show detail window with transactions matching a description
  showDescriptionDetail: (description) => ipcRenderer.invoke('show-description-detail', description),
  
  // Show detail window with transactions matching a vendor
  showVendorDetail: (vendor) => ipcRenderer.invoke('show-vendor-detail', vendor),
  
  // For the detail window to receive transaction data
  onDetailData: (callback) => {
    ipcRenderer.on('detail-data', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeAllListeners('detail-data');
    };
  }
});
