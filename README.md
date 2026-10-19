# RDMP — Reparación y Diagnóstico de Maquinaria Pesada

Web estática de una sola página (HTML, CSS y JavaScript sin dependencias en el navegador). Todo lo que se publica está en la carpeta `public/`.

> **Estado:** borrador. Antes de publicarla hay que activar el envío del formulario, confirmar los derechos de las imágenes y redactar el aviso legal y la política de privacidad (ver «Pendiente antes de publicar»).

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
  claveMapsGoogle: "",   // opcional: Google Maps JavaScript API
};
```

- Los campos vacíos se muestran como **«Pendiente de confirmar»**.
- El formulario tiene tres comportamientos, según lo que haya configurado:
  1. **Sin `destinoFormulario` ni `correo`**: el botón está desactivado y se avisa de que el contacto está **pendiente de activación**. No se envía nada.
  2. **Solo `correo`**: el botón «Preparar correo» abre el programa de correo del usuario con la solicitud redactada. La web avisa de que el mensaje no se envía desde ella.
  3. **Con `destinoFormulario`** (estado actual): se envían los datos en JSON por `POST` a esa URL. Solo se muestra «Solicitud enviada» si el servicio confirma la recepción.

### Envío actual: FormSubmit

El formulario usa [FormSubmit](https://formsubmit.co/) (`https://formsubmit.co/ajax/rdmpmaquinaria@gmail.com`), que reenvía cada solicitud a **rdmpmaquinaria@gmail.com** como una tabla con todos los campos. El asunto incluye el tipo de máquina y el modelo, y al pulsar «Responder» se contesta directamente al cliente.

- **Activación:** FormSubmit no reenvía nada hasta que se pulsa el enlace «Activate Form» del correo que manda a rdmpmaquinaria@gmail.com (revisa también la carpeta de spam). Hasta entonces la web muestra «No se ha podido enviar la solicitud». **La activación va ligada a la dirección desde la que se envía el formulario**: debe hacerse con un envío desde <https://rdmpempresa.vercel.app/> (un envío desde `localhost` genera un enlace que no sirve para la web pública). Cada envío sin activar genera un correo nuevo e invalida los enlaces anteriores, así que hay que usar siempre el más reciente.
- **Protección antispam:** el formulario incluye un campo trampa oculto (`_honey`).
- **Privacidad:** los datos pasan por FormSubmit, un servicio de terceros. La política de privacidad debe mencionarlo.
- **Cambiar de servicio:** basta con poner otra URL en `destinoFormulario` (Formspree, un backend propio…). Si el servicio exige otro formato de datos, se ajusta en `public/js/main.js`.

Campos que llegan al correo:

- Motivo de la solicitud (diagnóstico y asistencia, reparación in situ, mantenimiento, impresión 3D metálica u otra consulta)
- Nombre o empresa, correo y teléfono (opcional)
- Tipo de máquina, marca y modelo, número de serie o PIN (opcional) y horas de máquina (opcional)
- Referencia de ubicación, latitud, longitud y enlace de Google Maps
- Códigos de fallo y comprobaciones realizadas (opcionales)
- Descripción de la incidencia o de la pieza
- Aceptación del uso de los datos

El asunto incluye el motivo, el tipo de máquina y el modelo.

## Impresión 3D metálica

Servicio operativo, no un anuncio futuro. Tiene mención en portada, tarjeta en Servicios, sección propia (`#impresion-3d`) y opción en el formulario.

La web identifica la tecnología (Markforged Metal X, acero 17-4 PH, Wash-1 y Sinter-1) y limita el alcance a piezas auxiliares no críticas. No afirma colaboración oficial con Markforged, certificaciones, plazos universales ni que toda pieza salga lista para montar.

### Unidad móvil (documentación interna, no publicada en la web)

