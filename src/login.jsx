/* ═══════════════════════════════════════════════════════════════════
   GEOPOTAMO · Autenticación
═══════════════════════════════════════════════════════════════════ */

const { useState, useEffect, useRef } = React;

function PremiumLoginScreen({ onAuth, onViewer }) {
  const { useToast } = window.GPUI;
  const toast = useToast();
  const [mode, setMode] = useState("login"); // login | signup | done
  const [loading, setLoading] = useState(false);
  const [videoOk, setVideoOk] = useState(true);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    email: "",
    password: "",
    nombre: "",
    organizacion: "",
    departamento: "",
    municipio: ""
  });
  const [departments, setDepartments] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Bloquea el scroll del body cuando el bottom-sheet está abierto (evita
  // que al desplazar en móvil se mueva el fondo y reaparezca el hero)
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen]);
  // Cargar departamentos al montar
  useEffect(() => {
    if (window.GPDivipola) {
      setDepartments(window.GPDivipola.allDepartments());
    }
  }, []);

  // Validación en tiempo real
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (pwd) => pwd.length >= 2;

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Si cambia departamento, actualizar municipios disponibles
    if (field === "departamento" && window.GPDivipola) {
      const muns = window.GPDivipola.municipiosOfDepartment(value);
      setMunicipalities(muns);
      setForm(prev => ({ ...prev, municipio: "" })); // Reset municipio
    }
  };

  async function submit(e) {
    e.preventDefault();
    const newErrors = {};

    // Validaciones
    if (!form.email.trim()) newErrors.email = "Correo requerido";
    else if (!validateEmail(form.email)) newErrors.email = "Correo inválido";

    if (!form.password) newErrors.password = "Contraseña requerida";
    else if (!validatePassword(form.password)) newErrors.password = "Mínimo 8 caracteres";

    if (mode === "signup") {
      if (!form.nombre.trim()) newErrors.nombre = "Nombre requerido";
      if (!form.municipio.trim()) newErrors.municipio = "Municipio requerido";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.push("Por favor completa los campos requeridos", "warning");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const user = await window.GP.signIn(form.email.trim(), form.password);
        toast.push(`Bienvenido, ${user.nombre || user.email}`, "success");
        onAuth(user);
      } else {
        await window.GP.signUp(form);
        toast.push("Solicitud enviada · espera aprobación", "success");
        setMode("done");
      }
    } catch (err) {
      const message = err.message || "Error desconocido";
      toast.push(message, "error");
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full min-h-screen text-[#f4efe4] overflow-hidden">
      {/* Fondo cinematográfico */}
      <div className="fixed inset-0 z-0">
        {videoOk ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.pexels.com/photos/50582/elephant-cub-young-wildlife-50582.jpeg?auto=compress&cs=tinysrgb&w=1600"
            onError={() => setVideoOk(false)}
            style={{ imageRendering: "crisp-edges" }}
          >
            <source src="src/video_login.mp4" type="video/mp4" />
          </video>
        ) : (
          <div className="absolute inset-0 login-bg-fallback" />
        )}
      </div>

      {/* ── Neblina atmosférica: solo radiales asimétricas, cero líneas rectas ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {/* Masa principal: elipse enorme anclada arriba-izquierda, fuera del viewport */}
        <div className="absolute inset-0" style={{ background:
          "radial-gradient(ellipse 140% 170% at -22% 22%, rgba(7,17,12,0.97) 0%, rgba(7,17,12,0.68) 35%, rgba(7,17,12,0.18) 60%, transparent 76%)"
        }}/>
        {/* Lóbulo inferior-izquierdo: desplazado hacia abajo para irregularidad */}
        <div className="absolute inset-0" style={{ background:
          "radial-gradient(ellipse 110% 140% at -18% 88%, rgba(7,17,12,0.88) 0%, rgba(7,17,12,0.42) 42%, rgba(7,17,12,0.06) 66%, transparent 82%)"
        }}/>
        {/* Relleno central-izquierda: cubre el hueco entre los dos lóbulos */}
        <div className="absolute inset-0" style={{ background:
          "radial-gradient(ellipse 72% 90% at -2% 54%, rgba(7,17,12,0.60) 0%, rgba(7,17,12,0.22) 52%, transparent 74%)"
        }}/>
        {/* Bruma alta asimétrica: descentrada y pequeña, rompe la simetría */}
        <div className="absolute inset-0" style={{ background:
          "radial-gradient(ellipse 55% 65% at 18% 8%, rgba(7,17,12,0.38) 0%, rgba(7,17,12,0.10) 55%, transparent 72%)"
        }}/>
        {/* Anclaje inferior global: viñeta suave que profundiza la escena */}
        <div className="absolute inset-0" style={{ background:
          "radial-gradient(ellipse 140% 55% at 28% 115%, rgba(7,17,12,0.65) 0%, rgba(7,17,12,0.18) 55%, transparent 72%)"
        }}/>
        {/* Blur volumétrico: da cuerpo al efecto sin pixelar */}
        <div className="absolute inset-0" style={{
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(1px)"
        }}/>
      </div>

      {/* DESKTOP: hero izquierdo + auth panel derecho (480px) */}
      <div className="gp-desktop-grid relative z-10 min-h-screen" style={{ gridTemplateColumns: "1fr 540px", background: "transparent" }}>
        <HeroSection />
        <div className="auth-panel">
          <div className="auth-card">
            <div className="auth-card-inner">
              <AuthFormContent
                mode={mode} setMode={setMode}
                errors={errors} setErrors={setErrors}
                form={form} handleFieldChange={handleFieldChange}
                departments={departments} municipalities={municipalities}
                loading={loading} submit={submit} onViewer={onViewer}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE: hero fullscreen */}
      <div className="gp-mobile-hero relative z-10 flex flex-col" style={{ minHeight: "100dvh" }}>
        <HeroSection mobile />
      </div>

      {/* MOBILE: pill flotante */}
      <div className="gp-mobile-fab fixed bottom-0 left-0 right-0 z-20 mobile-fab-zone">
        <button className="mobile-access-pill" type="button" onClick={() => setSheetOpen(true)}>
          <span>Acceder al geovisor</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* MOBILE: bottom sheet portal */}
      {sheetOpen && ReactDOM.createPortal(
        <div className="mobile-sheet-root" onMouseDown={e => { if (e.target === e.currentTarget) setSheetOpen(false); }}>
          <div className="mobile-sheet-panel">
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-scroll gp-scrollbar">
              <AuthFormContent
                mode={mode} setMode={setMode}
                errors={errors} setErrors={setErrors}
                form={form} handleFieldChange={handleFieldChange}
                departments={departments} municipalities={municipalities}
                loading={loading} submit={submit} onViewer={onViewer}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="grain fixed inset-0 pointer-events-none z-50 mix-blend-multiply opacity-30" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   COMPONENTES AUXILIARES
   ──────────────────────────────────────────────────────────────── */

function AuthFormContent({ mode, setMode, errors, setErrors, form, handleFieldChange, departments, municipalities, loading, submit, onViewer }) {
  const [showPass, setShowPass] = useState(false);

  if (mode === "done") {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">✓</div>
        <h3 className="auth-success-title">Solicitud recibida</h3>
        <p className="auth-success-description">
          Tu solicitud quedó <strong>pendiente de aprobación</strong>.
          Un administrador revisará tus datos y te notificará por correo.
        </p>
        <div className="flex flex-col gap-2 w-full mt-4">
          <button onClick={onViewer} className="btn btn-primary w-full">
            Continuar como visitante
          </button>
          <button
            onClick={() => { setMode("login"); setErrors({}); }}
            className="btn btn-ghost-light w-full text-sm"
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="auth-header">
        <div className="auth-header-content flex-1">
          <p className="auth-header-label">{mode === "login" ? "Acceso" : "Registro"}</p>
          <h2 className="serif font-normal">{mode === "login" ? "Iniciar sesión" : "Solicita acceso"}</h2>
        </div>
        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErrors({}); }}
          className="auth-mode-toggle"
          title={mode === "login" ? "Registrarse" : "Ya tengo cuenta"}
        >
          {mode === "login" ? "Registrarse" : "Acceder"}
        </button>
      </div>

      <form onSubmit={submit} className="auth-form" noValidate>
        {mode === "signup" && (
          <>
            <FormField label="Nombre y apellido" required error={errors.nombre}>
              <input
                type="text"
                className={`gp-input gp-input-dark w-full ${errors.nombre ? "border-red-500" : ""}`}
                placeholder="ej. María Rincón"
                value={form.nombre}
                onChange={(e) => handleFieldChange("nombre", e.target.value)}
                aria-invalid={!!errors.nombre}
              />
            </FormField>

            <FormField label="Organización · opcional">
              <input
                type="text"
                className="gp-input gp-input-dark w-full"
                placeholder="ej. Instituto de Investigación Ambiental"
                value={form.organizacion}
                onChange={(e) => handleFieldChange("organizacion", e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Departamento" required error={errors.departamento}>
                <CustomSelect
                  options={departments}
                  value={form.departamento}
                  onChange={(val) => handleFieldChange("departamento", val)}
                  placeholder="Selecciona..."
                />
              </FormField>
              <FormField label="Municipio" required error={errors.municipio}>
                <CustomSelect
                  options={municipalities}
                  value={form.municipio}
                  onChange={(val) => handleFieldChange("municipio", val)}
                  placeholder="Selecciona..."
                  disabled={!form.departamento}
                />
              </FormField>
            </div>
          </>
        )}

        <FormField label="Correo electrónico" required error={errors.email}>
          <input
            type="email"
            className={`gp-input gp-input-dark w-full ${errors.email ? "border-red-500" : ""}`}
            placeholder="tu@correo.co"
            value={form.email}
            onChange={(e) => handleFieldChange("email", e.target.value)}
            aria-invalid={!!errors.email}
            autoComplete="email"
          />
        </FormField>

        <FormField label="Contraseña" required error={errors.password} hint={mode === "signup" ? "Mínimo 8 caracteres" : ""}>
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"}
              className={`gp-input gp-input-dark w-full ${errors.password ? "border-red-500" : ""}`}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => handleFieldChange("password", e.target.value)}
              aria-invalid={!!errors.password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              style={{ paddingRight: "2.75rem" }}
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              style={{
                position: "absolute", right: "0.75rem", top: "50%",
                transform: "translateY(-50%)", background: "none", border: "none",
                cursor: "pointer", padding: 0, lineHeight: 1, display: "flex",
                color: "rgba(244,239,228,0.45)",
              }}
            >
              {showPass ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </FormField>

        <button type="submit" disabled={loading} className="btn btn-primary w-full auth-submit-btn mt-4">
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Procesando…</span>
            </>
          ) : mode === "login" ? "Entrar al geovisor" : "Enviar solicitud"}
        </button>
      </form>

      {mode === "login" && (
        <>
          <div className="auth-divider"><span className="auth-divider-text">o</span></div>
          <button type="button" onClick={onViewer} className="btn btn-ghost-light w-full auth-secondary-action">
            Continuar como visitante
          </button>
        </>
      )}

      <div className="auth-footer">
        {window.GP?.mode === "supabase" ? "© 2026 Universidad del Valle" : "Modo demo local"}
      </div>
    </>
  );
}

function HeroSection({ mobile = false }) {
  return (
    <div
      className={`login-hero flex flex-col ${mobile ? "px-7 pt-10 pb-32 gap-8" : ""}`}
      style={mobile ? {} : {
        padding: "clamp(1.75rem,4vh,4rem) 4rem clamp(2.25rem,4vh,4rem) clamp(3.5rem,5vw,6rem)",
        justifyContent: "flex-start",
        gap: "clamp(0.6rem,1.4vh,1.25rem)",
      }}
    >
      {/* Header branding */}
      <div style={{ maxWidth: mobile ? "100%" : "640px" }}>
        <h1
          className="font-bold text-[#f4efe4] mb-2 flex items-baseline"
          style={{
            fontFamily: "DM Sans",
            letterSpacing: "0.05em",
            lineHeight: "1",
            fontSize: mobile ? "2.4rem" : "clamp(2rem, 4.2vh, 3rem)",
          }}
        >
          GEOP
          <img
            src="src/hipo_name.png"
            alt="O"
            style={{
              height: "0.8em",
              width: "0.8em",
              objectFit: "contain",
              marginInline: "0.05em",
              transform: "translateY(0.03em)",
            }}
          />
          TAMO
        </h1>
        <p className="font-normal text-[#b8a89a] mb-3" style={{ fontFamily: "DM Sans", letterSpacing: "0.02em", fontSize: mobile ? "0.75rem" : "clamp(0.65rem,1.2vh,0.8rem)", textTransform: "uppercase", opacity: 0.65 }}>
          Geovisor para la Observación Territorial y Monitoreo de Hipopótamos en Colombia
        </p>
        <div className="h-px w-16 bg-gradient-to-r from-[#e7c98a] to-transparent opacity-50" />
        {!mobile && (
          <p style={{ fontFamily: "DM Sans", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#b8a89a", opacity: 0.45, marginTop: "0.45rem" }}>
            Propuesta:{" "}
            <span style={{ color: "#e7c98a" }}>Sara Camila Varela</span>
            {" · "}
            <span style={{ color: "#e7c98a" }}>Andrés Julián Escobar Cardona</span>
          </p>
        )}
      </div>

      {/* Contenido principal */}
      <div
        className="flex flex-col"
        style={{ maxWidth: mobile ? "100%" : "640px", gap: mobile ? "2.5rem" : "clamp(0.75rem,2vh,2.5rem)" }}
      >
        {/* Titular principal */}
        <div>
          <p
            className="font-semibold text-[#c8bfb5]"
            style={{ fontFamily: "DM Sans", lineHeight: "1.25", letterSpacing: "0.01em", textTransform: "uppercase", opacity: 0.75,
              fontSize: mobile ? "1rem" : "clamp(0.8rem,1.6vh,1.1rem)",
              marginBottom: mobile ? "0.5rem" : "clamp(0.3rem,0.8vh,0.75rem)" }}
          >
            La invasión de megafauna<br />más grande de Latinoamérica:
          </p>
          <h2
            className="font-bold"
            style={{ fontFamily: "DM Sans", lineHeight: "1.05", letterSpacing: "-0.025em", color: "#e7c98a",
              fontSize: mobile ? "1.75rem" : "clamp(1.9rem,4.8vh,3rem)",
              marginBottom: mobile ? "0.75rem" : "clamp(0.4rem,1.2vh,1.25rem)" }}
          >
            181 hipopótamos<br />en libertad
          </h2>
          <p className="text-[#b8a89a] leading-relaxed mb-0" style={{ fontFamily: "DM Sans", fontSize: mobile ? "0.875rem" : "clamp(0.78rem,1.3vh,0.95rem)", maxWidth: "480px" }}>
            Lo que comenzó con cuatro hipopótamos introducidos en Colombia durante los años 80, se convirtió en uno de los mayores desafíos ecológicos de Latinoamérica.
          </p>
        </div>

        {/* Datos impactantes - Grid compacto */}
        <div className="grid grid-cols-2 gap-3" style={{ maxWidth: "520px" }}>
          <ImpactCard
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                <rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/>
              </svg>
            }
            number="181+"
            label="Hipopótamos estimados"
            detail="(Cifra MADS, 2024)"
          />
          <ImpactCard
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                <path d="M3 17c2-4 4-6 6-6s3 3 5 3 4-4 7-4"/><path d="M3 11c2-4 4-6 6-6s3 3 5 3 4-4 7-4" opacity="0.4"/>
              </svg>
            }
            number="1,350 km&sup2;"
            label="Territorio ocupado"
            detail="Cuenca del Magdalena"
          />
          <ImpactCard
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                <polyline points="3 17 8 11 13 14 21 4"/><line x1="21" y1="4" x2="21" y2="9"/><line x1="16" y1="4" x2="21" y2="4"/>
              </svg>
            }
            number="2,000/año"
            label="PROYECCIÓN DE NACIMIENTOS"
            detail="Casos potenciales"
          />
          <ImpactCard
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
              </svg>
            }
            number="7+"
            label="Municipios"
            detail='con avistamientos (o "afectados")'
          />
        </div>
      </div>

    </div>
  );
}

