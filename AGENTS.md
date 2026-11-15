# Plugins de Claude de Carvuk

Este archivo es la fuente de instrucciones compartida por los agentes de este repo. `CLAUDE.md`
lo importa. Las instrucciones del usuario tienen prioridad.

## Contexto

- Catálogo en `.claude-plugin/marketplace.json`; cada plugin vive en `plugins/<nombre>/`.
- Lo usan personas no técnicas: las skills hablan en español de Chile, sin jerga, y explican qué
  hacer cuando algo falla.
- `carvuk-studio` depende de dos contratos externos. Cámbialos en conjunto:
  - La API de carvuk.dev en
    [`carvuk-app-dev/docs/carvuk-studio.md`](https://github.com/carvuk/carvuk-app-dev/blob/main/docs/carvuk-studio.md):
    rutas, token, carpetas permitidas y slugs reservados.
  - La carpeta de prototipos y el visor de `apps/carvuk-app-design` en
    [`carvuk-monorepo`](https://github.com/carvuk/carvuk-monorepo/blob/main/apps/carvuk-app-design/AGENTS.md).

## Código

- Scripts en TypeScript que Node 22 ejecuta directo: sólo sintaxis borrable, imports con
  extensión `.ts` y sin dependencias de runtime. `onboarding.sh` queda en bash porque corre antes
  de que exista Node.
- Cada comando de `studio.ts` imprime un único JSON con `ok`; nada más va a stdout.
- `type` y no `interface`, nombres en inglés, sin comentarios ni `console.*`, hasta 300 líneas por
  archivo.
- Antes de commitear: `npm run typecheck` y `npm run check:shell`.
- Commits en inglés con Conventional Commits y scope del plugin: `feat(carvuk-studio): …`.
