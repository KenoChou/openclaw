const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openclawDesktop', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  gatewayStatus: () => ipcRenderer.invoke('gateway:status'),
  openOnboardTerminal: () => ipcRenderer.invoke('setup:open-onboard-terminal'),
  openGatewayTerminal: () => ipcRenderer.invoke('setup:open-gateway-terminal'),
  openWindowsDocs: () => ipcRenderer.invoke('setup:open-docs'),
  retryConnect: () => ipcRenderer.invoke('setup:retry-connect'),
});
