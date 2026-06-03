/* GEOPOTAMO · capa de datos
   Modos:
   - SUPABASE: si window.GEOPOTAMO_CONFIG tiene URL+ANON_KEY
   - MOCK: localStorage con datos seed (modo demo / desarrollo local)

   Modelo:
   - perfiles: id, email, nombre, organizacion, municipio, rol (reporter|admin),
               estado_cuenta (pendiente|aprobado|rechazado), approved_by, approved_at, created_at
   - reportes: id, codigo, tipo, severidad, n_individuos, descripcion, lat, lng,
               municipio, departamento, estado_validacion (pendiente|validado|rechazado),
               validated_by, validated_at, validation_note, user_id, evidencia_url, created_at
   - audit:   id, actor_id, action, target_id, ts, payload
*/

(function () {
  const CFG = window.GEOPOTAMO_CONFIG || {};
  const useSupabase = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  const sb = useSupabase
    ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY)
    : null;

  /* ---------- Catálogos ---------- */
  const TIPOS = [
    { id: "avistamiento", label: "Avistamiento",          desc: "Observación directa del animal" },
    { id: "huella",       label: "Huella o rastro",       desc: "Pisadas, heces, sendas" },
    { id: "conflicto",    label: "Conflicto humano-fauna",desc: "Ataque, daño o amenaza" },
    { id: "cultivo",      label: "Daño a cultivo",        desc: "Pisoteo o consumo en parcelas" },
    { id: "vialidad",     label: "Riesgo vial",           desc: "Animal en vía o cerca de carretera" },
    { id: "ambiental",    label: "Incidencia ambiental",  desc: "Eutrofización, contaminación de agua" },
    { id: "captura",      label: "Captura / esterilización", desc: "Manejo, esterilización o reubicación" },
  ];
  const SEVERIDADES = [
    { id: 1, label: "Baja" },
    { id: 2, label: "Media" },
    { id: 3, label: "Alta" },
    { id: 4, label: "Crítica" },
  ];
  const ESTADOS_VAL  = ["pendiente", "validado", "rechazado"];
  const ESTADOS_CUEN = ["pendiente", "aprobado", "rechazado"];

  /* ---------- Mock store ---------- */
  const LS_USERS   = "gp.users";
  const LS_REPORTS = "gp.reports";
  const LS_AUDIT   = "gp.audit";
  const LS_SESSION = "gp.session";

  function load(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k) || "null") ?? fallback; }
    catch { return fallback; }
  }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function uuid() { return "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function nowISO(daysOffset = 0) { return new Date(Date.now() + daysOffset * 86400000).toISOString(); }

  function ensureSeed() {
    if (load(LS_USERS, null)) return;

    const users = [
      { id:"u_admin1", email:"admin@geopotamo.co",         password:"admin123", nombre:"Lina Cárdenas",     organizacion:"MinAmbiente",      municipio:"Puerto Triunfo", rol:"admin",    estado_cuenta:"aprobado",  activo:true, approved_by:"u_admin1", approved_at:nowISO(-300), created_at:nowISO(-300) },
      { id:"u_admin2", email:"admin2@geopotamo.co",        password:"admin123", nombre:"Carlos Mejía",      organizacion:"Cornare",          municipio:"Doradal",        rol:"admin",    estado_cuenta:"aprobado",  activo:true, approved_by:"u_admin1", approved_at:nowISO(-260), created_at:nowISO(-260) },
      { id:"u_rep1",   email:"reporter@geopotamo.co",      password:"demo1234", nombre:"Sara Varela",       organizacion:"Univalle",         municipio:"Doradal",        rol:"reporter", estado_cuenta:"aprobado",  activo:true, approved_by:"u_admin1", approved_at:nowISO(-200), created_at:nowISO(-220) },
      { id:"u_rep2",   email:"biologa@univalle.edu.co",    password:"demo1234", nombre:"Andrés Escobar",    organizacion:"Univalle",         municipio:"Puerto Berrío",  rol:"reporter", estado_cuenta:"aprobado",  activo:true, approved_by:"u_admin2", approved_at:nowISO(-120), created_at:nowISO(-130) },
      { id:"u_rep3",   email:"campesino@correo.co",        password:"demo1234", nombre:"Eustaquio Ruiz",    organizacion:"Comunidad",        municipio:"Puerto Boyacá",  rol:"reporter", estado_cuenta:"aprobado",  activo:true, approved_by:"u_admin2", approved_at:nowISO(-90),  created_at:nowISO(-100) },
      { id:"u_rep4",   email:"investiga@humboldt.org.co",  password:"demo1234", nombre:"María Rincón",      organizacion:"Inst. Humboldt",   municipio:"Magangué",       rol:"reporter", estado_cuenta:"aprobado",  activo:true, approved_by:"u_admin1", approved_at:nowISO(-60),  created_at:nowISO(-65) },
      { id:"u_pend1",  email:"nueva@correo.co",            password:"demo1234", nombre:"Diana Patiño",      organizacion:"CAR Boyacá",       municipio:"Puerto Boyacá",  rol:"reporter", estado_cuenta:"pendiente", activo:true, approved_by:null,       approved_at:null,         created_at:nowISO(-5) },
      { id:"u_pend2",  email:"jose@cornare.gov.co",        password:"demo1234", nombre:"José Hincapié",     organizacion:"Cornare",          municipio:"Cocorná",        rol:"reporter", estado_cuenta:"pendiente", activo:true, approved_by:null,       approved_at:null,         created_at:nowISO(-2) },
    ];
    save(LS_USERS, users);

    // Seed sites along Magdalena basin
    const seedSites = [
      [5.880,-74.638,"Puerto Triunfo","Antioquia"], [5.815,-74.701,"Doradal","Antioquia"],
      [5.940,-74.555,"Puerto Nare","Antioquia"], [6.487,-74.405,"Puerto Berrío","Antioquia"],
      [6.001,-74.583,"Cocorná","Antioquia"],     [6.350,-74.412,"Yondó","Antioquia"],
      [5.972,-74.594,"Hda. Nápoles","Antioquia"], [5.873,-74.860,"San Luis","Antioquia"],
      [6.110,-74.580,"Caracolí","Antioquia"],     [5.733,-74.629,"Puerto Boyacá","Boyacá"],
      [7.062,-74.249,"Barrancabermeja","Santander"], [8.297,-73.595,"El Banco","Magdalena"],
      [9.246,-74.420,"Magangué","Bolívar"],       [9.456,-74.521,"Mompós","Bolívar"],
      [6.180,-74.480,"La Sierra","Antioquia"],    [6.330,-74.510,"San Juan","Antioquia"],
      [5.945,-74.620,"El Doradal","Antioquia"],   [6.250,-74.430,"Puerto Olaya","Santander"],
      [7.480,-74.082,"Cantagallo","Bolívar"],     [8.027,-73.857,"Aguachica","Cesar"],
      [6.852,-74.140,"Puerto Wilches","Santander"],
    ];
    const tipos = TIPOS.map(t => t.id);
    const reports = [];
    const baseDate = Date.now();
    const userIds = ["u_rep1","u_rep2","u_rep3","u_rep4","u_admin1","u_admin2"];
    let n = 1;
    for (let i = 0; i < 132; i++) {
      const s = seedSites[i % seedSites.length];
      const jitter = () => (Math.random() - 0.5) * 0.18;
      const tipo = tipos[Math.floor(Math.random() * tipos.length)];
      const sev  = Math.min(4, Math.max(1, Math.round(2 + (Math.random() - .4) * 2)));
      const dayOffset = Math.floor(Math.random() * 540); // ~18 meses
      const user_id = userIds[Math.floor(Math.random() * userIds.length)];
      // 70% validados, 20% pendientes, 10% rechazados
      const r = Math.random();
      const estado = r < 0.7 ? "validado" : (r < 0.9 ? "pendiente" : "rechazado");
      // El validador NUNCA puede ser el mismo que el reportante
      const possibleAdmins = ["u_admin1","u_admin2"].filter(a => a !== user_id);
      const validated_by = estado === "validado" ? possibleAdmins[Math.floor(Math.random()*possibleAdmins.length)] : null;
      reports.push({
        id: uuid(),
        codigo: "GP-" + String(n++).padStart(4, "0"),
        lat: s[0] + jitter(),
        lng: s[1] + jitter(),
        municipio: s[2],
        departamento: s[3],
        tipo,
        severidad: sev,
        n_individuos: 1 + Math.floor(Math.random() * 6),
        descripcion: descripcionSeed(tipo, s[2]),
        estado_validacion: estado,
        validated_by,
        validated_at: validated_by ? nowISO(-dayOffset + 1 + Math.random()*5) : null,
        validation_note: estado === "rechazado" ? "Evidencia insuficiente, revisar reporte presencial." : null,
        user_id,
        evidencia_url: null,
        created_at: new Date(baseDate - dayOffset * 86400000 - Math.floor(Math.random()*86400000)).toISOString(),
      });
    }
    save(LS_REPORTS, reports);
    save(LS_AUDIT, []);
  }
  function descripcionSeed(tipo, mun) {
    const m = {
      avistamiento: `Grupo observado en cuerpo de agua cerca a ${mun}. Comportamiento en reposo durante el día.`,
      huella:       `Rastros de pisadas y heces sobre sendero ribereño en ${mun}.`,
      conflicto:    `Encuentro inesperado con ejemplar adulto en zona poblada de ${mun}.`,
      cultivo:      `Daño en cultivo de plátano y pastizal por paso nocturno del grupo en ${mun}.`,
      vialidad:     `Ejemplar cruzando vía secundaria al anochecer en jurisdicción de ${mun}.`,
      ambiental:    `Eutrofización local del cuerpo de agua con presencia constante de individuos en ${mun}.`,
      captura:      `Operación de esterilización exitosa realizada en sector ${mun}.`,
    };
    return m[tipo] || `Reporte registrado en ${mun}.`;
  }

  ensureSeed();

  /* pushAudit: fire-and-forget — no bloquea la llamada principal */
  async function pushAudit(actor_id, action, target_id, payload = {}) {
    if (sb) {
      try {
        await sb.from("audit_log").insert({
          actor_id,
          action,
          target_id: target_id ? String(target_id) : null,
          payload,
        });
      } catch (e) {
        console.warn("[GEOPOTAMO] audit_log insert error:", e.message);
      }
      return;
    }
    const arr = load(LS_AUDIT, []);
    arr.unshift({ id: uuid(), actor_id, action, target_id, ts: new Date().toISOString(), payload });
    save(LS_AUDIT, arr.slice(0, 500));
  }

  /* ---------- API ---------- */
  const API = {
    mode: useSupabase ? "supabase" : "mock",
    catalog: { TIPOS, SEVERIDADES, ESTADOS_VAL, ESTADOS_CUEN },

    /* ===== Auth ===== */
    async signIn(email, password) {
      if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong password")) {
            throw new Error("Correo o contraseña incorrectos.");
          }
          if (msg.includes("email not confirmed")) {
            throw new Error(
              "Tu correo no está confirmado. En Supabase Dashboard desactiva " +
              "'Confirm email' (Authentication → Providers → Email)."
            );
          }
          throw new Error(error.message);
        }

        const { data: prof, error: pe } = await sb
          .from("perfiles").select("*").eq("id", data.user.id).single();

        if (pe || !prof) {
          await sb.auth.signOut();
          throw new Error("No se encontró tu perfil. Contacta al administrador.");
        }

        if (prof.activo === false) {
          await sb.auth.signOut();
          throw new Error("Tu cuenta está desactivada. Contacta a un administrador.");
        }
        if (prof.estado_cuenta === "pendiente") {
          await sb.auth.signOut();
          throw new Error("Tu cuenta está pendiente de aprobación. Un administrador la revisará en breve.");
        }
        if (prof.estado_cuenta === "rechazado") {
          await sb.auth.signOut();
          throw new Error("Tu solicitud fue rechazada. Puedes volver a solicitarla desde el formulario de registro.");
        }
        if (prof.estado_cuenta !== "aprobado") {
          await sb.auth.signOut();
          throw new Error("Tu cuenta no está habilitada. Contacta al administrador.");
        }

        const sess = { user: { id: data.user.id, email: data.user.email, ...prof } };
        save(LS_SESSION, sess);
        pushAudit(data.user.id, "signin", data.user.id);
        return sess.user;
      }

      /* ── Mock mode ─────────────────────────────────────────────── */
      const users = load(LS_USERS, []);
      const u = users.find(x =>
        x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password
      );
      if (!u) throw new Error("Correo o contraseña incorrectos.");
      if (u.activo === false) throw new Error("Tu cuenta está desactivada. Contacta a un administrador.");
      if (u.estado_cuenta === "pendiente") throw new Error("Tu cuenta está pendiente de aprobación por un administrador.");
      if (u.estado_cuenta === "rechazado") throw new Error("Tu solicitud fue rechazada. Puedes volver a solicitarla desde el formulario de registro.");
      const { password: _p, ...safe } = u;
      save(LS_SESSION, { user: safe });
      pushAudit(u.id, "signin", u.id);
      return safe;
    },

    async signUp({ email, password, nombre, organizacion, municipio }) {
      if (sb) {
        /* ── Supabase mode ──────────────────────────────────────────
           REQUISITO EN SUPABASE DASHBOARD:
           Authentication → Providers → Email → Confirm email: OFF
           Sin eso, Supabase envía correos de confirmación que agotan
           el rate limit del plan gratuito (4/hora).
        ──────────────────────────────────────────────────────────── */
        const { data, error } = await sb.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("rate limit") || msg.includes("email rate") || msg.includes("too many")) {
            throw new Error(
              "Límite de registros alcanzado temporalmente. " +
              "Espera unos minutos y vuelve a intentarlo, o pídele al administrador " +
              "que cree tu cuenta directamente desde el panel."
            );
          }
          if (msg.includes("already registered") || msg.includes("already been registered")) {
            // Supabase: el correo ya existe pero con confirmación OFF devuelve el usuario
            // sin error. Si llega acá, es confirmación ON con email ya registrado.
            throw new Error("Este correo ya tiene una cuenta. Inicia sesión o contacta al administrador.");
          }
          throw new Error(error.message);
        }

        const userId = data?.user?.id;
        if (!userId) {
          throw new Error(
            "No se pudo completar el registro. " +
            "Verifica que 'Confirm email' esté desactivado en Supabase Dashboard " +
            "(Authentication → Providers → Email → Confirm email: OFF)."
          );
        }

        /* Usar función RPC para crear/actualizar el perfil.
           Esta función corre con security definer, evitando problemas de RLS
           cuando la sesión de signUp no está completamente activa. */
        const { data: result, error: fnErr } = await sb.rpc("gp_register_profile", {
          p_user_id:     userId,
          p_email:       email.trim().toLowerCase(),
          p_nombre:      nombre.trim(),
          p_organizacion: organizacion?.trim() || null,
          p_municipio:   municipio?.trim() || null,
        });

        if (fnErr) {
          await sb.auth.signOut();
          /* Si la función no existe aún, intentar INSERT directo como fallback */
          if (fnErr.code === "PGRST202" || fnErr.message?.includes("does not exist")) {
            const { error: insertErr2 } = await sb.from("perfiles").insert({
              id: userId, email: email.trim().toLowerCase(), nombre: nombre.trim(),
              organizacion: organizacion?.trim() || null, municipio: municipio?.trim() || null,
              rol: "reporter", estado_cuenta: "pendiente",
            });
            if (insertErr2 && !insertErr2.message?.includes("duplicate")) throw insertErr2;
          } else {
            throw new Error(fnErr.message || "Error al crear el perfil de usuario.");
          }
        } else if (result === "already_pending") {
          await sb.auth.signOut();
          throw new Error("Ya tienes una solicitud pendiente de aprobación. Espera a que el administrador la revise.");
        } else if (result === "already_active") {
          await sb.auth.signOut();
          throw new Error("Este correo ya tiene una cuenta activa en GEOPOTAMO. Inicia sesión.");
        } else {
          /* "created" o "updated" — éxito */
          const action = result === "updated" ? "signup_request_retry" : "signup_request";
          pushAudit(userId, action, userId, { nombre, re_registro: result === "updated" });
        }

        /* Cerrar sesión — el usuario no puede entrar hasta que admin apruebe */
        await sb.auth.signOut();
        return { pending: true };
      }

      /* ── Mock mode ─────────────────────────────────────────────── */
      const users = load(LS_USERS, []);
      const existing = users.find(x => x.email.toLowerCase() === email.trim().toLowerCase());

      if (existing) {
        if (existing.estado_cuenta === "rechazado") {
          /* Re-registro: actualizar el registro existente en lugar de crear uno nuevo */
          const i = users.findIndex(u => u.id === existing.id);
          users[i] = {
            ...users[i],
            nombre: nombre.trim(),
            organizacion: organizacion?.trim() || null,
            municipio: municipio?.trim() || null,
            password,
            estado_cuenta: "pendiente",
            approved_by: null,
            approved_at: null,
          };
          save(LS_USERS, users);
          pushAudit(existing.id, "signup_request", existing.id, { re_registro: true });
          return { pending: true };
        }
        if (existing.estado_cuenta === "pendiente") {
          throw new Error("Ya tienes una solicitud pendiente de aprobación.");
        }
        throw new Error("Este correo ya tiene una cuenta activa. Inicia sesión.");
      }

      const u = {
        id: uuid(),
        email: email.trim().toLowerCase(),
        password,
        nombre: nombre.trim(),
        organizacion: organizacion?.trim() || null,
        municipio: municipio?.trim() || null,
        rol: "reporter",
        estado_cuenta: "pendiente",
        activo: true,
        approved_by: null,
        approved_at: null,
        created_at: new Date().toISOString(),
      };
      users.push(u);
      save(LS_USERS, users);
      pushAudit(u.id, "signup_request", u.id, { nombre });
      return { pending: true };
    },

    async signOut() {
      // Registrar auditoría antes de limpiar
      const s = load(LS_SESSION, null);
      if (s?.user?.id) {
        try { pushAudit(s.user.id, "signout", s.user.id); } catch {}
      }

      // 1. Limpiar sesión propia
      localStorage.removeItem(LS_SESSION);

      // 2. Limpiar TODOS los tokens de Supabase (sb-*) del localStorage
      //    Supabase guarda: sb-{ref}-auth-token, sb-{ref}-auth-token-code-verifier, etc.
      //    Los eliminamos manualmente como failsafe antes de llamar al SDK.
      const sbKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("sb-")) sbKeys.push(k);
      }
      sbKeys.forEach(k => localStorage.removeItem(k));

      // 3. Llamar al SDK de Supabase (limpia su estado interno en memoria)
      if (sb) {
        try { await sb.auth.signOut(); } catch {}
      }
    },

    async currentUser() {
      if (sb) {
        // Si no hay LS_SESSION ni tokens sb-* en localStorage → sesión definitivamente cerrada
        const hasCachedSession = !!load(LS_SESSION, null);
        const hasSbTokens = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
          .some(k => k && k.startsWith("sb-"));

        if (!hasCachedSession && !hasSbTokens) return null;

        try {
          const { data: { session } } = await sb.auth.getSession();
          if (session) {
            const { data: prof, error } = await sb
              .from("perfiles")
              .select("*")
              .eq("id", session.user.id)
              .single();
            if (error || !prof) return null;
            if (prof.estado_cuenta !== "aprobado" || prof.activo === false) return null;
            const u = { id: session.user.id, email: session.user.email, ...prof };
            save(LS_SESSION, { user: u });
            return u;
          }
        } catch {}

        // Fallback solo si LS_SESSION existe (sesión no fue limpiada explícitamente)
        if (hasCachedSession) {
          const cached = load(LS_SESSION, null);
          return cached?.user || null;
        }
        return null;
      }
      // Modo mock
      const s = load(LS_SESSION, null);
      return s?.user || null;
    },

    /* ===== Reportes ===== */
    async listReports({ filters = {}, includeUnvalidated = true, includeArchived = false } = {}) {
      if (sb) {
        let q = sb.from("reportes").select("*").order("created_at", { ascending: false });
        const { data, error } = await q;
        if (error) throw error;
        let arr = data;
        if (!includeArchived) arr = arr.filter(r => !r.archivado);
        return applyFilters(arr, filters, includeUnvalidated);
      }
      let arr = load(LS_REPORTS, []).slice();
      if (!includeArchived) arr = arr.filter(r => !r.archivado);
      return applyFilters(arr, filters, includeUnvalidated);
    },

    async getReport(id) {
      if (sb) {
        const { data, error } = await sb.from("reportes").select("*").eq("id", id).single();
        if (error) throw error;
        return data;
      }
      return load(LS_REPORTS, []).find(r => r.id === id);
    },

    async createReport(payload) {
      const session = load(LS_SESSION, null);
      const userId = session?.user?.id || null;
      const departamento = payload.departamento || window.GPGeo.findDepartamentoByMunicipio(payload.municipio) || null;

      if (sb) {
        // En Supabase: NO enviar id ni codigo — los genera el trigger set_codigo y uuid_generate_v4()
        const supabaseRecord = {
          ...payload,
          departamento,
          estado_validacion: "pendiente",
          validated_by: null,
          validated_at: null,
          validation_note: null,
          user_id: userId,
        };
        const { data, error } = await sb.from("reportes").insert(supabaseRecord).select().single();
        if (error) throw error;
        pushAudit(userId, "create_report", data.id, { codigo: data.codigo });
        return data;
      }

      // Modo mock: generar id y codigo localmente
      const arr = load(LS_REPORTS, []);
      const nextCode = "GP-" + String(arr.length + 1).padStart(4, "0");
      const record = {
        id: uuid(),
        codigo: nextCode,
        ...payload,
        departamento,
        estado_validacion: "pendiente",
        validated_by: null,
        validated_at: null,
        validation_note: null,
        user_id: userId,
        created_at: new Date().toISOString(),
      };
      arr.unshift(record); save(LS_REPORTS, arr);
      pushAudit(userId, "create_report", record.id, { codigo: record.codigo });
      return record;
    },

    async updateReport(id, patch) {
      const session = load(LS_SESSION, null);
      if (sb) {
        const { data, error } = await sb.from("reportes").update(patch).eq("id", id).select().single();
        if (error) throw error;
        pushAudit(session?.user?.id, "update_report", id, patch);
        return data;
      }
      const arr = load(LS_REPORTS, []);
      const i = arr.findIndex(r => r.id === id);
      if (i < 0) throw new Error("Reporte no encontrado");
      arr[i] = { ...arr[i], ...patch };
      save(LS_REPORTS, arr);
      pushAudit(session?.user?.id, "update_report", id, patch);
      return arr[i];
    },

    /* Validación: admin valida un reporte, pero NUNCA el suyo propio. */
    async validateReport(id, decision, note = null) {
      const session = load(LS_SESSION, null);
      const actor = session?.user;
      if (!actor || actor.rol !== "admin") throw new Error("Solo administradores pueden validar.");
      const r = await API.getReport(id);
      if (!r) throw new Error("Reporte no encontrado");
      if (r.user_id === actor.id) throw new Error("No puedes validar tu propio reporte. Debe hacerlo otro administrador.");
      const patch = {
        estado_validacion: decision,
        validated_by: actor.id,
        validated_at: new Date().toISOString(),
        validation_note: note,
      };
      return await API.updateReport(id, patch);
    },

    /* Archivar (soft-delete): marca archivado=true. Los registros nunca se eliminan físicamente. */
    async archiveReport(id, nota = null) {
      const session = load(LS_SESSION, null);
      const actor = session?.user;
      if (!actor || actor.rol !== "admin") throw new Error("Solo administradores pueden archivar reportes.");
      const patch = {
        archivado: true,
        archivado_at: new Date().toISOString(),
        archivado_por: actor.id,
        archivado_nota: nota,
      };
      if (sb) {
        const { error } = await sb.from("reportes").update(patch).eq("id", id);
        if (error) throw error;
        pushAudit(actor.id, "archive_report", id, { nota });
        return true;
      }
      const arr = load(LS_REPORTS, []);
      const i = arr.findIndex(r => r.id === id);
      if (i < 0) throw new Error("Reporte no encontrado");
      arr[i] = { ...arr[i], ...patch };
      save(LS_REPORTS, arr);
      pushAudit(actor.id, "archive_report", id, { nota });
      return true;
    },

    async bulkArchiveByDateRange(fromISO, toISO) {
      const session = load(LS_SESSION, null);
      const actor = session?.user;
      if (!actor || actor.rol !== "admin") throw new Error("Solo administradores pueden hacer archivado masivo.");
      const archivadoAt = new Date().toISOString();
      if (sb) {
        const { error } = await sb.from("reportes")
          .update({ archivado: true, archivado_at: archivadoAt, archivado_por: actor.id })
          .gte("created_at", fromISO).lte("created_at", toISO).eq("archivado", false);
        if (error) throw error;
        pushAudit(actor.id, "bulk_archive", null, { fromISO, toISO });
        return true;
      }
      const arr = load(LS_REPORTS, []);
      let count = 0;
      arr.forEach((r, i) => {
        if (r.created_at >= fromISO && r.created_at <= toISO && !r.archivado) {
          arr[i] = { ...r, archivado: true, archivado_at: archivadoAt, archivado_por: actor.id };
          count++;
        }
      });
      save(LS_REPORTS, arr);
      pushAudit(actor.id, "bulk_archive", null, { fromISO, toISO, count });
      return true;
    },

    /* ===== Usuarios ===== */
    async listUsers({ estado = null, rol = null } = {}) {
      let users;
      if (sb) {
        const { data, error } = await sb.from("perfiles").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        users = data;
      } else {
        users = load(LS_USERS, []).map(({ password, ...u }) => u);
      }
      if (estado) users = users.filter(u => u.estado_cuenta === estado);
      if (rol)    users = users.filter(u => u.rol === rol);
      return users;
    },

    async approveUser(userId, approve = true) {
      const session = load(LS_SESSION, null);
      const actor = session?.user;
      if (!actor || actor.rol !== "admin") throw new Error("Solo admins pueden aprobar.");
      const patch = {
        estado_cuenta: approve ? "aprobado" : "rechazado",
        approved_by: actor.id,
        approved_at: new Date().toISOString(),
      };
      if (sb) {
        const { data, error } = await sb.from("perfiles").update(patch).eq("id", userId).select().single();
        if (error) throw error;
        pushAudit(actor.id, approve ? "approve_user" : "reject_user", userId);
        return data;
      }
      const users = load(LS_USERS, []);
      const i = users.findIndex(u => u.id === userId);
      if (i < 0) throw new Error("Usuario no encontrado");
      users[i] = { ...users[i], ...patch };
      save(LS_USERS, users);
      pushAudit(actor.id, approve ? "approve_user" : "reject_user", userId);
      const { password, ...safe } = users[i];
      return safe;
    },

    /* Admin crea usuario directamente (ya aprobado). */
    async createUser({ email, password, nombre, organizacion, municipio, rol }) {
      const session = load(LS_SESSION, null);
      const actor = session?.user;
      if (!actor || actor.rol !== "admin") throw new Error("Solo admins pueden crear usuarios.");
      if (sb) {
        throw new Error("La creación directa solo está disponible en modo demo. En producción, usa una Edge Function con service-role key.");
      }
      const users = load(LS_USERS, []);
      if (users.find(x => x.email.toLowerCase() === email.toLowerCase())) throw new Error("Ese correo ya está registrado");
      const u = {
        id: uuid(), email, password, nombre, organizacion, municipio,
        rol, estado_cuenta: "aprobado", activo: true,
        approved_by: actor.id, approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      users.push(u); save(LS_USERS, users);
      pushAudit(actor.id, "create_user", u.id, { rol });
      const { password: _, ...safe } = u;
      return safe;
    },

    /* Admin edita campos arbitrarios de un usuario.
       Aplica guarda: al menos un admin activo y aprobado debe existir. */
    async updateUser(userId, patch) {
      const session = load(LS_SESSION, null);
      const actor = session?.user;
      if (!actor || actor.rol !== "admin") throw new Error("Solo admins pueden editar usuarios.");
      if (sb) {
        // En Supabase la edición se hace vía Edge Function (manejar password aparte).
        const cleanPatch = { ...patch };
        delete cleanPatch.password;
        const { data, error } = await sb.from("perfiles").update(cleanPatch).eq("id", userId).select().single();
        if (error) throw error;
        pushAudit(actor.id, "update_user", userId, Object.keys(patch));
        return data;
      }
      const users = load(LS_USERS, []);
      const i = users.findIndex(u => u.id === userId);
      if (i < 0) throw new Error("Usuario no encontrado");
      const before = users[i];
      const next = { ...before, ...patch };
      // Guarda email único
      if (patch.email && patch.email.toLowerCase() !== before.email.toLowerCase()) {
        if (users.find(u => u.email.toLowerCase() === patch.email.toLowerCase() && u.id !== userId))
          throw new Error("Ese correo ya está registrado por otra cuenta");
      }
      // Guarda: al menos un admin activo+aprobado.
      const wouldRemoveAdmin =
        (before.rol === "admin" && next.rol !== "admin") ||
        (before.rol === "admin" && next.activo === false) ||
        (before.rol === "admin" && next.estado_cuenta && next.estado_cuenta !== "aprobado");
      if (wouldRemoveAdmin) {
        const activosAprobados = users.filter((u, idx) =>
          idx !== i && u.rol === "admin" && u.activo !== false && u.estado_cuenta === "aprobado"
        );
        if (activosAprobados.length === 0) {
          throw new Error("El sistema debe mantener al menos un administrador activo y aprobado.");
        }
      }
      users[i] = next;
      save(LS_USERS, users);
      pushAudit(actor.id, "update_user", userId, Object.keys(patch));
      const { password, ...safe } = users[i];
      return safe;
    },

    /* Admin cambia la contraseña de cualquier usuario. */
    async changeUserPassword(userId, newPassword) {
      const session = load(LS_SESSION, null);
      const actor = session?.user;
      if (!actor || actor.rol !== "admin") throw new Error("Solo admins pueden cambiar contraseñas.");
      if (!newPassword || newPassword.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
      if (sb) {
        // Requiere service-role key vía Edge Function
        throw new Error("El cambio de contraseña en producción requiere una Edge Function con service-role.");
      }
      const users = load(LS_USERS, []);
      const i = users.findIndex(u => u.id === userId);
      if (i < 0) throw new Error("Usuario no encontrado");
      users[i] = { ...users[i], password: newPassword };
      save(LS_USERS, users);
      pushAudit(actor.id, "change_password", userId);
      return true;
    },

    /* Actualiza el propio perfil (solo campos no sensibles, cualquier rol). */
    async updateOwnProfile(patch) {
      const session = load(LS_SESSION, null);
      const actor = session?.user;
      if (!actor) throw new Error("No hay sesión activa.");
      const safePatch = {};
      if (patch.nombre?.trim()) safePatch.nombre = patch.nombre.trim();
      if (patch.organizacion !== undefined) safePatch.organizacion = patch.organizacion || null;
      if (patch.municipio !== undefined) safePatch.municipio = patch.municipio || null;
      if (!Object.keys(safePatch).length) return actor;
      if (sb) {
        const { data, error } = await sb.from("perfiles").update(safePatch).eq("id", actor.id).select().single();
        if (error) throw error;
        const updated = { ...actor, ...safePatch };
        save(LS_SESSION, { user: updated });
        pushAudit(actor.id, "update_profile", actor.id, Object.keys(safePatch));
        return updated;
      }
      const users = load(LS_USERS, []);
      const i = users.findIndex(u => u.id === actor.id);
      if (i >= 0) { users[i] = { ...users[i], ...safePatch }; save(LS_USERS, users); }
      const updated = { ...actor, ...safePatch };
      save(LS_SESSION, { user: updated });
      pushAudit(actor.id, "update_profile", actor.id, Object.keys(safePatch));
      return updated;
    },

    /* Activar / desactivar */
    async setUserActive(userId, activo) {
      return await API.updateUser(userId, { activo });
    },

    /* Cantidad de admins activos */
    activeAdminCount() {
      const users = load(LS_USERS, []);
      return users.filter(u => u.rol === "admin" && u.activo !== false && u.estado_cuenta === "aprobado").length;
    },

    async userActivity() {
      const users = await API.listUsers();
      const reports = await API.listReports({ includeUnvalidated: true });
      const byUser = {};
      for (const r of reports) {
        if (!byUser[r.user_id]) byUser[r.user_id] = { total:0, validados:0, pendientes:0, ultimo:null };
        byUser[r.user_id].total += 1;
        if (r.estado_validacion === "validado")   byUser[r.user_id].validados += 1;
        if (r.estado_validacion === "pendiente")  byUser[r.user_id].pendientes += 1;
        if (!byUser[r.user_id].ultimo || r.created_at > byUser[r.user_id].ultimo) byUser[r.user_id].ultimo = r.created_at;
      }
      return users.map(u => ({
        ...u,
        ...(byUser[u.id] || { total:0, validados:0, pendientes:0, ultimo:null }),
      })).sort((a,b) => b.total - a.total);
    },

    async listAudit({ limit = 50 } = {}) {
      if (sb) {
        const { data, error } = await sb
          .from("audit_log")
          .select("*")
          .order("ts", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return data || [];
      }
      return load(LS_AUDIT, []).slice(0, limit);
    },

    /* ===== Helpers ===== */
    fmtDate(iso) {
      if (!iso) return "—";
      return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
    },
    fmtDateTime(iso) {
      if (!iso) return "—";
      return new Date(iso).toLocaleString("es-CO", { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    },
    severityLabel(s) { return SEVERIDADES.find(x => x.id === s)?.label || "—"; },
    tipoLabel(t)     { return TIPOS.find(x => x.id === t)?.label || t; },

    async _resetSeed() {
      localStorage.removeItem(LS_USERS);
      localStorage.removeItem(LS_REPORTS);
      localStorage.removeItem(LS_AUDIT);
      ensureSeed();
    },
  };

  /* ---------- Filtros server-style ---------- */
  function applyFilters(arr, filters, includeUnvalidated) {
    if (!includeUnvalidated) arr = arr.filter(r => r.estado_validacion === "validado");
    if (filters.tipo)         arr = arr.filter(r => r.tipo === filters.tipo);
    if (filters.estado)       arr = arr.filter(r => r.estado_validacion === filters.estado);
    if (filters.minSev)       arr = arr.filter(r => r.severidad >= filters.minSev);
    if (filters.user_id)      arr = arr.filter(r => r.user_id === filters.user_id);
    if (filters.municipio)    arr = arr.filter(r => r.municipio === filters.municipio);
    if (filters.departamento) arr = arr.filter(r => r.departamento === filters.departamento);
    if (filters.q) {
      const s = filters.q.toLowerCase();
      arr = arr.filter(r =>
        (r.descripcion || "").toLowerCase().includes(s) ||
        (r.municipio   || "").toLowerCase().includes(s) ||
        (r.departamento|| "").toLowerCase().includes(s) ||
        r.codigo.toLowerCase().includes(s)
      );
    }
    if (filters.from) arr = arr.filter(r => r.created_at >= filters.from);
    if (filters.to)   arr = arr.filter(r => r.created_at <= filters.to);
    arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return arr;
  }

  /* Listener de cambios de sesión Supabase.
     Mantiene LS_SESSION sincronizado para compatibilidad. */
  if (sb) {
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // No sobreescribe el perfil enriquecido — solo registra el evento
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem(LS_SESSION);
      }
    });
  }

  window.GP = API;
})();
