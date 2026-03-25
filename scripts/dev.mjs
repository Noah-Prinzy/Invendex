import { execFile, spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { createInterface } from 'node:readline';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const services = [
  {
    key: 'backend',
    label: 'Backend',
    cwd: path.join(workspaceRoot, 'backend'),
    script: 'dev',
    port: 4000,
    url: 'http://localhost:4000'
  },
  {
    key: 'frontend',
    label: 'Frontend',
    cwd: path.join(workspaceRoot, 'frontend'),
    script: 'start',
    port: 3000,
    url: 'http://localhost:3000'
  }
];

const children = new Map();
const serviceState = {
  backend: {
    ready: false
  },
  frontend: {
    ready: false
  }
};
let shuttingDown = false;
let shutdownPromise = null;
let expectedExitCode = 0;
let workspaceReadyAnnounced = false;

const ansi = {
  reset: '\u001B[0m',
  bold: '\u001B[1m',
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  magenta: '\u001B[35m',
  cyan: '\u001B[36m',
  white: '\u001B[37m'
};

const scopeStyles = {
  dev: {
    label: 'Dev',
    color: ansi.blue
  },
  backend: {
    label: 'Backend',
    color: ansi.cyan
  },
  frontend: {
    label: 'Frontend',
    color: ansi.magenta
  }
};

const stripAnsi = (value) =>
  String(value || '').replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');

const supportsColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

const colorize = (text, ...styles) => {
  if (!supportsColor) return text;
  return `${styles.join('')}${text}${ansi.reset}`;
};

const getMessageTone = (scope, message) => {
  const text = String(message || '').trim().toLowerCase();

  if (
    text.startsWith('error:') ||
    text.includes('could not start') ||
    text.includes('failed') ||
    text.includes('already in use') ||
    text.includes('cannot start')
  ) {
    return 'error';
  }

  if (text.startsWith('warning:') || text.startsWith('note:')) {
    return 'warn';
  }

  if (
    text.includes('ready at') ||
    text.includes('connected to mongodb') ||
    text.includes('initialized') ||
    text.includes('scheduled') ||
    text.includes('started') ||
    text.includes('checked purchase orders')
  ) {
    return 'success';
  }

  if (
    text.includes('starting') ||
    text.includes('stopping') ||
    text.includes('restarting') ||
    text.includes('watching') ||
    text.includes('will open at') ||
    text.includes('health should respond')
  ) {
    return 'status';
  }

  return scope;
};

const styleMessage = (scope, message) => {
  const tone = getMessageTone(scope, message);

  switch (tone) {
    case 'error':
      return colorize(message, ansi.red, ansi.bold);
    case 'warn':
      return colorize(message, ansi.yellow);
    case 'success':
      return colorize(message, ansi.green);
    case 'status':
      return colorize(message, ansi.white);
    case 'backend':
      return colorize(message, ansi.cyan);
    case 'frontend':
      return colorize(message, ansi.magenta);
    case 'dev':
    default:
      return colorize(message, ansi.blue);
  }
};

const printLine = (scope, message) => {
  const text = String(message || '').trim();
  if (!text) return;

  const scopeStyle = scopeStyles[scope] || {
    label: scope,
    color: ansi.white
  };
  const tag = colorize(`[${scopeStyle.label}]`, scopeStyle.color, ansi.bold);
  const body = styleMessage(scope, text);

  process.stdout.write(`${tag} ${body}\n`);
};

const printDev = (message) => printLine('dev', message);

const maybeAnnounceWorkspaceReady = () => {
  if (workspaceReadyAnnounced) return;
  if (!serviceState.backend.ready || !serviceState.frontend.ready) return;

  workspaceReadyAnnounced = true;
  printDev('Workspace ready.');
  printDev(`- Frontend: ${services[1].url}`);
  printDev(`- Backend: ${services[0].url}`);
  printDev('Press Ctrl+C to stop both services.');
};

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

const checkPortInUse = (port) =>
  new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        resolve(false);
        return;
      }

      resolve(true);
    });
  });

const parseTaskListName = (output) => {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;
  const match = lines[0].match(/^"([^"]+)"/);
  return match ? match[1] : null;
};

const getPortOwner = async (port) => {
  if (!isWindows) return null;

  const { stdout } = await execFileText('netstat', ['-ano', '-p', 'tcp']);
  const pid = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.split(/\s+/))
    .find(
      (parts) =>
        parts.length >= 5 &&
        parts[0] === 'TCP' &&
        parts[1].endsWith(`:${port}`) &&
        parts[3] === 'LISTENING'
    )?.[4];

  if (!pid) return null;

  const taskResult = await execFileText('tasklist', [
    '/FI',
    `PID eq ${pid}`,
    '/FO',
    'CSV',
    '/NH'
  ]);

  return {
    pid,
    processName: parseTaskListName(taskResult.stdout)
  };
};

