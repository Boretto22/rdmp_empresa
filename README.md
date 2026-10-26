# RDMP — Reparación y Diagnóstico de Maquinaria Pesada

Web estática de una sola página (HTML, CSS y JavaScript). Leaflet 1.9.4 va en el propio sitio, con su licencia BSD 2-Clause; el navegador no lo descarga de un CDN. Todo lo que se publica está en la carpeta `public/`.

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
  urlCartografia: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  atribucionCartografia: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
```

- Los campos vacíos se muestran como **«Pendiente de confirmar»**.
- El formulario tiene tres comportamientos, según lo que haya configurado:
  1. **Sin `destinoFormulario` ni `correo`**: el botón está desactivado y se avisa de que el contacto está **pendiente de activación**. No se envía nada.
  2. **Solo `correo`**: el botón «Preparar correo» abre el programa de correo del usuario con la solicitud redactada. La web avisa de que el mensaje no se envía desde ella.
  3. **Con `destinoFormulario`** (estado actual): el navegador envía los datos y las fotos como un formulario normal. Solo se muestra «Solicitud aceptada» cuando FormSubmit redirige a `enviado.html`, que es lo que hace después de aceptar el envío.

### Envío actual: FormSubmit

El formulario usa [FormSubmit](https://formsubmit.co/) (`https://formsubmit.co/rdmpmaquinaria@gmail.com`), que reenvía cada solicitud a **rdmpmaquinaria@gmail.com** como una tabla con todos los campos. El asunto incluye el tipo de máquina y el modelo, y al pulsar «Responder» se contesta directamente al cliente. Si `destinoFormulario` contiene `/ajax/`, el envío lo quita: ese endpoint no devuelve una confirmación fiable cuando el formulario lleva fotos y la imagen no llega como un archivo que se pueda abrir.

- **Activación:** FormSubmit no reenvía nada hasta que se pulsa el enlace «Activate Form» del correo que manda a rdmpmaquinaria@gmail.com (revisa también la carpeta de spam). **La activación va ligada a la dirección desde la que se envía el formulario**: debe hacerse con un envío desde <https://rdmpempresa.vercel.app/> (un envío desde `localhost` genera un enlace que no sirve para la web pública). Cada envío sin activar genera un correo nuevo e invalida los enlaces anteriores, así que hay que usar siempre el más reciente.
- **Confirmación:** la web solo muestra «Solicitud aceptada» si FormSubmit redirige el envío a `/enviado.html`. FormSubmit hace esa redirección después de aceptar el formulario; un HTTP 200 del endpoint `/ajax/` no se usa, porque con fotos esa respuesta no era legible y la página decía que no sabía si se había enviado aunque el correo sí llegaba. Si a los 90 segundos no hay redirección, el mensaje dice que no se ha podido confirmar y conserva los datos. No afirma que la solicitud no haya llegado. Mientras tanto el formulario queda bloqueado.
- **Fotos:** van en el mismo formulario, con `enctype="multipart/form-data"`, en el campo `attachment` que documenta FormSubmit. El navegador envía el archivo con su nombre y su tipo, no un JSON. JPEG, PNG y WebP se adjuntan tal cual. HEIC se convierte a JPEG antes de enviarlo; si el navegador no puede convertirlo, no se adjunta y se pide JPEG o PNG, porque el correo de Gmail no abre HEIC. El límite sigue siendo 6 fotos y 10 MB en total. No hay backend propio.
- **Protección antispam:** el formulario incluye un campo trampa oculto (`_honey`).
- **Privacidad:** los datos pasan por FormSubmit, un servicio de terceros. La política de privacidad debe mencionarlo.
- **Cambiar de servicio:** basta con poner otra URL en `destinoFormulario` (Formspree, un backend propio…). Si el servicio exige otro formato de datos, se ajusta en `public/js/main.js`.

Campos que llegan al correo:

