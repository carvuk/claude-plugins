import { openInBrowser } from './lib/studio-browser.ts';
import { STUDIO_TARGET_APPS } from './lib/studio-config.ts';
import { loginToStudio } from './lib/studio-login.ts';
import {
  printFailure,
  printResult,
  readFlag,
  StudioError,
} from './lib/studio-output.ts';
import {
  describeStudio,
  prepareStudio,
  requireSlug,
} from './lib/studio-prepare.ts';
import { capturePrototype } from './lib/studio-screenshot.ts';
import {
  buildPrototypeViewerUrl,
  serveDesignApp,
  stopDesignApp,
} from './lib/studio-server.ts';
import { clearStudioSession } from './lib/studio-session.ts';
import { savePrototypeImage } from './lib/studio-images.ts';
import { submitPrototype } from './lib/studio-submit.ts';
import {
  addReferenceApp,
  installDesignApp,
  syncWorkspace,
} from './lib/studio-workspace.ts';

type StudioCommand = (
  args: string[]
) => Promise<Record<string, unknown>> | Record<string, unknown>;

const VIEWER_MODES = ['desktop', 'mobile'];

function requireFlag(args: string[], name: string) {
  const value = readFlag(args, name);
  if (!value) {
    throw new StudioError(
      `Falta --${name}.`,
      `Ejemplo: studio.ts <comando> --${name} <valor>`
    );
  }
  return value;
}

function readViewerMode(args: string[]) {
  const mode = readFlag(args, 'vista') ?? 'desktop';
  if (!VIEWER_MODES.includes(mode)) {
    throw new StudioError(
      `Vista desconocida: ${mode}.`,
      'Usa --vista desktop o --vista mobile.'
    );
  }
  return mode;
}

const COMMANDS: Record<string, StudioCommand> = {
  status: () => describeStudio(),
  prepare: async () => prepareStudio(),
  login: async () => loginToStudio(),
  logout: () => {
    clearStudioSession();
    return { loggedOut: true };
  },
  sync: async () => syncWorkspace(),
  install: () => installDesignApp(),
  apps: () => ({ apps: STUDIO_TARGET_APPS }),
  reference: async (args) => addReferenceApp(requireFlag(args, 'app')),
  serve: async () => serveDesignApp(),
  stop: () => stopDesignApp(),
  open: (args) =>
    openInBrowser(
      buildPrototypeViewerUrl(
        requireSlug(requireFlag(args, 'slug')),
        readViewerMode(args)
      ),
      readFlag(args, 'browser')
    ),
  screenshot: (args) =>
    capturePrototype(
      requireSlug(requireFlag(args, 'slug')),
      readFlag(args, 'path') ?? undefined
    ),
  image: async (args) =>
    savePrototypeImage({
      slug: requireSlug(requireFlag(args, 'slug')),
      name: requireFlag(args, 'name'),
      from: requireFlag(args, 'from'),
    }),
  submit: async (args) => submitPrototype(requireFlag(args, 'manifest')),
};

async function main() {
  const [name = 'status', ...args] = process.argv.slice(2);
  const command = COMMANDS[name];
  if (!command) {
    throw new StudioError(
      `Comando desconocido: ${name}.`,
      `Comandos: ${Object.keys(COMMANDS).join(', ')}.`
    );
  }
  printResult(await command(args));
}

main().catch(printFailure);
