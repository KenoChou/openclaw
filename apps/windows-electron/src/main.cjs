const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

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

function openCommandInTerminal(commandLabel, command) {
  // We use a separate terminal window so interactive prompts (like onboard)
  // behave exactly like the CLI version users already know.
  if (process.platform === 'win32') {
    spawn(
      'cmd.exe',
      ['/d', '/s', '/c', 'start', '""', 'cmd.exe', '/k', command],
      {
        detached: true,
        stdio: 'ignore',
      },
    ).unref();
    return;
  }

  const title = `OpenClaw ${commandLabel}`;
  if (process.platform === 'darwin') {
    const escaped = command.replace(/"/g, '\\"');
    spawn('osascript', [
      '-e',
      `tell application "Terminal" to do script "${escaped}"`,
      '-e',
      `tell application "Terminal" to set custom title of front window to "${title}"`,
    ]).unref();
    return;
  }

  spawn('x-terminal-emulator', ['-e', command], { detached: true, stdio: 'ignore' }).unref();
}

async function showLauncherPage() {
  if (!mainWindow) {
    return;
  }
  await mainWindow.loadFile(path.join(__dirname, 'launcher.html'));
}

async function showWebchat() {
  if (!mainWindow) {
    return;
  }
  await mainWindow.loadURL(WEBCHAT_URL);
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
      preload: path.join(__dirname, 'preload.cjs'),
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

ipcMain.handle('setup:open-onboard-terminal', async () => {
  openCommandInTerminal('Onboarding', 'openclaw onboard --install-daemon');
  return { ok: true };
});

ipcMain.handle('setup:open-gateway-terminal', async () => {
  openCommandInTerminal('Gateway', 'openclaw gateway run --bind loopback --port 18789 --force');
  return { ok: true };
});

ipcMain.handle('setup:open-docs', async () => {
  await shell.openExternal('https://docs.openclaw.ai/platforms/windows');
  return { ok: true };
});

ipcMain.handle('setup:retry-connect', async () => {
  const ready = await waitForGateway(10_000);
  if (ready) {
    await showWebchat();
  }
  return { ready };
});

app.whenReady().then(async () => {
  startGateway();
  createWindow();

  const ready = await waitForGateway();
  if (ready) {
    await showWebchat();
    return;
  }

  await showLauncherPage();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopGateway();
});
