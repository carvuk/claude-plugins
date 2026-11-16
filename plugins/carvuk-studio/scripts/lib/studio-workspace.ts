import { execFileSync, type ExecFileSyncOptions } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { createMonorepoReadToken } from './studio-api.ts';
import {
  STUDIO_DESIGN_APP,
  STUDIO_PATHS,
  STUDIO_REPOSITORY,
} from './studio-config.ts';
import { StudioError } from './studio-output.ts';

const GIT_HOST_URL = 'https://github.com/';
const STUDIO_REFERENCE_APP_PATTERN = /^carvuk-app-[a-z0-9-]+$/;
const PARTIAL_WORKSPACE_SUFFIX = '.descargando';
const ERROR_TAIL_LENGTH = 1200;
const RETRY_HINT =
  'Revisa tu conexión y vuelve a intentar. Si se repite, avisa a tech con este mensaje.';

function buildGitAuthEnvironment(token: string): NodeJS.ProcessEnv {
  const credentials = Buffer.from(`x-access-token:${token}`).toString('base64');
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: `http.${GIT_HOST_URL}.extraheader`,
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${credentials}`,
  };
}

function run(
  command: string,
  args: string[],
  options: ExecFileSyncOptions = {}
) {
  return execFileSync(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options,
  });
}

function git(args: string[], env?: NodeJS.ProcessEnv) {
  return run('git', args, { cwd: STUDIO_PATHS.workspace, env })
    .toString()
    .trim();
}

function readStderrTail(error: unknown) {
  const stderr =
    typeof error === 'object' && error !== null && 'stderr' in error
      ? String((error as { stderr: unknown }).stderr)
      : '';
  return stderr.slice(-ERROR_TAIL_LENGTH);
}

export const hasWorkspace = () => existsSync(`${STUDIO_PATHS.workspace}/.git`);

const hasDesignApp = () =>
  existsSync(join(STUDIO_PATHS.workspace, STUDIO_DESIGN_APP.directory));

function downloadWorkspace(destination: string, env: NodeJS.ProcessEnv) {
  run(
    'git',
    [
      'clone',
      '--filter=blob:none',
      '--sparse',
      '--branch',
      STUDIO_REPOSITORY.branch,
      STUDIO_REPOSITORY.url,
      destination,
    ],
    { env }
  );
  run('git', ['sparse-checkout', 'set', ...STUDIO_REPOSITORY.sparsePaths], {
    cwd: destination,
    env,
  });
}

export async function cloneWorkspace() {
  if (hasWorkspace())
    return { workspace: STUDIO_PATHS.workspace, cloned: false };
  const env = buildGitAuthEnvironment(await createMonorepoReadToken());
  const partialWorkspace = `${STUDIO_PATHS.workspace}${PARTIAL_WORKSPACE_SUFFIX}`;
  rmSync(partialWorkspace, { recursive: true, force: true });
  mkdirSync(dirname(STUDIO_PATHS.workspace), { recursive: true });
  try {
    downloadWorkspace(partialWorkspace, env);
  } catch (error) {
    rmSync(partialWorkspace, { recursive: true, force: true });
    throw new StudioError(
      `No se pudo descargar el código. ${readStderrTail(error)}`,
      RETRY_HINT
    );
  }
  renameSync(partialWorkspace, STUDIO_PATHS.workspace);
  return { workspace: STUDIO_PATHS.workspace, cloned: true };
}

function requireWorkspace() {
  if (!hasWorkspace()) {
    throw new StudioError(
      'Todavía no está descargado el código.',
      'Corre /carvuk-studio:empezar para descargarlo.'
    );
  }
}

export async function updateWorkspace() {
  requireWorkspace();
  const env = buildGitAuthEnvironment(await createMonorepoReadToken());
  git(['fetch', 'origin', STUDIO_REPOSITORY.branch], env);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== STUDIO_REPOSITORY.branch) {
    throw new StudioError(
      `El código está en la rama ${branch}, no en ${STUDIO_REPOSITORY.branch}.`,
      'Pídele a Claude que vuelva a staging sin borrar tus prototipos.'
    );
  }
  try {
    git(['merge', '--ff-only', `origin/${STUDIO_REPOSITORY.branch}`], env);
  } catch {
    throw new StudioError(
      'Hay cambios locales fuera de los prototipos que chocan con la versión nueva.',
      'Pídele a Claude que revise `git status` y guarde sólo los prototipos.'
    );
  }
  return {
    workspace: STUDIO_PATHS.workspace,
    commit: git(['rev-parse', '--short', 'HEAD']),
  };
}

export async function addReferenceApp(app: string) {
  requireWorkspace();
  if (!STUDIO_REFERENCE_APP_PATTERN.test(app)) {
    throw new StudioError(
      `La app ${app} no existe en el monorepo.`,
      'Usa el nombre de carpeta, por ejemplo carvuk-app-client.'
    );
  }
  const env = buildGitAuthEnvironment(await createMonorepoReadToken());
  git(['sparse-checkout', 'add', `apps/${app}`], env);
  if (!existsSync(join(STUDIO_PATHS.workspace, 'apps', app))) {
    throw new StudioError(
      `La app ${app} no existe en el monorepo.`,
      'Elige una de las apps de la lista.'
    );
  }
  return {
    workspace: STUDIO_PATHS.workspace,
    reference: join(STUDIO_PATHS.workspace, 'apps', app),
  };
}

export function installDesignApp() {
  requireWorkspace();
  try {
    run(
      'pnpm',
      [
        'install',
        '--frozen-lockfile',
        '--filter',
        `${STUDIO_DESIGN_APP.packageName}...`,
      ],
      { cwd: STUDIO_PATHS.workspace }
    );
  } catch (error) {
    throw new StudioError(
      `No se pudieron instalar las dependencias. ${readStderrTail(error)}`,
      RETRY_HINT
    );
  }
  return {
    workspace: STUDIO_PATHS.workspace,
    app: STUDIO_DESIGN_APP.directory,
  };
}

export async function syncWorkspace() {
  if (hasWorkspace() && !hasDesignApp()) {
    rmSync(STUDIO_PATHS.workspace, { recursive: true, force: true });
  }
  if (!hasWorkspace()) {
    await cloneWorkspace();
    return { action: 'cloned', commit: git(['rev-parse', '--short', 'HEAD']) };
  }
  const { commit } = await updateWorkspace();
  return { action: 'updated', commit };
}