function ImpactCard({ icon, number, label, detail }) {
  return (
    <div className="glass-effect p-4 border border-white/10 hover:border-white/20 transition-all" style={{ borderRadius: "0.375rem" }}>
      <div className="mb-3" style={{ color: "#e7c98a" }}>{icon}</div>
      <div className="leading-none mb-1" style={{ fontFamily: "DM Sans", fontSize: "1.75rem", fontWeight: "700", color: "#f4efe4" }}>
        {number}
      </div>
      <div className="uppercase mb-0.5" style={{ fontFamily: "DM Sans", fontSize: "0.65rem", letterSpacing: "0.08em", color: "#f4efe4", opacity: 0.7 }}>
        {label}
      </div>
      <div style={{ fontFamily: "DM Sans", fontSize: "0.65rem", color: "#b8a89a" }}>
        {detail}
      </div>
    </div>
  );
}

function FormField({ label, required, error, hint, children }) {
  return (
    <div className="form-group">
      <label className="form-label light">
        <span>{label}</span>
        {required && <span className="required">*</span>}
      </label>
      {children}
      {error && <div className="form-error">{error}</div>}
      {!error && hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

function CustomSelect({ options, value, onChange, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const portalRef = useRef(null);

  const normalize = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const filtered = options.filter(opt => normalize(opt).includes(normalize(search)));

  function openMenu() {
    if (disabled) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Abre hacia arriba si no hay espacio abajo
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuH = Math.min(filtered.length * 36 + 48, 240);
    const openUp = spaceBelow < menuH + 8 && rect.top > menuH + 8;
    setPos({
      left: rect.left + window.scrollX,
      width: rect.width,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top - window.scrollY + 4 }
        : { top: rect.bottom + window.scrollY + 4 })
    });
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 30);
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (
        triggerRef.current?.contains(e.target) ||
        portalRef.current?.contains(e.target)
      ) return;
      setOpen(false);
      setSearch("");
    }
    function handleKey(e) {
      if (e.key === "Escape") { setOpen(false); setSearch(""); }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const chevron = (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"
      style={{ transition: "transform 200ms", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
      <polyline points="2 4 6 8 10 4"/>
    </svg>
  );

  const menu = open && ReactDOM.createPortal(
    <div
      ref={portalRef}
      style={{
        position: "absolute",
        top: pos.top,
        bottom: pos.bottom,
        left: pos.left,
        width: pos.width,
        zIndex: 99999,
      }}
    >
      <div style={{
        background: "rgba(8, 18, 14, 0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "0.5rem",
        boxShadow: "0 24px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}>
        {/* Buscador */}
        <div style={{ padding: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)"
              strokeWidth="2" strokeLinecap="square"
              style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "0.25rem",
                padding: "0.4rem 0.6rem 0.4rem 2rem",
                fontSize: "0.8rem",
                color: "#f4efe4",
                outline: "none",
                fontFamily: "DM Sans, sans-serif",
              }}
            />
          </div>
        </div>
        {/* Lista con scroll custom */}
        <div style={{ maxHeight: "200px", overflowY: "auto" }} className="gp-scrollbar">
          {filtered.length === 0 && (
            <div style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", fontFamily: "DM Sans" }}>
              Sin resultados
            </div>
          )}
          {filtered.map((opt, i) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false); setSearch(""); }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.55rem 1rem",
                  fontSize: "0.85rem",
                  fontFamily: "DM Sans, sans-serif",
                  color: selected ? "#e7c98a" : "#f4efe4",
                  background: selected ? "rgba(31,93,76,0.35)" : "transparent",
                  borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        disabled={disabled}
        className="gp-input gp-input-dark w-full"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
          textAlign: "left",
          userSelect: "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.85rem",
          color: value ? "#f4efe4" : "rgba(244,239,228,0.4)" }}>
          {value || placeholder}
        </span>
        {chevron}
      </button>
      {menu}
    </>
  );
}

window.GPLogin = PremiumLoginScreen;