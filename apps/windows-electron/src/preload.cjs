const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openclawDesktop', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  gatewayStatus: () => ipcRenderer.invoke('gateway:status'),
});
