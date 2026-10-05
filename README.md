# RDMP — Reparación y Diagnóstico de Maquinaria Pesada

Web estática de una sola página (HTML, CSS y JavaScript sin dependencias en el navegador). Todo lo que se publica está en la carpeta `public/`.

> **Estado:** borrador. Antes de publicarla hay que completar los datos de contacto, confirmar los derechos de las imágenes y redactar el aviso legal y la política de privacidad (ver «Pendiente antes de publicar»).

## Ejecutar en local

Requiere [Node.js](https://nodejs.org/) 18 o superior.

```bash
npm install      # solo hace falta para regenerar imágenes
npm start        # abre http://localhost:4173
```

`npm start` no necesita `npm install`: usa un servidor mínimo incluido en `scripts/servidor.mjs`. También sirve cualquier servidor estático apuntando a `public/` (por ejemplo `npx serve public`).

Para publicar, basta con subir el contenido de `public/` a cualquier alojamiento estático (GitHub Pages, Netlify, Cloudflare Pages, un hosting tradicional…).

## Editar los datos de contacto

Todo está en **`public/config.js`**:

```js
window.RDMP_CONFIG = {
  correo: "",            // correo público
  telefono: "",          // teléfono tal y como debe mostrarse
  zonaCobertura: "",     // zona de cobertura en texto libre
  destinoFormulario: "", // URL que recibe el formulario por POST
};
```

- Los campos vacíos se muestran como **«Pendiente de confirmar»**.
- El formulario tiene tres comportamientos, según lo que haya configurado:
  1. **Sin `destinoFormulario` ni `correo`** (estado actual): el botón está desactivado y se avisa de que el contacto está **pendiente de activación**. No se envía nada.
  2. **Solo `correo`**: el botón «Preparar correo» abre el programa de correo del usuario con la solicitud redactada. La web avisa de que el mensaje no se envía desde ella.
  3. **Con `destinoFormulario`**: se envían los datos por `POST` (formato `FormData`, cabecera `Accept: application/json`) a esa URL. Es compatible con servicios como Formspree o Getform, o con un backend propio. Solo se muestra «Solicitud enviada» si el servidor responde correctamente.

Campos que se envían: `nombre`, `correo`, `tipo_maquina`, `marca_modelo`, `ubicacion`, `descripcion` y `privacidad`.

## Imágenes

Los originales están en `imagenes-originales/` con nombres descriptivos. Las versiones optimizadas que usa la web (JPEG progresivo y, donde pesa menos, WebP, sin metadatos y en dos anchos) están en `public/assets/img/` y se generan con:

```bash
npm install
npm run imagenes
```

La selección y los anchos se configuran en `scripts/optimizar-imagenes.mjs`.

### ⚠️ Derechos de publicación: pendiente de confirmar

**Ninguna de las imágenes adjuntas tiene una licencia de uso documentada.** Antes de publicar la web hay que confirmar, para cada imagen usada, que RDMP tiene derecho a publicarla (fotografía propia, permiso escrito del autor o licencia que lo permita). Si no se puede confirmar, hay que sustituirla por una foto propia o con licencia documentada.

No se ha añadido ninguna imagen externa: solo se usan las adjuntas.

| Original | Uso en la web | Observaciones |
| --- | --- | --- |
| `06-bulldozer-cat-d9t-al-atardecer.jpg` | Portada e imagen para redes sociales | Logotipo CAT visible. 735 px de ancho: algo justa para pantallas grandes. |
| `02-bulldozer-liebherr-con-ripper-en-roca.jpg` | Servicios | Logotipo Liebherr visible. Hay una persona en la cabina (no se le distingue la cara). |
| `04-flota-de-bulldozers-cat-alineados.jpg` | Mantenimiento preventivo | Logotipo CAT visible. |
| `12-pala-minera-komatsu-con-tecnicos.jpg` | Cómo trabajamos | Logotipo Komatsu visible. Aparecen tres personas de espaldas o de lado: confirmar también su consentimiento. |
| `03-tres-bulldozers-cat-empujando-en-ladera.jpg` | Pendiente de estudio (en escala de grises) | Logotipo CAT visible. |
| `01-rdmp-cartel-portada-dumper-tramado.jpg` | No se usa | Cartel con la marca RDMP. Parece basado en una foto de terceros: confirmar el origen antes de usarlo. |
| `05-excavadora-minera-cat-y-cargadora-generada-ia.jpg` | No se usa | Lleva la marca «Contenido generado por IA». |
| `07-pala-hidraulica-minera-komatsu.jpg` | No se usa | Alternativa válida si se confirman los derechos. |
| `08-excavadora-en-montana-ilustracion-ia.jpg` | No se usa | Parece generada por IA; no representa una máquina real. |
| `09-excavadora-case-en-obra-urbana.jpg` | No se usa | Parece una foto promocional del fabricante (Case). |
| `10-despiece-de-maquinaria-ilustracion-ia.jpg` | No se usa | Parece generada por IA. |
| `11-dumper-belaz-cargando-carbon-con-marca-de-agua.jpg` | No se usa | Lleva la marca de agua de su autor (gelio-nsk.livejournal.com). |
| `13-dumper-liebherr-t282b-en-carga.jpg` | No se usa | Parece una foto promocional del fabricante (Liebherr). 480 px de ancho. |

Como en las fotografías aparecen marcas de fabricantes, el pie de página aclara que eso no implica ninguna relación comercial. Lo ideal a medio plazo es sustituirlas por fotos propias de intervenciones reales.

### Tipografías

Barlow y Barlow Condensed, servidas desde `public/assets/fonts/` (sin peticiones a terceros). Licencia [SIL Open Font License 1.1](https://openfontlicense.org/), que permite su uso comercial y en webs. Se copian desde los paquetes `@fontsource/barlow` y `@fontsource/barlow-condensed` al ejecutar `npm run imagenes`.

## Pendiente antes de publicar

- [ ] Correo, teléfono y zona de cobertura en `public/config.js`.
- [ ] Destino real del formulario (`destinoFormulario`) o, como mínimo, el correo.
- [ ] Derechos de publicación de las cinco imágenes usadas.
- [ ] Aviso legal (identificación del titular, obligatoria en España según la LSSI) y política de privacidad (RGPD), enlazados en el pie y junto a la casilla del formulario.
- [ ] Dominio definitivo: cuando exista, cambiar `og:image` en `public/index.html` por la URL absoluta (por ejemplo `https://dominio/assets/img/portada-bulldozer-735.jpg`) y añadir `<link rel="canonical">`.

## Estructura

```
public/                  Web publicable
  index.html             Página única con todas las secciones
  config.js              Datos de contacto y destino del formulario
  css/styles.css         Estilos
  js/main.js             Menú móvil, datos de contacto y formulario
  assets/img/            Imágenes optimizadas
  assets/fonts/          Tipografías
imagenes-originales/     Imágenes adjuntas, sin modificar
scripts/                 Servidor local y optimización de imágenes
```
