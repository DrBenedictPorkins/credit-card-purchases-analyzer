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
  
  // Show bar chart for category transactions
  showCategoryBarChart: (category, transactions) => ipcRenderer.invoke('show-category-chart', { category, transactions }),
  
  // For the detail window to receive transaction data
  onDetailData: (callback) => {
    ipcRenderer.on('detail-data', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeAllListeners('detail-data');
    };
  },
  
  // For the chart window to receive data
  onChartData: (callback) => {
    ipcRenderer.on('chart-data', (_, data) => {
      // Add debug logging for data received
      console.log('Chart data received in preload:', data ? (data.transactions ? data.transactions.length : 'no transactions') : 'no data');
      
      // Process amounts to ensure we have numeric values
      if (data && data.transactions && Array.isArray(data.transactions)) {
        data.transactions = data.transactions.map(t => {
          if (t) {
            // Ensure we have the amount as a number
            if (typeof t.Amount === 'string') {
              const parsedAmount = parseFloat(t.Amount.replace(/[$,]/g, ''));
              if (!isNaN(parsedAmount)) {
                console.log(`Converting amount in preload: ${t.Amount} -> ${parsedAmount}`);
                t.Amount = parsedAmount;
              }
            }
          }
          return t;
        });
      }
      
      callback(data);
    });
    return () => {
      ipcRenderer.removeAllListeners('chart-data');
    };
  }
});
