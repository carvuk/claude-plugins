# Fotos para el prototipo

Parte de `empezar`: lo lees cuando la pantalla necesita fotos. La persona no tiene que pedirlas ni
conocer este proceso. Decide tú qué fotos lleva, cuéntalo en una frase y muestra el resultado en
el navegador. `studio <comando>` es el mismo comando completo de `SKILL.md`.

## 1. Qué fotos lleva

- Llevan foto las landings, los heroes, los banners de campaña y las cards de servicios o
  beneficios. Los formularios, los flujos de pago y las tablas no llevan.
- Usa una foto por idea, por ejemplo el hero y cada servicio destacado. Son 8 como máximo por
  prototipo.
- Nunca dejes bloques grises, íconos gigantes ni textos como «imagen aquí».

## 2. Primero, el brand book

Lee `https://design.carvuk.com/v1/fotografia.json`. Si una foto de `photos` cuenta lo mismo que la
sección, úsala: ya está en la app de diseño, en `/brand/images/photography/<id>.webp`, y no
gasta créditos. No repitas la misma foto en una pantalla.

## 3. Si ninguna calza, genera con Higgsfield

Esto necesita las herramientas de Higgsfield (`balance`, `media_import_url`,
`generate_image_batch` y `jobs_wait`). Si no las tienes, usa la foto más cercana del brand book y
dile: «Si conectas Higgsfield en Configuración → Conectores, puedo crear fotos nuevas para esto».

1. Revisa los créditos con `balance`. Cada foto cuesta unos 2 créditos. No preguntes hasta 20
   créditos por prototipo. Pregunta antes si vas a gastar más o si quedan menos de 10.
2. Lee `https://design.carvuk.com/v1/agents/fotografia.md` y sigue su procedimiento con las
   reglas de `fotografia.json`: sub-estilo según el uso, un spec por concepto, vocabulario sin
   repetir y la plantilla de prompt en inglés.
3. Importa las referencias con `media_import_url` desde
   `https://design.carvuk.com/brand/images/photography/<id>.webp`. Si aparece un técnico, una de
   ellas es `uniform-sheet`, con el rol «the technician wears exactly this uniform».
4. Genera con `generate_image_batch`: modelo `nano_banana_pro`, `resolution` `2k`, dos variantes
   por foto y el `aspect_ratio` del lugar donde va. Un hero lleva `1:1` o `4:5`, una card `4:3` y
   un banner ancho `16:9`. Espera el resultado con `jobs_wait`.
5. Revisa cada variante contra `avoidGroups`, `traits` y, si hay técnico, cada parte de `uniform`.
   Fíjate también en manos, caras, logos o texto en autos, pantallas legibles y la posición del
   volante. Descarta la que falle en una sola cosa. Si fallan las dos, regenera una vez.

## 4. Guardarla en el prototipo

Nunca pegues en el código una URL de Higgsfield. Guarda cada foto elegida con:

```bash
studio image --slug <slug> --name <nombre-en-kebab-case> --from <result_url o ruta local>
```

El comando la deja en webp de hasta 1600 px y 500 KB y devuelve `src`, por ejemplo
`/prototipos/<slug>/hero-entrega.webp`. Úsala con `next/image`, con `fill`, `sizes` y
`object-cover` dentro de un contenedor con proporción fija, y un `alt` en español que describa la
escena. Con el mismo `--name` reemplazas una foto.

## 5. Dejarlo anotado

En `~/.carvuk-studio/pedidos/<slug>.json`, agrega en `decisions` qué fotos vienen del brand book y
cuáles generaste con Higgsfield, con el concepto de cada una. Las fotos de
`public/prototipos/<slug>/` viajan con el pedido cuando se envía a tech.