El criterio de diseño es una furgoneta grande; el peso no es el criterio principal. No basta con «meter la impresora»: hay que contemplar el conjunto Metal X + Wash-1 + Sinter-1, accesos y mantenimiento, alimentación eléctrica, extracción, gases, consumibles, anclajes y condiciones de operación. La validación de esa instalación es independiente de esta web. No consta que Markforged certifique estos equipos para funcionar dentro de una furgoneta.

## Ubicación de la máquina y Google Maps

El formulario admite una referencia de obra/explotación/acceso, coordenadas, o ambas. Hace falta al menos una de las dos (referencia suficiente o coordenadas válidas). Si hay coordenadas, se validan aunque exista dirección:

- Latitud entre -90 y 90, longitud entre -180 y 180.
- El 0 es un valor válido.
- Se rechazan pares incompletos o fuera de rango.
- Al borrar o cambiar el campo no se reutilizan coordenadas anteriores.

Flujo base, **sin clave**:

1. «Abrir Google Maps» abre una pestaña nueva (o la aplicación) y no borra el formulario.
2. El usuario copia las coordenadas y las pega, o las escribe a mano (ejemplo: `41.403380, 2.174030`).
3. «Comprobar punto en Google Maps» usa `https://www.google.com/maps/search/?api=1&query=` + `encodeURIComponent(latitud + "," + longitud)`.
4. «Usar mi ubicación» pide permiso **solo al pulsar el botón**, indica que debe usarse junto a la máquina y permite corregir el resultado.

Un enlace a Google Maps no devuelve el punto al formulario; no hay callback ficticio ni iframe que capture la selección.

### Activar el selector integrado

Si hay una clave autorizada de [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) (con facturación y restricciones de dominio en Google Cloud), pégala en `claveMapsGoogle` dentro de `public/config.js`. Entonces aparece «Elegir el punto en el mapa»: diálogo, clic o toque, marcador arrastrable y confirmación que rellena las coordenadas. Sin clave, el botón permanece oculto. No actives facturación ni inventes credenciales desde este repositorio.

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
| `logo-rdmp-texto.png` | Logotipo en la cabecera y el pie | Logotipo propio de RDMP. |
| `logo-rdmp-emblema-bulldozer.png` | Emblema al inicio de la portada e imagen al compartir el enlace (`compartir-rdmp-1200x630.jpg`) | Logotipo propio de RDMP. |
| `06-bulldozer-cat-d9t-al-atardecer.jpg` | Portada | Logotipo CAT visible. 735 px de ancho: algo justa para pantallas grandes. |
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

- [x] Correo, teléfono y zona de cobertura en `public/config.js`.
- [ ] Activar FormSubmit con el enlace recibido en rdmpmaquinaria@gmail.com y hacer una prueba real desde el dominio público.
- [ ] Derechos de publicación de las cinco fotografías usadas (los logotipos propios y la ilustración conceptual de fabricación no sustituyen esa revisión).
- [ ] Aviso legal (identificación del titular, obligatoria en España según la LSSI) y política de privacidad (RGPD), enlazados en el pie y junto a la casilla del formulario. La política debe mencionar FormSubmit y, si se activa, Google Maps y la geolocalización.
- [x] Dominio: la web está publicada en Vercel en <https://rdmpempresa.vercel.app/>. Si se cambia de dominio, actualizar `canonical`, `og:url` y `og:image` en `public/index.html` y volver a activar FormSubmit desde el nuevo dominio.
- [ ] Clave de Google Maps JavaScript API, solo si se quiere el selector de mapa integrado.
- [ ] Validación independiente de la instalación del Metal X, Wash-1 y Sinter-1 en la furgoneta.

## Publicación en Vercel

`vercel.json` indica a Vercel que publique la carpeta `public/` (no hay paso de compilación). Cada `git push` a `main` debería generar un despliegue nuevo. Si la web publicada no refleja el último commit, revisa la pestaña **Deployments** del proyecto en Vercel o pulsa **Redeploy**.

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
