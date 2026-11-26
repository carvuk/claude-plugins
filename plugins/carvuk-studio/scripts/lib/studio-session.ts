import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

import { STUDIO_HOME, STUDIO_KEYCHAIN, STUDIO_PATHS } from './studio-config.ts';
import { StudioError } from './studio-output.ts';

export type StudioSession = {
  email: string;
  expiresAt: string;
};

const isMac = process.platform === 'darwin';

function ensureStudioHome() {
  mkdirSync(STUDIO_HOME, { recursive: true, mode: 0o700 });
}

function writeToken(token: string) {
  if (isMac) {
    execFileSync('security', [
      'add-generic-password',
      '-U',
      '-s',
      STUDIO_KEYCHAIN.service,
      '-a',
      STUDIO_KEYCHAIN.account,
      '-w',
      token,
    ]);
    return;
  }
  writeFileSync(STUDIO_PATHS.tokenFile, token, { mode: 0o600 });
  chmodSync(STUDIO_PATHS.tokenFile, 0o600);
}

function readToken() {
  if (!isMac) {
    return existsSync(STUDIO_PATHS.tokenFile)
      ? readFileSync(STUDIO_PATHS.tokenFile, 'utf8').trim()
      : null;
  }
  try {
    return execFileSync(
      'security',
      [
        'find-generic-password',
        '-s',
        STUDIO_KEYCHAIN.service,
        '-a',
        STUDIO_KEYCHAIN.account,
        '-w',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
  } catch {
    return null;
  }
}

function deleteToken() {
  if (!isMac) {
    rmSync(STUDIO_PATHS.tokenFile, { force: true });
    return;
  }
  try {
    execFileSync(
      'security',
      [
        'delete-generic-password',
        '-s',
        STUDIO_KEYCHAIN.service,
        '-a',
        STUDIO_KEYCHAIN.account,
      ],
      {
        stdio: 'ignore',
      }
    );
  } catch {
    return;
  }
}

export function saveStudioSession(token: string, session: StudioSession) {
  ensureStudioHome();
  writeToken(token);
  writeFileSync(STUDIO_PATHS.session, JSON.stringify(session, null, 2), {
    mode: 0o600,
  });
}

export function readStudioSession(): StudioSession | null {
  if (!existsSync(STUDIO_PATHS.session)) return null;
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(STUDIO_PATHS.session, 'utf8')
    );
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { email, expiresAt } = parsed as Record<string, unknown>;
    if (typeof email !== 'string' || typeof expiresAt !== 'string') return null;
    return { email, expiresAt };
  } catch {
    return null;
  }
}

export function clearStudioSession() {
  deleteToken();
  rmSync(STUDIO_PATHS.session, { force: true });
}

export function requireStudioToken() {
  const session = readStudioSession();
  const token = readToken();
  if (!session || !token) {
    throw new StudioError(
      'No hay una sesión de Carvuk Studio.',
      'Corre /carvuk-studio:empezar para conectarte.'
    );
  }
  const expiresAtMs = Date.parse(session.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new StudioError(
      'La sesión de Carvuk Studio expiró.',
      'Corre /carvuk-studio:empezar para conectarte de nuevo.'
    );
  }
  return token;
}
