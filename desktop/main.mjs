import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import electron from 'electron';
import * as electronUpdaterPackage from 'electron-updater';

const { app, BrowserWindow, dialog, shell } = electron;
const { NsisUpdater } =
  electronUpdaterPackage.default || electronUpdaterPackage;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const preloadPath = path.join(__dirname, 'preload.mjs');
const splashHtmlPath = path.join(__dirname, 'splash.html');
const desktopIconPath = path.join(__dirname, 'assets', 'invendex-desktop.ico');
const windowState = {
  width: 1480,
  height: 960,
  minWidth: 1180,
  minHeight: 760
};

let backendProcess = null;
let mainWindow = null;
let splashWindow = null;
let backendBaseUrl = '';
let isQuitting = false;
let splashShownAt = 0;
let desktopUpdater = null;
let autoUpdateIntervalHandle = null;
let autoUpdateCheckInFlight = false;
let updatePromptOpen = false;
let lastLoggedDownloadProgress = -1;

const generateSecret = () => randomBytes(32).toString('hex');
const getPackagedDesktopBundleRoot = () => {
  const candidates = [
    path.join(process.resourcesPath, 'desktop-resources'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'desktop-resources'),
    path.join(app.getAppPath(), 'desktop-resources')
  ];

  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
};
const getDesktopBundleRoot = () =>
  app.isPackaged
    ? getPackagedDesktopBundleRoot()
    : path.join(app.getAppPath(), 'desktop-resources');
const getFrontendBundleDir = () =>
  path.join(getDesktopBundleRoot(), 'frontend');
const getBackendBundleDir = () => path.join(getDesktopBundleRoot(), 'backend');
const getDesktopConfigPath = () =>
  path.join(app.getPath('userData'), 'desktop-config.json');
const getBackendLogPath = () =>
  path.join(app.getPath('userData'), 'backend.log');
const getDesktopLogPath = () =>
  path.join(app.getPath('userData'), 'desktop.log');
const getPackagedUpdateConfigPath = () =>
  path.join(process.resourcesPath, 'app-update.yml');
const getDesktopWindowIcon = () =>
  existsSync(desktopIconPath) ? desktopIconPath : undefined;
const getSplashLogoPath = () =>
  path.join(getFrontendBundleDir(), 'logo512.png');

const execFileText = (file, args) =>
  new Promise((resolve) => {
    execFile(file, args, { windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        error,
        stdout: String(stdout || ''),
        stderr: String(stderr || '')
      });
    });
  });

const appendLogLine = (logPath, message) => {
  mkdirSync(path.dirname(logPath), { recursive: true });
  appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
};

const appendBackendLog = (message) => {
  appendLogLine(getBackendLogPath(), message);
};

const appendDesktopLog = (message) => {
  appendLogLine(getDesktopLogPath(), message);
};

const writeDesktopLogSection = (title) => {
  appendDesktopLog('');
  appendDesktopLog(title);
};

const writeBackendLogSection = (title) => {
  appendBackendLog('');
  appendBackendLog(title);
};

