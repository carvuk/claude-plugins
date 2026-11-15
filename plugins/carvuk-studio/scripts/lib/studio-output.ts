export class StudioError extends Error {
  readonly hint: string;

  constructor(message: string, hint: string) {
    super(message);
    this.hint = hint;
  }
}

export function printResult(result: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`);
}

export function printFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const hint =
    error instanceof StudioError
      ? error.hint
      : 'Avisa a tech con este mensaje.';
  process.stdout.write(
    `${JSON.stringify({ ok: false, error: message, hint }, null, 2)}\n`
  );
  process.exitCode = 1;
}

export function readFlag(args: string[], name: string) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}
