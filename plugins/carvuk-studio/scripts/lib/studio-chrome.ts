import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

import { STUDIO_HEADLESS_CHROME } from './studio-config.ts';
import { StudioError } from './studio-output.ts';

type CdpResult = Record<string, unknown>;

type CdpMessage = {
  id?: number;
  method?: string;
  result?: CdpResult;
  error?: { message: string };
};

type CdpRequest = {
  resolve: (result: CdpResult) => void;
  reject: (error: Error) => void;
};

export type CdpPage = {
  send: (method: string, params?: Record<string, unknown>) => Promise<CdpResult>;
  waitFor: (method: string) => Promise<void>;
  close: () => void;
};

export type HeadlessChrome = {
  page: CdpPage;
  stop: () => Promise<void>;
};

const CHROME_ARGS = [
  '--headless',
  '--no-sandbox',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-port=0',
];

export async function settlesWithin(promise: Promise<unknown>, ms: number) {
  const timer = new AbortController();
  const timedOut = wait(ms, false, { signal: timer.signal }).catch(() => false);
  const settled = await Promise.race([promise.then(() => true), timedOut]);
  timer.abort();
  return settled;
}

const chromeError = () =>
  new StudioError(
    'No se pudo abrir el navegador para sacar pantallazos.',
    'Vuelve a intentar. Si se repite, el pedido puede ir sin pantallazos.'
  );

async function pollUntil<T>(read: () => Promise<T | null> | T | null) {
  const deadline = Date.now() + STUDIO_HEADLESS_CHROME.startTimeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (value !== null) return value;
    await wait(STUDIO_HEADLESS_CHROME.pollIntervalMs);
  }
  throw chromeError();
}

function readDevToolsPort(profile: string) {
  const file = join(profile, STUDIO_HEADLESS_CHROME.portFile);
  if (!existsSync(file)) return null;
  const [port] = readFileSync(file, 'utf8').split('\n');
  return port && /^\d+$/.test(port) ? port : null;
}

async function readPageSocketUrl(port: string) {
  const targets: unknown = await fetch(`http://127.0.0.1:${port}/json/list`)
    .then((response) => response.json())
    .catch(() => null);
  if (!Array.isArray(targets)) return null;
  const page: unknown = targets.find(
    (target: unknown) =>
      typeof target === 'object' &&
      target !== null &&
      (target as { type?: unknown }).type === 'page'
  );
  const url = (page as { webSocketDebuggerUrl?: unknown } | undefined)
    ?.webSocketDebuggerUrl;
  return typeof url === 'string' ? url : null;
}

function connectToPage(socketUrl: string) {
  return new Promise<CdpPage>((resolve, reject) => {
    const socket = new WebSocket(socketUrl);
    const requests = new Map<number, CdpRequest>();
    const events = new Map<string, () => void>();
    let lastId = 0;

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (message.id === undefined) {
        if (message.method) events.get(message.method)?.();
        return;
      }
      const request = requests.get(message.id);
      requests.delete(message.id);
      if (message.error) request?.reject(new Error(message.error.message));
      else request?.resolve(message.result ?? {});
    });
    socket.addEventListener('error', () => reject(chromeError()));
    socket.addEventListener('open', () =>
      resolve({
        send: (method, params = {}) =>
          new Promise<CdpResult>((resolveRequest, rejectRequest) => {
            lastId += 1;
            requests.set(lastId, {
              resolve: resolveRequest,
              reject: rejectRequest,
            });
            socket.send(JSON.stringify({ id: lastId, method, params }));
          }),
        waitFor: (method) =>
          new Promise<void>((resolveEvent) => events.set(method, resolveEvent)),
        close: () => socket.close(),
      })
    );
  });
}

async function stopChrome(child: ChildProcess, profile: string) {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await settlesWithin(exited, STUDIO_HEADLESS_CHROME.stopTimeoutMs);
  }
  rmSync(profile, { recursive: true, force: true });
}

export async function launchHeadlessChrome(
  chrome: string
): Promise<HeadlessChrome> {
  const profile = mkdtempSync(
    join(tmpdir(), STUDIO_HEADLESS_CHROME.profilePrefix)
  );
  const child = spawn(
    chrome,
    [...CHROME_ARGS, `--user-data-dir=${profile}`, 'about:blank'],
    { stdio: 'ignore' }
  );
  try {
    const port = await pollUntil(() => readDevToolsPort(profile));
    const page = await connectToPage(
      await pollUntil(() => readPageSocketUrl(port))
    );
    return {
      page,
      stop: async () => {
        page.close();
        await stopChrome(child, profile);
      },
    };
  } catch (error) {
    await stopChrome(child, profile);
    throw error;
  }
}