- Motivo de la solicitud (diagnóstico y asistencia, reparación in situ, mantenimiento, impresión 3D u otra consulta)
- Nombre o empresa, correo y teléfono (opcional)
- Tipo de máquina, marca y modelo, número de serie o PIN (opcional) y horas de máquina (opcional)
- Sede u obra, dirección e indicaciones de acceso (opcionales), latitud, longitud y enlace de OpenStreetMap al punto confirmado
- Códigos de fallo y comprobaciones realizadas (opcionales)
- Descripción de la incidencia o de la pieza
- Fotos opcionales (JPEG, PNG o WebP; HEIC se convierte a JPEG; hasta 6 y 10 MB en total)
- Aceptación del uso de los datos

El asunto incluye el motivo, el tipo de máquina y el modelo.

## Impresión 3D

Servicio operativo, con la misma jerarquía que el resto: mención en la franja de la portada, tarjeta en Servicios, sección compacta (`#impresion-3d`) y opción en el formulario. No hay bloque promocional en la portada ni tarjeta resaltada.

La sección visible resume aplicaciones, materiales y alcance. El límite a piezas no críticas queda fuera del desplegable. «Detalles de fabricación», cerrado por defecto, cita la configuración de referencia: Markforged FX10 + Metal Kit, lavado y sinterización en metal, escáner 3D, medición y acabado. El 17-4 PH es el metal de referencia, no una solución universal. La web no afirma compra del equipo, colaboración oficial con Markforged, instalación móvil certificada, piezas metálicas acabadas al salir de la impresora ni plazos instantáneos.

### Unidad móvil (documentación interna, no publicada como ficha)

Decisión vigente del equipo de referencia: FX10 + Metal Kit, lavado y sinterización, escáner 3D, medición y acabado. El criterio de diseño sigue siendo una furgoneta grande; el peso no es el criterio principal. Hay que contemplar accesos, mantenimiento, alimentación, extracción, gases, consumibles, anclajes y condiciones de operación. La validación de esa instalación es independiente de esta web y no está hecha. No consta certificación de Markforged para usar estos equipos dentro de una furgoneta. Metal X, Wash-1 y Sinter-1 ya no son la referencia pública ni interna del equipo.

## Mapa de ubicación

El cliente marca el punto de la máquina en un mapa dentro de la web («Seleccionar ubicación en el mapa»). El mapa es Leaflet 1.9.4 con teselas de OpenStreetMap: calles, carreteras y poblaciones reales. No hace falta cuenta, tarjeta ni clave. Leaflet y su CSS se sirven desde `public/vendor/leaflet/` (licencia BSD 2-Clause, archivo `LICENSE`). El despliegue sigue siendo la carpeta estática `public/`, compatible con Vercel.

La vista inicial encuadra la península ibérica y Baleares, con margen. Los botones «Península», «Baleares» y «Ver todo» cambian el encuadre y no mueven el punto. Baleares incluye Mallorca, Menorca, Ibiza y Formentera. Se puede hacer zoom, arrastrar con el ratón y usar gestos táctiles. Un clic deja un único marcador arrastrable. El centro inicial no cuenta como ubicación. Al abrir el modal y al cambiar el tamaño o la orientación se recalcula el tamaño del mapa.

El buscador es local: municipios de España en la península y Baleares, con la provincia o la isla cuando el nombre se repite. Elegir un municipio solo centra el mapa; después hay que marcar el punto de la máquina. No hay búsqueda de empresas ni de direcciones postales, ni geocodificación automática. El nombre de la sede u obra, la dirección y las indicaciones de acceso son campos de texto del formulario.

«Usar mi ubicación» pide permiso solo al pulsarlo y no confirma sola. Latitud y longitud se pueden escribir con coma o punto. El rango es -90 a 90 y -180 a 180; el cero es válido. Cada geolocalización queda ligada a la sesión del modal y a la versión de la selección: una respuesta antigua no pisa un punto posterior ni una sesión nueva. «Confirmar ubicación» guarda el punto en la solicitud en curso. Cancelar, cerrar o Escape conservan el punto ya confirmado. Al reabrir se muestra ese punto y se puede cambiar. El punto provisional y el confirmado van separados.

