/**
 * Conexión con Google Apps Script para cuando la página está en GitHub Pages.
 *
 * Reemplaza a google.script.run (que solo existe dentro de Apps Script), así que
 * index.html y admin.html funcionan igual sin tocar nada más.
 * Si la página se abre desde Apps Script, este archivo no hace nada.
 *
 * ▼▼▼ ÚNICO DATO QUE DEBES CAMBIAR ▼▼▼
 * Pega aquí la URL de tu implementación de Apps Script (la que termina en /exec).
 */
var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyqIfPlr1x-gIboc9skEH8IvQi8--GA262tBoWmEXJdMcMlLqvd8p61-8RjYPbkxurN/exec';
/* ▲▲▲ ÚNICO DATO QUE DEBES CAMBIAR ▲▲▲ */

(function () {
  if (window.google && window.google.script && window.google.script.run) return; // dentro de Apps Script

  var TIMEOUT_MS = 60000;
  var FUNCIONES = ['getListas', 'getListasAdmin', 'guardarListas', 'guardarRegistros', 'consultarServicios', 'getUrlApp'];

  function llamar(nombre, args) {
    // El enlace "Administración" apunta a admin.html (en Apps Script era ?page=admin)
    if (nombre === 'getUrlApp') {
      return Promise.resolve(new URL('admin.html', window.location.href).href);
    }
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.indexOf('PEGA_AQUI') === 0) {
      return Promise.reject(new Error('Falta configurar la URL de Apps Script en el archivo apps-script-api.js.'));
    }
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;
    return fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      // text/plain evita la comprobación previa (preflight) de CORS, que Apps Script no responde
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: nombre, args: args }),
      redirect: 'follow',
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      return r.json();
    }, function () {
      throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
    }).then(function (d) {
      if (!d || d.ok !== true) throw new Error((d && d.error) || 'Error del servidor.');
      return d.data;
    }, function (e) {
      if (e && e.message && e.message.indexOf('conectar') >= 0) throw e;
      throw new Error('Respuesta inválida del servidor. Revisa que la implementación de Apps Script sea para "Cualquier persona".');
    }).then(function (v) {
      if (timer) clearTimeout(timer);
      return v;
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }

  function crear(ok, fail) {
    var r = {
      withSuccessHandler: function (f) { return crear(f, fail); },
      withFailureHandler: function (f) { return crear(ok, f); },
      withUserObject: function () { return crear(ok, fail); }
    };
    FUNCIONES.forEach(function (n) {
      r[n] = function () {
        var args = Array.prototype.slice.call(arguments);
        llamar(n, args).then(function (v) { if (ok) ok(v); }, function (e) {
          if (fail) fail(e); else if (window.console) console.error(e);
        });
      };
    });
    return r;
  }

  window.google = { script: { run: crear(null, null) } };
})();
