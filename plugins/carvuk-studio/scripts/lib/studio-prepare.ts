import { listInstalledBrowsers } from './studio-browser.ts';
import { STUDIO_PATHS, STUDIO_SLUG } from './studio-config.ts';
import { loginToStudio } from './studio-login.ts';
import { StudioError } from './studio-output.ts';
import { serveDesignApp } from './studio-server.ts';
import { readStudioSession } from './studio-session.ts';
import {
  hasWorkspace,
  installDesignApp,
  syncWorkspace,
} from './studio-workspace.ts';

export const hasActiveSession = () => {
  const session = readStudioSession();
  return Boolean(session && new Date(session.expiresAt).getTime() > Date.now());
};

export function requireSlug(slug: string) {
  const isReserved = STUDIO_SLUG.reserved.some((reserved) => reserved === slug);
  if (
    !STUDIO_SLUG.pattern.test(slug) ||
    slug.length > STUDIO_SLUG.maxLength ||
    isReserved
  ) {
    throw new StudioError(
      `El nombre ${slug} no sirve para un prototipo.`,
      'Usa palabras en minúscula separadas por guiones, por ejemplo cotizar-soap.'
    );
  }
  return slug;
}

export async function prepareStudio() {
  const login = hasActiveSession()
    ? { action: 'skipped', email: readStudioSession()?.email ?? null }
    : { action: 'logged-in', ...(await loginToStudio()) };
  const workspace = await syncWorkspace();
  installDesignApp();
  const server = await serveDesignApp();
  return {
    login,
    workspace: { ...workspace, path: STUDIO_PATHS.workspace },
    dependencies: 'installed',
    server,
    browsers: listInstalledBrowsers(),
  };
}

export const describeStudio = () => ({
  loggedIn: hasActiveSession(),
  email: readStudioSession()?.email ?? null,
  workspace: STUDIO_PATHS.workspace,
  hasWorkspace: hasWorkspace(),
  browsers: listInstalledBrowsers(),
});
