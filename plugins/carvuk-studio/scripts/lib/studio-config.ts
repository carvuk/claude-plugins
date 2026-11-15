import { homedir } from 'node:os';
import { join } from 'node:path';

const home = homedir();

export const STUDIO_HOME =
  process.env.CARVUK_STUDIO_HOME ?? join(home, '.carvuk-studio');

export const STUDIO_PATHS = {
  session: join(STUDIO_HOME, 'session.json'),
  tokenFile: join(STUDIO_HOME, 'token'),
  screenshots: join(STUDIO_HOME, 'screenshots'),
  serverLog: join(STUDIO_HOME, 'design-app.log'),
  serverPid: join(STUDIO_HOME, 'design-app.pid'),
  workspace:
    process.env.CARVUK_STUDIO_WORKSPACE ??
    join(home, 'Carvuk', 'carvuk-monorepo'),
} as const;

export const STUDIO_API_URL =
  process.env.CARVUK_STUDIO_API_URL ?? 'https://carvuk.dev';

export const STUDIO_API_PATHS = {
  authorize: '/pedidos/studio',
  githubToken: '/api/studio/github-token',
  attachments: '/api/adjuntos',
  prototypes: '/api/studio/prototipos',
  requests: '/pedidos',
} as const;

export const STUDIO_KEYCHAIN = {
  service: 'carvuk-studio',
  account: 'carvuk.dev',
} as const;

export const STUDIO_REPOSITORY = {
  url: 'https://github.com/carvuk/carvuk-monorepo.git',
  branch: 'staging',
  sparsePaths: [
    'apps/carvuk-app-design',
    'packages',
    'skills',
    '.claude',
    '.agents',
    'scripts',
  ],
} as const;

export const STUDIO_DESIGN_APP = {
  packageName: 'carvuk-app-design',
  directory: 'apps/carvuk-app-design',
  port: 3010,
  prototypeDirectories: (slug: string) => [
    `apps/carvuk-app-design/src/components/prototipos/${slug}`,
    `apps/carvuk-app-design/src/lib/prototipos/${slug}`,
  ],
  prototypePage: (slug: string) =>
    `apps/carvuk-app-design/src/pages/prototipos/${slug}.tsx`,
} as const;

export const STUDIO_LOGIN = {
  timeoutMs: 5 * 60 * 1000,
  callbackPath: '/callback',
  host: '127.0.0.1',
} as const;

export const STUDIO_SCREENSHOT_VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

export const STUDIO_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Arc.app/Contents/MacOS/Arc',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/opt/pw-browsers/chromium',
] as const;

export const STUDIO_SERVER = {
  healthPath: '/prototipos',
  healthTimeoutMs: 5_000,
  startTimeoutMs: 180_000,
  pollIntervalMs: 2_000,
} as const;

export const STUDIO_BROWSERS = [
  { name: 'Chrome', app: 'Google Chrome' },
  { name: 'Arc', app: 'Arc' },
  { name: 'Brave', app: 'Brave Browser' },
  { name: 'Safari', app: 'Safari' },
  { name: 'Edge', app: 'Microsoft Edge' },
  { name: 'Firefox', app: 'Firefox' },
] as const;

export const STUDIO_SLUG = {
  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  maxLength: 48,
  reserved: ['index', 'utils'],
} as const;

export const STUDIO_TARGET_APPS = [
  { app: 'carvuk-app-client', label: 'Cliente (carvuk.com)' },
  { app: 'carvuk-app-backoffice', label: 'Backoffice' },
  { app: 'carvuk-app-businesses', label: 'Empresas' },
  { app: 'carvuk-app-finance', label: 'Finanzas' },
  { app: 'carvuk-app-sellers', label: 'Vendedores' },
  { app: 'carvuk-app-suppliers', label: 'Proveedores' },
  { app: 'carvuk-app-wiki', label: 'Wiki interna' },
  { app: 'carvuk-app-client-mobile', label: 'App móvil de clientes' },
  {
    app: 'carvuk-app-mobile-mi-primera-licencia',
    label: 'App Mi Primera Licencia',
  },
  { app: 'carvuk-app-design', label: 'Brand book y design system' },
] as const;
