import { execFile } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  STUDIO_API_PATHS,
  STUDIO_API_URL,
  STUDIO_LOGIN,
} from './studio-config.ts';
import { StudioError } from './studio-output.ts';
import { saveStudioSession, type StudioSession } from './studio-session.ts';

const SUCCESS_PAGE = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Carvuk Studio</title>
<body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1>Listo</h1><p>Claude ya está conectado. Puedes cerrar esta pestaña y volver a Claude.</p></div></body></html>`;

const MAX_BODY_BYTES = 16_384;

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    request.on('data', (chunk: Buffer) => {
      totalBytes += chunk.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        request.destroy();
        fail(new Error('Body too large'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', fail);
  });
}

function statesMatch(actual: string | null, expected: string) {
  if (!actual) return false;
  const actualBuf = Buffer.from(actual, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  return actualBuf.length === expectedBuf.length && timingSafeEqual(actualBuf, expectedBuf);
}

function parseCallback(body: string, expectedState: string) {
  const fields = new URLSearchParams(body);
  const token = fields.get('token');
  const email = fields.get('email');
  const expiresAt = fields.get('expiresAt');
  if (!statesMatch(fields.get('state'), expectedState) || !token || !email || !expiresAt)
    return null;
  const session: StudioSession = { email, expiresAt };
  return { token, session };
}

function openBrowser(url: string) {
  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  execFile(command, [url], () => undefined);
}

export function loginToStudio() {
  const state = randomBytes(32).toString('base64url');

  return new Promise<StudioSession & { authorizeUrl: string }>(
    (resolve, reject) => {
      let authorizeUrl = '';
      let completed = false;

      const server = createServer(
        async (request: IncomingMessage, response: ServerResponse) => {
          if (completed) {
            response.writeHead(409).end();
            return;
          }
          if (
            request.method !== 'POST' ||
            request.url !== STUDIO_LOGIN.callbackPath
          ) {
            response.writeHead(404).end();
            return;
          }
          const callback = parseCallback(
            await readBody(request).catch(() => ''),
            state
          );
          if (!callback) {
            response
              .writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
              .end('Solicitud inválida.');
            return;
          }
          completed = true;
          clearTimeout(timeout);
          try {
            saveStudioSession(callback.token, callback.session);
          } catch (error) {
            response
              .writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
              .end('No se pudo guardar la sesión.');
            server.close();
            reject(error);
            return;
          }
          response
            .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            .end(SUCCESS_PAGE);
          server.close();
          resolve({ ...callback.session, authorizeUrl });
        }
      );

      const timeout = setTimeout(() => {
        if (completed) return;
        completed = true;
        server.close();
        reject(
          new StudioError(
            'No llegó la autorización desde el navegador.',
            'Vuelve a correr el login y presiona «Autorizar y volver a Claude» en la página que se abre.'
          )
        );
      }, STUDIO_LOGIN.timeoutMs);

      server.on('error', (error) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeout);
        reject(error);
      });

      server.listen(0, STUDIO_LOGIN.host, () => {
        const { port } = server.address() as AddressInfo;
        const url = new URL(STUDIO_API_PATHS.authorize, STUDIO_API_URL);
        url.searchParams.set('port', String(port));
        url.searchParams.set('state', state);
        authorizeUrl = url.toString();
        process.stderr.write(`Abriendo ${authorizeUrl}\n`);
        openBrowser(authorizeUrl);
      });
    }
  );
}
