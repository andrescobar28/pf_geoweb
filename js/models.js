/* =====================================================
   GEOPOTAMO · Modelos de datos (MVP – Model)

   Clases que representan las entidades del dominio.
   Coinciden con el esquema de supabase/schema.sql:
     public.perfiles   → clase Perfil
     public.reportes   → clase Reporte
   Utilidades:
     GeoPoint          → coordenada con helpers
===================================================== */

/* ─── Perfil (usuarios del sistema) ─────────────────
   Roles:         'reporter' | 'admin'
   Estado cuenta: 'pendiente' | 'aprobado' | 'rechazado'
──────────────────────────────────────────────────── */
class Perfil {
  constructor({
    id, email, nombre, organizacion = null,
    municipio = null, rol = "reporter",
    estado_cuenta = "pendiente", activo = true,
    approved_by = null, approved_at = null,
    created_at = null,
  }) {
    this.id            = id;
    this.email         = email;
    this.nombre        = nombre;
    this.organizacion  = organizacion;
    this.municipio     = municipio;
    this.rol           = rol;
    this.estado_cuenta = estado_cuenta;
    this.activo        = activo;
    this.approved_by   = approved_by;
    this.approved_at   = approved_at;
    this.created_at    = created_at || new Date().toISOString();
  }

  isAdmin()    { return this.rol === "admin"; }
  isReporter() { return this.rol === "reporter"; }
  isAprobado() { return this.estado_cuenta === "aprobado"; }
  isPendiente(){ return this.estado_cuenta === "pendiente"; }
  isRechazado(){ return this.estado_cuenta === "rechazado"; }
  isActivo()   { return this.activo === true; }

  /** Devuelve una copia segura sin datos internos sensibles */
  toPublic() {
    const { ...pub } = this;
    return pub;
  }
}

/* ─── Reporte (avistamiento / incidencia) ────────────
   Tipos:      'avistamiento' | 'huella' | 'conflicto'
               'cultivo' | 'vialidad' | 'ambiental' | 'captura'
   Severidad:  1 (baja) – 4 (crítica)
   Validación: 'pendiente' | 'validado' | 'rechazado'
──────────────────────────────────────────────────── */
class Reporte {
  constructor({
    id = null, codigo = null,
    tipo, severidad, n_individuos = 1,
    descripcion = "", lat, lng,
    municipio = null, departamento = null,
    estado_validacion = "pendiente",
    validated_by = null, validated_at = null,
    validation_note = null,
    user_id = null, evidencia_url = null,
    created_at = null,
  }) {
    this.id               = id;
    this.codigo           = codigo;
    this.tipo             = tipo;
    this.severidad        = severidad;       // 1 – 4
    this.n_individuos     = n_individuos;
    this.descripcion      = descripcion;
    this.lat              = lat;
    this.lng              = lng;
    this.municipio        = municipio;
    this.departamento     = departamento;
    this.estado_validacion= estado_validacion;
    this.validated_by     = validated_by;
    this.validated_at     = validated_at;
    this.validation_note  = validation_note;
    this.user_id          = user_id;
    this.evidencia_url    = evidencia_url;
    this.created_at       = created_at || new Date().toISOString();
  }

  isValidado()  { return this.estado_validacion === "validado"; }
  isPendiente() { return this.estado_validacion === "pendiente"; }
  isRechazado() { return this.estado_validacion === "rechazado"; }

  /** ¿Puede el actor (Perfil) validar este reporte?
      Regla de negocio: un admin NO valida sus propios reportes. */
  canBeValidatedBy(actor) {
    if (!actor || actor.rol !== "admin") return false;
    if (this.user_id === actor.id) return false;
    return true;
  }
}

/* ─── GeoPoint (coordenada geográfica) ───────────── */
class GeoPoint {
  constructor(lat, lng, name = "") {
    this.lat  = lat;
    this.lng  = lng;
    this.name = name;
  }

  /** Distancia Haversine en kilómetros */
  distanceTo(other) {
    const R = 6371;
    const toRad = v => v * Math.PI / 180;
    const dLat  = toRad(other.lat - this.lat);
    const dLng  = toRad(other.lng - this.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(this.lat)) * Math.cos(toRad(other.lat)) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Punto a una distancia (km) y rumbo (°) */
  destination(distKm, bearingDeg) {
    const R = 6371;
    const d = distKm / R;
    const b = bearingDeg * Math.PI / 180;
    const lat1 = this.lat * Math.PI / 180;
    const lng1 = this.lng * Math.PI / 180;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(b)
    );
    const lng2 = lng1 + Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
    return new GeoPoint(
      lat2 * 180 / Math.PI,
      lng2 * 180 / Math.PI,
    );
  }
}

/* ─── Export ─────────────────────────────────────── */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Perfil, Reporte, GeoPoint };
} else {
  window.GPModels = { Perfil, Reporte, GeoPoint };
}
