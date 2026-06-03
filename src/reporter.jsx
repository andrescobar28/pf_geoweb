/* GEOPOTAMO · Dashboard HIPOREPORTER */
const { useState, useEffect, useMemo, useRef } = React;

function ReporterDashboard({ user: initialUser, onSignOut }) {
  const { TopBar, PageHero, Tabs, Stat, Card, Chip, useToast, Badge } = window.GPUI;
  const { FiltersBar, AreaSelector, MapExplorer, ReportsList, AnalyticsGrid, filter, buildAreaPolygon } = window.GPShared;
  const { ProjectionPanel } = window.GPProjection;
  const toast = useToast();

  const [user, setUser] = useState(initialUser);
  const [reports, setReports] = useState([]);
  const [mine, setMine] = useState([]);
  const [tab, setTab] = useState("mapa");
  const [gestionSubTab, setGestionSubTab] = useState("mis");
  const [filters, setFilters] = useState({});
  const [area, setArea] = useState({ kind:"none" });
  const [areaPolygon, setAreaPolygon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visorMode, setVisorMode] = useState("map"); // map | analitica | proyeccion

  async function refresh() {
    const [validados, allMine] = await Promise.all([
      window.GP.listReports({ includeUnvalidated:false }),
      window.GP.listReports({ filters:{ user_id:user.id }, includeUnvalidated:true }),
    ]);
    setReports(validados);
    setMine(allMine);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);
  useEffect(() => { buildAreaPolygon(area).then(setAreaPolygon); }, [area?.kind, area?.name]);

  const filtered = useMemo(() => filter(reports, filters, area, null), [reports, filters, area]);
  const allDepartments = useMemo(() => (window.GPDivipola && window.GPDivipola.allDepartments()) || [], []);
  const municipios = useMemo(() => Array.from(new Set(reports.map(r => r.municipio).filter(Boolean))).sort(), [reports]);

  const totals = useMemo(() => ({
    total: filtered.length,
    municipios: new Set(filtered.map(r => r.municipio)).size,
    misReportes: mine.length,
    misPendientes: mine.filter(r => r.estado_validacion === "pendiente").length,
  }), [filtered, mine]);

  function cn(...xs) { return xs.filter(Boolean).join(" "); }

  async function onCreated() {
    await refresh();
    toast.push("Reporte enviado · pendiente de validación", "success");
    setTab("gestion");
  }

  const TABS = [
    { id:"mapa",     label:"Geovisor" },
    { id:"reportar", label:"Reportar" },
    { id:"gestion",  label:"Gestión de Reportes", badge: mine.length, badgeWarn: totals.misPendientes > 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        user={user}
        onSignOut={onSignOut}
        leftChip={<Chip kind="moss">HIPOREPORTER</Chip>}
        onHome={() => { setTab("mapa"); setVisorMode("map"); }}
      />

      <main className="flex-1 px-4 md:px-8 pt-5 pb-10 max-w-[1600px] mx-auto w-full">

        <PageHero
          eyebrow="Panel del reportero"
          title={`Hola, ${(user.nombre || user.email).split(" ")[0]}.`}
          subtitle="Registra avistamientos o incidencias en campo. Tus reportes pasan por validación cruzada de un administrador antes de quedar en firme en el geovisor público."
          action={<Tabs tabs={TABS} active={tab} onChange={setTab}/>}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
          <Stat label="Reportes validados" value={totals.total} tiny loading={loading}/>
          <Stat label="Municipios" value={totals.municipios} tiny loading={loading}/>
          <Stat label="Mis reportes" value={totals.misReportes} tiny loading={loading}/>
          <Stat label="Mis pendientes" value={totals.misPendientes} accent="var(--ochre)" tiny loading={loading}/>
        </div>

        {tab === "mapa" && (
          <div className="space-y-4">
            {/* Sub-nav Geovisor */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[["map","Mapa"],["analitica","Analítica"],["proyeccion","Proyección"]].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setVisorMode(v)}
                  style={visorMode === v
                    ? {background:"rgba(255,255,255,.18)", color:"white", border:"1px solid rgba(255,255,255,.28)", fontWeight:600}
                    : {background:"transparent", color:"var(--ink-3)", border:"1px solid rgba(255,255,255,.12)"}}
                  className="btn btn-sm mono uppercase tracking-wider !text-[10px]">
                  {l}
                </button>
              ))}
            </div>
            {visorMode === "map" && (
              <>
                <FiltersBar filters={filters} setFilters={setFilters} allDepartments={allDepartments} municipios={municipios}/>
                <AreaSelector value={area} onChange={setArea} allDepartments={allDepartments}/>
                <MapExplorer reports={filtered} area={area} areaPolygon={areaPolygon}/>
                <Card eyebrow={"Listado · " + filtered.length} title="Reportes visibles">
                  <ReportsList reports={filtered} max={36}/>
                </Card>
              </>
            )}
            {visorMode === "analitica" && (
              <>
                <FiltersBar filters={filters} setFilters={setFilters} allDepartments={allDepartments} municipios={municipios}/>
                <AreaSelector value={area} onChange={setArea} allDepartments={allDepartments}/>
                <AnalyticsGrid reports={filtered}/>
              </>
            )}
            {visorMode === "proyeccion" && <ProjectionPanel reports={reports}/>}
          </div>
        )}

        {tab === "reportar" && <ReportingFlow onCreated={onCreated}/>}

        {tab === "gestion" && (
          <div className="space-y-4">
            {/* Sub-nav */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[["mis","Mis Reportes"],["perfil","Mi Perfil"]].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setGestionSubTab(v)}
                  style={gestionSubTab === v
                    ? {background:"rgba(255,255,255,.18)", color:"white", border:"1px solid rgba(255,255,255,.28)", fontWeight:600}
                    : {background:"transparent", color:"var(--ink-3)", border:"1px solid rgba(255,255,255,.12)"}}
                  className="btn btn-sm mono uppercase tracking-wider !text-[10px]">
                  {l}
                </button>
              ))}
            </div>
            {gestionSubTab === "mis" && (
              <Card eyebrow={`Tus aportes · ${mine.length} reporte${mine.length!==1?"s":""}`} title="Historial de reportes">
                <ReportsList reports={mine} max={120} showStatus showValidationNote/>
              </Card>
            )}
            {gestionSubTab === "perfil" && (
              <ReporterProfileForm user={user} onSaved={updated => { setUser(updated); toast.push("Perfil actualizado", "success"); }}/>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ReportingFlow — flujo de ingreso de reporte
═══════════════════════════════════════════════════ */
function ReportingFlow({ onCreated }) {
  const { Card, Field, TextInput, TextArea, Select, Button, Typeahead, useToast, Chip, Spinner } = window.GPUI;
  const { PickMap } = window.GPMaps;
  const { TIPOS, SEVERIDADES } = window.GP.catalog;
  const { MUNI_COORDS } = window.GPGeo;
  const toast = useToast();

  const [method, setMethod] = useState("pin");
  const [form, setForm] = useState(defaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [gps, setGps] = useState({ loading:false, error:null, accuracy:null });
  const [extraPoints, setExtraPoints] = useState([]);

  function defaultForm() {
    return { tipo:"avistamiento", severidad:2, n_individuos:1, lat:null, lng:null, municipio:"", departamento:"", descripcion:"" };
  }

  function locateGPS() {
    if (!navigator.geolocation) { toast.push("Tu navegador no soporta geolocalización", "error"); return; }
    setGps({ loading:true, error:null, accuracy:null });
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        setForm(f => ({ ...f, lat:latitude, lng:longitude }));
        setGps({ loading:false, error:null, accuracy });
        toast.push(`Ubicación capturada · precisión ${Math.round(accuracy)} m`, "success");
      },
      err => {
        setGps({ loading:false, error:err.message, accuracy:null });
        toast.push("No se pudo capturar GPS: " + err.message, "error");
      },
      { enableHighAccuracy:true, timeout:12000 }
    );
  }

  function pickAddress(mun, dept) {
    const c = MUNI_COORDS[mun];
    const fallback = c || [6.0, -74.6];
    const jitter = () => (Math.random() - .5) * 0.04;
    setForm(f => ({
      ...f,
      lat: fallback[0] + jitter(), lng: fallback[1] + jitter(),
      municipio: mun,
      departamento: dept || window.GPDivipola.findDepartment(mun) || f.departamento,
    }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.lat || !form.lng) { toast.push("Selecciona una ubicación", "error"); return; }
    if (!form.municipio.trim()) { toast.push("Indica el municipio", "error"); return; }
    const departamento = (form.departamento || window.GPDivipola.findDepartment(form.municipio) || "").trim() || null;
    setSubmitting(true);
    try {
      await window.GP.createReport({
        tipo: form.tipo, severidad: Number(form.severidad),
        n_individuos: Number(form.n_individuos),
        lat: Number(form.lat), lng: Number(form.lng),
        municipio: form.municipio.trim(), departamento,
        descripcion: form.descripcion.trim(),
      });
      for (const p of extraPoints) {
        await window.GP.createReport({
          tipo: form.tipo, severidad: Number(form.severidad),
          n_individuos: Number(form.n_individuos),
          lat: p[0], lng: p[1],
          municipio: form.municipio.trim(), departamento,
          descripcion: (form.descripcion || "") + " · multi-punto",
        });
      }
      setForm(defaultForm()); setExtraPoints([]);
      onCreated && onCreated();
    } catch (err) {
      toast.push(err.message || "Error al crear reporte", "error");
    } finally { setSubmitting(false); }
  }

  const METHODS = [
    { id:"pin",     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, title:"Pin en el mapa",  desc:"Clic exacto sobre el punto del avistamiento" },
    { id:"gps",     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>, title:"Ubicación GPS", desc:"Captura las coordenadas del dispositivo" },
    { id:"address", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>, title:"Por municipio",   desc:"Selecciona ciudad/vereda y ajusta en mapa" },
    { id:"multi",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, title:"Multi-punto",     desc:"Varios puntos para un mismo evento" },
  ];

  return (
    <div className="space-y-5">

      {/* Method selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {METHODS.map(m => {
          const active = method === m.id;
          return (
            <button key={m.id} type="button" onClick={() => setMethod(m.id)}
              className="text-left rounded-xl transition p-4 focus:outline-none"
              style={{
                border: active
                  ? "1.5px solid rgba(255,255,255,.28)"
                  : "1.5px solid rgba(255,255,255,.09)",
                background: active
                  ? "rgba(255,255,255,.14)"
                  : "rgba(255,255,255,.04)",
                color: "var(--ink)",
              }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{color: active ? "var(--ink)" : "var(--ink-3)", lineHeight:1}}>
                  {m.icon}
                </span>
                {active &&
                  <span className="mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{background:"rgba(255,255,255,.15)", color:"var(--ink-2)"}}>
                    Activo
                  </span>
                }
              </div>
              <div className="text-[13.5px] font-semibold leading-tight" style={{color: active ? "var(--ink)" : "var(--ink-2)"}}>
                {m.title}
              </div>
              <div className="text-[11px] mt-1 leading-snug" style={{color:"var(--muted)"}}>
                {m.desc}
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-5">

        {/* ─── Lado izquierdo: espacial ─── */}
        <Card eyebrow={"Mecanismo · " + METHODS.find(m => m.id===method).title} title="Ubicación del evento">

          {method === "pin" && (
            <div className="space-y-2.5">
              <p className="text-[13px]" style={{color:"var(--muted)"}}>
                Haz <b>clic</b> en el mapa donde ocurrió el evento. Puedes hacer zoom y reposicionar arrastrando.
              </p>
              <PickMap value={form.lat ? [form.lat, form.lng] : null} onChange={([lat,lng]) => setForm({...form,lat,lng})} height={380}/>
              {form.lat &&
                <div className="mono text-[11px] flex items-center gap-1.5" style={{color:"var(--muted)"}}>
                  <span style={{color:"var(--moss)"}}>●</span>
                  {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                </div>
              }
            </div>
          )}

          {method === "gps" && (
            <div className="space-y-4">
              <p className="text-[13px]" style={{color:"var(--muted)"}}>
                Captura la ubicación de tu dispositivo. Requiere permitir acceso de geolocalización en el navegador.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button type="button" variant="ink" onClick={locateGPS} loading={gps.loading}>
                  {!gps.loading && <span className="pulse">🎯</span>}
                  {gps.loading ? "Capturando…" : form.lat ? "Capturar de nuevo" : "Capturar ubicación"}
                </Button>
                {gps.accuracy &&
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{background:"var(--moss)"}}/>
                    <span className="mono text-[11px]" style={{color:"var(--muted)"}}>
                      precisión {Math.round(gps.accuracy)} m
                    </span>
                  </div>
                }
                {gps.error &&
                  <span className="text-[12px]" style={{color:"var(--clay)"}}>{gps.error}</span>
                }
              </div>
              {form.lat && <>
                <PickMap value={[form.lat,form.lng]} onChange={([lat,lng]) => setForm({...form,lat,lng})} height={300}/>
                <div className="mono text-[11px]" style={{color:"var(--muted)"}}>
                  {form.lat.toFixed(5)}, {form.lng.toFixed(5)} · puedes ajustar haciendo clic en el mapa
                </div>
              </>}
            </div>
          )}

          {method === "address" && (
            <div className="space-y-3">
              <p className="text-[13px]" style={{color:"var(--muted)"}}>
                Escribe el nombre del municipio — el sistema sugiere de DIVIPOLA y asigna un punto aproximado que puedes refinar en el mapa.
              </p>
              <Field label="Municipio" hint={form.departamento ? "Departamento: " + form.departamento : null}>
                <Typeahead
                  value={form.municipio}
                  onChange={t => setForm({...form, municipio:t, departamento: window.GPDivipola.findDepartment(t)||form.departamento})}
                  onSelect={s => pickAddress(s.m, s.d)}
                  getSuggestions={q => window.GPDivipola.search(q, 8)}
                  placeholder="Ej. Puerto Triunfo, Magangué…"/>
              </Field>
              {form.lat && <>
                <PickMap value={[form.lat,form.lng]} onChange={([lat,lng]) => setForm({...form,lat,lng})} height={300}/>
                <div className="mono text-[11px]" style={{color:"var(--muted)"}}>{form.lat.toFixed(5)}, {form.lng.toFixed(5)} · ajustable</div>
              </>}
            </div>
          )}

          {method === "multi" && (
            <div className="space-y-3">
              <p className="text-[13px]" style={{color:"var(--muted)"}}>
                Registra <b>varios puntos</b> para un mismo evento (p.ej. ruta de un grupo). Haz clic en el mapa para añadir cada punto.
              </p>
              <MultiPointMap
                points={[...(form.lat ? [[form.lat,form.lng]] : []), ...extraPoints]}
                onAdd={(lat,lng) => {
                  if (!form.lat) setForm({...form,lat,lng});
                  else setExtraPoints(arr => [...arr,[lat,lng]]);
                }}
                onClear={() => { setForm({...form,lat:null,lng:null}); setExtraPoints([]); }}
              />
              <div className="flex items-center gap-2">
                <span className="mono text-[11px]" style={{color:"var(--muted)"}}>
                  {form.lat ? 1 + extraPoints.length : 0} punto(s) marcado(s)
                </span>
                {(form.lat || extraPoints.length > 0) &&
                  <button type="button"
                    onClick={() => { setForm({...form,lat:null,lng:null}); setExtraPoints([]); }}
                    className="mono text-[10px] uppercase tracking-wider underline underline-offset-4 transition"
                    style={{color:"var(--clay)",opacity:.8}}>
                    limpiar
                  </button>
                }
              </div>
            </div>
          )}
        </Card>

        {/* ─── Lado derecho: alfanumérico ─── */}
        <Card eyebrow="Información alfanumérica" title="Detalles del reporte">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de evento" required>
                <Select value={form.tipo} onChange={e => setForm({...form,tipo:e.target.value})} options={TIPOS}/>
              </Field>
              <Field label="Severidad" required>
                <Select value={form.severidad} onChange={e => setForm({...form,severidad:Number(e.target.value)})}
                  options={SEVERIDADES.map(s => ({ id:s.id, label:`${s.id} · ${s.label}` }))}/>
              </Field>
              <Field label="N° individuos">
                <TextInput type="number" min="1" value={form.n_individuos}
                  onChange={e => setForm({...form,n_individuos:Number(e.target.value)})}/>
              </Field>
              <Field label="Municipio" required hint={form.departamento ? "Dpto: " + form.departamento : null}>
                <Typeahead
                  value={form.municipio}
                  onChange={t => setForm({...form,municipio:t,departamento:window.GPDivipola.findDepartment(t)||form.departamento})}
                  onSelect={s => setForm({...form,municipio:s.m,departamento:s.d})}
                  getSuggestions={q => window.GPDivipola.search(q, 6)}
                  placeholder="Empieza a escribir…"/>
              </Field>
            </div>

            <Field label="Descripción">
              <TextArea rows="5" value={form.descripcion}
                placeholder="Describe lo observado: hora aproximada, comportamiento del animal, cercanía a personas, cultivos, infraestructura…"
                onChange={e => setForm({...form,descripcion:e.target.value})}/>
            </Field>

            {/* Info box */}
            <div className="rounded-xl p-3 flex items-start gap-2.5" style={{background:"rgba(42,157,100,.1)",border:"1px solid rgba(42,157,100,.25)"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--moss)" strokeWidth="2" strokeLinecap="round" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-[12px] leading-snug" style={{color:"var(--moss-deep)"}}>
                Tu reporte quedará como <b>pendiente</b>. Un administrador distinto al autor lo verificará antes de aparecer en el geovisor público.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={submitting} loading={submitting}>
                {submitting ? "Enviando…" : "Enviar reporte"}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

/* ─── Multi-point map ─── */
function MultiPointMap({ points, onAdd, onClear }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;
    const m = L.map(ref.current, { center:[6.5,-74.3], zoom:7, scrollWheelZoom:true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      subdomains:"abcd", attribution:"&copy; OSM &copy; CARTO", maxZoom:19
    }).addTo(m);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
      subdomains:"abcd", maxZoom:19, pane:"shadowPane", opacity:.9
    }).addTo(m);
    m.on("click", e => onAdd(e.latlng.lat, e.latlng.lng));
    mapRef.current = m;
    setTimeout(() => m.invalidateSize(), 80);
  }, []);

  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    if (layerRef.current) m.removeLayer(layerRef.current);
    const g = L.layerGroup();
    points.forEach((p, i) => {
      L.marker(p, {
        icon: L.divIcon({ className:"",
          html:`<div class="gp-pin" style="background:#0d1714;font-size:9px">${i+1}</div>`,
          iconSize:[20,20], iconAnchor:[10,10] })
      }).addTo(g);
    });
    if (points.length > 1) L.polyline(points, { color:"#0d1714", weight:1.5, opacity:.5, dashArray:"3,4" }).addTo(g);
    g.addTo(m);
    layerRef.current = g;
  }, [points]);

  return (
    <div ref={ref} style={{ height:340, borderRadius:12, overflow:"hidden", border:"1.5px solid var(--line-2)" }}/>
  );
}

