/*
 * DATOS DE CONTACTO DE RDMP
 * -------------------------
 * Este es el único archivo que hay que editar para configurar el contacto.
 * Deja un valor vacío ("") mientras no esté confirmado: la web mostrará
 * «Pendiente de confirmar» y el formulario indicará que está pendiente de activación.
 */
window.RDMP_CONFIG = {
  // Correo público de contacto. Ejemplo: "contacto@rdmp.es"
  correo: "rdmpmaquinaria@gmail.com",

  // Teléfono tal y como debe mostrarse. Sin prefijo se asume +34 para el enlace de llamada.
  telefono: "649 632 791",

  // Zona de cobertura en texto libre.
  zonaCobertura: "España (península y Baleares)",

  // URL que recibe el formulario por POST en JSON. Ahora: FormSubmit, que reenvía
  // cada solicitud al correo indicado al final de la URL.
  // Si se deja vacía pero hay correo, el botón preparará un correo en el programa
  // de correo del usuario (no se envía nada desde la web).
  // Si no hay ni destino ni correo, el formulario queda desactivado.
  destinoFormulario: "https://formsubmit.co/ajax/rdmpmaquinaria@gmail.com",

  // Clave de navegador de Google Maps JavaScript API. Vacía: el selector se abre,
  // pero el mapa y el buscador no cargan hasta pegar aquí una clave autorizada.
  // APIs, facturación y restricciones: README, «Selector de Google Maps».
  claveMapsGoogle: "",

  // Map ID de Google Cloud para el marcador avanzado. Vacío usa DEMO_MAP_ID.
  mapaIdGoogle: "",
};
