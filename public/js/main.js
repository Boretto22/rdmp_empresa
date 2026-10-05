(function () {
  "use strict";

  var config = window.RDMP_CONFIG || {};
  var limpiar = function (v) { return typeof v === "string" ? v.trim() : ""; };
  var correo = limpiar(config.correo);
  var telefono = limpiar(config.telefono);
  var zona = limpiar(config.zonaCobertura);
  var destino = limpiar(config.destinoFormulario);

  /* ---------------- Navegación móvil ---------------- */
  var boton = document.querySelector(".menu-boton");
  var nav = document.getElementById("navegacion");
  var movil = window.matchMedia("(max-width: 1080px)");

  function cerrarMenu(devolverFoco) {
    if (!nav.classList.contains("abierta")) return;
    nav.classList.remove("abierta");
    boton.setAttribute("aria-expanded", "false");
    if (devolverFoco) boton.focus();
  }

  boton.addEventListener("click", function () {
    var abrir = !nav.classList.contains("abierta");
    nav.classList.toggle("abierta", abrir);
    boton.setAttribute("aria-expanded", String(abrir));
    if (abrir) nav.querySelector("a").focus();
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) cerrarMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") cerrarMenu(true);
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".cabecera")) cerrarMenu(false);
  });
  movil.addEventListener("change", function () { cerrarMenu(false); });

  /* ---------------- Sección activa en el menú ---------------- */
  var enlaces = Array.prototype.slice.call(document.querySelectorAll(".navegacion__lista a"));
  if ("IntersectionObserver" in window) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        enlaces.forEach(function (a) {
          if (a.getAttribute("href") === "#" + entrada.target.id) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { observador.observe(s); });
  }

  var anio = document.getElementById("anio");
  if (anio) anio.textContent = String(new Date().getFullYear());

  /* ---------------- Datos de contacto ---------------- */
  function pintarDato(clave, valor, crearEnlace) {
    var el = document.querySelector('[data-dato="' + clave + '"]');
    if (!el) return;
    if (!valor) {
      el.textContent = "Pendiente de confirmar";
      el.classList.add("pendiente");
      return;
    }
    el.classList.remove("pendiente");
    el.textContent = "";
    if (crearEnlace) {
      var a = document.createElement("a");
      a.href = crearEnlace(valor);
      a.textContent = valor;
      el.appendChild(a);
    } else {
      el.textContent = valor;
    }
  }
  pintarDato("correo", correo, function (v) { return "mailto:" + v; });
  pintarDato("telefono", telefono, function (v) { return "tel:" + v.replace(/[^\d+]/g, ""); });
  pintarDato("zonaCobertura", zona);

  /* ---------------- Formulario ---------------- */
  var form = document.getElementById("formulario");
  var estado = document.getElementById("estado-formulario");
  var enviar = document.getElementById("boton-enviar");
  var modo = destino ? "destino" : (correo ? "correo" : "pendiente");

  function mostrarEstado(tipo, titulo, texto) {
    estado.className = "estado estado--" + tipo;
    estado.innerHTML = "";
    var t = document.createElement("strong");
    t.textContent = titulo;
    var s = document.createElement("span");
    s.textContent = texto;
    estado.appendChild(t);
    estado.appendChild(s);
  }

  if (modo === "destino") {
    enviar.disabled = false;
    enviar.textContent = "Enviar solicitud";
    mostrarEstado("info", "Formulario de contacto", "Rellena los campos y pulsa «Enviar solicitud». Te responderemos a la dirección de correo que indiques.");
  } else if (modo === "correo") {
    enviar.disabled = false;
    enviar.textContent = "Preparar correo";
    mostrarEstado("info", "El formulario no envía mensajes directamente",
      "Al pulsar «Preparar correo» se abrirá tu programa de correo con la solicitud redactada para que la envíes tú a " + correo + ".");
  } else {
    enviar.disabled = true;
    enviar.textContent = "Envío pendiente de activación";
  }

  var mensajes = {
    nombre: "Indica tu nombre o el de la empresa.",
    correo: "Indica un correo electrónico válido, por ejemplo nombre@empresa.es.",
    tipo_maquina: "Selecciona el tipo de máquina.",
    marca_modelo: "Indica la marca y el modelo de la máquina.",
    ubicacion: "Indica dónde se encuentra la máquina.",
    descripcion: "Describe brevemente la incidencia.",
    privacidad: "Debes aceptar el uso de los datos para que podamos responderte.",
  };

  function validarCampo(campo) {
    var error = document.getElementById(campo.getAttribute("aria-describedby").split(" ").pop());
    var valido = campo.type === "checkbox" ? campo.checked : (campo.value.trim() !== "" && campo.checkValidity());
    campo.setAttribute("aria-invalid", String(!valido));
    if (error) error.textContent = valido ? "" : mensajes[campo.name];
    return valido;
  }

  var campos = Array.prototype.slice.call(form.querySelectorAll("[required]"));
  campos.forEach(function (campo) {
    var evento = campo.type === "checkbox" || campo.tagName === "SELECT" ? "change" : "blur";
    campo.addEventListener(evento, function () {
      if (campo.hasAttribute("aria-invalid")) validarCampo(campo);
    });
    campo.addEventListener("blur", function () {
      if (campo.value.trim() !== "" || campo.type === "checkbox") validarCampo(campo);
    });
  });

  function datosFormulario() {
    var d = new FormData(form);
    return {
      nombre: d.get("nombre").trim(),
      correo: d.get("correo").trim(),
      tipo: d.get("tipo_maquina"),
      modelo: d.get("marca_modelo").trim(),
      ubicacion: d.get("ubicacion").trim(),
      descripcion: d.get("descripcion").trim(),
    };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (modo === "pendiente") return;

    var invalidos = campos.filter(function (c) { return !validarCampo(c); });
    if (invalidos.length) {
      invalidos[0].focus();
      return;
    }

    var d = datosFormulario();

    if (modo === "correo") {
      var cuerpo = [
        "Nombre o empresa: " + d.nombre,
        "Correo: " + d.correo,
        "Tipo de máquina: " + d.tipo,
        "Marca y modelo: " + d.modelo,
        "Ubicación: " + d.ubicacion,
        "",
        "Descripción de la incidencia:",
        d.descripcion,
      ].join("\n");
      window.location.href = "mailto:" + correo +
        "?subject=" + encodeURIComponent("Solicitud de asistencia — " + d.tipo + " " + d.modelo) +
        "&body=" + encodeURIComponent(cuerpo);
      mostrarEstado("info", "Correo preparado",
        "Si no se ha abierto tu programa de correo, escribe directamente a " + correo + ". La solicitud no se envía hasta que la mandes desde tu correo.");
      return;
    }

    enviar.disabled = true;
    enviar.textContent = "Enviando…";
    fetch(destino, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        form.reset();
        campos.forEach(function (c) { c.removeAttribute("aria-invalid"); });
        mostrarEstado("ok", "Solicitud enviada", "Hemos recibido tu solicitud. Te responderemos a la dirección de correo indicada.");
      })
      .catch(function () {
        mostrarEstado("error", "No se ha podido enviar la solicitud",
          correo ? "Inténtalo de nuevo más tarde o escríbenos a " + correo + "." : "Inténtalo de nuevo más tarde.");
      })
      .finally(function () {
        enviar.disabled = false;
        enviar.textContent = "Enviar solicitud";
        estado.scrollIntoView({ block: "nearest" });
      });
  });
})();
