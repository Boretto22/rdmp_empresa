(function () {
  "use strict";

  var config = window.RDMP_CONFIG || {};
  var limpiar = function (v) { return typeof v === "string" ? v.trim() : ""; };
  var correo = limpiar(config.correo);
  var telefono = limpiar(config.telefono);
  var zona = limpiar(config.zonaCobertura);
  var destino = limpiar(config.destinoFormulario);
  var claveMaps = limpiar(config.claveMapsGoogle);

  /* ---------------- Navegación móvil ---------------- */
  var boton = document.querySelector(".menu-boton");
  var nav = document.getElementById("navegacion");
  var movil = window.matchMedia("(max-width: 1240px)");
  var dialogo = document.getElementById("dialogo-mapa");

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
    if (e.key !== "Escape") return;
    if (dialogo && dialogo.open) return;
    cerrarMenu(true);
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
  pintarDato("telefono", telefono, function (v) {
    var numero = v.replace(/[^\d+]/g, "");
    return "tel:" + (numero.charAt(0) === "+" ? numero : "+34" + numero);
  });
  pintarDato("zonaCobertura", zona);

  /* ---------------- Formulario ---------------- */
  var form = document.getElementById("formulario");
  var estado = document.getElementById("estado-formulario");
  var enviar = document.getElementById("boton-enviar");
  var modo = destino ? "destino" : (correo ? "correo" : "pendiente");
  var campoMotivo = document.getElementById("f-motivo");
  var campoUbicacion = document.getElementById("f-ubicacion");
  var campoCoords = document.getElementById("f-coordenadas");
  var errorUbicacion = document.getElementById("e-ubicacion");
  var errorCoords = document.getElementById("e-coordenadas");
  var estadoUbicacion = document.getElementById("estado-ubicacion");
  var comprobarPunto = document.getElementById("comprobar-punto");
  var elegirMapa = document.getElementById("elegir-mapa");
  var puntoMapa = document.getElementById("punto-mapa");
  var confirmarMapa = document.getElementById("confirmar-mapa");
  var lienzoMapa = document.getElementById("lienzo-mapa");
  var mapaInstancia = null;
  var marcadorMapa = null;
  var puntoElegido = null;
  var mapsCargando = false;

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
    motivo: "Selecciona el motivo de la solicitud.",
    nombre: "Indica tu nombre o el de la empresa.",
    correo: "Indica un correo electrónico válido, por ejemplo nombre@empresa.es.",
    tipo_maquina: "Selecciona el tipo de máquina.",
    marca_modelo: "Indica la marca y el modelo de la máquina.",
    descripcion: "Describe los síntomas, la incidencia o la pieza que necesitas.",
    privacidad: "Debes aceptar el uso de los datos para que podamos responderte.",
  };

  function idError(campo) {
    var desc = campo.getAttribute("aria-describedby");
    if (!desc) return null;
    var ids = desc.split(/\s+/);
    return document.getElementById(ids[ids.length - 1]);
  }

  function validarCampo(campo) {
    var error = idError(campo);
    var valido = campo.type === "checkbox" ? campo.checked : (campo.value.trim() !== "" && campo.checkValidity());
    campo.setAttribute("aria-invalid", String(!valido));
    if (error) error.textContent = valido ? "" : (mensajes[campo.name] || "Revisa este campo.");
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

  function seleccionarMotivo(valor) {
    if (!campoMotivo || !valor) return;
    var existe = Array.prototype.some.call(campoMotivo.options, function (o) { return o.value === valor; });
    if (!existe) return;
    campoMotivo.value = valor;
    campoMotivo.removeAttribute("aria-invalid");
    var error = document.getElementById("e-motivo");
    if (error) error.textContent = "";
  }

  document.addEventListener("click", function (e) {
    var enlace = e.target.closest("[data-motivo]");
    if (!enlace) return;
    seleccionarMotivo(enlace.getAttribute("data-motivo"));
  });

  /* ---------------- Coordenadas y Google Maps ---------------- */
  function urlMaps(consulta) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(consulta);
  }

  function formatearPunto(lat, lng) {
    return Number(lat).toFixed(6) + ", " + Number(lng).toFixed(6);
  }

  function parsearCoordenadas(texto) {
    var t = limpiar(texto);
    if (!t) return null;
    var m = t.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*[,;\s]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/);
    if (!m) return { error: "formato" };
    var lat = Number(m[1]);
    var lng = Number(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "formato" };
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { error: "rango" };
    return { lat: lat, lng: lng };
  }

  function actualizarComprobar() {
    var punto = parsearCoordenadas(campoCoords.value);
    if (punto && !punto.error) {
      comprobarPunto.hidden = false;
      comprobarPunto.href = urlMaps(punto.lat + "," + punto.lng);
    } else {
      comprobarPunto.hidden = true;
      comprobarPunto.removeAttribute("href");
    }
  }

  function validarUbicacion() {
    var referencia = limpiar(campoUbicacion.value);
    var textoCoords = campoCoords.value;
    var punto = parsearCoordenadas(textoCoords);
    var coordsOk = !!(punto && !punto.error);
    var refOk = referencia.length >= 3;
    var ubicOk = true;

    if (limpiar(textoCoords)) {
      if (!coordsOk) {
        campoCoords.setAttribute("aria-invalid", "true");
        errorCoords.textContent = punto && punto.error === "rango"
          ? "La latitud debe estar entre -90 y 90, y la longitud entre -180 y 180."
          : "Introduce latitud y longitud en grados decimales, por ejemplo 41.403380, 2.174030.";
        ubicOk = false;
      } else {
        campoCoords.removeAttribute("aria-invalid");
        errorCoords.textContent = "";
      }
    } else {
      campoCoords.removeAttribute("aria-invalid");
      errorCoords.textContent = "";
    }

    if (!refOk && !coordsOk) {
      campoUbicacion.setAttribute("aria-invalid", "true");
      errorUbicacion.textContent = "Indica una referencia de la obra, explotación o acceso, o las coordenadas de la máquina.";
      ubicOk = false;
    } else {
      campoUbicacion.removeAttribute("aria-invalid");
      errorUbicacion.textContent = "";
    }

    actualizarComprobar();
    return ubicOk;
  }

  campoCoords.addEventListener("input", function () {
    actualizarComprobar();
    if (campoCoords.hasAttribute("aria-invalid") || campoUbicacion.hasAttribute("aria-invalid")) {
      validarUbicacion();
    }
  });
  campoCoords.addEventListener("blur", function () {
    if (limpiar(campoCoords.value) || campoUbicacion.hasAttribute("aria-invalid")) validarUbicacion();
  });
  campoUbicacion.addEventListener("blur", function () {
    if (limpiar(campoUbicacion.value) || campoCoords.hasAttribute("aria-invalid") || campoUbicacion.hasAttribute("aria-invalid")) {
      validarUbicacion();
    }
  });

  document.getElementById("abrir-maps").addEventListener("click", function () {
    var punto = parsearCoordenadas(campoCoords.value);
    var consulta = "";
    if (punto && !punto.error) consulta = punto.lat + "," + punto.lng;
    else if (limpiar(campoUbicacion.value)) consulta = limpiar(campoUbicacion.value);
    window.open(consulta ? urlMaps(consulta) : "https://www.google.com/maps", "_blank", "noopener");
  });

  document.getElementById("usar-ubicacion").addEventListener("click", function () {
    if (!navigator.geolocation) {
      estadoUbicacion.textContent = "Este dispositivo no ofrece geolocalización. Marca el punto en Google Maps o introduce las coordenadas.";
      return;
    }
    estadoUbicacion.textContent = "Solicitando ubicación…";
    navigator.geolocation.getCurrentPosition(function (pos) {
      campoCoords.value = formatearPunto(pos.coords.latitude, pos.coords.longitude);
      estadoUbicacion.textContent = "Ubicación obtenida. Comprueba que corresponde a la máquina y corrígela si hace falta.";
      validarUbicacion();
    }, function (err) {
      if (err && err.code === 1) {
        estadoUbicacion.textContent = "No se ha concedido el permiso de ubicación. Marca el punto en Google Maps o introduce las coordenadas.";
      } else {
        estadoUbicacion.textContent = "No se ha podido obtener la ubicación. Marca el punto en Google Maps o introduce las coordenadas.";
      }
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });

  function actualizarPuntoDialogo(lat, lng) {
    puntoElegido = { lat: lat, lng: lng };
    puntoMapa.textContent = "Punto marcado: " + formatearPunto(lat, lng);
    confirmarMapa.disabled = false;
  }

  function colocarMarcador(latLng) {
    if (!mapaInstancia || !window.google) return;
    if (marcadorMapa) {
      marcadorMapa.setPosition(latLng);
      return;
    }
    marcadorMapa = new window.google.maps.Marker({
      position: latLng,
      map: mapaInstancia,
      draggable: true,
      title: "Ubicación de la máquina",
    });
    marcadorMapa.addListener("dragend", function () {
      var pos = marcadorMapa.getPosition();
      actualizarPuntoDialogo(pos.lat(), pos.lng());
    });
  }

  function iniciarMapa() {
    var centro = { lat: 40.2, lng: -3.7 };
    var zoom = 6;
    var actual = parsearCoordenadas(campoCoords.value);
    if (actual && !actual.error) {
      centro = { lat: actual.lat, lng: actual.lng };
      zoom = 16;
    }
    mapaInstancia = new window.google.maps.Map(lienzoMapa, {
      center: centro,
      zoom: zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapaInstancia.addListener("click", function (ev) {
      colocarMarcador(ev.latLng);
      actualizarPuntoDialogo(ev.latLng.lat(), ev.latLng.lng());
    });
    if (actual && !actual.error) {
      colocarMarcador(centro);
      actualizarPuntoDialogo(actual.lat, actual.lng);
    }
  }

  function abrirSelectorMapa() {
    if (!dialogo || typeof dialogo.showModal !== "function") {
      estadoUbicacion.textContent = "Este navegador no puede mostrar el mapa integrado. Usa «Abrir Google Maps».";
      return;
    }
    puntoElegido = null;
    confirmarMapa.disabled = true;
    puntoMapa.textContent = "Todavía no has marcado ningún punto.";
    dialogo.showModal();
    if (mapaInstancia) {
      window.google.maps.event.trigger(mapaInstancia, "resize");
      var actual = parsearCoordenadas(campoCoords.value);
      if (actual && !actual.error) {
        var pos = { lat: actual.lat, lng: actual.lng };
        mapaInstancia.setCenter(pos);
        mapaInstancia.setZoom(16);
        colocarMarcador(pos);
        actualizarPuntoDialogo(actual.lat, actual.lng);
      }
      return;
    }
    iniciarMapa();
  }

  function cargarMaps(listo) {
    if (window.google && window.google.maps) {
      listo();
      return;
    }
    if (mapsCargando) {
      var espera = setInterval(function () {
        if (window.google && window.google.maps) {
          clearInterval(espera);
          listo();
        }
      }, 200);
      return;
    }
    mapsCargando = true;
    var script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(claveMaps);
    script.async = true;
    script.onload = function () { listo(); };
    script.onerror = function () {
      mapsCargando = false;
      estadoUbicacion.textContent = "No se ha podido cargar el mapa integrado. Usa «Abrir Google Maps» o introduce las coordenadas.";
    };
    document.head.appendChild(script);
  }

  if (claveMaps && elegirMapa) {
    elegirMapa.hidden = false;
    elegirMapa.addEventListener("click", function () {
      cargarMaps(abrirSelectorMapa);
    });
  }

  if (dialogo) {
    dialogo.querySelectorAll("[data-cerrar-mapa]").forEach(function (el) {
      el.addEventListener("click", function () { dialogo.close(); });
    });
  }
  if (confirmarMapa) {
    confirmarMapa.addEventListener("click", function () {
      if (!puntoElegido) return;
      campoCoords.value = formatearPunto(puntoElegido.lat, puntoElegido.lng);
      estadoUbicacion.textContent = "Punto confirmado. Puedes ajustar las coordenadas antes de enviar.";
      validarUbicacion();
      if (dialogo) dialogo.close();
    });
  }

  function resetearMapa() {
    estadoUbicacion.textContent = "";
    actualizarComprobar();
    puntoElegido = null;
    if (marcadorMapa) {
      marcadorMapa.setMap(null);
      marcadorMapa = null;
    }
    if (confirmarMapa) confirmarMapa.disabled = true;
    if (puntoMapa) puntoMapa.textContent = "Todavía no has marcado ningún punto.";
  }

  /* ---------------- Envío ---------------- */
  function valor(nombre) {
    var el = form.elements[nombre];
    return el ? limpiar(el.value) : "";
  }

  function datosFormulario() {
    var punto = parsearCoordenadas(campoCoords.value);
    var coordsOk = punto && !punto.error ? punto : null;
    var referencia = valor("ubicacion");
    var enlace = "";
    if (coordsOk) enlace = urlMaps(coordsOk.lat + "," + coordsOk.lng);
    else if (referencia) enlace = urlMaps(referencia);
    return {
      motivo: valor("motivo"),
      nombre: valor("nombre"),
      correo: valor("correo"),
      telefono: valor("telefono"),
      tipo: valor("tipo_maquina"),
      modelo: valor("marca_modelo"),
      serie: valor("numero_serie"),
      horas: valor("horas"),
      ubicacion: referencia,
      latitud: coordsOk ? String(coordsOk.lat) : "",
      longitud: coordsOk ? String(coordsOk.lng) : "",
      enlaceMaps: enlace,
      descripcion: valor("descripcion"),
      codigos: valor("codigos_fallo"),
      comprobaciones: valor("comprobaciones"),
    };
  }

  function lineasCorreo(d) {
    var lineas = [
      "Motivo de la solicitud: " + d.motivo,
      "Nombre o empresa: " + d.nombre,
      "Correo: " + d.correo,
      "Teléfono: " + (d.telefono || "—"),
      "Tipo de máquina: " + d.tipo,
      "Marca y modelo: " + d.modelo,
      "Número de serie o PIN: " + (d.serie || "—"),
      "Horas de máquina: " + (d.horas || "—"),
      "Referencia de ubicación: " + (d.ubicacion || "—"),
      "Latitud: " + (d.latitud || "—"),
      "Longitud: " + (d.longitud || "—"),
      "Enlace de Google Maps: " + (d.enlaceMaps || "—"),
      "Códigos de fallo: " + (d.codigos || "—"),
      "Comprobaciones realizadas: " + (d.comprobaciones || "—"),
      "",
      "Descripción de la incidencia o de la pieza:",
      d.descripcion,
    ];
    return lineas.join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (modo === "pendiente") return;

    var invalidos = campos.filter(function (c) { return !validarCampo(c); });
    var ubicOk = validarUbicacion();
    if (invalidos.length || !ubicOk) {
      var foco = invalidos[0] || (campoUbicacion.getAttribute("aria-invalid") === "true" ? campoUbicacion : campoCoords);
      if (foco) foco.focus();
      return;
    }

    var d = datosFormulario();

    if (modo === "correo") {
      window.location.href = "mailto:" + correo +
        "?subject=" + encodeURIComponent("Solicitud RDMP — " + d.motivo + " — " + d.tipo + " " + d.modelo) +
        "&body=" + encodeURIComponent(lineasCorreo(d));
      mostrarEstado("info", "Correo preparado",
        "Si no se ha abierto tu programa de correo, escribe directamente a " + correo + ". La solicitud no se envía hasta que la mandes desde tu correo.");
      return;
    }

    enviar.disabled = true;
    enviar.textContent = "Enviando…";
    var envio = {
      "Motivo de la solicitud": d.motivo,
      "Nombre o empresa": d.nombre,
      "Correo": d.correo,
      "Teléfono": d.telefono || "—",
      "Tipo de máquina": d.tipo,
      "Marca y modelo": d.modelo,
      "Número de serie o PIN": d.serie || "—",
      "Horas de máquina": d.horas || "—",
      "Referencia de ubicación": d.ubicacion || "—",
      "Latitud": d.latitud || "—",
      "Longitud": d.longitud || "—",
      "Enlace de Google Maps": d.enlaceMaps || "—",
      "Códigos de fallo": d.codigos || "—",
      "Comprobaciones realizadas": d.comprobaciones || "—",
      "Descripción de la incidencia o de la pieza": d.descripcion,
      "Acepta el uso de sus datos": "Sí",
      _subject: "Solicitud RDMP — " + d.motivo + " — " + d.tipo + " " + d.modelo,
      _replyto: d.correo,
      _template: "table",
      _captcha: "false",
      _honey: form.elements._honey ? form.elements._honey.value : "",
    };
    fetch(destino, {
      method: "POST",
      body: JSON.stringify(envio),
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json().catch(function () { return {}; });
      })
      .then(function (respuesta) {
        if (respuesta.success === false || respuesta.success === "false") throw new Error(respuesta.message || "rechazado");
        form.reset();
        campos.forEach(function (c) { c.removeAttribute("aria-invalid"); });
        campoUbicacion.removeAttribute("aria-invalid");
        campoCoords.removeAttribute("aria-invalid");
        errorUbicacion.textContent = "";
        errorCoords.textContent = "";
        resetearMapa();
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

  actualizarComprobar();
})();