/* ─── Edición del propio perfil (reporter) ─── */
function ReporterProfileForm({ user, onSaved }) {
  const { Field, TextInput, Typeahead, Button, Card, useToast } = window.GPUI;
  const toast = useToast();
  const [f, setF] = useState({
    nombre: user.nombre || "",
    organizacion: user.organizacion || "",
    municipio: user.municipio || "",
  });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!f.nombre.trim()) { toast.push("El nombre es requerido", "error"); return; }
    setBusy(true);
    try {
      const updated = await window.GP.updateOwnProfile(f);
      onSaved && onSaved(updated);
    } catch (err) {
      toast.push(err.message || "Error al actualizar perfil", "error");
    } finally { setBusy(false); }
  }

  return (
    <Card eyebrow="Tu cuenta" title="Editar perfil">
      <div className="max-w-md space-y-4">
        {/* Email (read-only) */}
        <div className="rounded-xl p-3.5 flex items-center gap-3" style={{background:"var(--paper-3)"}}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{background:"var(--ink)", color:"white"}}>
            {(user.nombre || user.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-[14px] truncate">{user.email}</div>
            <div className="mono text-[10px] uppercase tracking-wider mt-0.5" style={{color:"var(--muted)"}}>
              correo · no se puede modificar
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="Nombre completo" required>
            <TextInput required value={f.nombre} onChange={e => setF({...f, nombre:e.target.value})} placeholder="Tu nombre completo"/>
          </Field>
          <Field label="Organización · opcional">
            <TextInput value={f.organizacion} onChange={e => setF({...f, organizacion:e.target.value})} placeholder="Institución u organización"/>
          </Field>
          <Field label="Municipio de referencia">
            <Typeahead value={f.municipio}
              onChange={t => setF({...f, municipio:t})}
              onSelect={s => setF({...f, municipio:s.m})}
              getSuggestions={q => window.GPDivipola.search(q, 6)}
              placeholder="Escribe el municipio…"/>
          </Field>
          <div className="flex justify-end pt-1">
            <Button type="submit" loading={busy}>{busy ? "Guardando…" : "Guardar cambios"}</Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

window.GPReporter = ReporterDashboard;
window.GPReporterFlow = ReportingFlow;
