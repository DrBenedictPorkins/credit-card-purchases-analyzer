const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showOpenDialog: () => ipcRenderer.invoke('dialog:openFile'),
  openFile: (filePath) => ipcRenderer.invoke('file:open', filePath)
});
