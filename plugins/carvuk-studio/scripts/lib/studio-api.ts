import { STUDIO_API_PATHS, STUDIO_API_URL } from './studio-config.ts';
import { StudioError } from './studio-output.ts';
import { clearStudioSession, requireStudioToken } from './studio-session.ts';

type StudioRequestOptions = {
  path: string;
  body?: BodyInit;
  json?: unknown;
};

const STATUS_HINTS: Record<number, string> = {
  401: 'La sesión ya no es válida. Corre /carvuk-studio:empezar para conectarte de nuevo.',
  403: 'Tu cuenta no tiene permiso para crear pedidos. Pídele acceso a tech.',
  409: 'Tienes 10 pedidos pendientes. Espera a que avance uno o guarda este como borrador en carvuk.dev/pedidos.',
};

function readErrorMessage(body: unknown, status: number) {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const { error } = body as { error: unknown };
    if (typeof error === 'string') return error;
  }
  return `carvuk.dev respondió ${status}.`;
}

export async function studioRequest({
  path,
  body,
  json,
}: StudioRequestOptions): Promise<unknown> {
  const token = requireStudioToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${STUDIO_API_URL}${path}`, {
    method: 'POST',
    headers,
    body: json !== undefined ? JSON.stringify(json) : body,
  }).catch(() => {
    throw new StudioError(
      'No se pudo conectar con carvuk.dev.',
      'Revisa tu conexión a internet y vuelve a intentar.'
    );
  });

  const responseBody: unknown = await response.json().catch(() => null);
  if (response.status === 401) clearStudioSession();
  if (!response.ok) {
    throw new StudioError(
      readErrorMessage(responseBody, response.status),
      STATUS_HINTS[response.status] ?? 'Avisa a tech con este mensaje.'
    );
  }
  return responseBody;
}

export async function createMonorepoReadToken() {
  const body = await studioRequest({ path: STUDIO_API_PATHS.githubToken });
  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as { token?: unknown }).token !== 'string'
  ) {
    throw new StudioError(
      'carvuk.dev no entregó un token de lectura.',
      'Avisa a tech con este mensaje.'
    );
  }
  return (body as { token: string }).token;
}
