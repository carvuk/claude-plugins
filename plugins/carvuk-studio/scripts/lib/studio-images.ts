import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';

import {
  STUDIO_DESIGN_APP,
  STUDIO_PATHS,
  STUDIO_PROTOTYPE_IMAGES,
} from './studio-config.ts';
import { StudioError } from './studio-output.ts';

type SharpPipeline = {
  rotate: () => SharpPipeline;
  resize: (options: { width: number; withoutEnlargement: boolean }) => SharpPipeline;
  webp: (options: { quality: number }) => SharpPipeline;
  toBuffer: (options: { resolveWithObject: true }) => Promise<{
    data: Buffer;
    info: { width: number; height: number };
  }>;
};

type SharpFactory = (input: Buffer) => SharpPipeline;

type SavePrototypeImageInput = {
  slug: string;
  name: string;
  from: string;
};

const imageDirectory = (slug: string) =>
  join(STUDIO_PATHS.workspace, STUDIO_PROTOTYPE_IMAGES.directory(slug));

export const listPrototypeImages = (slug: string) => {
  const directory = imageDirectory(slug);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => STUDIO_PROTOTYPE_IMAGES.filePattern.test(file))
    .map((file) => join(directory, file));
};

function loadSharp(): SharpFactory {
  try {
    const appRequire = createRequire(
      join(STUDIO_PATHS.workspace, STUDIO_DESIGN_APP.directory, 'package.json')
    );
    const nextRequire = createRequire(appRequire.resolve('next/package.json'));
    return nextRequire('sharp') as SharpFactory;
  } catch {
    throw new StudioError(
      'No encontré la herramienta para procesar imágenes.',
      'Corre studio install y vuelve a intentar.'
    );
  }
}

async function readSource(from: string) {
  if (!from.startsWith('https://')) {
    if (!existsSync(from)) {
      throw new StudioError(`No existe la imagen ${from}.`, 'Revisa la ruta.');
    }
    return readFileSync(from);
  }
  const response = await fetch(from, {
    signal: AbortSignal.timeout(STUDIO_PROTOTYPE_IMAGES.downloadTimeoutMs),
  }).catch(() => null);
  if (!response?.ok) {
    throw new StudioError(
      'No pude descargar la imagen.',
      'Revisa tu conexión o genera la imagen de nuevo.'
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

async function compressToWebp(input: Buffer) {
  const sharp = loadSharp();
  for (const quality of STUDIO_PROTOTYPE_IMAGES.qualities) {
    const result = await sharp(input)
      .rotate()
      .resize({ width: STUDIO_PROTOTYPE_IMAGES.maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
    if (result.data.byteLength <= STUDIO_PROTOTYPE_IMAGES.maxBytes) return result;
  }
  throw new StudioError(
    'La imagen queda demasiado pesada para el pedido.',
    'Usa una imagen más simple o más chica.'
  );
}

function requireImageName(name: string) {
  if (!STUDIO_PROTOTYPE_IMAGES.namePattern.test(name)) {
    throw new StudioError(
      `El nombre ${name} no sirve para una imagen.`,
      'Usa palabras en minúscula separadas por guiones, por ejemplo hero-entrega.'
    );
  }
  return `${name}${STUDIO_PROTOTYPE_IMAGES.extension}`;
}

function requireRoomFor(slug: string, file: string) {
  const existing = listPrototypeImages(slug);
  const replacing = existing.some((filePath) => basename(filePath) === file);
  if (!replacing && existing.length >= STUDIO_PROTOTYPE_IMAGES.maxImages) {
    throw new StudioError(
      `El prototipo ya tiene ${STUDIO_PROTOTYPE_IMAGES.maxImages} imágenes.`,
      'Reemplaza una existente usando su mismo nombre.'
    );
  }
}

export async function savePrototypeImage({ slug, name, from }: SavePrototypeImageInput) {
  const file = requireImageName(name);
  requireRoomFor(slug, file);
  const { data, info } = await compressToWebp(await readSource(from));
  const directory = imageDirectory(slug);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, file), data);
  return {
    src: STUDIO_PROTOTYPE_IMAGES.publicPath(slug, file),
    file: join(directory, file),
    width: info.width,
    height: info.height,
    bytes: data.byteLength,
  };
}
