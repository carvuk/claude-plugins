import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';

import { STUDIO_BROWSERS } from './studio-config.ts';
import { StudioError } from './studio-output.ts';

const isMac = process.platform === 'darwin';

export const listInstalledBrowsers = () =>
  STUDIO_BROWSERS.filter(({ app }) =>
    existsSync(`/Applications/${app}.app`)
  ).map(({ name }) => name);

function resolveBrowserApp(browser: string | null) {
  if (!browser) return null;
  const match = STUDIO_BROWSERS.find(
    ({ name, app }) =>
      name.toLowerCase() === browser.toLowerCase() ||
      app.toLowerCase() === browser.toLowerCase()
  );
  if (!match || !existsSync(`/Applications/${match.app}.app`)) {
    throw new StudioError(
      `No encontré el navegador ${browser}.`,
      `Navegadores instalados: ${
        listInstalledBrowsers().join(', ') || 'ninguno detectado'
      }.`
    );
  }
  return match.app;
}

export function openInBrowser(url: string, browser: string | null) {
  const app = isMac ? resolveBrowserApp(browser) : null;
  const command = isMac ? 'open' : 'xdg-open';
  const args = app ? ['-a', app, url] : [url];
  execFile(command, args, () => undefined);
  return { url, browser: app ?? 'navegador por defecto' };
}
