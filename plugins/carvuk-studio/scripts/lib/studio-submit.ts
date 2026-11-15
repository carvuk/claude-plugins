import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { studioRequest } from './studio-api.ts';
import {
  STUDIO_API_PATHS,
  STUDIO_API_URL,
  STUDIO_DESIGN_APP,
  STUDIO_PATHS,
} from './studio-config.ts';
import { StudioError } from './studio-output.ts';

type StudioScreenshotInput = { label: string; file: string };

type StudioPrototypeManifest = {
  slug: string;
  title: string;
  summary: string;
  target: { app: string; route?: string };
  mockData: string[];
  decisions: string[];
  openQuestions: string[];
  screenshots: StudioScreenshotInput[];
  area?: string;
  priority?: number;
};

const TEXT_EXTENSIONS = /\.(tsx?|json|md)$/;
const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

function collectPrototypeFiles(slug: string) {
  const page = STUDIO_DESIGN_APP.prototypePage(slug);
  if (!existsSync(join(STUDIO_PATHS.workspace, page))) {
    throw new StudioError(
      `No existe la página ${page}.`,
      'Crea el prototipo antes de enviarlo.'
    );
  }
  const directories = STUDIO_DESIGN_APP.prototypeDirectories(slug).map(
    (directory) => join(STUDIO_PATHS.workspace, directory)
  );
  return [join(STUDIO_PATHS.workspace, page), ...directories.flatMap(listFiles)]
    .filter((path) => TEXT_EXTENSIONS.test(path))
    .map((path) => ({
      path: relative(STUDIO_PATHS.workspace, path),
      content: readFileSync(path, 'utf8'),
    }));
}

function readManifest(manifestPath: string): StudioPrototypeManifest {
  try {
    return JSON.parse(
      readFileSync(manifestPath, 'utf8')
    ) as StudioPrototypeManifest;
  } catch {
    throw new StudioError(
      'No pude leer el resumen del prototipo.',
      'Pídele a Claude que vuelva a generarlo.'
    );
  }
}

async function uploadScreenshot({ label, file }: StudioScreenshotInput) {
  const content = readFileSync(file);
  if (content.byteLength > MAX_SCREENSHOT_BYTES) {
    throw new StudioError(
      `El pantallazo ${basename(file)} pesa más de 4 MB.`,
      'Sácalo de nuevo con una ventana más chica.'
    );
  }
  const form = new FormData();
  form.append(
    'file',
    new Blob([content], { type: 'image/png' }),
    basename(file)
  );
  const body = await studioRequest({
    path: STUDIO_API_PATHS.attachments,
    body: form,
  });
  const url =
    typeof body === 'object' && body !== null
      ? (body as { url?: unknown }).url
      : null;
  if (typeof url !== 'string') {
    throw new StudioError(
      'carvuk.dev no devolvió la URL del pantallazo.',
      'Avisa a tech con este mensaje.'
    );
  }
  return { label, url };
}

export async function submitPrototype(manifestPath: string) {
  const { screenshots, ...manifest } = readManifest(manifestPath);
  const files = collectPrototypeFiles(manifest.slug);
  const uploadedScreenshots = [];
  for (const screenshot of screenshots) {
    uploadedScreenshots.push(await uploadScreenshot(screenshot));
  }
  const result = await studioRequest({
    path: STUDIO_API_PATHS.prototypes,
    json: { ...manifest, screenshots: uploadedScreenshots, files },
  });
  const issueNumber =
    typeof result === 'object' && result !== null
      ? (result as { issueNumber?: unknown }).issueNumber
      : null;
  return {
    ...(result as Record<string, unknown>),
    files: files.map(({ path }) => path),
    requestUrl:
      typeof issueNumber === 'number'
        ? `${STUDIO_API_URL}${STUDIO_API_PATHS.requests}?issue=${issueNumber}`
        : null,
  };
}
