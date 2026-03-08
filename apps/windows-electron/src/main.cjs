const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');

const GATEWAY_HOST = '127.0.0.1';
const GATEWAY_PORT = 18789;
const WEBCHAT_URL = `http://${GATEWAY_HOST}:${GATEWAY_PORT}/webchat`;

let mainWindow = null;
let gatewayProcess = null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkGatewayReady() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: '/health',
        method: 'GET',
        timeout: 1_500,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 500);
      },
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function waitForGateway(timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkGatewayReady()) {
      return true;
    }
    await wait(400);
  }
  return false;
}

function startGateway() {
  if (gatewayProcess) {
    return;
  }

  gatewayProcess = spawn(
    'openclaw',
    ['gateway', 'run', '--bind', 'loopback', '--port', String(GATEWAY_PORT), '--force'],
    {
      stdio: 'ignore',
      windowsHide: true,
      detached: false,
    },
  );

  gatewayProcess.on('exit', () => {
    gatewayProcess = null;
  });
}

function stopGateway() {
  if (!gatewayProcess) {
    return;
  }
  gatewayProcess.kill();
  gatewayProcess = null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 700,
    autoHideMenuBar: true,
    title: 'OpenClaw',
    webPreferences: {
      preload: require('node:path').join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('gateway:status', async () => {
  return {
    ready: await checkGatewayReady(),
    url: WEBCHAT_URL,
  };
});

app.whenReady().then(async () => {
  startGateway();
  createWindow();

  const ready = await waitForGateway();
  if (ready) {
    await mainWindow.loadURL(WEBCHAT_URL);
    return;
  }

  await dialog.showMessageBox({
    type: 'error',
    title: 'OpenClaw Gateway not reachable',
    message: 'Could not start or reach the local OpenClaw Gateway.',
    detail:
      'Install openclaw CLI and make sure it is available in PATH, then relaunch this app.',
  });

  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopGateway();
});
