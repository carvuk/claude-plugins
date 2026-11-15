# Plugins de Claude de Carvuk

Catálogo de plugins de Claude para el equipo de Carvuk. El admin lo sincroniza desde
claude.ai → Organization settings → Plugins & skills, y cada plugin activado aparece para toda la
organización sin que nadie necesite cuenta de GitHub.

| Plugin                                         | Para qué sirve                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`carvuk-studio`](plugins/carvuk-studio/README.md) | Prototipar pantallas con el design system real en la Mac y enviarlas a tech como ticket con su rama |

## Agregar un plugin

1. Crea `plugins/<nombre>/` con `.claude-plugin/plugin.json` y sus skills en
   `skills/<skill>/SKILL.md`.
2. Agrégalo a `.claude-plugin/marketplace.json`.
3. Prueba localmente con `claude --plugin-dir plugins/<nombre>` antes de abrir la PR.

Lo que se mergea a `main` llega a la organización en la siguiente sincronización.
