/* =====================================================
   GEOPOTAMO · Presenters (MVP – Presenter)

   Capa que coordina la UI con el servicio de datos.
   Delega a window.GP (src/data.jsx → Supabase o mock).

   Uso desde componentes React:
     const auth  = new window.GPPresenter.AuthPresenter();
     const rep   = new window.GPPresenter.ReportPresenter();
     const users = new window.GPPresenter.UserPresenter();

   Patrón de callbacks opcionales (attach):
     presenter.attach({
       onLoginSuccess: (user)   => …,
       onLoginError:   (msg)    => …,
       onReportsLoaded:(reports)=> …,
       onError:        (msg)    => …,
     });
   Los componentes React pueden ignorar los callbacks
   y usar el valor de retorno de cada método (Promise).
===================================================== */

/* ─────────────────────────────────────────────────── *
 *  AuthPresenter                                      *
 *  Gestiona login, signup, logout y sesión activa     *
 * ─────────────────────────────────────────────────── */
class AuthPresenter {
  constructor() { this._view = null; }

  /** Asocia callbacks de la vista (opcionales) */
  attach(view) { this._view = view; return this; }

  /** Inicia sesión con email/password.
      Devuelve { success, user } o { success:false, error } */
  async login(email, password) {
    try {
      const user = await window.GP.signIn(email.trim(), password);
      this._view?.onLoginSuccess?.(user);
      return { success: true, user };
    } catch (err) {
      const msg = err.message || "Error al iniciar sesión";
      this._view?.onLoginError?.(msg);
      return { success: false, error: msg };
    }
  }

  /** Registra una cuenta nueva (queda pendiente de aprobación).
      @param {{ email, password, nombre, organizacion, municipio }} form */
  async signup(form) {
    try {
      if (!form.nombre || !form.email || !form.password)
        throw new Error("Completa los campos requeridos: nombre, correo y contraseña.");
      await window.GP.signUp(form);
      this._view?.onSignupSuccess?.();
      return { success: true };
    } catch (err) {
      const msg = err.message || "Error al registrarse";
      this._view?.onSignupError?.(msg);
      return { success: false, error: msg };
    }
  }

