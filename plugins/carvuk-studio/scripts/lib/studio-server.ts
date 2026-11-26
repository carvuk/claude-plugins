import { type ChildProcess, spawn } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';

import {
  STUDIO_DESIGN_APP,
  STUDIO_HOME,
  STUDIO_PATHS,
  STUDIO_SERVER,
} from './studio-config.ts';
import { StudioError } from './studio-output.ts';

type DesignAppStart = 'ready' | 'exited' | 'timeout';

const DESIGN_APP_START_FAILURES: Record<
  Exclude<DesignAppStart, 'ready'>,
  string
> = {
  exited: 'La app de diseño se cerró al arrancar.',
  timeout: 'La app de diseño no respondió a tiempo.',
};

const designAppUrl = (path = '') =>
  `http://localhost:${STUDIO_DESIGN_APP.port}${path}`;

async function isDesignAppResponding() {
  try {
    const response = await fetch(designAppUrl(STUDIO_SERVER.healthPath), {
      signal: AbortSignal.timeout(STUDIO_SERVER.healthTimeoutMs),
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

function readServerPid() {
  if (!existsSync(STUDIO_PATHS.serverPid)) return null;
  const pid = Number(readFileSync(STUDIO_PATHS.serverPid, 'utf8').trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function startDesignApp(attempt: number) {
  mkdirSync(STUDIO_HOME, { recursive: true });
  const log = openSync(STUDIO_PATHS.serverLog, attempt === 1 ? 'w' : 'a');
  let child: ChildProcess;
  try {
    child = spawn(
      'pnpm',
      ['--filter', STUDIO_DESIGN_APP.packageName, 'dev'],
      {
        cwd: STUDIO_PATHS.workspace,
        detached: true,
        stdio: ['ignore', log, log],
        env: process.env,
      }
    );
  } finally {
    closeSync(log);
  }
  child.unref();
  if (child.pid) writeFileSync(STUDIO_PATHS.serverPid, String(child.pid));
  return child;
}

const hasExited = (child: ChildProcess) =>
  child.exitCode !== null || child.signalCode !== null;

async function waitForDesignApp(child: ChildProcess): Promise<DesignAppStart> {
  const deadline = Date.now() + STUDIO_SERVER.startTimeoutMs;
  while (Date.now() < deadline) {
    if (await isDesignAppResponding()) return 'ready';
    if (hasExited(child)) return 'exited';
    await wait(STUDIO_SERVER.pollIntervalMs);
  }
  return 'timeout';
}

async function startDesignAppWithRetries() {
  let start: DesignAppStart = 'exited';
  let attempts = 0;
  while (start === 'exited' && attempts < STUDIO_SERVER.startAttempts) {
    attempts += 1;
    start = await waitForDesignApp(startDesignApp(attempts));
  }
  return { start, attempts };
}

export async function serveDesignApp() {
  if (await isDesignAppResponding()) {
    return { running: true, started: false, url: designAppUrl('/prototipos') };
  }
  const { start, attempts } = await startDesignAppWithRetries();
  if (start !== 'ready') {
    throw new StudioError(
      DESIGN_APP_START_FAILURES[start],
      `Revisa el registro en ${STUDIO_PATHS.serverLog} o vuelve a intentar.`
    );
  }
  return {
    running: true,
    started: true,
    attempts,
    url: designAppUrl('/prototipos'),
    log: STUDIO_PATHS.serverLog,
  };
}

export function stopDesignApp() {
  const pid = readServerPid();
  rmSync(STUDIO_PATHS.serverPid, { force: true });
  if (!pid) return { stopped: false };
  try {
    process.kill(-pid, 'SIGTERM');
    return { stopped: true };
  } catch {
    return { stopped: false };
  }
}

export const buildPrototypeViewerUrl = (slug: string, mode: string) =>
  designAppUrl(
    `/prototipos?slug=${encodeURIComponent(slug)}&vista=${encodeURIComponent(
      mode
    )}`
  );
