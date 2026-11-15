import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
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
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8');
      if (body.length > MAX_BODY_BYTES) reject(new Error('Body too large'));
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function parseCallback(body: string, expectedState: string) {
  const fields = new URLSearchParams(body);
  const token = fields.get('token');
  const email = fields.get('email');
  const expiresAt = fields.get('expiresAt');
  if (fields.get('state') !== expectedState || !token || !email || !expiresAt)
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
      const server = createServer(
        async (request: IncomingMessage, response: ServerResponse) => {
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
          saveStudioSession(callback.token, callback.session);
          response
            .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            .end(SUCCESS_PAGE);
          clearTimeout(timeout);
          server.close();
          resolve({ ...callback.session, authorizeUrl });
        }
      );

      const timeout = setTimeout(() => {
        server.close();
        reject(
          new StudioError(
            'No llegó la autorización desde el navegador.',
            'Vuelve a correr el login y presiona «Autorizar y volver a Claude» en la página que se abre.'
          )
        );
      }, STUDIO_LOGIN.timeoutMs);

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