const formatBusyServiceMessage = (service, owner) => {
  if (owner?.processName && owner?.pid) {
    return `${service.label} port ${service.port} is already in use by ${owner.processName} (PID ${owner.pid}).`;
  }

  return `${service.label} port ${service.port} is already in use.`;
};

const explainRuntimeWarnings = (warnings) =>
  Array.isArray(warnings)
    ? warnings.map((warning) => {
        if (warning.includes('COOKIE_SECURE')) {
          return 'COOKIE_SECURE is off outside production. That is normal for local development.';
        }

        return warning;
      })
    : [];

const formatBackendJson = (entry) => {
  const message = String(entry?.message || '').trim();
  const errorMessage = String(
    entry?.err?.message || entry?.errorMessage || ''
  ).trim();

  switch (message) {
    case 'runtime_env_validation_warnings':
      return explainRuntimeWarnings(entry.warnings).map(
        (warning) => `Local dev note: ${warning}`
      );
    case 'mongo_profiling_enabled':
      return [`Mongo profiling enabled (${entry.thresholdMs}ms threshold).`];
    case 'database_connected':
      return ['Connected to MongoDB.'];
    case 'realtime_initialized':
      return ['Realtime server initialized.'];
    case 'background_job_queue_ready':
      return [`Background job queue ready (${entry.queueName}).`];
    case 'background_job_queue_fallback_mode':
      return [
        `Background job queue fallback mode is active${
          entry.reason ? `: ${entry.reason}` : '.'
        }`
      ];
    case 'inventory_integrity_cron_scheduled':
      return [`Inventory integrity check scheduled (${entry.expression}).`];
    case 'server_started':
      return [`Backend ready at http://localhost:${entry.port}`];
    case 'server_shutdown_started':
      return ['Backend shutting down...'];
    case 'server_start_failed':
      if (errorMessage.includes('already in use')) {
        return [
          `Backend could not start because port ${entry.port || 4000} is already in use.`,
          'Stop the other process using port 4000, then run `npm run dev` again.'
        ];
      }

      return [`Backend failed to start: ${errorMessage || 'unknown error'}`];
    default:
      if (entry.level === 'warn' && message) {
        return [`Warning: ${message}`];
      }

      if (entry.level === 'error' && errorMessage) {
        return [`Error: ${errorMessage}`];
      }

      return null;
  }
};

const formatBackendLine = (line) => {
  const text = stripAnsi(line).trim();
  if (!text || text.startsWith('> ')) return null;

  if (text.startsWith('{')) {
    try {
      return formatBackendJson(JSON.parse(text));
    } catch {
      return [text];
    }
  }

  if (text.includes('[nodemon] 3.')) {
    return null;
  }

  if (text.includes('[nodemon] starting `node src/server.js`')) {
    return ['Backend starting...'];
  }

  if (text.includes('[nodemon] to restart at any time')) {
    return ['Watching backend files for changes.'];
  }

  if (text.includes('[nodemon] watching path(s):')) {
    return null;
  }

  if (text.includes('[nodemon] watching extensions:')) {
    return null;
  }

  if (text.includes('[nodemon] restarting due to changes')) {
    return ['Backend restarting because a watched file changed...'];
  }

  if (text.includes('Inventory snapshot cron scheduled')) {
    return ['Scheduled daily inventory snapshot job (00:05).'];
  }

  if (text.includes('Inventory metrics cron scheduled')) {
    return ['Scheduled daily inventory metrics job (00:10).'];
  }

  if (text.includes('Inventory forecast cron scheduled')) {
    return ['Scheduled daily inventory forecast job (00:20).'];
  }

  if (text.includes('Forecast reorder cron scheduled')) {
    return ['Scheduled daily forecast reorder job (00:40).'];
  }

  if (text.includes('Running auto-send purchase order job')) {
    return ['Checked purchase orders for auto-send.'];
  }

  if (text.includes('Running auto-close purchase order job')) {
    return ['Checked purchase orders for auto-close.'];
  }

  return [text];
};