  /** Cierra la sesión actual */
  async logout() {
    try {
      await window.GP.signOut();
      this._view?.onLogout?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /** Verifica si hay una sesión válida persistida.
      Devuelve { success, user } */
  async checkSession() {
    try {
      const user = await window.GP.currentUser();
      return { success: !!user, user: user || null };
    } catch (err) {
      return { success: false, user: null };
    }
  }
}

/* ─────────────────────────────────────────────────── *
 *  ReportPresenter                                    *
 *  CRUD de reportes + validación cruzada              *
 * ─────────────────────────────────────────────────── */
class ReportPresenter {
  constructor() {
    this._view   = null;
    this._cache  = [];   // último resultado de load()
  }

  attach(view) { this._view = view; return this; }

  /** Carga reportes con filtros opcionales.
      @param {{ filters, includeUnvalidated }} options */
  async load(options = {}) {
    try {
      const reports = await window.GP.listReports(options);
      this._cache = reports;
      this._view?.onReportsLoaded?.(reports);
      return { success: true, reports };
    } catch (err) {
      const msg = err.message || "Error al cargar reportes";
      this._view?.onError?.(msg);
      return { success: false, error: msg };
    }
  }

  /** Crea un nuevo reporte.
      @param {object} payload — campos del reporte */
  async create(payload) {
    try {
      const report = await window.GP.createReport(payload);
      this._view?.onReportCreated?.(report);
      return { success: true, report };
    } catch (err) {
      const msg = err.message || "Error al crear reporte";
      this._view?.onError?.(msg);
      return { success: false, error: msg };
    }
  }

  /** Actualiza campos de un reporte existente. */
  async update(id, patch) {
    try {
      const report = await window.GP.updateReport(id, patch);
      this._view?.onReportUpdated?.(report);
      return { success: true, report };
    } catch (err) {
      const msg = err.message || "Error al actualizar reporte";
      this._view?.onError?.(msg);
      return { success: false, error: msg };
    }
  }

  /** Valida o rechaza un reporte (solo admins, no el propio).
      @param {string} id
      @param {'validado'|'rechazado'} decision
      @param {string|null} note */
  async validate(id, decision, note = null) {
    try {
      const report = await window.GP.validateReport(id, decision, note);
      this._view?.onReportValidated?.(report);
      return { success: true, report };
    } catch (err) {
      const msg = err.message || "Error al validar reporte";
      this._view?.onError?.(msg);
      return { success: false, error: msg };
    }
  }

  /** Elimina un reporte (solo admins). */
  async delete(id) {
    try {
      await window.GP.deleteReport(id);
      this._view?.onReportDeleted?.(id);
      return { success: true };
    } catch (err) {
      const msg = err.message || "Error al eliminar reporte";
      this._view?.onError?.(msg);
      return { success: false, error: msg };
    }
  }

  /** Calcula estadísticas sobre un array de reportes.
      Si no se pasa array usa el cache de la última carga. */
  getStats(reports) {
    const arr = reports || this._cache || [];
    return {
      total:      arr.length,
      validados:  arr.filter(r => r.estado_validacion === "validado").length,
      pendientes: arr.filter(r => r.estado_validacion === "pendiente").length,
      rechazados: arr.filter(r => r.estado_validacion === "rechazado").length,
      individuos: arr.reduce((s, r) => s + (r.n_individuos || 0), 0),
      municipios: new Set(arr.map(r => r.municipio).filter(Boolean)).size,
    };
  }
}

/* ─────────────────────────────────────────────────── *
 *  UserPresenter                                      *
 *  Gestión de cuentas (aprobación, edición, activación)
 * ─────────────────────────────────────────────────── */
class UserPresenter {
  constructor() { this._view = null; }

  attach(view) { this._view = view; return this; }

  /** Lista usuarios con filtros opcionales. */
  async load(filters = {}) {
    try {
      const users = await window.GP.listUsers(filters);
      this._view?.onUsersLoaded?.(users);
      return { success: true, users };
    } catch (err) {
      const msg = err.message || "Error al cargar usuarios";
      this._view?.onError?.(msg);
      return { success: false, error: msg };
    }
  }

  /** Aprueba o rechaza una cuenta pendiente.
      @param {string} userId
      @param {boolean} approve */
  async approve(userId, approve = true) {
    try {
      const user = await window.GP.approveUser(userId, approve);
      this._view?.onUserUpdated?.(user);
      return { success: true, user };
    } catch (err) {
      const msg = err.message || "Error al procesar cuenta";
      this._view?.onError?.(msg);
      return { success: false, error: msg };
    }
  }

  /** Actualiza campos de un usuario existente. */
  async update(userId, patch) {
    try {
      const user = await window.GP.updateUser(userId, patch);
      this._view?.onUserUpdated?.(user);
      return { success: true, user };
    } catch (err) {
      const msg = err.message || "Error al actualizar usuario";
      this._view?.onError?.(msg);
      return { success: false, error: msg };
    }
  }

  /** Activa o desactiva una cuenta. */
  async setActive(userId, activo) {
    return this.update(userId, { activo });
  }

  /** Carga la actividad (reportes por usuario) — solo admins. */
  async loadActivity() {
    try {
      const activity = await window.GP.userActivity();
      this._view?.onActivityLoaded?.(activity);
      return { success: true, activity };
    } catch (err) {
      const msg = err.message || "Error al cargar actividad";
      this._view?.onError?.(msg);
      return { success: false, error: msg };
    }
  }
}

/* ─── Export ─────────────────────────────────────── */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AuthPresenter, ReportPresenter, UserPresenter };
} else {
  window.GPPresenter = { AuthPresenter, ReportPresenter, UserPresenter };
}
