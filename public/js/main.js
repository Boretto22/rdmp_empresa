(function () {
  "use strict";

  var config = window.RDMP_CONFIG || {};
  var limpiar = function (v) { return typeof v === "string" ? v.trim() : ""; };
  var correo = limpiar(config.correo);
  var telefono = limpiar(config.telefono);
  var zona = limpiar(config.zonaCobertura);
  var destino = limpiar(config.destinoFormulario);
  var claveMaps = limpiar(config.claveMapsGoogle);
  var mapaId = limpiar(config.mapaIdGoogle) || "DEMO_MAP_ID";

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
  var tarjetaDireccion = document.getElementById("tarjeta-direccion");
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
  var contenedorBusqueda = document.getElementById("contenedor-busqueda");
  var campoNombre = document.getElementById("f-lugar-nombre");
  var campoDireccion = document.getElementById("f-lugar-direccion");
  var campoLat = document.getElementById("f-latitud");
  var campoLng = document.getElementById("f-longitud");
  var campoPlace = document.getElementById("f-place-id");

  var confirmada = null;
  var provisional = null;
  var disparador = null;
  var confirmadoAhora = false;
  var silenciarCoords = false;
  var seqGeo = 0;
  var mapa = null;
  var marcador = null;
  var Marcador = null;
  var geocoder = null;
  var mapsLista = false;
  var mapsCargando = null;

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

  /* ---------------- Selector de ubicación ---------------- */
  function clonarPunto(p) {
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
    return {
      lat: p.lat,
      lng: p.lng,
      nombre: p.nombre || "",
      direccion: p.direccion || "",
      placeId: p.placeId || "",
    };
  }

  function coordsValidas(lat, lng) {
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  function formatearNumero(n) {
    return String(Math.round(n * 1000000) / 1000000);
  }

  function urlMaps(lat, lng) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(lat + "," + lng);
  }

  function textoLugar(place) {
    var n = place && place.displayName;
    if (!n) return "";
    return typeof n === "string" ? n : (n.text || "");
  }

  function leerLatLng(valor) {
    if (!valor) return null;
    if (typeof valor.lat === "function") return { lat: valor.lat(), lng: valor.lng() };
    if (Number.isFinite(valor.lat) && Number.isFinite(valor.lng)) return { lat: valor.lat, lng: valor.lng };
    return null;
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
    var partes = [];
    if (provisional.nombre) partes.push(provisional.nombre);
    if (provisional.direccion) partes.push(provisional.direccion);
    partes.push(formatearNumero(provisional.lat) + ", " + formatearNumero(provisional.lng));
    resumenPunto.textContent = partes.join(" · ");
    confirmarMapa.disabled = false;
  }

  function pintarTarjeta() {
    if (!confirmada) {
      tarjeta.hidden = true;
      abrirSelector.removeAttribute("aria-invalid");
      return;
    }
    tarjeta.hidden = false;
    tarjetaNombre.textContent = confirmada.nombre || "Punto marcado en el mapa";
    tarjetaDireccion.textContent = confirmada.direccion
      ? confirmada.direccion
      : "Sin dirección postal. La solicitud guardará las coordenadas.";
    tarjetaCoords.textContent = formatearNumero(confirmada.lat) + ", " + formatearNumero(confirmada.lng);
    abrirSelector.removeAttribute("aria-invalid");
    errorUbicacion.textContent = "";
  }

  function volcarConfirmada() {
    campoNombre.value = confirmada && confirmada.nombre ? confirmada.nombre : "";
    campoDireccion.value = confirmada && confirmada.direccion ? confirmada.direccion : "";
    campoLat.value = confirmada ? String(confirmada.lat) : "";
    campoLng.value = confirmada ? String(confirmada.lng) : "";
    campoPlace.value = confirmada && confirmada.placeId ? confirmada.placeId : "";
    pintarTarjeta();
  }

  function sincronizarMarcador() {
    if (!mapa || !window.google) return;
    if (!provisional || !coordsValidas(provisional.lat, provisional.lng)) {
      if (marcador) marcador.map = null;
      return;
    }
    var pos = { lat: provisional.lat, lng: provisional.lng };
    mapa.setCenter(pos);
    mapa.setZoom(Math.max(mapa.getZoom() || 0, 16));
    if (!marcador) {
      marcador = new Marcador({
        map: mapa,
        position: pos,
        gmpDraggable: true,
        title: "Ubicación de la máquina",
      });
      marcador.addListener("dragend", function () {
        var ll = leerLatLng(marcador.position);
        if (ll) fijarPuntoLibre(ll.lat, ll.lng);
      });
    } else {
      marcador.map = mapa;
      marcador.position = pos;
    }
  }

  function aplicarVistaProvisional() {
    if (provisional && coordsValidas(provisional.lat, provisional.lng)) escribirCoords(provisional.lat, provisional.lng);
    else {
      silenciarCoords = true;
      inputLat.value = "";
      inputLng.value = "";
      silenciarCoords = false;
      errorCoordsModal.textContent = "";
    }
    pintarResumen();
    sincronizarMarcador();
    if (mapa && window.google && window.google.maps && window.google.maps.event) {
      window.google.maps.event.trigger(mapa, "resize");
    }
  }

  function fijarPuntoLibre(lat, lng) {
    if (!coordsValidas(lat, lng)) return;
    var id = ++seqGeo;
    provisional = { lat: lat, lng: lng, nombre: "", direccion: "", placeId: "" };
    escribirCoords(lat, lng);
    pintarResumen();
    sincronizarMarcador();
    if (!geocoder) return;
    geocoder.geocode({ location: { lat: lat, lng: lng } }).then(function (respuesta) {
      if (id !== seqGeo || !provisional) return;
      if (provisional.lat !== lat || provisional.lng !== lng) return;
      var resultado = respuesta && respuesta.results && respuesta.results[0];
      provisional.nombre = "";
      provisional.direccion = resultado && resultado.formatted_address ? resultado.formatted_address : "";
      provisional.placeId = resultado && resultado.place_id ? resultado.place_id : "";
      pintarResumen();
    }).catch(function () {
      if (id !== seqGeo || !provisional) return;
      provisional.direccion = "";
      provisional.placeId = "";
      pintarResumen();
    });
  }

  function aplicarLugar(place) {
    var ll = leerLatLng(place.location);
    if (!ll || !coordsValidas(ll.lat, ll.lng)) {
      estadoBusqueda.textContent = "Ese resultado no tiene un punto utilizable. Márcalo en el mapa.";
      return;
    }
    seqGeo += 1;
    estadoBusqueda.textContent = "";
    provisional = {
      lat: ll.lat,
      lng: ll.lng,
      nombre: textoLugar(place),
      direccion: place.formattedAddress || "",
      placeId: place.id || "",
    };
    escribirCoords(ll.lat, ll.lng);
    pintarResumen();
    if (mapa) mapa.setZoom(17);
    sincronizarMarcador();
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
    return { lat: lat, lng: lng };
  }

  function alEditarCoords() {
    if (silenciarCoords) return;
    var leido = leerCoordsEscritas();
    if (leido.vacio) {
      seqGeo += 1;
      provisional = null;
      if (marcador) marcador.map = null;
      errorCoordsModal.textContent = "";
      pintarResumen();
      return;
    }
    if (leido.error) {
      seqGeo += 1;
      provisional = null;
      if (marcador) marcador.map = null;
      inputLat.setAttribute("aria-invalid", "true");
      inputLng.setAttribute("aria-invalid", "true");
      errorCoordsModal.textContent = leido.error === "rango"
        ? "La latitud debe estar entre -90 y 90, y la longitud entre -180 y 180."
        : "Escribe latitud y longitud en grados decimales.";
      pintarResumen();
      return;
    }
    if (provisional && provisional.lat === leido.lat && provisional.lng === leido.lng) return;
    fijarPuntoLibre(leido.lat, leido.lng);
  }

  inputLat.addEventListener("input", alEditarCoords);
  inputLng.addEventListener("input", alEditarCoords);

  function prepararBuscador(libs) {
    if (contenedorBusqueda.querySelector("gmp-place-autocomplete")) return;
    var elemento = new libs.PlaceAutocompleteElement({ includedRegionCodes: ["es"] });
    elemento.id = "buscar-lugar";
    elemento.placeholder = "Buscar sede, empresa, dirección u obra";
    elemento.setAttribute("aria-label", "Buscar sede, empresa, dirección u obra");
    contenedorBusqueda.textContent = "";
    contenedorBusqueda.appendChild(elemento);
    elemento.addEventListener("gmp-select", function (ev) {
      var prediction = ev.placePrediction || (ev.detail && ev.detail.placePrediction);
      if (!prediction || typeof prediction.toPlace !== "function") return;
      var place = prediction.toPlace();
      place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "id"] }).then(function () {
        aplicarLugar(place);
      }).catch(function () {
        estadoBusqueda.textContent = "No se ha podido cargar ese resultado. Prueba con otro o marca el punto en el mapa.";
      });
    });
    elemento.addEventListener("gmp-placeselect", function (ev) {
      if (ev.place) aplicarLugar(ev.place);
    });
    elemento.addEventListener("gmp-error", function () {
      estadoBusqueda.textContent = "No se han encontrado resultados. Puedes marcar el punto directamente en el mapa.";
    });
  }

  function iniciarMapa(libs) {
    if (mapa) return;
    Marcador = libs.AdvancedMarkerElement;
    lienzoMapa.classList.remove("vacio");
    lienzoMapa.textContent = "";
    mapa = new libs.Map(lienzoMapa, {
      center: { lat: 40.2, lng: -3.7 },
      zoom: 6,
      mapId: mapaId,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: true,
      gestureHandling: "greedy",
    });
    mapa.addListener("click", function (ev) {
      if (ev.placeId && libs.Place) {
        if (typeof ev.stop === "function") ev.stop();
        var place = new libs.Place({ id: ev.placeId });
        place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "id"] }).then(function () {
          aplicarLugar(place);
        }).catch(function () {
          var ll = leerLatLng(ev.latLng);
          if (ll) fijarPuntoLibre(ll.lat, ll.lng);
        });
        return;
      }
      var ll = leerLatLng(ev.latLng);
      if (ll) fijarPuntoLibre(ll.lat, ll.lng);
    });
    geocoder = new libs.Geocoder();
    prepararBuscador(libs);
    aplicarVistaProvisional();
  }

  function instalarCargador() {
    if (window.google && window.google.maps && window.google.maps.importLibrary) return;
    var w = window;
    var googleNs = w.google = w.google || {};
    var maps = googleNs.maps = googleNs.maps || {};
    var pendientes = new Set();
    var promesa = null;
    maps.importLibrary = function (nombre) {
      pendientes.add(nombre);
      promesa = promesa || new Promise(function (ok, fail) {
        setTimeout(function () {
          var script = document.createElement("script");
          var params = new URLSearchParams();
          params.set("libraries", Array.from(pendientes).join(","));
          params.set("key", claveMaps);
          params.set("v", "weekly");
          params.set("callback", "google.maps.__ib__");
          script.src = "https://maps.googleapis.com/maps/api/js?" + params.toString();
          script.async = true;
          maps.__ib__ = ok;
          script.onerror = function () {
            promesa = null;
            fail(new Error("No se ha podido cargar Google Maps"));
          };
          document.head.appendChild(script);
        }, 0);
      });
      return promesa.then(function () { return maps.importLibrary(nombre); });
    };
  }

  function cargarMapa() {
    if (!claveMaps) {
      avisoMapa.hidden = false;
      avisoMapa.textContent = "Falta la clave de Google Maps. El mapa y el buscador no pueden cargarse todavía. Puedes escribir la latitud y la longitud y confirmar el punto en esta ventana.";
      lienzoMapa.classList.add("vacio");
      lienzoMapa.textContent = "Mapa no disponible hasta configurar la clave de API.";
      return Promise.resolve();
    }
    if (mapa) return Promise.resolve();
    if (mapsCargando) return mapsCargando;
    instalarCargador();
    mapsCargando = Promise.all([
      window.google.maps.importLibrary("maps"),
      window.google.maps.importLibrary("marker"),
      window.google.maps.importLibrary("places"),
      window.google.maps.importLibrary("geocoding"),
    ]).then(function (libs) {
      mapsLista = true;
      avisoMapa.hidden = true;
      iniciarMapa({
        Map: libs[0].Map,
        AdvancedMarkerElement: libs[1].AdvancedMarkerElement,
        PlaceAutocompleteElement: libs[2].PlaceAutocompleteElement,
        Place: libs[2].Place,
        Geocoder: libs[3].Geocoder,
      });
    }).catch(function () {
      mapsCargando = null;
      avisoMapa.hidden = false;
      avisoMapa.textContent = "No se ha podido cargar Google Maps. Los demás datos del formulario se conservan. Puedes escribir la latitud y la longitud y confirmar el punto.";
      lienzoMapa.classList.add("vacio");
      lienzoMapa.textContent = "No se ha podido cargar el mapa.";
    });
    return mapsCargando;
  }

  function abrirDialogo(desde) {
    if (!dialogo || typeof dialogo.showModal !== "function") {
      errorUbicacion.textContent = "Este navegador no puede abrir el selector de mapa.";
      return;
    }
    disparador = desde || abrirSelector;
    seqGeo += 1;
    provisional = clonarPunto(confirmada);
    estadoBusqueda.textContent = "";
    estadoGeo.textContent = "";
    errorCoordsModal.textContent = "";
    dialogo.showModal();
    aplicarVistaProvisional();
    cargarMapa().then(function () {
      if (dialogo.open) aplicarVistaProvisional();
    });
  }

  abrirSelector.addEventListener("click", function () { abrirDialogo(abrirSelector); });
  cambiarUbicacion.addEventListener("click", function () { abrirDialogo(cambiarUbicacion); });

  dialogo.querySelectorAll("[data-cerrar-mapa]").forEach(function (el) {
    el.addEventListener("click", function () { dialogo.close(); });
  });
  dialogo.addEventListener("close", function () {
    if (!confirmadoAhora) provisional = null;
    confirmadoAhora = false;
    seqGeo += 1;
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
    estadoGeo.textContent = "Solicitando ubicación…";
    navigator.geolocation.getCurrentPosition(function (pos) {
      estadoGeo.textContent = "Ubicación obtenida. Ajusta el marcador si hace falta y pulsa «Confirmar ubicación».";
      fijarPuntoLibre(pos.coords.latitude, pos.coords.longitude);
    }, function (err) {
      if (err && err.code === 1) {
        estadoGeo.textContent = "No se ha concedido el permiso de ubicación. Marca el punto en el mapa o escribe las coordenadas.";
      } else {
        estadoGeo.textContent = "No se ha podido obtener la ubicación. Marca el punto en el mapa o escribe las coordenadas.";
      }
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });

  function validarUbicacion() {
    if (confirmada && coordsValidas(confirmada.lat, confirmada.lng)) {
      abrirSelector.removeAttribute("aria-invalid");
      errorUbicacion.textContent = "";
      return true;
    }
    abrirSelector.setAttribute("aria-invalid", "true");
    errorUbicacion.textContent = "Selecciona en el mapa la sede, la obra o el punto donde está la máquina.";
    return false;
  }

  function limpiarUbicacion() {
    confirmada = null;
    provisional = null;
    seqGeo += 1;
    volcarConfirmada();
    if (marcador) marcador.map = null;
  }

  /* ---------------- Envío ---------------- */
  function valor(nombre) {
    var el = form.elements[nombre];
    return el ? limpiar(el.value) : "";
  }

  function referenciaLugar(d) {
    if (d.nombreLugar) return d.nombreLugar;
    if (d.indicaciones) return d.indicaciones;
    return "Punto marcado en el mapa";
  }

  function datosFormulario() {
    var lat = confirmada ? confirmada.lat : null;
    var lng = confirmada ? confirmada.lng : null;
    return {
      motivo: valor("motivo"),
      nombre: valor("nombre"),
      correo: valor("correo"),
      telefono: valor("telefono"),
      tipo: valor("tipo_maquina"),
      modelo: valor("marca_modelo"),
      serie: valor("numero_serie"),
      horas: valor("horas"),
      nombreLugar: confirmada ? confirmada.nombre : "",
      direccion: confirmada ? confirmada.direccion : "",
      latitud: coordsValidas(lat, lng) ? String(lat) : "",
      longitud: coordsValidas(lat, lng) ? String(lng) : "",
      placeId: confirmada ? confirmada.placeId : "",
      indicaciones: valor("indicaciones"),
      enlaceMaps: coordsValidas(lat, lng) ? urlMaps(lat, lng) : "",
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
      "Referencia de la sede u obra: " + referenciaLugar(d),
      "Nombre del establecimiento: " + (d.nombreLugar || "—"),
      "Dirección: " + (d.direccion || "—"),
      "Latitud: " + (d.latitud || "—"),
      "Longitud: " + (d.longitud || "—"),
      "Google place ID: " + (d.placeId || "—"),
      "Indicaciones de acceso: " + (d.indicaciones || "—"),
      "Enlace de Google Maps: " + (d.enlaceMaps || "—"),
      "Códigos de fallo: " + (d.codigos || "—"),
      "Comprobaciones realizadas: " + (d.comprobaciones || "—"),
      "",
      "Descripción de la incidencia o de la pieza:",
      d.descripcion,
    ].join("\n");
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
      "Referencia de la sede u obra": referenciaLugar(d),
      "Nombre del establecimiento": d.nombreLugar || "—",
      "Dirección": d.direccion || "—",
      "Latitud": d.latitud || "—",
      "Longitud": d.longitud || "—",
      "Google place ID": d.placeId || "—",
      "Indicaciones de acceso": d.indicaciones || "—",
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
        limpiarUbicacion();
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

  if (!claveMaps) {
    var buscar = document.getElementById("buscar-lugar");
    if (buscar) buscar.disabled = true;
  }
})();
