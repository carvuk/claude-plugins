import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

import {
  type CdpPage,
  launchHeadlessChrome,
  settlesWithin,
} from './studio-chrome.ts';
import {
  STUDIO_CHROME_PATHS,
  STUDIO_DESIGN_APP,
  STUDIO_PATHS,
  STUDIO_SCREENSHOT,
  STUDIO_SCREENSHOT_VIEWPORTS,
} from './studio-config.ts';
import { StudioError } from './studio-output.ts';

type StudioViewport = keyof typeof STUDIO_SCREENSHOT_VIEWPORTS;

type ViewportCapture = {
  url: string;
  viewport: StudioViewport;
  file: string;
};

const FONTS_READY_EXPRESSION = 'document.fonts.ready.then(() => true)';

const findChromium = () =>
  STUDIO_CHROME_PATHS.find((path) => existsSync(path)) ?? null;

const pageTimeoutError = () =>
  new StudioError(
    'La pantalla del prototipo no terminó de cargar.',
    'Revisa que se vea bien con studio open y vuelve a sacar los pantallazos.'
  );

async function captureViewport(
  page: CdpPage,
  { url, viewport, file }: ViewportCapture
) {
  const { width, height, mobile } = STUDIO_SCREENSHOT_VIEWPORTS[viewport];
  await page.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    mobile,
    deviceScaleFactor: STUDIO_SCREENSHOT.deviceScaleFactor,
  });
  const loaded = page.waitFor('Page.loadEventFired');
  await page.send('Page.navigate', { url });
  if (!(await settlesWithin(loaded, STUDIO_SCREENSHOT.navigationTimeoutMs))) {
    throw pageTimeoutError();
  }
  await page.send('Runtime.evaluate', {
    expression: FONTS_READY_EXPRESSION,
    awaitPromise: true,
  });
  await wait(STUDIO_SCREENSHOT.settleMs);
  const { data } = await page.send('Page.captureScreenshot', {
    format: 'png',
  });
  if (typeof data !== 'string') throw pageTimeoutError();
  writeFileSync(file, Buffer.from(data, 'base64'));
  return { viewport, file };
}

export async function capturePrototype(slug: string, path?: string) {
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
  const browser = await launchHeadlessChrome(chrome);
  try {
    await browser.page.send('Page.enable');
    const screenshots = [];
    for (const viewport of Object.keys(
      STUDIO_SCREENSHOT_VIEWPORTS
    ) as StudioViewport[]) {
      screenshots.push(
        await captureViewport(browser.page, {
          url,
          viewport,
          file: join(directory, `${viewport}-${stamp}.png`),
        })
      );
    }
    return { url, screenshots };
  } finally {
    await browser.stop();
  }
}
