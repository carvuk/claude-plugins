import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  STUDIO_CHROME_PATHS,
  STUDIO_DESIGN_APP,
  STUDIO_PATHS,
  STUDIO_SCREENSHOT_VIEWPORTS,
} from './studio-config.ts';

type StudioViewport = keyof typeof STUDIO_SCREENSHOT_VIEWPORTS;

const CHROME_TIMEOUT_MS = 60_000;
const RENDER_BUDGET_MS = 8_000;

const findChromium = () =>
  STUDIO_CHROME_PATHS.find((path) => existsSync(path)) ?? null;

function captureViewport(
  chrome: string,
  url: string,
  viewport: StudioViewport,
  file: string
) {
  const { width, height } = STUDIO_SCREENSHOT_VIEWPORTS[viewport];
  execFileSync(
    chrome,
    [
      '--headless',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      `--window-size=${width},${height}`,
      `--virtual-time-budget=${RENDER_BUDGET_MS}`,
      `--screenshot=${file}`,
      url,
    ],
    { stdio: 'ignore', timeout: CHROME_TIMEOUT_MS }
  );
  return { viewport, file };
}

export function capturePrototype(slug: string, path?: string) {
  const url = `http://localhost:${STUDIO_DESIGN_APP.port}${
    path ?? `/prototipos/${slug}`
  }`;
  const chrome = findChromium();
  if (!chrome) {
    return {
      url,
      screenshots: [],
      skipped:
        'No hay Chrome, Brave, Arc ni Edge instalado: el pedido puede ir sin pantallazos.',
    };
  }
  const directory = join(STUDIO_PATHS.screenshots, slug);
  mkdirSync(directory, { recursive: true });
  const stamp = Date.now();
  const captures = (
    Object.keys(STUDIO_SCREENSHOT_VIEWPORTS) as StudioViewport[]
  ).map((viewport) =>
    captureViewport(
      chrome,
      url,
      viewport,
      join(directory, `${viewport}-${stamp}.png`)
    )
  );
  return { url, screenshots: captures };
}
