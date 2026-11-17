---
name: empezar
description: Punto de entrada de Carvuk Studio. Prepara la Mac, conecta la cuenta @carvuk.com, descarga o actualiza el design system, pregunta en qué app trabajar y prototipa en vivo en el navegador. Úsala cuando alguien quiera prototipar, maquetar, diseñar o cambiar una pantalla de Carvuk, o pida empezar o retomar Carvuk Studio.
---

# Carvuk Studio: empezar y prototipar

Hablas con alguien que no programa. Tú corres los comandos y escribes el código; la persona decide
qué se ve y qué dice. Explica cada paso en una frase simple. Si algo falla, di qué pasó y qué tiene
que hacer la persona.

`studio <comando>` significa correr, en cada llamada, el comando completo:

```bash
source ~/.carvuk-studio/env.sh && node '${CLAUDE_PLUGIN_ROOT}/scripts/studio.ts' <comando>
```

Cada comando imprime JSON. Con `"ok": false`, explica `error` y `hint` con tus palabras y detente.
Haz los pasos 1 a 4 en cada sesión, en orden: son rápidos cuando ya está todo listo.

## 1. Herramientas

Corre con un timeout de 10 minutos:

```bash
bash '${CLAUDE_PLUGIN_ROOT}/scripts/onboarding.sh'
```

La primera vez avisa antes: «Voy a instalar lo que necesita tu Mac; no pide contraseña».

- Código de salida 2: se abrió la ventana de Apple para instalar herramientas de desarrollo. Pide
  que la acepte, espere a que termine y te avise; después repite este paso.
- `FAIL`: explica el motivo y detente.

## 2. Credencial

Corre `studio status`. Si `loggedIn` es `false`, avisa: «Se va a abrir el navegador: entra con tu
cuenta @carvuk.com y presiona “Autorizar y volver a Claude”». Luego corre `studio login` con un
timeout de 6 minutos. Si no se abrió el navegador, muestra el `authorizeUrl` que el comando imprime
en stderr. Nunca pidas ni pegues tokens en la conversación.

## 3. Design system al día

Corre, cada uno con un timeout de 10 minutos:

1. `studio sync`: la primera vez descarga el design system y la app de diseño en
   `~/Carvuk/carvuk-monorepo`; después trae la última versión de `staging`.
2. `studio install`: instala o actualiza las dependencias.
3. `studio serve`: levanta la app de diseño en segundo plano en `http://localhost:3010`.

Cuéntalo en una línea: «Tengo la última versión del design system (commit `<commit>`)».

## 4. Elegir la app

Corre `studio apps` y pregunta en qué app quiere trabajar, con las etiquetas de la lista como
opciones. Pregunta también si es una pantalla nueva o un cambio a una existente.

- Para un cambio a una pantalla existente, corre `studio reference --app <app>` y lee esa pantalla
  en la ruta que devuelve. Es sólo referencia: nunca edites esa carpeta.
- Elige un slug en español y kebab-case que describa la pantalla, por ejemplo `cotizar-soap`.
  `index` y `utils` están reservados. Si el slug ya existe en
  `apps/carvuk-app-design/src/pages/prototipos/`, pregunta si quiere retomarlo.
- Guarda el borrador en `~/.carvuk-studio/pedidos/<slug>.json` con `slug`, `target.app` y, si lo
  sabes, `target.route`. Ve agregando `decisions` y `openQuestions` mientras trabajas.

## 5. Prototipar en vivo

Trabaja en `~/Carvuk/carvuk-monorepo`. Antes de escribir código, lee su `AGENTS.md`, el de
`apps/carvuk-app-design` y la skill `carvuk-design-system` del repo.

1. Crea el prototipo sólo en estos archivos; carvuk.dev rechaza cualquier otro:

   - `apps/carvuk-app-design/src/pages/prototipos/<slug>.tsx`
   - `apps/carvuk-app-design/src/components/prototipos/<slug>/`
   - `apps/carvuk-app-design/src/lib/prototipos/<slug>/`
   - `apps/carvuk-app-design/public/prototipos/<slug>/`, sólo para fotos, con `studio image`

   Copia la forma de `ejemplo-mantencion`: la página exporta
   `getStaticProps = getPrototypeStaticProps` y no usa `getLayout`.

   Puedes poner fotos de marca: del brand book o nuevas con Higgsfield. Si es una landing, un
   hero, un banner de campaña o cards de servicios, o si pide algo más vivo, ponlas sin esperar a
   que las pida, siguiendo [fotos.md](fotos.md).

2. Ábrelo en su navegador con `studio open --slug <slug>`. Usa el navegador por defecto; si la
   persona prefiere otro de `browsers` (Chrome, Arc, Brave, Safari, Edge, Firefox), agrega
   `--browser <nombre>`.
3. Cada cambio que pida se ve solo en esa pestaña al guardar. Después de cada cambio, revisa tú el
   resultado con `studio screenshot --slug <slug>` si hay pantallazos disponibles, corrige lo que se
   vea roto y cuéntale en una línea qué cambió.
4. Si pide ver mobile, corre `studio open --slug <slug> --vista mobile`, o dile que use el botón
   Mobile arriba a la derecha. Para volver, `--vista desktop`.
5. Si cerró la pestaña o no ve los cambios, vuelve a correr `studio open`. Si la página no
   responde, corre `studio serve`.

## Design system primero

- Usa componentes de `@carvuk/design-system/components/*`, tokens de tipografía (`heading-*`,
  `body-*`), colores semánticos (`text-foreground`, `bg-primary`), la escala de spacing y radius e
  íconos Tabler. Revisa ejemplos en `apps/carvuk-app-design/src/components/design-system/docs/`.
- Si lo que pide no existe en el design system, propón la alternativa más cercana que sí existe y
  explica la diferencia en simple.
- Sólo sal del design system si la persona lo pide explícitamente después de escuchar la
  alternativa. Hazlo dentro de los archivos del prototipo y anótalo en `decisions` como
  «Pidió salir del design system: …», para que tech lo vea.
- Datos falsos pero creíbles en `src/lib/prototipos/<slug>/constants/`. Sin fetch, queries,
  services ni variables de entorno.
- Las fotos van con `next/image`: las del brand book desde `/brand/images/photography/` y las
  nuevas desde `/prototipos/<slug>/`. Nunca uses URLs externas.
- Convenciones del repo: TypeScript, `type` y no `interface`, nombres en inglés, copy en español de
  Chile, archivos de 300 líneas como máximo y sin comentarios.

## Cuándo terminar

No crees tickets, ramas, commits ni PRs durante el prototipo. Cuando la persona diga que está
listo o quiera pedir el cambio, usa `/carvuk-studio:enviar`. Si sólo quiere parar, deja la app
corriendo o apágala con `studio stop`; el trabajo queda guardado en su Mac.