const formatFrontendLine = (line) => {
  const text = stripAnsi(line).trim();
  if (!text || text.startsWith('> ')) return null;

  if (text.includes('Re-optimizing dependencies because vite config has changed')) {
    return ['Refreshing optimized dependencies because Vite config changed.'];
  }

  if (text.includes('ready in')) {
    return ['Frontend starting...'];
  }

  const localMatch = text.match(/Local:\s+(.*)$/);
  if (localMatch) {
    return [`Frontend ready at ${localMatch[1].trim()}`];
  }

  const networkMatch = text.match(/Network:\s+(.*)$/);
  if (networkMatch) {
    return [`Frontend network URL: ${networkMatch[1].trim()}`];
  }

  if (text.includes('vite.config.mjs changed, restarting server')) {
    return ['Frontend config changed. Restarting dev server...'];
  }

  if (text.includes('server restarted.')) {
    return ['Frontend dev server restarted.'];
  }

  if (text.includes('error when starting dev server')) {
    return ['Frontend could not start.'];
  }

  if (text.includes('Port 3000 is already in use')) {
    return [
      'Frontend could not start because port 3000 is already in use.',
      'Stop the other process using port 3000, then run `npm run dev` again.'
    ];
  }

  if (text.includes('VITE v')) {
    return ['Starting Vite dev server...'];
  }

  if (text === 'vite') {
    return null;
  }

  return [text];
};

const formatServiceLine = (service, line) =>
  service.key === 'backend' ? formatBackendLine(line) : formatFrontendLine(line);

const emitServiceLines = (service, lines) => {
  if (!Array.isArray(lines)) return;
  for (const line of lines) {
    printLine(service.key, line);

    if (service.key === 'frontend' && line.startsWith('Frontend ready at ')) {
      serviceState.frontend.ready = true;
      maybeAnnounceWorkspaceReady();
    }

    if (service.key === 'backend' && line.startsWith('Backend ready at ')) {
      serviceState.backend.ready = true;
      maybeAnnounceWorkspaceReady();
    }
  }
};

const attachOutput = (service, stream) => {
  stream.setEncoding('utf8');
  const reader = createInterface({ input: stream });
  reader.on('line', (line) => {
    const formattedLines = formatServiceLine(service, line);
    emitServiceLines(service, formattedLines);
  });
};

const stopChild = async (child) => {
  if (!child || child.exitCode !== null || child.killed) return;

  if (isWindows) {
    await execFileText('taskkill', ['/PID', String(child.pid), '/T', '/F']);
    return;
  }

  child.kill('SIGTERM');
};

const shutdown = async (message, exitCode = 0) => {
  if (shutdownPromise) return shutdownPromise;

  shuttingDown = true;
  expectedExitCode = exitCode;
  if (message) printDev(message);

  shutdownPromise = Promise.allSettled(
    Array.from(children.values()).map((child) => stopChild(child))
  ).then(() => {
    process.exit(expectedExitCode);
  });

  return shutdownPromise;
};

const handleChildExit = async (service, code, signal) => {
  if (shuttingDown) return;

  if (signal) {
    await shutdown(
      `${service.label} stopped after receiving ${signal}. Stopping the dev workspace...`,
      0
    );
    return;
  }

  const normalizedCode = Number(code ?? 0);
  if (normalizedCode === 0) {
    await shutdown(
      `${service.label} exited normally. Stopping the dev workspace...`,
      0
    );
    return;
  }

  await shutdown(
    `${service.label} exited with code ${normalizedCode}. Stopping the dev workspace...`,
    normalizedCode
  );
};

const startService = (service) => {
  const child = spawn(npmCommand, ['run', service.script], {
    cwd: service.cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  children.set(service.key, child);
  attachOutput(service, child.stdout);
  attachOutput(service, child.stderr);
  child.on('exit', (code, signal) => {
    handleChildExit(service, code, signal).catch((error) => {
      printDev(`Failed to stop cleanly: ${error.message}`);
      process.exit(1);
    });
  });
};

const validatePorts = async () => {
  const busyServices = [];

  for (const service of services) {
    const inUse = await checkPortInUse(service.port);
    if (!inUse) continue;

    const owner = await getPortOwner(service.port);
    busyServices.push({ service, owner });
  }

  if (!busyServices.length) return true;

  printDev('Cannot start Invendex yet.');
  for (const { service, owner } of busyServices) {
    printDev(`- ${formatBusyServiceMessage(service, owner)}`);
  }
  printDev('Stop the busy process or change the port, then run `npm run dev` again.');
  return false;
};

const main = async () => {
  process.on('SIGINT', () => {
    shutdown('Stopping Invendex dev workspace...', 0).catch(() => {
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    shutdown('Stopping Invendex dev workspace...', 0).catch(() => {
      process.exit(1);
    });
  });

  const portsAvailable = await validatePorts();
  if (!portsAvailable) {
    process.exit(1);
  }

  printDev('Starting Invendex...');
  printDev(`- Frontend: ${services[1].url}`);
  printDev(`- Backend health: ${services[0].url}/health`);

  for (const service of services) {
    startService(service);
  }
};

main().catch((error) => {
  printDev(`Unable to start the dev workspace: ${error.message}`);
  process.exit(1);
});
