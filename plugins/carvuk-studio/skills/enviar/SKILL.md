---
name: enviar
description: Envía a tech el prototipo terminado de Carvuk Studio como solicitud de cambio, con un ticket en carvuk.dev y una rama con PR draft que contiene la demostración real. Úsala sólo cuando la persona diga que el prototipo está listo o pida enviarlo, mandarlo o pedírselo a tech.
---

# Carvuk Studio: enviar a tech

Este es el único momento en que se crea algo fuera de la Mac: un ticket y una rama con PR draft a
nombre de la persona. Muestra el resumen y espera su confirmación explícita antes de enviar.

`studio <comando>` significa correr, en cada llamada, el comando completo:

```bash
source ~/.carvuk-studio/env.sh && node '${CLAUDE_PLUGIN_ROOT}/scripts/studio.ts' <comando>
```

## 1. Revisar el prototipo

1. Corre `studio status`. Si falta la sesión o el código, usa `/carvuk-studio:empezar` y vuelve.
2. Identifica el slug. Si hay varios en `apps/carvuk-app-design/src/pages/prototipos/`, pregunta
   cuál.
3. En `~/Carvuk/carvuk-monorepo`, corre `pnpm --filter carvuk-app-design typecheck` y
   `pnpm --filter carvuk-app-design lint`. Si fallan, corrige sólo archivos del prototipo y
   muéstrale el resultado en el navegador antes de seguir.
4. Corre `studio screenshot --slug <slug>`. Si el prototipo tiene estados, saca uno por estado con
   `--path` y ponle una etiqueta clara. Si responde `skipped`, sigue sin pantallazos: la rama
   lleva la demostración.

## 2. Armar el resumen

Completa `~/.carvuk-studio/pedidos/<slug>.json`, que empezó en `/carvuk-studio:empezar`:

```json
{
  "slug": "cotizar-soap",
  "title": "Frase corta de lo que se pide (3 a 140 caracteres)",
  "summary": "Qué se necesita y por qué, con las palabras de la persona.",
  "target": { "app": "carvuk-app-client", "route": "/soap/cotizar" },
  "mockData": ["Qué datos del prototipo son de ejemplo y deben ser reales"],
  "decisions": [
    "Lo que la persona decidió, incluidas las salidas del design system"
  ],
  "openQuestions": [
    "Lo que quedó sin decidir o necesita algo fuera del prototipo"
  ],
  "screenshots": [{ "label": "Mobile", "file": "/ruta/al/pantallazo.png" }],
  "area": "seguros"
}
```

- `target.app` es un `app` de `studio apps`. `target.route` es opcional.
- `area` es opcional: `seguros`, `campanas`, `finanzas`, `ops`, `b2b`, `gps`, `bots`, `infra` o
  `marketing`. `priority` es opcional, un entero desde 1.
- `screenshots` puede ir vacío. Hasta 12 pantallazos de 4 MB cada uno.
- Las fotos de `apps/carvuk-app-design/public/prototipos/<slug>/` se envían solas con el
  prototipo: hasta 8, de 500 KB cada una. Las del brand book ya están en el repo y no se envían.

Muestra el título, el resumen, la app, las decisiones, las preguntas abiertas y los pantallazos.
Pregunta: «¿Lo envío a tech así?». Ajusta lo que pida.

## 3. Enviar

Con la confirmación, corre:

```bash
studio submit --manifest ~/.carvuk-studio/pedidos/<slug>.json
```

Cuéntale el resultado en simple:

- El número del ticket y `requestUrl`, donde sigue el avance y conversa con tech.
- `branch` y `pullRequestUrl`: la rama con su demostración real, lista para que tech la revise. Si
  `pullRequestUrl` es `null`, el ticket y la rama igual quedaron creados.
- Qué pasa ahora: tech lleva el prototipo a la app real con datos reales y le avisa cuando esté en
  producción.

Si el envío falla con 409, tiene 10 pedidos pendientes: sugiere esperar o guardarlo como borrador
en carvuk.dev/pedidos. Los archivos del prototipo quedan en su Mac; no los borres.
