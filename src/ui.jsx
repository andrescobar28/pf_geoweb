/* GEOPOTAMO · UI primitives (rediseño moderno) */
const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

function cn(...xs) { return xs.filter(Boolean).join(" "); }

/* ═══════════════ Brand ═══════════════ */
function Logo({ size = 28, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="30" stroke={color} strokeWidth="1.5"/>
      <path d="M14 38c0-4 2-7 7-8 2-7 9-10 16-9 7 1 11 5 12 11 4 1 4 5 1 7-1 4-5 5-9 4-5 4-12 4-17 1-6 1-10-2-10-6Z" fill={color}/>
      <circle cx="44" cy="34" r="1.2" fill="var(--paper)"/>
      <path d="M26 42v3M21 42v3" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function Brand({ tone = "dark", compact = false }) {
  const c = "#e8e0d0";
  const sz = compact ? "1.35rem" : "1.6rem";
  return (
    <div className="flex items-center gap-2" style={{userSelect:"none", lineHeight:1}}>
      <span style={{
        fontFamily:"DM Sans, sans-serif", fontWeight:700,
        letterSpacing:"-0.01em", fontSize:sz, color:c,
        display:"inline-flex", alignItems:"center",
      }}>
        GEOP
        <img
          src="src/hipo_name.png" alt="o"
          style={{height:"0.82em", width:"0.82em", objectFit:"contain",
                  margin:"0 0.03em", transform:"translateY(0.04em)"}}
        />
        TAMO
      </span>
      {!compact && (
        <span className="mono hidden sm:inline-block" style={{
          fontSize:"0.5rem", letterSpacing:".22em", textTransform:"uppercase",
          color:c, opacity:.4, marginLeft:"0.2rem",
        }}>
          Cuenca del Magdalena
        </span>
      )}
    </div>
  );
}

/* ═══════════════ Spinner ═══════════════ */
function Spinner({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeOpacity=".25" strokeWidth="2.5"/>
      <path d="M12 3a9 9 0 0 1 9 9" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ═══════════════ EmptyState ═══════════════ */
function EmptyState({ icon = "○", title, subtitle, action }) {
  return (
    <div className="py-16 flex flex-col items-center text-center gap-3">
      <div className="serif text-5xl opacity-30">{icon}</div>
      <div>
        <div className="font-semibold text-[15px] opacity-70">{title}</div>
        {subtitle && <div className="text-[13px] opacity-50 mt-1 max-w-xs">{subtitle}</div>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ═══════════════ Status indicators ═══════════════ */
function StatusDot({ kind = "ok" }) {
  return <span className={cn("dot", `dot-${kind}`)} />;
}

function ValidationStatus({ value }) {
  const cfg = {
    validado:  { cls: "status-pill-ok",    dot: "ok",   label: "Validado"  },
    pendiente: { cls: "status-pill-warn",  dot: "warn", label: "Pendiente" },
    rechazado: { cls: "status-pill-err",   dot: "err",  label: "Rechazado" },
  };
  const s = cfg[value] || cfg.pendiente;
  return (
    <span className={cn("status-pill", s.cls)}>
      <StatusDot kind={s.dot}/>{s.label}
    </span>
  );
}

function CuentaStatus({ value }) {
  const cfg = {
    aprobado:  { cls: "status-pill-ok",   dot: "ok",   label: "Aprobado"  },
    pendiente: { cls: "status-pill-warn", dot: "warn", label: "Pendiente" },
    rechazado: { cls: "status-pill-err",  dot: "err",  label: "Rechazado" },
  };
  const s = cfg[value] || cfg.pendiente;
  return (
    <span className={cn("status-pill", s.cls)}>
      <StatusDot kind={s.dot}/>{s.label}
    </span>
  );
}

function SeverityIndicator({ value }) {
  const colors = { 1:"#7fa66f", 2:"#c9912a", 3:"#c25a1f", 4:"#7a2218" };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-end gap-[2px] h-3.5">
        {[1,2,3,4].map(i =>
          <span key={i} className="w-[3px] rounded-sm"
            style={{ height: `${i * 3 + 3}px`, background: i <= value ? colors[value] : "rgba(13,23,20,.15)" }}/>
        )}
      </span>
      <span className="mono text-[11px] uppercase tracking-wider" style={{ color: colors[value], opacity: .9 }}>
        {window.GP.severityLabel(value)}
      </span>
    </span>
  );
}

function Chip({ children, kind, className = "" }) {
  return (
    <span className={cn("chip", kind === "fill" && "chip-fill", kind === "moss" && "chip-moss", className)}>
      {children}
    </span>
  );
}

function Badge({ children, kind = "warn" }) {
  return <span className={cn("badge", `badge-${kind}`)}>{children}</span>;
}

/* ═══════════════ Buttons ═══════════════ */
function Button({ children, variant = "primary", size, className = "", loading, as = "button", ...props }) {
  const v = { primary:"btn-primary", ink:"btn-ink", outline:"btn-outline", ghost:"btn-ghost", danger:"btn-danger" }[variant] || "btn-primary";
  const sz = size === "sm" ? "btn-sm" : size === "xs" ? "btn-xs" : "";
  const Comp = as;
  return (
    <Comp className={cn("btn", v, sz, className)} disabled={loading || props.disabled} {...props}>
      {loading ? <Spinner size={14}/> : null}
      {children}
    </Comp>
  );
}

/* ═══════════════ Inputs ═══════════════ */
function Field({ label, hint, children, required, error }) {
  return (
    <label className="block">
      <div className="mono uppercase tracking-wider text-[10px] mb-1.5 font-medium" style={{ color: "var(--muted)" }}>
        {label}{required && <span className="opacity-50"> *</span>}
      </div>
      {children}
      {error
        ? <div className="text-[11px] mt-1 font-medium" style={{ color: "var(--clay)" }}>{error}</div>
        : hint && <div className="text-[11px] mt-1" style={{ color: "var(--muted)", opacity: .8 }}>{hint}</div>
      }
    </label>
  );
}

function TextInput({ className = "", dark = false, ...props }) {
  return <input {...props} className={cn("gp-input", dark && "gp-input-dark", className)}/>;
}

function PasswordInput({ className = "", dark = false, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"}
        className={cn("gp-input pr-11", dark && "gp-input-dark", className)}/>
      <button type="button" onClick={() => setShow(s => !s)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition",
          dark ? "text-[rgba(244,239,228,.6)] hover:text-[#f4efe4]" : "text-[var(--muted)] hover:text-[var(--ink)]")}>
        {show
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
        }
      </button>
    </div>
  );
}

function Typeahead({ value, onChange, onSelect, placeholder, getSuggestions, renderItem, dark, className = "", id }) {
  const [open, setOpen] = useState(false);
  const [sugs, setSugs] = useState([]);
  const [hi, setHi] = useState(0);
  const ref = useRef(null);

  useEffect(() => { setSugs(getSuggestions(value)); setHi(0); }, [value]);

  function pick(item) { onSelect(item); setOpen(false); }

  function onKey(e) {
    if (!open || !sugs.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(h+1, sugs.length-1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => Math.max(h-1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(sugs[hi]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div className="relative" ref={ref}>
      <input id={id} value={value} placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        onKeyDown={onKey}
        autoComplete="off"
        className={cn("gp-input", dark && "gp-input-dark", className)}/>
      {open && sugs.length > 0 &&
        <ul className="absolute z-[500] left-0 right-0 mt-1.5 max-h-60 overflow-auto rounded-xl shadow-lg"
          style={{ background:"#181c26", border:"1.5px solid rgba(255,255,255,.12)" }}>
          {sugs.map((s, i) =>
            <li key={i} onMouseDown={() => pick(s)} onMouseEnter={() => setHi(i)}
              className="px-3 py-2.5 cursor-pointer text-sm transition"
              style={{
                background: i===hi ? "rgba(255,255,255,.09)" : "transparent",
                color: "var(--ink)",
              }}>
              {renderItem ? renderItem(s) :
                <>
                  <div className="font-medium" style={{color:"var(--ink)"}}>{s.m}</div>
                  <div className="mono text-[10px] uppercase tracking-wider" style={{color:"var(--muted)"}}>{s.d}</div>
                </>
              }
            </li>
          )}
        </ul>
      }
    </div>
  );
}

function TextArea({ className = "", dark = false, ...props }) {
  return <textarea {...props} className={cn("gp-input resize-none", dark && "gp-input-dark", className)}/>;
}

function Select({ options, className = "", dark = false, ...props }) {
  return (
    <div style={{position:"relative", display:"inline-block", width:"100%"}}>
      <select {...props} className={cn("gp-input", dark && "gp-input-dark", className)}
        style={{paddingRight:"2.5rem", appearance:"none", WebkitAppearance:"none"}}>
        {options.map(o =>
          typeof o === "string"
            ? <option key={o} value={o} style={{background:"#181c26", color:"#eae4d8"}}>{o}</option>
            : <option key={o.id} value={o.id} style={{background:"#181c26", color:"#eae4d8"}}>{o.label}</option>
        )}
      </select>
      <span style={{
        pointerEvents:"none", position:"absolute", right:"0.75rem", top:"50%",
        transform:"translateY(-50%)", color:"var(--ink-3)",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </span>
    </div>
  );
}

/* ═══════════════ Card / Section ═══════════════ */
function Card({ title, eyebrow, action, children, className = "", padded = true, variant = "default" }) {
  return (
    <section className={cn("card", padded && "p-4 md:p-5", className)}>
      {(title || eyebrow || action) &&
        <header className="flex items-start justify-between gap-4 mb-3.5">
          <div className="min-w-0">
            {eyebrow && <div className="mono uppercase tracking-[.18em] text-[10px] mb-1" style={{color:"var(--muted)"}}>{eyebrow}</div>}
            {title && <h3 className="text-[17px] font-semibold tracking-tight leading-tight">{title}</h3>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </header>
      }
      {children}
    </section>
  );
}

/* ═══════════════ Stat ═══════════════ */
function Stat({ label, value, sub, pct, accent, tiny, loading, onClick, active }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "card flex flex-col justify-between transition-all",
        tiny ? "p-3.5 min-h-[80px]" : "p-4 min-h-[100px]",
        onClick && "cursor-pointer hover:scale-[1.02]",
      )}
      style={active ? {borderColor:"rgba(255,255,255,.2)", boxShadow:"0 0 0 1px rgba(255,255,255,.18)"} : undefined}
    >
      <div className="mono uppercase tracking-[.16em] text-[9.5px] font-medium" style={{color:"var(--muted)"}}>{label}</div>
      <div className="flex items-end justify-between mt-2 gap-2">
        {loading
          ? <div className="skeleton h-8 w-16 rounded-md"/>
          : <div className="flex items-baseline gap-1.5">
              <span className={cn(tiny ? "text-[1.75rem]" : "text-[2rem]", "font-semibold tracking-tight leading-none")}
                style={accent ? { color: accent } : {color:"var(--ink)"}}>
                {value}
              </span>
              {pct != null && (
                <span className="text-[0.8125rem] font-medium leading-none"
                  style={{color: accent || "var(--muted)", opacity:.85}}>
                  ({pct}%)
                </span>
              )}
            </div>
        }
        {sub && <div className="text-[11px] mb-0.5" style={{color:"var(--muted)"}}>{sub}</div>}
      </div>
    </div>
  );
}

/* ═══════════════ Tabs ═══════════════ */
function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} className={active === t.id ? "active" : ""}>
          {t.label}
          {t.badge != null && (
            <span className={cn("tab-badge", t.badgeWarn && "tab-badge-warn")}>
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════ Toggle ═══════════════ */
function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label className={cn("flex items-center justify-between py-1.5", disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer")}>
      <span className="text-[13px]">{label}</span>
      <button type="button" disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn("w-9 h-5 rounded-full p-0.5 transition-all flex", checked ? "bg-[var(--moss)] justify-end" : "bg-[var(--line-2)] justify-start")}>
        <span className="w-4 h-4 rounded-full bg-white shadow-sm"/>
      </button>
    </label>
  );
}

/* ═══════════════ Modal ═══════════════ */
function Modal({ open, onClose, title, eyebrow, children, maxW = "max-w-lg" }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="modal-backdrop absolute inset-0 backdrop-blur-[3px]" style={{background:"rgba(8,10,14,.65)"}}/>
      <div className={cn("modal-panel relative w-full rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col", maxW)}
        style={{ boxShadow: "var(--shadow-xl)" }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className="flex items-start justify-between px-5 py-4 flex-shrink-0"
          style={{borderBottom:"1px solid rgba(255,255,255,.08)"}}>
          <div>
            {eyebrow && <div className="mono uppercase tracking-[.18em] text-[10px] mb-1" style={{color:"var(--muted)"}}>{eyebrow}</div>}
            {title && <h3 className="text-[18px] font-semibold tracking-tight" style={{color:"var(--ink)"}}>{title}</h3>}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition ml-4 flex-shrink-0"
            style={{background:"rgba(255,255,255,.07)", color:"var(--ink-3)"}}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.14)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,.07)"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>
        {/* Body — scrollable */}
        <div className="p-5 overflow-y-auto flex-1" style={{color:"var(--ink)"}}>{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════ Toast ═══════════════ */
const ToastCtx = createContext(null);

function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  function push(msg, kind = "info") {
    const id = Math.random().toString(36).slice(2);
    setItems(s => [...s, { id, msg, kind }]);
    setTimeout(() => setItems(s => s.filter(x => x.id !== id)), 3800);
  }
  function dismiss(id) { setItems(s => s.filter(x => x.id !== id)); }

  const icons = {
    success: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    error:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    warning: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    info:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  };

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[120] flex flex-col gap-2.5 max-w-[340px]" style={{ pointerEvents: "none" }}>
        {items.map(t => (
          <div key={t.id} className="toast-item flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
            style={{
              pointerEvents: "auto",
              background: t.kind === "error" ? "#7a2218" : t.kind === "success" ? "var(--moss-deep)" : t.kind === "warning" ? "#b9701a" : "var(--ink)",
              color: "white",
              border: "1px solid rgba(255,255,255,.12)",
            }}>
            <span className="opacity-80 mt-0.5 flex-shrink-0">{icons[t.kind] || icons.info}</span>
            <span className="flex-1 leading-snug">{t.msg}</span>
            <button onClick={() => dismiss(t.id)}
              className="opacity-50 hover:opacity-90 transition flex-shrink-0 mt-0.5"
              style={{ pointerEvents: "auto" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function useToast() { return useContext(ToastCtx); }

/* ═══════════════ TopBar ═══════════════ */
function TopBar({ user, onSignOut, rightChip, leftChip, pendingCount, onHome }) {
  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-[200] glass border-b border-line" style={{backdropFilter:"blur(18px)"}}>
      <div className="px-4 md:px-8 py-2.5 max-w-[1600px] mx-auto flex items-center justify-between gap-3">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            onClick={onHome}
            style={{cursor: onHome ? "pointer" : "default", flexShrink:0}}
            title={onHome ? "Ir al Geovisor" : undefined}
          >
            <Brand tone="dark" />
          </div>
          {leftChip && <div className="hidden sm:block">{leftChip}</div>}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {rightChip}

          {/* Pending badge */}
          {pendingCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{background:"rgba(200,152,40,.15)", border:"1px solid rgba(200,152,40,.3)"}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{background:"var(--ochre)"}}/>
              <span className="mono text-[10px] uppercase tracking-wider" style={{color:"var(--ochre)"}}>
                {pendingCount}
              </span>
            </div>
          )}

          {user ? (
            <>
              {/* Nombre + Rol */}
              <div style={{textAlign:"right", flexShrink:0}}>
                <div style={{
                  fontSize:"0.8125rem", fontWeight:600, lineHeight:"1.2",
                  color:"var(--ink)", whiteSpace:"nowrap",
                  maxWidth:"160px", overflow:"hidden", textOverflow:"ellipsis",
                }}>
                  {user.nombre || user.email}
                </div>
                <div style={{
                  fontFamily:"var(--font-mono)", fontSize:"0.625rem",
                  textTransform:"uppercase", letterSpacing:".1em",
                  color:"var(--ink-3)", marginTop:"1px",
                }}>
                  {user.rol === "admin" ? "HIPOADMIN" : "HIPOREPORTER"}
                </div>
              </div>

              {/* Avatar */}
              <div style={{
                width:30, height:30, borderRadius:"50%",
                display:"grid", placeItems:"center",
                fontSize:"0.8125rem", fontWeight:700, flexShrink:0,
                background:"rgba(255,255,255,.12)",
                color:"var(--ink)",
                border:"1px solid rgba(255,255,255,.2)",
              }}>
                {(user.nombre || user.email)[0].toUpperCase()}
              </div>

              {/* Logout */}
              <button onClick={onSignOut} title="Cerrar sesión"
                style={{
                  display:"inline-flex", alignItems:"center", gap:"0.35rem",
                  padding:"0.3rem 0.65rem",
                  borderRadius:"999px",
                  border:"1px solid rgba(255,255,255,.18)",
                  background:"transparent",
                  color:"var(--ink-3)",
                  fontSize:"0.75rem", fontFamily:"var(--font-mono)",
                  textTransform:"uppercase", letterSpacing:".06em",
                  cursor:"pointer", flexShrink:0,
                  transition:"background 140ms, border-color 140ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.borderColor="rgba(255,255,255,.28)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="rgba(255,255,255,.18)"; }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Salir</span>
              </button>
            </>
          ) : (
            <>
              <span className="mono text-[10px] uppercase tracking-wider hidden sm:block" style={{color:"var(--muted)"}}>
                Visor público
              </span>
              {onSignOut &&
                <button onClick={onSignOut}
                  className="btn btn-sm mono uppercase tracking-wider !text-[10px]"
                  style={{background:"var(--moss)", color:"white", boxShadow:"0 2px 12px rgba(42,157,100,.35)"}}>
                  Ingresar
                </button>
              }
            </>
          )}
        </div>
      </div>
    </header>
    {/* Spacer: empuja el contenido debajo del header fijo */}
    <div style={{height:"54px", flexShrink:0}} aria-hidden="true"/>
    </>
  );
}

/* ═══════════════ PageHero ═══════════════ */
function PageHero({ eyebrow, title, subtitle, action, accent }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6 pb-5 border-b" style={{borderColor:"rgba(255,255,255,.07)"}}>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="mono uppercase tracking-[.22em] text-[10px] mb-1.5 flex items-center gap-2"
            style={{color:"var(--moss-2)", opacity:.85}}>
            <span className="w-4 h-px inline-block" style={{background:"var(--moss-2)", opacity:.6}}/>
            {eyebrow}
          </div>
        )}
        <h2 className="font-semibold tracking-tight leading-[1.05] text-[clamp(22px,3vw,30px)]"
          style={accent ? {color:accent} : {color:"var(--ink)"}}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed" style={{color:"var(--muted)"}}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ═══════════════ SectionHeader ═══════════════ */
function SectionHeader({ label, count, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        <span className="mono uppercase tracking-[.16em] text-[10px] font-medium" style={{color:"var(--muted)"}}>{label}</span>
        {count != null && <Badge kind="muted">{count}</Badge>}
      </div>
      {action}
    </div>
  );
}

/* Export */
window.GPUI = {
  cn, Logo, Brand, Spinner, EmptyState, Toggle,
  StatusDot, ValidationStatus, CuentaStatus, SeverityIndicator, Chip, Badge,
  Button, Field, TextInput, PasswordInput, TextArea, Select, Typeahead,
  Card, Stat, Tabs, Modal, ToastProvider, useToast,
  TopBar, PageHero, SectionHeader,
};