const formatLogValue = (value) => {
  if (value instanceof Error) {
    return value.stack || `${value.name}: ${value.message}`;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const autoUpdateLogger = {
  info: (...values) => {
    appendDesktopLog(
      `[auto-update][info] ${values.map((value) => formatLogValue(value)).join(' ')}`
    );
  },
  warn: (...values) => {
    appendDesktopLog(
      `[auto-update][warn] ${values.map((value) => formatLogValue(value)).join(' ')}`
    );
  },
  error: (...values) => {
    appendDesktopLog(
      `[auto-update][error] ${values.map((value) => formatLogValue(value)).join(' ')}`
    );
  },
  debug: (...values) => {
    appendDesktopLog(
      `[auto-update][debug] ${values.map((value) => formatLogValue(value)).join(' ')}`
    );
  }
};

const parseOptionalBoolean = (value) => {
  if (value == null) return null;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  return null;
};

const parseOptionalPositiveInteger = (value) => {
  if (value == null || value === '') return null;

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const ensureDesktopConfig = () => {
  const desktopConfigPath = getDesktopConfigPath();
  const defaults = {
    dbUrl: 'mongodb://127.0.0.1:27017/invendex',
    jwtAccessSecret: generateSecret(),
    jwtRefreshSecret: generateSecret(),
    autoUpdateEnabled: true,
    autoUpdateUrl: '',
    autoUpdateChannel: 'latest',
    autoUpdateAllowPrerelease: false,
    autoUpdateCheckIntervalMinutes: 360,
    createdAt: new Date().toISOString()
  };

  if (!existsSync(desktopConfigPath)) {
    mkdirSync(path.dirname(desktopConfigPath), { recursive: true });
    writeFileSync(desktopConfigPath, JSON.stringify(defaults, null, 2));
    return defaults;
  }

  try {
    const existing = JSON.parse(readFileSync(desktopConfigPath, 'utf8'));
    const merged = {
      ...defaults,
      ...(existing && typeof existing === 'object' ? existing : {})
    };

    writeFileSync(desktopConfigPath, JSON.stringify(merged, null, 2));
    return merged;
  } catch {
    writeFileSync(desktopConfigPath, JSON.stringify(defaults, null, 2));
    return defaults;
  }
};

const getAutoUpdateSettings = (config) => {
  if (!app.isPackaged) {
    appendDesktopLog(
      'Auto-updates are disabled while running an unpackaged build.'
    );
    return null;
  }

  if (typeof NsisUpdater !== 'function') {
    appendDesktopLog(
      'Auto-updates are unavailable because electron-updater did not expose NsisUpdater.'
    );
    return null;
  }

  const envEnabled = parseOptionalBoolean(
    process.env.INVENDEX_AUTO_UPDATE_ENABLED
  );
  const envAllowPrerelease = parseOptionalBoolean(
    process.env.INVENDEX_AUTO_UPDATE_ALLOW_PRERELEASE
  );
  const envCheckIntervalMinutes = parseOptionalPositiveInteger(
    process.env.INVENDEX_AUTO_UPDATE_CHECK_INTERVAL_MINUTES
  );
  const enabled = envEnabled ?? Boolean(config.autoUpdateEnabled ?? true);
  const url = String(
    process.env.INVENDEX_AUTO_UPDATE_URL || config.autoUpdateUrl || ''
  ).trim();
  const channel = String(
    process.env.INVENDEX_AUTO_UPDATE_CHANNEL ||
      config.autoUpdateChannel ||
      'latest'
  ).trim();
  const allowPrerelease =
    envAllowPrerelease ?? Boolean(config.autoUpdateAllowPrerelease);
  const intervalMinutes = Math.max(
    envCheckIntervalMinutes ??
      parseOptionalPositiveInteger(config.autoUpdateCheckIntervalMinutes) ??
      360,
    15
  );

  if (!enabled) {
    appendDesktopLog('Auto-updates are disabled in desktop-config.json.');
    return null;
  }

  if (url) {
    return {
      provider: 'generic',
      url: url.replace(/\/+$/, ''),
      channel: channel || 'latest',
      allowPrerelease,
      checkIntervalMs: intervalMinutes * 60 * 1000
    };
  }

  if (existsSync(getPackagedUpdateConfigPath())) {
    return {
      provider: 'packaged',
      channel: channel || 'latest',
      allowPrerelease,
      checkIntervalMs: intervalMinutes * 60 * 1000
    };
  }

  appendDesktopLog(
    'Auto-updates are enabled, but neither autoUpdateUrl nor a packaged app-update.yml feed is available.'
  );
  return null;
};

const getFreePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port =
        typeof address === 'object' && address ? Number(address.port) : 0;

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForBackendReady = async (baseUrl, timeoutMs = 30_000) => {
  const startedAt = Date.now();
  const healthUrl = `${baseUrl}/health`;

  while (Date.now() - startedAt < timeoutMs) {
    if (backendProcess?.exitCode != null) {
      throw new Error(
        `Backend exited before the desktop app became ready. Check ${getBackendLogPath()} for details.`
      );
    }

    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // Retry until timeout.
    }

    await sleep(500);
  }

  throw new Error(
    `Timed out waiting for the backend to respond at ${healthUrl}. Check that MongoDB is running and review ${getBackendLogPath()}.`
  );
};

const buildDesktopBackendEnv = (config, port) => {
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    ...process.env,
    NODE_ENV: 'desktop',
    PORT: String(port),
    DB_URL:
      String(config.dbUrl || '').trim() || 'mongodb://127.0.0.1:27017/invendex',
    JWT_ACCESS_SECRET:
      String(config.jwtAccessSecret || '').trim() || generateSecret(),
    JWT_REFRESH_SECRET:
      String(config.jwtRefreshSecret || '').trim() || generateSecret(),
    JWT_ACCESS_SECRET_PREVIOUS: '',
    JWT_REFRESH_SECRET_PREVIOUS: '',
    JWT_ACCESS_EXPIRES: '1d',
    JWT_REFRESH_EXPIRES: '7d',
    AUTH_REQUIRE_EMAIL_VERIFICATION: 'false',
    AUTH_TEST_BYPASS: 'false',
    APP_WEB_URL: baseUrl,
    PUBLIC_API_BASE_URL: baseUrl,
    CORS_ORIGIN: `${baseUrl},http://localhost:${port}`,
    SOCKET_CORS_ORIGIN: `${baseUrl},http://localhost:${port}`,
    COOKIE_SECURE: 'false',
    COOKIE_SAMESITE: 'lax',
    CSRF_ENABLED: 'true',
    REALTIME_ENABLED: 'true',
    REALTIME_REDIS_ENABLED: 'false',
    RATE_LIMIT_REDIS_ENABLED: 'false',
    BACKGROUND_JOB_QUEUE_ENABLED: 'false',
    BACKGROUND_JOB_RUN_INLINE_WORKER: 'true',
    EMAIL_NOTIFICATIONS_ENABLED: 'false',
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_REQUIRE_TLS: 'false',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM_EMAIL: '',
    SMTP_FROM_NAME: 'Invendex',
    SMS_PROVIDER: 'none',
    WHATSAPP_PROVIDER: 'none',
    HTTP_LOGGER: 'morgan',
    INVENDEX_DESKTOP_RUNTIME: 'true',
    INVENDEX_DESKTOP_FRONTEND_DIR: getFrontendBundleDir()
  };
};

const killProcessTree = async (pid) => {
  if (!pid) return;

  if (process.platform === 'win32') {
    await execFileText('taskkill', ['/PID', String(pid), '/T', '/F']);
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // Ignore shutdown races.
  }
};

const stopBackend = async () => {
  if (!backendProcess || backendProcess.exitCode != null) return;
  const pid = backendProcess.pid;
  backendProcess = null;
  await killProcessTree(pid);
};

const closeSplashWindow = async () => {
  if (!splashWindow || splashWindow.isDestroyed()) {
    splashWindow = null;
    splashShownAt = 0;
    return;
  }

  const minVisibleMs = 1200;
  const elapsedMs = splashShownAt ? Date.now() - splashShownAt : 0;
  if (elapsedMs < minVisibleMs) {
    await sleep(minVisibleMs - elapsedMs);
  }

  if (!splashWindow.isDestroyed()) {
    splashWindow.destroy();
  }

  splashWindow = null;
  splashShownAt = 0;
};

const showStartupError = async (error) => {
  const message =
    error instanceof Error ? error.message : 'Unknown desktop startup failure.';

  appendDesktopLog(
    `Desktop startup failed: ${error instanceof Error ? error.stack || error.message : String(error)}`
  );

  await closeSplashWindow();
  await dialog.showMessageBox({
    type: 'error',
    title: 'Invendex could not start',
    message: 'The Invendex desktop app could not finish starting.',
    detail: `${message}\n\nBackend log: ${getBackendLogPath()}\nDesktop log: ${getDesktopLogPath()}`
  });
};

const ensureDesktopBundleExists = () => {
  const indexPath = path.join(getFrontendBundleDir(), 'index.html');
  const serverPath = path.join(getBackendBundleDir(), 'src', 'server.js');

  if (!existsSync(indexPath) || !existsSync(serverPath)) {
    throw new Error(
      'Desktop resources are missing. Run `npm run desktop:prepare` before starting the desktop app.'
    );
  }
};

const createSplashWindow = async () => {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 520,
    show: false,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    center: true,
    title: 'Invendex',
    backgroundColor: '#071120',
    icon: getDesktopWindowIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  splashWindow.removeMenu();
  splashWindow.on('closed', () => {
    splashWindow = null;
    splashShownAt = 0;
  });

  const readyToShow = new Promise((resolve) => {
    splashWindow.once('ready-to-show', () => {
      splashShownAt = Date.now();
      splashWindow?.show();
      resolve();
    });
  });

  await splashWindow.loadFile(splashHtmlPath, {
    query: {
      logoPath: existsSync(getSplashLogoPath())
        ? pathToFileURL(getSplashLogoPath()).toString()
        : ''
    }
  });

  await readyToShow;
};

const startBackend = async (config) => {
  ensureDesktopBundleExists();
  const port = await getFreePort();
  backendBaseUrl = `http://127.0.0.1:${port}`;

  writeBackendLogSection('Starting bundled backend');
  appendBackendLog(`Base URL: ${backendBaseUrl}`);
  appendBackendLog(`Frontend dir: ${getFrontendBundleDir()}`);
  appendBackendLog(`DB_URL: ${config.dbUrl}`);

  backendProcess = execFile(
    process.execPath,
    [path.join(getBackendBundleDir(), 'src', 'server.js')],
    {
      cwd: getBackendBundleDir(),
      env: {
        ...buildDesktopBackendEnv(config, port),
        ELECTRON_RUN_AS_NODE: '1'
      },
      windowsHide: true
    }
  );

  backendProcess.stdout?.setEncoding('utf8');
  backendProcess.stderr?.setEncoding('utf8');
  backendProcess.stdout?.on('data', (chunk) => {
    appendBackendLog(`[stdout] ${String(chunk).trimEnd()}`);
  });
  backendProcess.stderr?.on('data', (chunk) => {
    appendBackendLog(`[stderr] ${String(chunk).trimEnd()}`);
  });
  backendProcess.on('exit', async (code, signal) => {
    appendBackendLog(
      `[exit] code=${String(code)} signal=${String(signal || '') || 'none'}`
    );

    if (isQuitting) return;

    const detail =
      code === 0
        ? 'The bundled backend stopped.'
        : `The bundled backend stopped unexpectedly${
            code != null ? ` with code ${code}` : ''
          }.`;

    await dialog.showMessageBox({
      type: 'error',
      title: 'Invendex backend stopped',
      message: detail,
      detail: `Review the backend log for details:\n${getBackendLogPath()}`
    });

    app.quit();
  });

  await waitForBackendReady(backendBaseUrl);
};

const promptToInstallDownloadedUpdate = async (info) => {
  if (updatePromptOpen) {
    return;
  }

  updatePromptOpen = true;

  try {
    const result = await dialog.showMessageBox(mainWindow ?? undefined, {
      type: 'info',
      title: 'Invendex update ready',
      buttons: ['Install and restart', 'Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      message: 'A newer Invendex version has been downloaded.',
      detail: `Version ${info?.version || 'unknown'} is ready to install. Choose "Install and restart" to apply the update now.`
    });

    if (result.response === 0) {
      appendDesktopLog('Installing downloaded update after user confirmation.');
      desktopUpdater?.quitAndInstall();
    } else {
      appendDesktopLog('Update installation deferred by the user.');
    }
  } finally {
    updatePromptOpen = false;
  }
};

const runAutoUpdateCheck = async (reason = 'scheduled') => {
  if (!desktopUpdater || autoUpdateCheckInFlight) {
    return;
  }

  autoUpdateCheckInFlight = true;
  appendDesktopLog(`Checking for desktop updates (${reason}).`);

  try {
    await desktopUpdater.checkForUpdates();
  } catch (error) {
    appendDesktopLog(
      `Update check failed (${reason}): ${formatLogValue(error)}`
    );
  } finally {
    autoUpdateCheckInFlight = false;
  }
};

const startAutoUpdater = (config) => {
  const settings = getAutoUpdateSettings(config);
  if (!settings) {
    return;
  }

  desktopUpdater =
    settings.provider === 'generic'
      ? new NsisUpdater({
          provider: 'generic',
          url: settings.url,
          channel: settings.channel
        })
      : new NsisUpdater();
  desktopUpdater.logger = autoUpdateLogger;
  desktopUpdater.autoDownload = true;
  desktopUpdater.autoInstallOnAppQuit = true;
  desktopUpdater.allowPrerelease = settings.allowPrerelease;
  desktopUpdater.disableWebInstaller = true;
  desktopUpdater.verifyUpdateCodeSignature = async () => null;
  if (
    settings.provider === 'generic' ||
    settings.channel.toLowerCase() !== 'latest'
  ) {
    desktopUpdater.channel = settings.channel;
  }
  desktopUpdater.on('checking-for-update', () => {
    appendDesktopLog('Auto-update check started.');
  });
  desktopUpdater.on('update-available', (info) => {
    appendDesktopLog(
      `Update available: version ${String(info?.version || 'unknown')}.`
    );
  });
  desktopUpdater.on('update-not-available', () => {
    appendDesktopLog('No desktop update is currently available.');
  });
  desktopUpdater.on('download-progress', (progress) => {
    const roundedPercent = Math.round(Number(progress?.percent || 0));

    if (roundedPercent === lastLoggedDownloadProgress) {
      return;
    }

    lastLoggedDownloadProgress = roundedPercent;
    appendDesktopLog(
      `Downloading desktop update: ${roundedPercent}% complete.`
    );
  });
  desktopUpdater.on('update-downloaded', (info) => {
    appendDesktopLog(
      `Update downloaded: version ${String(info?.version || 'unknown')}.`
    );
    promptToInstallDownloadedUpdate(info).catch((error) => {
      appendDesktopLog(
        `Failed to prompt for downloaded update: ${formatLogValue(error)}`
      );
    });
  });
  desktopUpdater.on('error', (error) => {
    appendDesktopLog(`Auto-updater error: ${formatLogValue(error)}`);
  });

  appendDesktopLog(
    settings.provider === 'generic'
      ? `Auto-updates configured for ${settings.url} (channel: ${settings.channel}).`
      : `Auto-updates configured from packaged GitHub release metadata (channel: ${settings.channel}).`
  );

  setTimeout(() => {
    runAutoUpdateCheck('startup').catch(() => {});
  }, 15_000);

  autoUpdateIntervalHandle = setInterval(() => {
    runAutoUpdateCheck('scheduled').catch(() => {});
  }, settings.checkIntervalMs);
};

const stopAutoUpdater = () => {
  if (autoUpdateIntervalHandle) {
    clearInterval(autoUpdateIntervalHandle);
    autoUpdateIntervalHandle = null;
  }

  desktopUpdater = null;
  autoUpdateCheckInFlight = false;
  updatePromptOpen = false;
  lastLoggedDownloadProgress = -1;
};

const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    minWidth: windowState.minWidth,
    minHeight: windowState.minHeight,
    show: false,
    autoHideMenuBar: true,
    title: 'Invendex',
    backgroundColor: '#0f172a',
    icon: getDesktopWindowIcon(),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', async () => {
    await closeSplashWindow();
    mainWindow?.show();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(backendBaseUrl);
};

const bootstrapDesktopApp = async () => {
  ensureDesktopBundleExists();
  writeDesktopLogSection('Desktop app starting');
  appendDesktopLog(`Packaged: ${String(app.isPackaged)}`);
  appendDesktopLog(`App version: ${app.getVersion()}`);
  appendDesktopLog(`Desktop config: ${getDesktopConfigPath()}`);
  appendDesktopLog(`Desktop resources: ${getDesktopBundleRoot()}`);

  const config = ensureDesktopConfig();

  await createSplashWindow();
  await startBackend(config);
  await createMainWindow();
  startAutoUpdater(config);
};

app.setAppUserModelId('com.noahprinzy.invendex');

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0 && backendBaseUrl) {
    await createMainWindow();
  }
});

app
  .whenReady()
  .then(async () => {
    try {
      await bootstrapDesktopApp();
    } catch (error) {
      await showStartupError(error);
      app.quit();
    }
  })
  .catch(async (error) => {
    await showStartupError(error);
    app.quit();
  });

app.on('quit', () => {
  stopAutoUpdater();
  closeSplashWindow().catch(() => {});
  stopBackend().catch(() => {});
});