Al enviar se incluyen latitud, longitud, sede u obra, dirección e indicaciones cuando existen, y un enlace de OpenStreetMap al punto confirmado. Si el envío falla o no se puede confirmar, se conservan los datos y las fotos.

### Cartografía

Proveedor por defecto, en `public/config.js`:

`https://tile.openstreetmap.org/{z}/{x}/{y}.png`

La atribución visible es «© OpenStreetMap contributors», con enlace a la licencia. Se cumple la [política de teselas de la OSMF](https://operations.osmfoundation.org/policies/tiles/): sin cabeceras que impidan la caché del navegador, sin descarga previa de regiones y sin modo offline. El uso básico de una web con tráfico moderado entra en el servidor público; no hay disponibilidad garantizada ni uso sin conexión. Si el tráfico crece, `urlCartografia` y `atribucionCartografia` permiten cambiar a otro proveedor derivado de OpenStreetMap. Con la URL estándar, la atribución de OpenStreetMap se mantiene aunque el texto de configuración esté vacío.

El mapa se crea al abrir el selector. Si las teselas o Leaflet fallan, se explica y siguen disponibles la latitud y la longitud.

### Municipios

`public/datos/municipios.json` contiene 8128 centroides reales. Proceden de los límites municipales de la Base de Datos de Límites Jurisdiccionales de España (BDLJE) del Instituto Geográfico Nacional ([ign.es](https://www.ign.es/), [Centro de Descargas del CNIG](http://centrodedescargas.cnig.es/CentroDescargas/)), licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Opendatasoft calculó los centroides en el conjunto [georef-spain-municipio](https://public.opendatasoft.com/explore/dataset/georef-spain-municipio/) (datos procesados el 2022-12-26) y los republica con la misma licencia.

Se han excluido Canarias, Ceuta, Melilla y los territorios no asociados a una provincia. En Illes Balears el texto que distingue el municipio es la isla (Mallorca, Menorca, Ibiza o Formentera), deducida de las coordenadas de ese mismo centroide; no es un campo distinto de la fuente. El índice no incluye municipios de Portugal: Portugal se ve en el mapa y el punto se marca con un clic o con coordenadas. Hay que mantener la atribución al IGN y a Opendatasoft al redistribuir el archivo.

La política de privacidad debe mencionar FormSubmit, OpenStreetMap y la geolocalización.

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
- [ ] Derechos de publicación de las cinco fotografías usadas (los logotipos propios no sustituyen esa revisión).
- [ ] Aviso legal (identificación del titular, obligatoria en España según la LSSI) y política de privacidad (RGPD), enlazados en el pie y junto a la casilla del formulario. La política debe mencionar FormSubmit, OpenStreetMap y la geolocalización.
- [x] Dominio: la web está publicada en Vercel en <https://rdmpempresa.vercel.app/>. Si se cambia de dominio, actualizar `canonical`, `og:url` y `og:image` en `public/index.html` y volver a activar FormSubmit desde el nuevo dominio.
- [x] Mapa del formulario con Leaflet y OpenStreetMap, sin clave de API.
- [ ] Validación independiente de la instalación del FX10 + Metal Kit, con lavado, sinterización, escáner y acabado, en la furgoneta.

## Publicación en Vercel

`vercel.json` indica a Vercel que publique la carpeta `public/` (no hay paso de compilación). Cada `git push` a `main` debería generar un despliegue nuevo. Si la web publicada no refleja el último commit, revisa la pestaña **Deployments** del proyecto en Vercel o pulsa **Redeploy**.

## Estructura

```
public/                  Web publicable
  index.html             Página única con todas las secciones
  config.js              Datos de contacto y destino del formulario
  css/styles.css         Estilos
  js/main.js             Menú móvil, datos de contacto, mapa y formulario
  datos/municipios.json  Municipios de la península y Baleares, CC BY 4.0
  vendor/leaflet/        Leaflet 1.9.4, CSS, iconos y licencia BSD 2-Clause
  assets/img/            Imágenes optimizadas
  assets/fonts/          Tipografías
imagenes-originales/     Imágenes adjuntas, sin modificar
scripts/                 Servidor local y optimización de imágenes
```
