/*
 * DATOS DE CONTACTO DE RDMP
 * -------------------------
 * Este es el único archivo que hay que editar para configurar el contacto.
 * Deja un valor vacío ("") mientras no esté confirmado: la web mostrará
 * «Pendiente de confirmar» y el formulario indicará que está pendiente de activación.
 */
window.RDMP_CONFIG = {
  // Correo público de contacto. Ejemplo: "contacto@rdmp.es"
  correo: "",

  // Teléfono tal y como debe mostrarse. Ejemplo: "+34 600 000 000"
  telefono: "",

  // Zona de cobertura en texto libre. Ejemplo: "Provincia de Madrid y limítrofes"
  zonaCobertura: "",

  // URL que recibe el formulario por POST (Formspree, Getform, un backend propio...).
  // Si se deja vacía pero hay correo, el botón preparará un correo en el programa
  // de correo del usuario (no se envía nada desde la web).
  // Si no hay ni destino ni correo, el formulario queda desactivado.
  destinoFormulario: "",
};
