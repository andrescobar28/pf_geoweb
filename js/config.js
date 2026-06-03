/* =====================================================
   GEOPOTAMO · Configuración global (MVP – Config)

   Las credenciales Supabase vienen de js/env.js
   que sobreescribe window.GEOPOTAMO_CONFIG antes de
   que este archivo se evalúe.

   Arquitectura MVP de la aplicación:
   ┌──────────────────────────────────────────────────┐
   │  View      src/login.jsx  src/viewer.jsx          │
   │            src/reporter.jsx  src/admin.jsx        │
   ├──────────────────────────────────────────────────┤
   │  Presenter js/presenter.js  (window.GPPresenter)  │
   │            src/app.jsx   (coordinador de vistas)  │
   ├──────────────────────────────────────────────────┤
   │  Model     js/models.js  (window.GPModels)        │
   │  Service   src/data.jsx  (window.GP → Supabase)   │
   └──────────────────────────────────────────────────┘
===================================================== */

const GEOPOTAMO_CONFIG = window.GEOPOTAMO_CONFIG || {};

const GP_CONFIG = {
  SUPABASE_URL:      GEOPOTAMO_CONFIG.SUPABASE_URL  || null,
  SUPABASE_ANON_KEY: GEOPOTAMO_CONFIG.SUPABASE_ANON_KEY || null,
  DEBUG:             true,
  VERSION:           "1.0.0",
  APP_NAME:          "GEOPOTAMO",
};

const logger = {
  log:   (...a) => GP_CONFIG.DEBUG && console.log  ("[GEOPOTAMO]",       ...a),
  warn:  (...a) =>                    console.warn  ("[GEOPOTAMO WARN]",  ...a),
  error: (...a) =>                    console.error ("[GEOPOTAMO ERROR]", ...a),
  debug: (...a) => GP_CONFIG.DEBUG && console.debug ("[GEOPOTAMO DEBUG]", ...a),
};

// Emitir estado de conexión al cargar
(function () {
  const url = GP_CONFIG.SUPABASE_URL;
  const key = GP_CONFIG.SUPABASE_ANON_KEY;
  if (url && key) {
    logger.log("Supabase configurado ✓ →", url);
  } else {
    logger.warn("Supabase NO configurado — modo demo local activo. Edita js/env.js para conectar.");
  }
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GP_CONFIG, logger };
} else {
  window.GEOPOTAMO = { CONFIG: GP_CONFIG, logger };
}
