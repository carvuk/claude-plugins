# Carvuk Studio

Plugin de Claude para que cualquier persona de Carvuk prototipe pantallas con el design system
real en su Mac y se las mande a tech como pedido, sin cuenta de GitHub ni conocimientos técnicos.

```text
/carvuk-studio:empezar
  1. herramientas  ─▶ Node 22 + pnpm en ~/.carvuk-studio, si faltan
  2. credencial    ─▶ login con Google @carvuk.com, si no hay sesión
  3. design system ─▶ descarga la primera vez; después trae lo último de staging
  4. app           ─▶ pregunta en qué app trabajar y la usa como referencia
  5. en vivo       ─▶ localhost:3010/prototipos en tu navegador, Desktop o Mobile
/carvuk-studio:enviar
  └─▶ recién aquí: ticket en carvuk.dev + rama preview/ con PR draft y la demostración real
```

## Para quien lo usa

1. Abre Claude en tu Mac, en la pestaña Code, y escribe `/carvuk-studio:empezar`, o simplemente
   «quiero prototipar una pantalla». La primera vez instala lo necesario y te pide entrar con tu
   cuenta @carvuk.com; toma entre 5 y 15 minutos. Las siguientes veces sólo actualiza el design
   system.
2. Elige la app y cuenta qué quieres. Claude lo arma con el design system y lo abre en tu
   navegador (Chrome, Arc, Brave o Safari). Cada cambio aparece ahí solo; el botón Mobile muestra
   la pantalla de teléfono.
3. Cuando esté como lo quieres, di «mándalo a tech» o usa `/carvuk-studio:enviar`. Claude te
   muestra el resumen antes de crear el ticket. Sigues el avance en carvuk.dev/pedidos.

Claude usa siempre los componentes y tokens del design system. Si pides algo distinto, primero te
propone la alternativa que existe; si insistes, lo hace y lo deja anotado para tech. Tu prototipo
nunca llega a producción tal cual: tech lo usa como especificación exacta.

## Para el admin

| Paso                                    | Dónde                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Distribuir el plugin                    | claude.ai → Organization settings → Plugins & skills, sincronizando `carvuk/claude-plugins` (catálogo en `.claude-plugin/marketplace.json`) |
| Secreto de tokens                       | `STUDIO_TOKEN_SECRET` en el proyecto de Vercel de carvuk.dev, 32 caracteres o más                                                               |
| Permisos de la GitHub App de carvuk.dev | `contents: write` y `pull_requests: write` en `carvuk-monorepo`                                                                                 |
| Requisitos de cada Mac                  | macOS, 5 GB libres y cuenta @carvuk.com con acceso completo al portal de pedidos; Chrome, Brave, Arc o Edge para pantallazos                    |

Quien tenga acceso al repo puede instalarlo sin esperar la sincronización, desde Claude Code:

```text
/plugin install carvuk-studio --marketplace carvuk/claude-plugins
```

La sincronización lee el repo con la conexión de GitHub de la organización, así que las personas
no necesitan acceso al repo. El plugin descarga el monorepo en cada Mac con un token de lectura de
carvuk.dev; las reglas de prototipos y del design system viven allá, en el `AGENTS.md` de
[`apps/carvuk-app-design`](https://github.com/carvuk/carvuk-monorepo/blob/main/apps/carvuk-app-design/AGENTS.md). Los detalles de la API y del token están en
[`carvuk-app-dev/docs/carvuk-studio.md`](https://github.com/carvuk/carvuk-app-dev/blob/main/docs/carvuk-studio.md).

## Seguridad

- La Mac guarda un token de Studio en el Llavero de macOS. Dura 30 días, sirve sólo para la API
  de pedidos de carvuk.dev y se revoca para todos rotando `STUDIO_TOKEN_SECRET`.
- Para descargar código, carvuk.dev entrega un token de GitHub de sólo lectura que dura una hora y
  no se guarda. La Mac nunca recibe permisos de escritura sobre GitHub.
- carvuk.dev sólo acepta archivos de las carpetas del prototipo y los sube a una rama
  `preview/prototipo-*` con una PR draft. El merge sigue el flujo normal de review.
- No se descargan variables de entorno ni secretos: los prototipos usan datos de ejemplo.

## Cómo funciona por dentro

- `scripts/onboarding.sh` descarga Node 22 desde nodejs.org, verifica su SHA-256, lo instala en
  `~/.carvuk-studio/node`, activa pnpm 9.15.2 con corepack y escribe `~/.carvuk-studio/env.sh`.
  No usa `sudo` ni modifica el perfil del shell. En una Mac sin herramientas de Apple abre su
  instalador y sale con código 2.
- `scripts/studio.ts` corre con el Node instalado, sin dependencias, y siempre responde JSON:

  | Comando                                            | Qué hace                                                                 |
  | -------------------------------------------------- | ------------------------------------------------------------------------ |
  | `status`                                           | Sesión, carpeta de trabajo y navegadores instalados                      |
  | `login` / `logout`                                 | Conecta o desconecta la Mac con carvuk.dev                               |
  | `sync`                                             | Clon parcial de `staging` la primera vez; después `fetch` + fast-forward |
  | `install`                                          | `pnpm install` congelado y filtrado a la app de diseño                   |
  | `serve` / `stop`                                   | Levanta o apaga la app de diseño en segundo plano (puerto 3010)          |
  | `prepare`                                          | `login` si falta, `sync`, `install` y `serve` en un paso                 |
  | `apps`                                             | Apps de destino que se pueden elegir                                     |
  | `reference --app <app>`                            | Agrega una app al clon, sólo como referencia                             |
  | `open --slug <s> [--vista mobile] [--browser Arc]` | Abre el visor en el navegador por defecto o el elegido                   |
  | `screenshot --slug <s>`                            | Pantallazos desktop y mobile con un navegador Chromium headless          |
  | `submit --manifest <json>`                         | Sube los pantallazos y envía el prototipo                                |

- Variables para probar: `CARVUK_STUDIO_API_URL`, `CARVUK_STUDIO_HOME` y
  `CARVUK_STUDIO_WORKSPACE`. Los tipos se revisan con `npm run typecheck` en la raíz de este repo.
