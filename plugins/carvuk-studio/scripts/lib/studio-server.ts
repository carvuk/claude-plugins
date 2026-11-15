import { spawn } from 'node:child_process';
import {
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

function startDesignApp() {
  mkdirSync(STUDIO_HOME, { recursive: true });
  const log = openSync(STUDIO_PATHS.serverLog, 'w');
  const child = spawn(
    'pnpm',
    ['--filter', STUDIO_DESIGN_APP.packageName, 'dev'],
    {
      cwd: STUDIO_PATHS.workspace,
      detached: true,
      stdio: ['ignore', log, log],
      env: process.env,
    }
  );
  child.unref();
  if (child.pid) writeFileSync(STUDIO_PATHS.serverPid, String(child.pid));
}

async function waitForDesignApp() {
  const deadline = Date.now() + STUDIO_SERVER.startTimeoutMs;
  while (Date.now() < deadline) {
    if (await isDesignAppResponding()) return true;
    await wait(STUDIO_SERVER.pollIntervalMs);
  }
  return false;
}

export async function serveDesignApp() {
  if (await isDesignAppResponding()) {
    return { running: true, started: false, url: designAppUrl('/prototipos') };
  }
  startDesignApp();
  if (!(await waitForDesignApp())) {
    throw new StudioError(
      'La app de diseño no respondió a tiempo.',
      `Revisa el registro en ${STUDIO_PATHS.serverLog} o vuelve a intentar.`
    );
  }
  return {
    running: true,
    started: true,
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
