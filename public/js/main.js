(function () {
  "use strict";

  var config = window.RDMP_CONFIG || {};
  var limpiar = function (v) { return typeof v === "string" ? v.trim() : ""; };
  var correo = limpiar(config.correo);
  var telefono = limpiar(config.telefono);
  var zona = limpiar(config.zonaCobertura);
  var destino = limpiar(config.destinoFormulario);
  var URL_OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  var ATTR_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors';
  var urlCartografia = limpiar(config.urlCartografia) || URL_OSM;
  var atribucionCartografia = urlCartografia === URL_OSM
    ? ATTR_OSM
    : (limpiar(config.atribucionCartografia) || "Proveedor de cartografía sin atribución configurada");

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
  var abrirSelector = document.getElementById("abrir-selector");
  var cambiarUbicacion = document.getElementById("cambiar-ubicacion");
  var errorUbicacion = document.getElementById("e-ubicacion");
  var tarjeta = document.getElementById("tarjeta-ubicacion");
  var tarjetaNombre = document.getElementById("tarjeta-nombre");
  var tarjetaCoords = document.getElementById("tarjeta-coords");
  var avisoMapa = document.getElementById("aviso-mapa");
  var estadoBusqueda = document.getElementById("estado-busqueda");
  var estadoGeo = document.getElementById("estado-geo");
  var resumenPunto = document.getElementById("resumen-punto");
  var errorCoordsModal = document.getElementById("e-coords-modal");
  var inputLat = document.getElementById("m-lat");
  var inputLng = document.getElementById("m-lng");
  var confirmarMapa = document.getElementById("confirmar-mapa");
  var lienzoMapa = document.getElementById("lienzo-mapa");
  var campoLat = document.getElementById("f-latitud");
  var campoLng = document.getElementById("f-longitud");
  var inputMunicipio = document.getElementById("buscar-municipio");
  var listaMunicipios = document.getElementById("lista-municipios");

  var confirmada = null;
  var provisional = null;
  var disparador = null;
  var confirmadoAhora = false;
  var silenciarCoords = false;
  var sesionModal = 0;
  var versionSeleccion = 0;
  var mapa = null;
  var marcador = null;
  var leafletCargando = null;
  var municipios = null;
  var municipiosCargando = null;
  var indiceActivo = -1;
  var encuadreAutomatico = true;
  var movimientoPropio = false;
  var cargasTeselas = 0;
  var fallosTeselas = 0;
  var avisoTeselas = false;

  function marcarSeleccion() {
    versionSeleccion += 1;
    return { sesion: sesionModal, version: versionSeleccion };
  }

  function seleccionVigente(marca) {
    return !!marca && marca.sesion === sesionModal && marca.version === versionSeleccion && !!(dialogo && dialogo.open);
  }

  function invalidarSeleccion() {
    sesionModal += 1;
    versionSeleccion += 1;
  }

  function mostrarEstado(tipo, titulo, texto, enfocar) {
    estado.className = "estado estado--" + tipo;
    estado.innerHTML = "";
    var t = document.createElement("strong");
    t.textContent = titulo;
    var s = document.createElement("span");
    s.textContent = texto;
    estado.appendChild(t);
    estado.appendChild(s);
    if (enfocar) estado.focus({ preventScroll: true });
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

  /* ---------------- Selector de ubicación ---------------- */
  var VISTAS = {
    todo: [[35.7, -9.8], [44.1, 4.6]],
    peninsula: [[35.85, -9.55], [43.95, 3.45]],
    baleares: [[38.55, 1.05], [40.15, 4.45]],
  };

  function clonarPunto(p) {
    if (!p || !coordsValidas(p.lat, p.lng)) return null;
    return { lat: p.lat, lng: p.lng };
  }

  function coordsValidas(lat, lng) {
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  function redondearCoord(n) {
    return Math.round(n * 1000000) / 1000000;
  }

  function formatearNumero(n) {
    return String(redondearCoord(n));
  }

  function urlOsm(lat, lng) {
    var la = String(lat);
    var ln = String(lng);
    return "https://www.openstreetmap.org/?mlat=" + encodeURIComponent(la) + "&mlon=" + encodeURIComponent(ln) + "#map=17/" + la + "/" + ln;
  }

  function normalizarTexto(valor) {
    return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function escribirCoords(lat, lng) {
    silenciarCoords = true;
    inputLat.value = formatearNumero(lat);
    inputLng.value = formatearNumero(lng);
    silenciarCoords = false;
    inputLat.removeAttribute("aria-invalid");
    inputLng.removeAttribute("aria-invalid");
    errorCoordsModal.textContent = "";
  }

  function pintarResumen() {
    if (!provisional || !coordsValidas(provisional.lat, provisional.lng)) {
      resumenPunto.textContent = "Todavía no has marcado ningún punto.";
      confirmarMapa.disabled = true;
      return;
    }
    resumenPunto.textContent = formatearNumero(provisional.lat) + ", " + formatearNumero(provisional.lng);
    confirmarMapa.disabled = false;
  }

  function pintarTarjeta() {
    if (!confirmada) {
      tarjeta.hidden = true;
      abrirSelector.removeAttribute("aria-invalid");
      return;
    }
    tarjeta.hidden = false;
    tarjetaNombre.textContent = "Punto marcado en el mapa";
    tarjetaCoords.textContent = formatearNumero(confirmada.lat) + ", " + formatearNumero(confirmada.lng);
    abrirSelector.removeAttribute("aria-invalid");
    errorUbicacion.textContent = "";
  }

  function volcarConfirmada() {
    campoLat.value = confirmada ? String(confirmada.lat) : "";
    campoLng.value = confirmada ? String(confirmada.lng) : "";
    pintarTarjeta();
  }

  function quitarMarcador() {
    if (marcador && mapa) mapa.removeLayer(marcador);
    marcador = null;
  }

  function colocarMarcador(enfocar) {
    if (!mapa || !window.L) return;
    if (!provisional || !coordsValidas(provisional.lat, provisional.lng)) {
      quitarMarcador();
      return;
    }
    var ll = [provisional.lat, provisional.lng];
    if (!marcador) {
      marcador = window.L.marker(ll, {
        icon: iconoPin(),
        draggable: true,
        autoPan: true,
        keyboard: true,
        title: "Ubicación de la máquina",
        alt: "Ubicación de la máquina",
      }).addTo(mapa);
      marcador.on("dragend", function () {
        var p = marcador.getLatLng();
        fijarPunto(p.lat, p.lng, false);
      });
    } else {
      marcador.setLatLng(ll);
    }
    if (enfocar) {
      moverMapa(function () {
        mapa.setView(ll, mapa.getZoom() < 15 ? 16 : mapa.getZoom(), { animate: !reducirMovimiento() });
      });
    }
  }

  function reducirMovimiento() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function margenVista() {
    var tam = mapa && mapa.getSize();
    if (!tam || tam.y < 360) return [12, 12];
    return [28, 28];
  }

  function moverMapa(fn) {
    movimientoPropio = true;
    try { fn(); }
    finally { movimientoPropio = false; }
  }

  function fijarPunto(lat, lng, enfocar) {
    if (!coordsValidas(lat, lng)) return;
    marcarSeleccion();
    encuadreAutomatico = false;
    provisional = { lat: redondearCoord(lat), lng: redondearCoord(lng) };
    estadoGeo.textContent = "";
    escribirCoords(provisional.lat, provisional.lng);
    pintarResumen();
    colocarMarcador(enfocar);
  }

  function leerCoordsEscritas() {
    var latTxt = limpiar(inputLat.value).replace(",", ".");
    var lngTxt = limpiar(inputLng.value).replace(",", ".");
    if (!latTxt && !lngTxt) return { vacio: true };
    if (!latTxt || !lngTxt) return { error: "incompleto" };
    var lat = Number(latTxt);
    var lng = Number(lngTxt);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "formato" };
    if (!coordsValidas(lat, lng)) return { error: "rango" };
    return { lat: redondearCoord(lat), lng: redondearCoord(lng) };
  }

  function alEditarCoords() {
    if (silenciarCoords) return;
    estadoGeo.textContent = "";
    var leido = leerCoordsEscritas();
    if (leido.vacio) {
      marcarSeleccion();
      encuadreAutomatico = false;
      provisional = null;
      quitarMarcador();
      errorCoordsModal.textContent = "";
      pintarResumen();
      return;
    }
    if (leido.error) {
      marcarSeleccion();
      encuadreAutomatico = false;
      provisional = null;
      quitarMarcador();
      inputLat.setAttribute("aria-invalid", "true");
      inputLng.setAttribute("aria-invalid", "true");
      errorCoordsModal.textContent = leido.error === "rango"
        ? "La latitud debe estar entre -90 y 90, y la longitud entre -180 y 180."
        : "Escribe latitud y longitud en grados decimales.";
      pintarResumen();
      return;
    }
    if (provisional && provisional.lat === leido.lat && provisional.lng === leido.lng) return;
    fijarPunto(leido.lat, leido.lng, true);
  }

  inputLat.addEventListener("input", alEditarCoords);
  inputLng.addEventListener("input", alEditarCoords);

  function aplicarEncuadreInicial() {
    if (!mapa) return;
    mapa.invalidateSize();
    var tam = mapa.getSize();
    if (!tam || tam.x < 20 || tam.y < 20) return;
    if (!encuadreAutomatico) return;
    moverMapa(function () {
      if (provisional && coordsValidas(provisional.lat, provisional.lng)) {
        mapa.setView([provisional.lat, provisional.lng], 16, { animate: false });
      } else {
        mapa.fitBounds(VISTAS.todo, { padding: margenVista(), animate: false });
      }
    });
  }

  function aplicarVista(clave) {
    if (!mapa || !VISTAS[clave]) return;
    marcarSeleccion();
    encuadreAutomatico = false;
    moverMapa(function () {
      mapa.fitBounds(VISTAS[clave], { padding: margenVista(), animate: !reducirMovimiento() });
    });
  }

  document.getElementById("vista-peninsula").addEventListener("click", function () { aplicarVista("peninsula"); });
  document.getElementById("vista-baleares").addEventListener("click", function () { aplicarVista("baleares"); });
  document.getElementById("vista-todo").addEventListener("click", function () { aplicarVista("todo"); });

  function etiquetaMunicipio(m) {
    var nombre = m.nombre;
    if (m.local && normalizarTexto(m.local) !== normalizarTexto(m.nombre)) nombre += " (" + m.local + ")";
    return nombre + " · " + m.contexto;
  }

  function cargarMunicipios() {
    if (municipios) return Promise.resolve(municipios);
    if (municipiosCargando) return municipiosCargando;
    municipiosCargando = fetch("datos/municipios.json").then(function (r) {
      if (!r.ok) throw new Error("listado");
      return r.json();
    }).then(function (datos) {
      var lista = datos && datos.municipios;
      if (!Array.isArray(lista)) throw new Error("listado");
      municipios = lista.map(function (m) {
        return {
          nombre: m[0],
          contexto: m[1],
          lat: m[2],
          lng: m[3],
          local: m[4] || "",
          clave: normalizarTexto(m[0] + " " + (m[4] || "") + " " + m[1]),
        };
      });
      return municipios;
    }).catch(function () {
      municipiosCargando = null;
      estadoBusqueda.textContent = "No se ha podido cargar el listado de municipios. Puedes marcar el punto en el mapa o escribir las coordenadas.";
      return null;
    });
    return municipiosCargando;
  }

  function buscarMunicipios(consulta) {
    var n = normalizarTexto(consulta);
    if (n.length < 2 || !municipios) return [];
    var prefijo = [];
    var contiene = [];
    municipios.forEach(function (m) {
      var nombre = normalizarTexto(m.nombre);
      var local = m.local ? normalizarTexto(m.local) : "";
      if (nombre.indexOf(n) === 0 || (local && local.indexOf(n) === 0)) prefijo.push(m);
      else if (m.clave.indexOf(n) !== -1) contiene.push(m);
    });
    return prefijo.concat(contiene).slice(0, 8);
  }

  function cerrarLista() {
    listaMunicipios.hidden = true;
    listaMunicipios.textContent = "";
    inputMunicipio.setAttribute("aria-expanded", "false");
    inputMunicipio.removeAttribute("aria-activedescendant");
    indiceActivo = -1;
  }

  function marcarOpcion(indice) {
    var opciones = listaMunicipios.querySelectorAll("[role='option']");
    if (!opciones.length) return;
    if (indice < 0) indice = opciones.length - 1;
    if (indice >= opciones.length) indice = 0;
    indiceActivo = indice;
    Array.prototype.forEach.call(opciones, function (op, i) {
      var activo = i === indiceActivo;
      op.setAttribute("aria-selected", activo ? "true" : "false");
      if (activo) {
        inputMunicipio.setAttribute("aria-activedescendant", op.id);
        op.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function pintarResultados(consulta) {
    var encontrados = buscarMunicipios(consulta);
    listaMunicipios.textContent = "";
    indiceActivo = -1;
    if (normalizarTexto(consulta).length < 2) {
      cerrarLista();
      return;
    }
    if (!municipios) return;
    if (!encontrados.length) {
      cerrarLista();
      estadoBusqueda.textContent = "Ningún municipio coincide. Prueba con otro nombre o marca el punto en el mapa.";
      return;
    }
    estadoBusqueda.textContent = encontrados.length + (encontrados.length === 1 ? " municipio." : " municipios.");
    encontrados.forEach(function (m, i) {
      var li = document.createElement("li");
      var botonOpcion = document.createElement("button");
      botonOpcion.type = "button";
      botonOpcion.id = "municipio-opcion-" + i;
      botonOpcion.setAttribute("role", "option");
      botonOpcion.setAttribute("aria-selected", "false");
      botonOpcion.tabIndex = -1;
      botonOpcion.textContent = etiquetaMunicipio(m);
      botonOpcion.addEventListener("click", function () { elegirMunicipio(m); });
      li.appendChild(botonOpcion);
      listaMunicipios.appendChild(li);
    });
    listaMunicipios.hidden = false;
    inputMunicipio.setAttribute("aria-expanded", "true");
  }

  function elegirMunicipio(m) {
    inputMunicipio.value = etiquetaMunicipio(m);
    cerrarLista();
    marcarSeleccion();
    encuadreAutomatico = false;
    estadoBusqueda.textContent = "Mapa centrado en " + etiquetaMunicipio(m) + ". Marca el punto exacto de la máquina.";
    if (mapa) {
      moverMapa(function () {
        mapa.setView([m.lat, m.lng], 13, { animate: !reducirMovimiento() });
      });
    }
  }

  inputMunicipio.addEventListener("input", function () {
    var consulta = inputMunicipio.value;
    if (normalizarTexto(consulta).length < 2) {
      cerrarLista();
      estadoBusqueda.textContent = "";
      return;
    }
    if (!municipios) {
      estadoBusqueda.textContent = "Cargando municipios…";
      cargarMunicipios().then(function () {
        if (inputMunicipio.value === consulta) pintarResultados(consulta);
      });
      return;
    }
    pintarResultados(consulta);
  });

  inputMunicipio.addEventListener("keydown", function (e) {
    if (listaMunicipios.hidden) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      marcarOpcion(indiceActivo + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      marcarOpcion(indiceActivo - 1);
    } else if (e.key === "Enter") {
      var opciones = listaMunicipios.querySelectorAll("[role='option']");
      var elegido = indiceActivo >= 0 ? indiceActivo : 0;
      if (opciones[elegido]) {
        e.preventDefault();
        opciones[elegido].click();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cerrarLista();
    }
  });

  document.addEventListener("click", function (e) {
    if (!dialogo.open || listaMunicipios.hidden) return;
    if (e.target.closest(".dialogo-mapa__busqueda")) return;
    cerrarLista();
  });

  function avisarTeselas() {
    if (avisoTeselas || fallosTeselas < 2 || cargasTeselas > 0) return;
    avisoTeselas = true;
    avisoMapa.hidden = false;
    avisoMapa.textContent = urlCartografia === URL_OSM
      ? "No se ha podido cargar la cartografía de OpenStreetMap. Puedes escribir la latitud y la longitud, y marcar el punto si el mapa llega a mostrarse. Este servicio público no ofrece uso sin conexión ni disponibilidad garantizada."
      : "No se ha podido cargar la cartografía configurada. Puedes escribir la latitud y la longitud.";
  }

  function iconoPin() {
    return window.L.icon({
      iconUrl: "assets/img/pin-ubicacion.png",
      iconSize: [48, 68],
      iconAnchor: [24, 68],
      className: "rdmp-pin",
    });
  }

  function iniciarMapa() {
    if (mapa || !window.L) return;
    lienzoMapa.classList.remove("vacio");
    lienzoMapa.textContent = "";
    mapa = window.L.map(lienzoMapa, {
      zoomControl: true,
      attributionControl: true,
      keyboard: true,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      minZoom: 4,
      maxZoom: 19,
    });
    mapa.on("movestart", function () {
      if (!movimientoPropio) encuadreAutomatico = false;
    });
    window.L.tileLayer(urlCartografia, {
      attribution: atribucionCartografia,
      maxZoom: 19,
      detectRetina: false,
    }).on("tileload", function () {
      cargasTeselas += 1;
      if (avisoTeselas) {
        avisoTeselas = false;
        avisoMapa.hidden = true;
      }
    }).on("tileerror", function () {
      fallosTeselas += 1;
      avisarTeselas();
    }).addTo(mapa);
    mapa.on("click", function (ev) {
      if (!ev.latlng) return;
      fijarPunto(ev.latlng.lat, ev.latlng.lng, mapa.getZoom() < 15);
    });
    aplicarEncuadreInicial();
    colocarMarcador(false);
  }

  function cargarHoja(href) {
    if (document.querySelector('link[href="' + href + '"]')) return Promise.resolve();
    return new Promise(function (ok) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = function () { ok(); };
      link.onerror = function () { ok(); };
      document.head.appendChild(link);
    });
  }

  function cargarLeaflet() {
    if (window.L && typeof window.L.map === "function") return Promise.resolve();
    if (window.leaflet && typeof window.leaflet.map === "function") {
      window.L = window.leaflet;
      return Promise.resolve();
    }
    if (leafletCargando) return leafletCargando;
    leafletCargando = Promise.all([
      cargarHoja("vendor/leaflet/leaflet.css"),
      new Promise(function (ok, fail) {
        var script = document.createElement("script");
        script.src = "vendor/leaflet/leaflet.js";
        script.onload = function () { ok(); };
        script.onerror = function () { fail(new Error("leaflet")); };
        document.body.appendChild(script);
      }),
    ]).then(function () {
      if (!window.L && window.leaflet) window.L = window.leaflet;
      if (!window.L || typeof window.L.map !== "function") throw new Error("leaflet");
    }).catch(function (err) {
      leafletCargando = null;
      throw err;
    });
    return leafletCargando;
  }

  function cargarMapa() {
    if (mapa) return Promise.resolve();
    avisoMapa.hidden = false;
    avisoMapa.textContent = "Cargando mapa…";
    return Promise.all([cargarLeaflet(), cargarMunicipios()]).then(function () {
      if (!dialogo.open) return;
      iniciarMapa();
      if (!avisoTeselas) avisoMapa.hidden = true;
    }).catch(function () {
      avisoMapa.hidden = false;
      avisoMapa.textContent = "No se ha podido cargar el mapa. Los datos del formulario se conservan. Escribe la latitud y la longitud para indicar el punto.";
      if (!mapa) {
        lienzoMapa.classList.add("vacio");
        lienzoMapa.textContent = "El mapa no está disponible. Usa la latitud y la longitud.";
      }
    });
  }

  function abrirDialogo(desde) {
    if (!dialogo || typeof dialogo.showModal !== "function") {
      errorUbicacion.textContent = "Este navegador no puede abrir el selector de mapa.";
      return;
    }
    disparador = desde || abrirSelector;
    invalidarSeleccion();
    encuadreAutomatico = true;
    provisional = clonarPunto(confirmada);
    estadoBusqueda.textContent = "";
    estadoGeo.textContent = "";
    errorCoordsModal.textContent = "";
    cerrarLista();
    dialogo.showModal();
    if (provisional) escribirCoords(provisional.lat, provisional.lng);
    else {
      silenciarCoords = true;
      inputLat.value = "";
      inputLng.value = "";
      silenciarCoords = false;
    }
    pintarResumen();
    cargarMapa().then(function () {
      if (!dialogo.open) return;
      colocarMarcador(false);
      aplicarEncuadreInicial();
      window.setTimeout(function () {
        if (!dialogo.open) return;
        colocarMarcador(false);
        aplicarEncuadreInicial();
      }, 200);
    });
  }

  abrirSelector.addEventListener("click", function () { abrirDialogo(abrirSelector); });
  cambiarUbicacion.addEventListener("click", function () { abrirDialogo(cambiarUbicacion); });

  dialogo.querySelectorAll("[data-cerrar-mapa]").forEach(function (el) {
    el.addEventListener("click", function () { dialogo.close(); });
  });
  dialogo.addEventListener("cancel", function (e) {
    if (!listaMunicipios.hidden) {
      e.preventDefault();
      cerrarLista();
    }
  });
  dialogo.addEventListener("close", function () {
    if (!confirmadoAhora) provisional = null;
    confirmadoAhora = false;
    invalidarSeleccion();
    cerrarLista();
    if (disparador && typeof disparador.focus === "function") disparador.focus();
  });
  confirmarMapa.addEventListener("click", function () {
    if (!provisional || !coordsValidas(provisional.lat, provisional.lng)) {
      errorCoordsModal.textContent = "Marca un punto en el mapa o escribe unas coordenadas válidas antes de confirmar.";
      confirmarMapa.disabled = true;
      return;
    }
    confirmada = clonarPunto(provisional);
    volcarConfirmada();
    confirmadoAhora = true;
    dialogo.close();
  });

  document.getElementById("usar-ubicacion").addEventListener("click", function () {
    if (!navigator.geolocation) {
      estadoGeo.textContent = "Este dispositivo no ofrece geolocalización. Marca el punto en el mapa o escribe las coordenadas.";
      return;
    }
    var marca = marcarSeleccion();
    estadoGeo.textContent = "Solicitando ubicación…";
    navigator.geolocation.getCurrentPosition(function (pos) {
      if (!seleccionVigente(marca)) return;
      fijarPunto(pos.coords.latitude, pos.coords.longitude, true);
      if (dialogo && dialogo.open) {
        estadoGeo.textContent = "Ubicación obtenida. Ajusta el marcador si hace falta y pulsa «Confirmar ubicación».";
      }
    }, function (err) {
      if (!seleccionVigente(marca)) return;
      if (err && err.code === 1) {
        estadoGeo.textContent = "No se ha concedido el permiso de ubicación. Marca el punto en el mapa o escribe las coordenadas.";
      } else {
        estadoGeo.textContent = "No se ha podido obtener la ubicación. Marca el punto en el mapa o escribe las coordenadas.";
      }
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });

  window.addEventListener("resize", function () {
    if (dialogo.open && mapa) mapa.invalidateSize();
  });
  window.addEventListener("orientationchange", function () {
    if (dialogo.open && mapa) window.setTimeout(function () { mapa.invalidateSize(); }, 150);
  });
  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      if (dialogo.open && mapa) mapa.invalidateSize();
    }).observe(lienzoMapa);
  }

  function validarUbicacion() {
    if (confirmada && coordsValidas(confirmada.lat, confirmada.lng)) {
      abrirSelector.removeAttribute("aria-invalid");
      errorUbicacion.textContent = "";
      return true;
    }
    abrirSelector.setAttribute("aria-invalid", "true");
    errorUbicacion.textContent = "Marca en el mapa el punto donde está la máquina.";
    return false;
  }

  function limpiarUbicacion() {
    confirmada = null;
    provisional = null;
    invalidarSeleccion();
    volcarConfirmada();
    quitarMarcador();
  }

  /* ---------------- Envío ---------------- */
  function valor(nombre) {
    var el = form.elements[nombre];
    return el ? limpiar(el.value) : "";
  }

  function datosFormulario() {
    var lat = confirmada ? confirmada.lat : null;
    var lng = confirmada ? confirmada.lng : null;
    var hay = coordsValidas(lat, lng);
    return {
      motivo: valor("motivo"),
      nombre: valor("nombre"),
      correo: valor("correo"),
      telefono: valor("telefono"),
      tipo: valor("tipo_maquina"),
      modelo: valor("marca_modelo"),
      serie: valor("numero_serie"),
      horas: valor("horas"),
      sede: valor("sede"),
      direccion: valor("direccion"),
      latitud: hay ? String(lat) : "",
      longitud: hay ? String(lng) : "",
      indicaciones: valor("indicaciones"),
      enlaceOsm: hay ? urlOsm(lat, lng) : "",
      descripcion: valor("descripcion"),
      codigos: valor("codigos_fallo"),
      comprobaciones: valor("comprobaciones"),
    };
  }

  function lineasCorreo(d) {
    return [
      "Motivo de la solicitud: " + d.motivo,
      "Nombre o empresa: " + d.nombre,
      "Correo: " + d.correo,
      "Teléfono: " + (d.telefono || "—"),
      "Tipo de máquina: " + d.tipo,
      "Marca y modelo: " + d.modelo,
      "Número de serie o PIN: " + (d.serie || "—"),
      "Horas de máquina: " + (d.horas || "—"),
      "Sede u obra: " + (d.sede || "—"),
      "Dirección: " + (d.direccion || "—"),
      "Latitud: " + (d.latitud || "—"),
      "Longitud: " + (d.longitud || "—"),
      "Indicaciones de acceso: " + (d.indicaciones || "—"),
      "Enlace de OpenStreetMap: " + (d.enlaceOsm || "—"),
      "Fotos: " + (fotos.length ? fotos.map(function (f) { return f.file.name; }).join(", ") + ". No se adjuntan al correo preparado; hay que añadirlas manualmente." : "—"),
      "Códigos de fallo: " + (d.codigos || "—"),
      "Comprobaciones realizadas: " + (d.comprobaciones || "—"),
      "",
      "Descripción de la incidencia o de la pieza:",
      d.descripcion,
    ].join("\n");
  }

  /* ---------------- Fotos y confirmación del envío ---------------- */
  var MAX_FOTOS = 6;
  var MAX_BYTES = 10 * 1024 * 1024;
  var fotos = [];
  var idFoto = 0;
  var enviando = false;
  var bloqueados = [];
  var entradaFotos = document.getElementById("f-fotos");
  var botonFotos = document.getElementById("anadir-fotos");
  var listaFotos = document.getElementById("lista-fotos");
  var errorFotos = document.getElementById("e-fotos");

  function extensionArchivo(nombre) {
    var punto = nombre.lastIndexOf(".");
    return punto >= 0 ? nombre.slice(punto + 1).toLowerCase() : "";
  }

  function formatoAdmitido(file) {
    var tipo = (file.type || "").toLowerCase();
    if (tipo === "image/jpeg" || tipo === "image/jpg" || tipo === "image/png" || tipo === "image/webp" || tipo === "image/heic" || tipo === "image/heif" || tipo === "image/heic-sequence" || tipo === "image/heif-sequence") return true;
    var ext = extensionArchivo(file.name || "");
    return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp" || ext === "heic" || ext === "heif";
  }

  function bytesFotos() {
    return fotos.reduce(function (suma, foto) { return suma + foto.file.size; }, 0);
  }

  function textoTamano(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
  }

  function quitarFoto(id) {
    fotos = fotos.filter(function (foto) {
      if (foto.id !== id) return true;
      if (foto.url) URL.revokeObjectURL(foto.url);
      return false;
    });
    pintarFotos();
  }

  function pintarFotos() {
    if (!listaFotos) return;
    listaFotos.textContent = "";
    fotos.forEach(function (foto) {
      var item = document.createElement("li");
      item.className = "foto";
      var img = document.createElement("img");
      img.alt = "";
      img.hidden = true;
      var aviso = document.createElement("p");
      aviso.className = "foto__aviso";
      aviso.hidden = true;
      var datos = document.createElement("div");
      var nombre = document.createElement("p");
      nombre.className = "foto__nombre";
      nombre.textContent = foto.file.name;
      var tamano = document.createElement("p");
      tamano.className = "foto__tamano";
      tamano.textContent = textoTamano(foto.file.size);
      datos.appendChild(nombre);
      datos.appendChild(tamano);
      var quitar = document.createElement("button");
      quitar.type = "button";
      quitar.className = "boton boton--secundario";
      quitar.textContent = "Quitar";
      quitar.setAttribute("aria-label", "Quitar " + foto.file.name);
      quitar.addEventListener("click", function () { quitarFoto(foto.id); });
      item.appendChild(img);
      item.appendChild(aviso);
      item.appendChild(datos);
      item.appendChild(quitar);
      listaFotos.appendChild(item);
      var prueba = new Image();
      prueba.onload = function () {
        img.src = foto.url;
        img.alt = "Vista previa de " + foto.file.name;
        img.hidden = false;
      };
      prueba.onerror = function () {
        aviso.hidden = false;
        aviso.textContent = "Sin vista previa. La foto se enviará igualmente.";
      };
      prueba.src = foto.url;
    });
  }

  function anadirFotos(lista) {
    var avisos = [];
    Array.prototype.forEach.call(lista, function (file) {
      if (!formatoAdmitido(file)) {
        avisos.push(file.name + ": usa JPEG, PNG, WebP o HEIC.");
        return;
      }
      var repetida = fotos.some(function (foto) {
        return foto.file.name === file.name && foto.file.size === file.size && foto.file.lastModified === file.lastModified;
      });
      if (repetida) {
        avisos.push(file.name + " ya está añadida.");
        return;
      }
      if (fotos.length >= MAX_FOTOS) {
        avisos.push(file.name + " no se ha añadido: el máximo es 6 fotos.");
        return;
      }
      if (bytesFotos() + file.size > MAX_BYTES) {
        avisos.push(file.name + " no se ha añadido: las fotos no pueden sumar más de 10 MB.");
        return;
      }
      fotos.push({ id: ++idFoto, file: file, url: URL.createObjectURL(file) });
    });
    pintarFotos();
    if (errorFotos) errorFotos.textContent = avisos.join(" ");
  }

  function limpiarFotos() {
    fotos.forEach(function (foto) { if (foto.url) URL.revokeObjectURL(foto.url); });
    fotos = [];
    if (entradaFotos) entradaFotos.value = "";
    if (errorFotos) errorFotos.textContent = "";
    pintarFotos();
  }

  if (botonFotos && entradaFotos) {
    botonFotos.addEventListener("click", function () { entradaFotos.click(); });
    entradaFotos.addEventListener("change", function () {
      anadirFotos(entradaFotos.files || []);
      entradaFotos.value = "";
    });
  }

  function bloquearFormulario() {
    bloqueados = [];
    Array.prototype.forEach.call(form.querySelectorAll("input, select, textarea, button"), function (el) {
      if (el.disabled) return;
      el.disabled = true;
      bloqueados.push(el);
    });
  }

  function desbloquearFormulario() {
    bloqueados.forEach(function (el) { el.disabled = false; });
    bloqueados = [];
  }

  function interpretarRespuesta(texto) {
    if (!texto || !String(texto).trim()) return "no-confirmado";
    var datos;
    try { datos = JSON.parse(texto); } catch (e) { return "no-confirmado"; }
    if (!datos || typeof datos !== "object") return "no-confirmado";
    if (datos.success === true || datos.success === "true") return "aceptada";
    if (datos.success === false || datos.success === "false") return "rechazada";
    return "no-confirmado";
  }

  function cerrarEnvio(resultado) {
    if (!enviando) return;
    if (resultado === "aceptada") {
      form.reset();
      campos.forEach(function (c) { c.removeAttribute("aria-invalid"); });
      limpiarUbicacion();
      limpiarFotos();
    }
    desbloquearFormulario();
    enviando = false;
    enviar.disabled = modo !== "destino";
    enviar.textContent = modo === "destino" ? "Enviar solicitud" : enviar.textContent;
    if (modo === "destino") enviar.disabled = false;
    if (resultado === "aceptada") {
      mostrarEstado("ok", "Solicitud aceptada",
        "FormSubmit ha aceptado la solicitud. Esto no confirma que ya haya llegado al buzón de RDMP.", true);
    } else if (resultado === "rechazada") {
      mostrarEstado("error", "FormSubmit no ha aceptado la solicitud",
        "Los datos, la ubicación y las fotos siguen en el formulario." + (correo ? " Puedes intentarlo de nuevo o escribir a " + correo + "." : " Puedes intentarlo de nuevo."), true);
    } else {
      mostrarEstado("error", "No hemos podido confirmar el envío",
        "No sabemos si FormSubmit ha aceptado la solicitud. Los datos, la ubicación y las fotos siguen aquí. Comprueba si ha llegado antes de enviarla otra vez" + (correo ? " o escribe a " + correo + "." : "."), true);
    }
    estado.scrollIntoView({ block: "nearest" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (modo === "pendiente") return;

    var invalidos = campos.filter(function (c) { return !validarCampo(c); });
    var ubicOk = validarUbicacion();
    if (invalidos.length || !ubicOk) {
      var foco = invalidos[0] || abrirSelector;
      if (foco) foco.focus();
      return;
    }

    var d = datosFormulario();

    if (modo === "correo") {
      window.location.href = "mailto:" + correo +
        "?subject=" + encodeURIComponent("Solicitud RDMP — " + d.motivo + " — " + d.tipo + " " + d.modelo) +
        "&body=" + encodeURIComponent(lineasCorreo(d));
      mostrarEstado("info", "Correo preparado",
        "Si no se ha abierto tu programa de correo, escribe directamente a " + correo + ". La solicitud no se envía hasta que la mandes desde tu correo." +
        (fotos.length ? " Las fotos no se adjuntan solas: añádelas en el correo." : ""),
        true);
      return;
    }

    if (enviando) return;
    enviando = true;
    bloquearFormulario();
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
      "Sede u obra": d.sede || "—",
      "Dirección": d.direccion || "—",
      "Latitud": d.latitud || "—",
      "Longitud": d.longitud || "—",
      "Indicaciones de acceso": d.indicaciones || "—",
      "Enlace de OpenStreetMap": d.enlaceOsm || "—",
      "Códigos de fallo": d.codigos || "—",
      "Comprobaciones realizadas": d.comprobaciones || "—",
      "Descripción de la incidencia o de la pieza": d.descripcion,
      "Acepta el uso de sus datos": "Sí",
      "Fotos": fotos.length ? String(fotos.length) : "Ninguna",
      _subject: "Solicitud RDMP — " + d.motivo + " — " + d.tipo + " " + d.modelo,
      _replyto: d.correo,
      _template: "table",
      _captcha: "false",
      _honey: form.elements._honey ? form.elements._honey.value : "",
    };
    var cuerpo = new FormData();
    Object.keys(envio).forEach(function (clave) { cuerpo.append(clave, envio[clave]); });
    fotos.forEach(function (foto, indice) {
      cuerpo.append("foto_" + (indice + 1), foto.file, foto.file.name);
    });
    var controlador = new AbortController();
    var temporizador = setTimeout(function () { controlador.abort(); }, 45000);
    fetch(destino, {
      method: "POST",
      body: cuerpo,
      headers: { Accept: "application/json" },
      signal: controlador.signal,
    })
      .then(function (r) {
        return r.text().then(function (texto) {
          return { httpOk: r.ok, juicio: interpretarRespuesta(texto) };
        });
      })
      .then(function (resultado) {
        if (!resultado.httpOk || resultado.juicio === "rechazada") cerrarEnvio("rechazada");
        else cerrarEnvio(resultado.juicio);
      })
      .catch(function () { cerrarEnvio("no-confirmado"); })
      .finally(function () { clearTimeout(temporizador); });
  });

})();
