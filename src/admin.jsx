/* GEOPOTAMO · Dashboard HIPOADMIN */
const { useState, useEffect, useMemo } = React;

/* ═══════════════ helper ═══════════════ */
function userName(users, id) {
  const u = users.find(u => u.id === id);
  return u ? (u.nombre || u.email) : "—";
}

/* ═══════════════════════════════════════════════════
   AdminDashboard
═══════════════════════════════════════════════════ */
function AdminDashboard({ user, onSignOut }) {
  const {
    TopBar, PageHero, Tabs, Stat, Card, Button,
    Field, TextInput, Select, Modal, Chip,
    ValidationStatus, CuentaStatus, SeverityIndicator,
    useToast, Badge, Spinner, EmptyState, Toggle,
  } = window.GPUI;
  const { FiltersBar, AreaSelector, MapExplorer, ReportsList, ReportsTable, AnalyticsGrid, filter, buildAreaPolygon } = window.GPShared;
  const { ReportsMap } = window.GPMaps;
  const { ProjectionPanel } = window.GPProjection;
  const { UsersBar } = window.GPCharts;
  const toast = useToast();

  const [tab, setTab] = useState("mapa");
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [audit, setAudit] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);

  /* Modals */
  const [editing, setEditing] = useState(null);
  const [editLocId, setEditLocId] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRange, setBulkRange] = useState({ from:"", to:"" });
  const [validating, setValidating] = useState(null);
  const [validationNote, setValidationNote] = useState("");
  const [validationDecision, setValidationDecision] = useState("validado");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [pwUser, setPwUser] = useState(null);
  const [toggleUser, setToggleUser] = useState(null);
  const [archivingReport, setArchivingReport] = useState(null);
  const [area, setArea] = useState({ kind:"none" });
  const [areaPolygon, setAreaPolygon] = useState(null);
  const [visorMode, setVisorMode] = useState("map");   // map | analitica | proyeccion
  const [gestionMode, setGestionMode] = useState("reportes"); // reportes | validacion

  async function refresh() {
    const [rs, us, ac, au] = await Promise.all([
      window.GP.listReports({ includeUnvalidated:true }),
      window.GP.listUsers(),
      window.GP.userActivity(),
      window.GP.listAudit({ limit:60 }),
    ]);
    setReports(rs); setUsers(us); setActivity(ac); setAudit(au);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);
  useEffect(() => { buildAreaPolygon(area).then(setAreaPolygon); }, [area?.kind, area?.name]);

  const filtered         = useMemo(() => filter(reports, filters, area, null), [reports, filters, area]);
  const filteredValidated = useMemo(() => filtered.filter(r => r.estado_validacion === "validado"), [filtered]);
  const pendingUsers = useMemo(() => users.filter(u => u.estado_cuenta === "pendiente"), [users]);
  const pendingReps  = useMemo(() => reports.filter(r => r.estado_validacion === "pendiente"), [reports]);
  const allDepartments = useMemo(() => (window.GPDivipola && window.GPDivipola.allDepartments()) || [], []);
  const municipios = useMemo(() => Array.from(new Set(reports.map(r => r.municipio).filter(Boolean))).sort(), [reports]);

  const totalPending = pendingReps.length + pendingUsers.length;

  /* ═══ Acciones ═══ */
  async function approveUser(u, ok) {
    try { await window.GP.approveUser(u.id, ok); toast.push(`Cuenta ${u.email} → ${ok ? "aprobada" : "rechazada"}`, "success"); await refresh(); }
    catch(e) { toast.push(e.message, "error"); }
  }
  async function saveEditUser(patch) {
    try { await window.GP.updateUser(editingUser.id, patch); toast.push("Usuario actualizado", "success"); setEditingUser(null); await refresh(); }
    catch(e) { toast.push(e.message, "error"); }
  }
  async function savePassword(newPassword) {
    try { await window.GP.changeUserPassword(pwUser.id, newPassword); toast.push(`Contraseña actualizada para ${pwUser.email}`, "success"); setPwUser(null); }
    catch(e) { toast.push(e.message, "error"); }
  }
  async function confirmToggleActive() {
    if (!toggleUser) return;
    const { user:u, willActivate } = toggleUser;
    try { await window.GP.setUserActive(u.id, willActivate); toast.push(`Cuenta ${willActivate ? "activada" : "desactivada"}`, "success"); setToggleUser(null); await refresh(); }
    catch(e) { toast.push(e.message, "error"); }
  }
  async function validateReport(decision) {
    if (!validating) return;
    if (decision === "rechazado" && !validationNote.trim()) {
      toast.push("La nota del validador es obligatoria al rechazar un reporte.", "warning");
      return;
    }
    try {
      await window.GP.validateReport(validating.id, decision, validationNote||null);
      toast.push(`Reporte ${validating.codigo} → ${decision}`, "success");
      setValidating(null); setValidationNote(""); setValidationDecision("validado");
      await refresh();
    } catch(e) { toast.push(e.message, "error"); }
  }
  async function confirmArchiveReport() {
    if (!archivingReport) return;
    try {
      await window.GP.archiveReport(archivingReport.id);
      toast.push("Reporte archivado · los datos se conservan en el sistema", "success");
      setArchivingReport(null);
      await refresh();
    } catch(e) { toast.push(e.message, "error"); }
  }
  async function saveEdit(patch) {
    try { await window.GP.updateReport(editing.id, patch); toast.push("Cambios guardados", "success"); setEditing(null); await refresh(); }
    catch(e) { toast.push(e.message, "error"); }
  }
  async function moveLocation(id, lat, lng) {
    await window.GP.updateReport(id, { lat, lng });
    toast.push("Ubicación actualizada", "success");
    await refresh();
  }
  async function runBulkArchive() {
    if (!bulkRange.from || !bulkRange.to) { toast.push("Define rango de fechas", "error"); return; }
    const fromISO = new Date(bulkRange.from).toISOString();
    const toISO   = new Date(bulkRange.to + "T23:59:59").toISOString();
    const candidates = reports.filter(r => r.created_at >= fromISO && r.created_at <= toISO && !r.archivado);
    if (!candidates.length) { toast.push("Sin reportes activos en el rango", "error"); return; }
    await window.GP.bulkArchiveByDateRange(fromISO, toISO);
    toast.push(`${candidates.length} reportes archivados · los datos se conservan`, "success");
    setBulkOpen(false); await refresh();
  }

  const stats = useMemo(() => ({
    total: reports.length,
    pendientes: pendingReps.length,
    cuentasPend: pendingUsers.length,
    usuarios: users.length,
  }), [reports, pendingReps, pendingUsers, users]);

  const TABS = [
    { id:"mapa",     label:"Geovisor" },
    { id:"reportar", label:"Reportar" },
    { id:"gestion",  label:"Gestión de Reportes", badge: pendingReps.length,  badgeWarn: pendingReps.length > 0 },
    { id:"usuarios", label:"Gestión de Usuarios",  badge: pendingUsers.length, badgeWarn: pendingUsers.length > 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        user={user}
        onSignOut={onSignOut}
        leftChip={<Chip kind="fill">HIPOADMIN</Chip>}
        pendingCount={totalPending}
        onHome={() => { setTab("mapa"); setVisorMode("map"); }}
      />

      <main className="flex-1 px-4 md:px-8 pt-5 pb-10 max-w-[1600px] mx-auto w-full">

        <PageHero
          eyebrow="Consola de administración"
          title="Control, validación & gobierno de datos"
          subtitle="Gestiona usuarios y reportes de la red colaborativa. Los reportes pendientes aparecen en el geovisor con borde punteado y signo «?»; al validarse pasan a vista plena."
          action={<Tabs tabs={TABS} active={tab} onChange={setTab}/>}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
          <Stat label="Total reportes" value={stats.total} tiny loading={loading}/>
          <Stat
            label="Pendientes validación"
            value={stats.pendientes}
            pct={stats.total > 0 && stats.pendientes > 0 ? Math.round(stats.pendientes / stats.total * 100) : null}
            accent="var(--ochre)" tiny loading={loading}
          />
          <Stat
            label="Cuentas por aprobar"
            value={stats.cuentasPend}
            pct={stats.usuarios > 0 && stats.cuentasPend > 0 ? Math.round(stats.cuentasPend / stats.usuarios * 100) : null}
            accent="var(--ochre)" tiny loading={loading}
          />
          <Stat label="Usuarios registrados" value={stats.usuarios} tiny loading={loading}/>
        </div>

        {/* ─── TABS CONTENT ─── */}

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
                <FiltersBar filters={filters} setFilters={setFilters} showEstadoFilter allDepartments={allDepartments} municipios={municipios}/>
                <AreaSelector value={area} onChange={setArea} allDepartments={allDepartments}/>
                <MapExplorer reports={filtered} area={area} areaPolygon={areaPolygon} defaultMode="cluster"/>
                <Card eyebrow={"Listado · " + filtered.length} title="Reportes visibles">
                  <ReportsList reports={filtered} max={36} showStatus/>
                </Card>
              </>
            )}
            {visorMode === "analitica" && (
              <>
                <FiltersBar filters={filters} setFilters={setFilters} showEstadoFilter allDepartments={allDepartments} municipios={municipios}/>
                <AreaSelector value={area} onChange={setArea} allDepartments={allDepartments}/>
                <AnalyticsGrid reports={filteredValidated}/>
                <Card eyebrow="Aportes" title="Usuarios más activos">
                  <UsersBar activity={activity.filter(a => a.total > 0)} height={280}/>
                </Card>
              </>
            )}
            {visorMode === "proyeccion" && <ProjectionPanel reports={reports}/>}
          </div>
        )}

        {tab === "reportar" && (
          <div className="space-y-3">
            <div className="rounded-xl p-3.5 flex items-start gap-2.5" style={{background:"rgba(212,160,48,.1)",border:"1px solid rgba(212,160,48,.25)"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ochre)" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p className="text-[13px] leading-snug" style={{color:"var(--ink-2)"}}>
                Puedes registrar reportes como cualquier usuario, pero <b>otro administrador</b> deberá validarlos — el sistema impide la autovalidación.
              </p>
            </div>
            <window.GPReporterFlow onCreated={refresh}/>
          </div>
        )}

        {tab === "gestion" && (
          <div className="space-y-4">
            {/* Sub-nav Gestión de Reportes */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[["reportes","Reportes"],["validacion","Validación"]].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setGestionMode(v)}
                  style={gestionMode === v
                    ? {background:"rgba(255,255,255,.18)", color:"white", border:"1px solid rgba(255,255,255,.28)", fontWeight:600}
                    : {background:"transparent", color:"var(--ink-3)", border:"1px solid rgba(255,255,255,.12)"}}
                  className="btn btn-sm mono uppercase tracking-wider !text-[10px] inline-flex items-center gap-1.5">
                  {l}
                  {v === "validacion" && pendingReps.length > 0 && (
                    <span className={cn("tab-badge", gestionMode !== v && "tab-badge-warn")}>{pendingReps.length}</span>
                  )}
                </button>
              ))}
            </div>
            {gestionMode === "reportes" && (
              <GestionTab
                currentUserId={user.id}
                reports={filtered} filters={filters} setFilters={setFilters}
                allDepartments={allDepartments} municipios={municipios}
                editLocId={editLocId}
                startEditLocation={r => setEditLocId(r.id)}
                stopEditLocation={() => setEditLocId(null)}
                moveLocation={moveLocation}
                startEdit={r => setEditing(r)}
                archiveReport={r => setArchivingReport(r)}
                openBulk={() => setBulkOpen(true)}
                startValidate={(r, decision) => { setValidating(r); setValidationDecision(decision); }}
              />
            )}
            {gestionMode === "validacion" && (
              <ValidationTab
                currentUserId={user.id}
                reports={reports}
                onValidate={(r, decision) => { setValidating(r); setValidationDecision(decision); }}
                users={users}
              />
            )}
          </div>
        )}

        {tab === "usuarios" && (
          <UsersTab
            users={users} activity={activity} currentUserId={user.id}
            onApprove={approveUser}
            onCreateUser={() => setCreateUserOpen(true)}
            onEdit={u => setEditingUser(u)}
            onToggleActive={u => setToggleUser({ user:u, willActivate: u.activo === false })}
            onRefresh={refresh}
          />
        )}

      </main>

      {/* ═══════════ MODALES ═══════════ */}

      {/* Validation */}
      <Modal open={!!validating} onClose={() => { setValidating(null); setValidationNote(""); }}
        eyebrow="Decisión de validación"
        title={validating ? `Reporte ${validating.codigo}` : ""}
        maxW="max-w-xl">
        {validating && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{background:"rgba(255,255,255,.06)", borderRadius:"0.75rem"}}>
              <div className="mono uppercase tracking-wider text-[10px] mb-2.5" style={{color:"var(--muted)"}}>Resumen del reporte</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <div><span style={{color:"var(--muted)"}}>Tipo</span><br/><b>{window.GP.tipoLabel(validating.tipo)}</b></div>
                <div><span style={{color:"var(--muted)"}}>Severidad</span><br/><window.GPUI.SeverityIndicator value={validating.severidad}/></div>
                <div><span style={{color:"var(--muted)"}}>Ubicación</span><br/><b>{validating.municipio}</b>{validating.departamento && <span style={{color:"var(--muted)"}}>, {validating.departamento}</span>}</div>
                <div><span style={{color:"var(--muted)"}}>Reportero</span><br/><b>{userName(users, validating.user_id)}</b></div>
              </div>
              {validating.descripcion && <p className="mt-3 text-[13px] leading-relaxed border-t border-line pt-3">{validating.descripcion}</p>}
            </div>

            {validating.user_id === user.id && (
              <div className="rounded-xl p-3.5 flex items-start gap-2.5" style={{background:"rgba(212,160,48,.1)",border:"1px solid rgba(212,160,48,.25)"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ochre)" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
                <p className="text-[13px]" style={{color:"var(--ochre)"}}>Este reporte es tuyo. La política impide la autovalidación; otro administrador debe revisarlo.</p>
              </div>
            )}

            <window.GPUI.Field label="Decisión">
              <div className="flex gap-2">
                {[
                  { id:"validado",  label:"Validado",  bg:"#1f5d4c", border:"#2a7a64" },
                  { id:"rechazado", label:"Rechazado", bg:"#7a2218", border:"#a83020" },
                  { id:"pendiente", label:"Pendiente", bg:"#7a5c1a", border:"#b9701a" },
                ].map(d => {
                  const active = validationDecision === d.id;
                  return (
                    <button key={d.id} type="button" onClick={() => setValidationDecision(d.id)}
                      className="mono text-[10px] uppercase tracking-wider px-3 py-2 rounded-full border transition flex-1 font-semibold"
                      style={active
                        ? { background: d.bg, borderColor: d.border, color: "#fff" }
                        : { background: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "var(--ink-3)" }}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </window.GPUI.Field>

            <window.GPUI.Field
              label={validationDecision === "rechazado" ? "Nota del validador (requerida al rechazar)" : "Nota del validador · opcional"}
              error={validationDecision === "rechazado" && !validationNote.trim() ? "Obligatoria cuando la decisión es rechazar" : null}>
              <window.GPUI.TextInput placeholder="ej. evidencia insuficiente, coordenadas fuera del rango esperado"
                value={validationNote} onChange={e => setValidationNote(e.target.value)}/>
            </window.GPUI.Field>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => { setValidating(null); setValidationNote(""); }}>Cancelar</Button>
              <Button variant="primary" disabled={validating.user_id === user.id}
                onClick={() => validateReport(validationDecision)}>
                Guardar decisión
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit report */}
      <Modal open={!!editing} onClose={() => setEditing(null)}
        title={editing ? `Editar ${editing.codigo}` : ""} maxW="max-w-xl">
        {editing && <EditForm record={editing} onCancel={() => setEditing(null)} onSave={saveEdit}/>}
      </Modal>

      {/* Bulk archive */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Archivar reportes por rango de fechas" maxW="max-w-md">
        <div className="space-y-4">
          <div className="rounded-xl p-3.5 flex items-start gap-2.5" style={{background:"rgba(42,157,100,.1)",border:"1px solid rgba(42,157,100,.25)"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--moss)" strokeWidth="2" strokeLinecap="round" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-[13px] leading-snug" style={{color:"var(--moss-deep)"}}>
              Los reportes archivados <b>no se eliminan físicamente</b>. El sistema conserva toda la trazabilidad y los datos pueden consultarse si es necesario.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <window.GPUI.Field label="Desde">
              <window.GPUI.TextInput type="date" value={bulkRange.from} onChange={e => setBulkRange({...bulkRange,from:e.target.value})}/>
            </window.GPUI.Field>
            <window.GPUI.Field label="Hasta">
              <window.GPUI.TextInput type="date" value={bulkRange.to} onChange={e => setBulkRange({...bulkRange,to:e.target.value})}/>
            </window.GPUI.Field>
          </div>
          {bulkRange.from && bulkRange.to && (() => {
            const fromISO = new Date(bulkRange.from).toISOString();
            const toISO   = new Date(bulkRange.to + "T23:59:59").toISOString();
            const n = reports.filter(r => r.created_at >= fromISO && r.created_at <= toISO && !r.archivado).length;
            return (
              <div className="rounded-xl p-3.5" style={{background:"rgba(255,255,255,.06)", borderRadius:"0.75rem"}}>
                <div className="mono uppercase tracking-wider text-[10px] mb-1" style={{color:"var(--muted)"}}>Se archivarán</div>
                <div className="text-2xl font-semibold">{n} reporte{n===1?"":"s"}</div>
                {n === 0 && <div className="text-[12px] mt-1" style={{color:"var(--muted)"}}>Sin reportes activos en el rango.</div>}
              </div>
            );
          })()}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={runBulkArchive}>Archivar rango</Button>
          </div>
        </div>
      </Modal>

      {/* Archive single */}
      <Modal open={!!archivingReport} onClose={() => setArchivingReport(null)}
        eyebrow="Confirmar archivo"
        title={archivingReport ? archivingReport.codigo : ""}
        maxW="max-w-md">
        {archivingReport && (
          <div className="space-y-4">
            <div className="rounded-xl p-3.5" style={{background:"rgba(255,255,255,.06)", borderRadius:"0.75rem"}}>
              <div className="font-medium">{window.GP.tipoLabel(archivingReport.tipo)}</div>
              <div className="text-[13px] mt-0.5" style={{color:"var(--muted)"}}>
                {archivingReport.municipio}{archivingReport.departamento ? " · " + archivingReport.departamento : ""}
              </div>
              <div className="mono text-[11px] mt-1" style={{color:"var(--muted)"}}>{window.GP.fmtDate(archivingReport.created_at)}</div>
            </div>
            <div className="rounded-xl p-3.5 flex items-start gap-2.5" style={{background:"rgba(42,157,100,.1)",border:"1px solid rgba(42,157,100,.25)"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--moss)" strokeWidth="2" strokeLinecap="round" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-[13px] leading-snug" style={{color:"var(--moss-deep)"}}>
                El reporte quedará <b>archivado</b> y desaparecerá de las vistas activas, pero sus datos se conservarán indefinidamente en el sistema.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setArchivingReport(null)}>Cancelar</Button>
              <Button variant="danger" onClick={confirmArchiveReport}>Archivar reporte</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create user */}
      <Modal open={createUserOpen} onClose={() => setCreateUserOpen(false)} title="Crear cuenta nueva" maxW="max-w-lg">
        <CreateUserForm onCancel={() => setCreateUserOpen(false)}
          onCreated={async () => { setCreateUserOpen(false); await refresh(); toast.push("Cuenta creada", "success"); }}/>
      </Modal>

      {/* Edit user */}
      <Modal open={!!editingUser} onClose={() => setEditingUser(null)}
        eyebrow="Edición de usuario"
        title={editingUser ? editingUser.nombre : ""}
        maxW="max-w-xl">
        {editingUser &&
          <EditUserForm record={editingUser} currentUserId={user.id}
            onCancel={() => setEditingUser(null)} onSave={saveEditUser}/>
        }
      </Modal>

      {/* Change password */}
      <Modal open={!!pwUser} onClose={() => setPwUser(null)}
        eyebrow="Cambiar contraseña"
        title={pwUser ? pwUser.nombre : ""}
        maxW="max-w-md">
        {pwUser && <ChangePasswordForm onCancel={() => setPwUser(null)} onSave={savePassword}/>}
      </Modal>

      {/* Toggle active */}
      <Modal open={!!toggleUser} onClose={() => setToggleUser(null)}
        eyebrow={toggleUser?.willActivate ? "Activar cuenta" : "Desactivar cuenta"}
        title={toggleUser ? toggleUser.user.nombre : ""}
        maxW="max-w-md">
        {toggleUser && (
          <div className="space-y-4">
            <div className="rounded-xl p-3.5" style={{background:"rgba(255,255,255,.06)", borderRadius:"0.75rem"}}>
              <div className="font-medium">{toggleUser.user.email}</div>
              <div className="text-[12px] mt-0.5" style={{color:"var(--muted)"}}>
                {toggleUser.user.rol === "admin" ? "HIPOADMIN" : "HIPOREPORTER"}
                {toggleUser.user.organizacion ? " · " + toggleUser.user.organizacion : ""}
              </div>
            </div>
            <p className="text-[13px] leading-relaxed" style={{color:"var(--muted)"}}>
              {toggleUser.willActivate
                ? "Al activar esta cuenta, el usuario podrá iniciar sesión y operar según su rol."
                : "Al desactivar esta cuenta, el usuario no podrá iniciar sesión hasta que un administrador la reactive. Sus reportes existentes permanecen en el sistema."}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setToggleUser(null)}>Cancelar</Button>
              <Button variant={toggleUser.willActivate ? "primary" : "danger"} onClick={confirmToggleActive}>
                {toggleUser.willActivate ? "Activar cuenta" : "Desactivar cuenta"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* cn helper — re-export local */
function cn(...xs) { return xs.filter(Boolean).join(" "); }

/* ═══════════════════════════════════════════════════
   ValidationTab
═══════════════════════════════════════════════════ */
function ValidationTab({ reports, onValidate, users, currentUserId }) {
  const { Card, ValidationStatus, SeverityIndicator, EmptyState } = window.GPUI;
  const [filterMode, setFilterMode] = useState("pendiente");

  const list = useMemo(() => {
    let arr = reports;
    if (filterMode === "pendiente") arr = arr.filter(r => r.estado_validacion === "pendiente");
    if (filterMode === "mios")      arr = arr.filter(r => r.user_id === currentUserId);
    return arr.slice(0, 80);
  }, [reports, filterMode, currentUserId]);

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {[["pendiente","Solo pendientes"], ["mios","Mis reportes"], ["todos","Todos"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilterMode(k)}
              className={cn("btn btn-sm mono uppercase tracking-wider !text-[10px]",
                filterMode === k ? "btn-ink" : "btn-outline")}>
              {l}
            </button>
          ))}
        </div>
        <span className="mono text-[11px]" style={{color:"var(--muted)"}}>{list.length} reporte{list.length !== 1 ? "s" : ""}</span>
      </div>

      <Card padded={false}>
        {list.length === 0
          ? <EmptyState icon="·" title="Sin reportes pendientes" subtitle="Todos los reportes han sido revisados."/>
          : <div className="overflow-x-auto">
              <table className="gp-table" style={{minWidth:"680px"}}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Tipo</th>
                    <th>Sev.</th>
                    <th>Ubicación</th>
                    <th>Reportero</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th style={{textAlign:"right"}}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(r => {
                    const isMine = r.user_id === currentUserId;
                    return (
                      <tr key={r.id} style={{opacity: isMine && r.estado_validacion==="pendiente" ? 0.7 : 1}}>
                        <td><span className="mono text-[11px]">{r.codigo}</span></td>
                        <td className="text-[13px]">{window.GP.tipoLabel(r.tipo)}</td>
                        <td><SeverityIndicator value={r.severidad}/></td>
                        <td>
                          <div className="text-[13px] font-medium">{r.municipio}</div>
                          <div className="text-[11px]" style={{color:"var(--muted)"}}>{r.departamento}</div>
                        </td>
                        <td>
                          <div className="text-[13px]">{userName(users, r.user_id)}</div>
                          {isMine && <span className="chip !text-[9px] !py-0.5">tuyo</span>}
                        </td>
                        <td><ValidationStatus value={r.estado_validacion}/></td>
                        <td><span className="mono text-[11px]" style={{color:"var(--muted)"}}>{window.GP.fmtDate(r.created_at)}</span></td>
                        <td style={{textAlign:"right"}}>
                          {isMine
                            ? <span className="mono text-[10px] uppercase tracking-wider" style={{color:"var(--muted)"}}>otro admin</span>
                            : <div className="inline-flex gap-1.5">
                                <button onClick={() => onValidate(r, "validado")}
                                  className="btn btn-sm !bg-[var(--moss)] !text-white mono uppercase tracking-wider !text-[10px]">
                                  ✓ Validar
                                </button>
                                <button onClick={() => onValidate(r, "rechazado")}
                                  className="btn btn-sm btn-outline mono uppercase tracking-wider !text-[10px]">
                                  × Rechazar
                                </button>
                              </div>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   UsersTab
═══════════════════════════════════════════════════ */
function UsersTab({ users, activity, onApprove, onCreateUser, currentUserId, onEdit, onChangePassword, onToggleActive, onRefresh }) {
  const { Card, Button, CuentaStatus, Chip, EmptyState } = window.GPUI;
  const pendientes = users.filter(u => u.estado_cuenta === "pendiente");

  return (
    <div className="space-y-5">
      {/* Pending accounts */}
      {pendientes.length > 0 && (
        <Card eyebrow={pendientes.length + " pendiente(s)"} title="Solicitudes de cuenta nuevas"
          action={<span className="badge badge-warn">{pendientes.length}</span>}>
          <div className="space-y-2">
            {pendientes.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-3 flex-wrap rounded-xl p-3.5"
                style={{background:"rgba(185,112,26,.06)",border:"1px solid rgba(185,112,26,.15)"}}>
                <div>
                  <div className="font-semibold text-[14px]">{u.nombre}</div>
                  <div className="text-[12px] mt-0.5" style={{color:"var(--muted)"}}>
                    {u.email} · {u.organizacion||"sin org."} · {u.municipio||"—"}
                    <span className="mono ml-2" style={{opacity:.7}}>{window.GP.fmtDate(u.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => onApprove(u, true)}>✓ Aprobar</Button>
                  <Button size="sm" variant="outline" onClick={() => onApprove(u, false)}>Rechazar</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Directory */}
      <Card
        eyebrow={`Directorio · ${users.length} usuario${users.length!==1?"s":""}`}
        title="Gestión de cuentas"
        action={
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} title="Actualizar lista"
              className="btn btn-sm btn-outline mono uppercase tracking-wider !text-[10px] flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Actualizar
            </button>
            <Button size="sm" variant="ink" onClick={onCreateUser}>+ Crear cuenta</Button>
          </div>
        }>
        <div className="overflow-x-auto -mx-1">
          <table className="gp-table" style={{minWidth:"820px"}}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Organización</th>
                <th>Rol</th>
                <th>Cuenta</th>
                <th>Estado</th>
                <th>Reportes (total · val · pend · rech)</th>
                <th style={{textAlign:"right"}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const a = activity.find(x => x.id === u.id) || { total:0, validados:0, pendientes:0, ultimo:null };
                const rechazados = (a.total || 0) - (a.validados || 0) - (a.pendientes || 0);
                const isInactive = u.activo === false;
                return (
                  <tr key={u.id} style={{opacity: isInactive ? .55 : 1}}>
                    <td>
                      <div className="font-medium text-[13px]">
                        {u.nombre}
                        {u.id === currentUserId && <span className="chip ml-1.5 !text-[9px]">tú</span>}
                      </div>
                      {u.organizacion && <div className="text-[11px]" style={{color:"var(--muted)"}}>{u.organizacion}</div>}
                    </td>
                    <td><span className="mono text-[11px]" style={{color:"var(--muted)"}}>{u.email}</span></td>
                    <td className="text-[13px]">{u.organizacion || <span style={{color:"var(--muted)"}}>No registrado</span>}</td>
                    <td>
                      <span className="mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
                        style={{background: u.rol==="admin" ? "rgba(13,23,20,.1)" : "rgba(31,93,76,.1)", color: u.rol==="admin" ? "var(--ink)" : "var(--moss)"}}>
                        {u.rol === "admin" ? "ADMIN" : "REPORTER"}
                      </span>
                    </td>
                    <td><CuentaStatus value={u.estado_cuenta}/></td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-[12px]">
                        <span className={cn("dot", isInactive ? "dot-err" : "dot-ok")}/>
                        {isInactive ? "Inactivo" : "Activo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="mono text-[12px] font-semibold">{a.total}</span>
                        {a.total > 0 && <>
                          <span className="mono text-[10px]" style={{color:"var(--moss)"}}>{a.validados}v</span>
                          {a.pendientes > 0 && <span className="mono text-[10px]" style={{color:"var(--ochre)"}}>{a.pendientes}p</span>}
                          {rechazados > 0 && <span className="mono text-[10px]" style={{color:"var(--clay)"}}>{rechazados}r</span>}
                        </>}
                      </div>
                      {a.ultimo && <div className="mono text-[10px] mt-0.5" style={{color:"var(--muted)"}}>{window.GP.fmtDate(a.ultimo)}</div>}
                    </td>
                    <td style={{textAlign:"right"}}>
                      <div className="inline-flex gap-1.5 flex-wrap justify-end">
                        <button onClick={() => onEdit(u)}
                          className="btn btn-xs btn-ink mono uppercase tracking-wider !text-[10px]">
                          Editar
                        </button>
                        <button onClick={() => onToggleActive(u)}
                          disabled={u.id === currentUserId}
                          className={cn("btn btn-xs mono uppercase tracking-wider !text-[10px]",
                            u.id === currentUserId ? "btn-outline opacity-40 cursor-not-allowed"
                              : isInactive ? "btn-primary"
                              : "btn-danger")}>
                          {isInactive ? "Activar" : "Desactivar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   GestionTab
═══════════════════════════════════════════════════ */
function GestionTab({ currentUserId, reports, filters, setFilters, allDepartments, municipios, editLocId, startEditLocation, stopEditLocation, moveLocation, startEdit, archiveReport, openBulk, startValidate }) {
  const { Card, Button } = window.GPUI;
  const { ReportsMap } = window.GPMaps;
  const { ReportsTable } = window.GPShared;

  return (
    <div className="space-y-5">
      <window.GPShared.FiltersBar filters={filters} setFilters={setFilters} showEstadoFilter allDepartments={allDepartments} municipios={municipios}/>

      <Card eyebrow="Edición espacial"
        title={editLocId ? "Arrastra el marcador negro para reubicar" : "Selecciona un reporte para reubicar"}
        action={editLocId
          ? <Button size="sm" variant="outline" onClick={stopEditLocation}>✓ Terminar edición</Button>
          : null}>
        <ReportsMap reports={reports} mode="thematic" height={420} editId={editLocId} onMove={moveLocation}/>
      </Card>

      <Card eyebrow="Bandeja de reportes" title="Gestión individual y masiva"
        action={
          <div className="flex items-center gap-2.5">
            <span className="mono text-[10px] uppercase tracking-wider" style={{color:"var(--muted)"}}>{reports.length} resultados</span>
            <Button size="sm" variant="danger" onClick={openBulk}>Archivar por rango</Button>
          </div>
        }>
        <ReportsTable
          reports={reports} max={80}
          showActions
          currentUserId={currentUserId}
          onAction={r => {
            const isMine = r.user_id === currentUserId;
            return (
              <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                {r.estado_validacion === "pendiente" && !isMine && (
                  <button onClick={() => startValidate(r, "validado")}
                    className="btn btn-xs !bg-[var(--moss)] !text-white mono uppercase tracking-wider !text-[10px]">
                    Validar
                  </button>
                )}
                <button onClick={() => startEditLocation(r)}
                  className="btn btn-xs btn-outline mono uppercase tracking-wider !text-[10px]">
                  Ubicar
                </button>
                <button onClick={() => startEdit(r)}
                  className="btn btn-xs btn-ink mono uppercase tracking-wider !text-[10px]">
                  Editar
                </button>
                <button onClick={() => archiveReport(r)}
                  className="btn btn-xs btn-danger mono uppercase tracking-wider !text-[10px]">
                  Archivar
                </button>
              </div>
            );
          }}
        />
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   AuditTab — timeline
═══════════════════════════════════════════════════ */
function AuditTab({ audit, users }) {
  const { Card, EmptyState } = window.GPUI;
  const labels = {
    signin:"Inicio de sesión", signout:"Cierre de sesión",
    signup_request:"Solicitud de registro",
    create_report:"Reporte creado", update_report:"Reporte actualizado",
    archive_report:"Reporte archivado", bulk_archive:"Archivado masivo",
    approve_user:"Cuenta aprobada", reject_user:"Cuenta rechazada",
    create_user:"Usuario creado", update_user:"Usuario actualizado",
    change_password:"Contraseña cambiada",
  };
  const icons = {
    signin:        "→",
    signout:       "←",
    create_report: "+",
    update_report: "~",
    archive_report:"○",
    bulk_archive:  "◎",
    approve_user:  "✓",
    reject_user:   "×",
    create_user:   "+",
    update_user:   "~",
    change_password:"*",
    signup_request: "?",
  };
  const colors = {
    archive_report:"var(--clay)", bulk_archive:"var(--clay)", reject_user:"var(--clay)",
    approve_user:"var(--moss)", create_report:"var(--moss)", create_user:"var(--moss)",
    signin:"var(--river)", signout:"var(--muted)", default:"var(--ink)",
  };

  return (
    <Card eyebrow="Auditoría" title="Bitácora de acciones">
      {audit.length === 0
        ? <EmptyState icon="—" title="Sin actividad registrada" subtitle="Las acciones del sistema aparecerán aquí."/>
        : <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-[1px]" style={{background:"var(--line)"}}/>
            <ul className="space-y-0">
              {audit.map(a => {
                const color = colors[a.action] || colors.default;
                return (
                  <li key={a.id} className="flex gap-4 py-2.5 relative">
                    {/* Dot */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] flex-shrink-0 relative z-10"
                      style={{background:"white",border:"1.5px solid var(--line)",color}}>
                      {icons[a.action]||"·"}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1.5">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="text-[13px] font-medium">{labels[a.action]||a.action}</span>
                        <span className="mono text-[10px] flex-shrink-0" style={{color:"var(--muted)"}}>{window.GP.fmtDateTime(a.ts)}</span>
                      </div>
                      <div className="text-[11px] mt-0.5" style={{color:"var(--muted)"}}>
                        {userName(users, a.actor_id)}
                        {a.target_id && <span className="mono ml-2 opacity-70">· {a.target_id.slice(0,10)}…</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
      }
    </Card>
  );
}

/* ═══════════════════════════════════════════════════
   EditForm
═══════════════════════════════════════════════════ */
function EditForm({ record, onCancel, onSave }) {
  const { Field, TextInput, TextArea, Select, Button } = window.GPUI;
  const { TIPOS, SEVERIDADES, ESTADOS_VAL } = window.GP.catalog;
  const [p, setP] = useState({
    tipo:record.tipo, severidad:record.severidad, estado_validacion:record.estado_validacion,
    n_individuos:record.n_individuos, descripcion:record.descripcion,
    municipio:record.municipio, departamento:record.departamento,
    lat:record.lat, lng:record.lng,
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo"><Select value={p.tipo} onChange={e => setP({...p,tipo:e.target.value})} options={TIPOS}/></Field>
        <Field label="Severidad">
          <Select value={p.severidad} onChange={e => setP({...p,severidad:Number(e.target.value)})}
            options={SEVERIDADES.map(s => ({id:s.id,label:`${s.id} · ${s.label}`}))}/>
        </Field>
        <Field label="Estado">
          <Select value={p.estado_validacion} onChange={e => setP({...p,estado_validacion:e.target.value})}
            options={ESTADOS_VAL.map(e => ({id:e,label:e}))}/>
        </Field>
        <Field label="N° individuos">
          <TextInput type="number" min="1" value={p.n_individuos} onChange={e => setP({...p,n_individuos:Number(e.target.value)})}/>
        </Field>
        <Field label="Latitud">
          <TextInput type="number" step="0.0001" value={p.lat} onChange={e => setP({...p,lat:Number(e.target.value)})}/>
        </Field>
        <Field label="Longitud">
          <TextInput type="number" step="0.0001" value={p.lng} onChange={e => setP({...p,lng:Number(e.target.value)})}/>
        </Field>
        <Field label="Municipio">
          <TextInput value={p.municipio} onChange={e => setP({...p,municipio:e.target.value})}/>
        </Field>
        <Field label="Departamento">
          <TextInput value={p.departamento||""} onChange={e => setP({...p,departamento:e.target.value})}/>
        </Field>
      </div>
      <Field label="Descripción">
        <TextArea rows="4" value={p.descripcion} onChange={e => setP({...p,descripcion:e.target.value})}/>
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(p)}>Guardar cambios</Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CreateUserForm
═══════════════════════════════════════════════════ */
function CreateUserForm({ onCancel, onCreated }) {
  const { Field, TextInput, Select, Button, useToast } = window.GPUI;
  const toast = useToast();
  const [f, setF] = useState({ email:"", password:"", nombre:"", organizacion:"", municipio:"", rol:"reporter" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { await window.GP.createUser(f); onCreated && onCreated(); }
    catch(err) { toast.push(err.message, "error"); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" required>
          <TextInput required value={f.nombre} onChange={e => setF({...f,nombre:e.target.value})}/>
        </Field>
        <Field label="Rol">
          <Select value={f.rol} onChange={e => setF({...f,rol:e.target.value})}
            options={[{id:"reporter",label:"HIPOREPORTER"},{id:"admin",label:"HIPOADMIN"}]}/>
        </Field>
        <Field label="Email" required>
          <TextInput required type="email" value={f.email} onChange={e => setF({...f,email:e.target.value})}/>
        </Field>
        <Field label="Contraseña inicial" required>
          <TextInput required type="text" value={f.password} onChange={e => setF({...f,password:e.target.value})}/>
        </Field>
        <Field label="Organización">
          <TextInput value={f.organizacion} onChange={e => setF({...f,organizacion:e.target.value})}/>
        </Field>
        <Field label="Municipio">
          <TextInput value={f.municipio} onChange={e => setF({...f,municipio:e.target.value})}/>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={busy}>{busy ? "Creando…" : "Crear cuenta aprobada"}</Button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════
   EditUserForm
═══════════════════════════════════════════════════ */
function EditUserForm({ record, currentUserId, onCancel, onSave }) {
  const { Field, TextInput, Select, Button, Toggle } = window.GPUI;
  const [p, setP] = useState({
    organizacion: record.organizacion || "",
    rol:          record.rol,
    estado_cuenta: record.estado_cuenta,
    activo:       record.activo !== false,
  });
  const isSelf = record.id === currentUserId;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(p); }} className="space-y-3">

      {/* Info de solo lectura */}
      <div className="rounded-xl p-3.5 space-y-1" style={{background:"rgba(255,255,255,.04)"}}>
        <div className="mono text-[9px] uppercase tracking-wider mb-2" style={{color:"var(--muted)"}}>Información del usuario</div>
        <div className="flex items-baseline gap-3">
          <span className="text-[13px] font-semibold" style={{color:"var(--ink)"}}>{record.nombre || "—"}</span>
          <span className="text-[12px]" style={{color:"var(--muted)"}}>{record.email}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Organización">
          <TextInput value={p.organizacion} onChange={e => setP({...p, organizacion: e.target.value})}
            placeholder="Ej. Univalle, MinAmbiente…"/>
        </Field>
        <Field label="Rol">
          <Select value={p.rol} onChange={e => setP({...p, rol: e.target.value})}
            options={[{id:"reporter",label:"HIPOREPORTER"},{id:"admin",label:"HIPOADMIN"}]}/>
        </Field>
        <Field label="Estado de cuenta">
          <Select value={p.estado_cuenta} onChange={e => setP({...p, estado_cuenta: e.target.value})}
            options={[{id:"pendiente",label:"Pendiente"},{id:"aprobado",label:"Aprobado"},{id:"rechazado",label:"Rechazado"}]}/>
        </Field>
      </div>

      <div className="rounded-xl p-3.5 flex items-center justify-between gap-4" style={{background:"rgba(255,255,255,.06)"}}>
        <div>
          <div className="text-[13px] font-medium" style={{color:"var(--ink)"}}>Cuenta activa</div>
          <div className="text-[11px] mt-0.5" style={{color:"var(--muted)"}}>
            Si está desactivada, el usuario no podrá iniciar sesión.
            {isSelf && <span className="block mt-0.5 text-amber-400">No puedes desactivarte a ti mismo.</span>}
          </div>
        </div>
        <Toggle checked={p.activo} onChange={v => setP({...p, activo: v})} disabled={isSelf}/>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Guardar cambios</Button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════
   ChangePasswordForm
═══════════════════════════════════════════════════ */
function ChangePasswordForm({ onCancel, onSave }) {
  const { Field, PasswordInput, Button, useToast } = window.GPUI;
  const toast = useToast();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  function submit(e) {
    e.preventDefault();
    if (p1.length < 4) { toast.push("Mínimo 8 caracteres", "error"); return; }
    if (p1 !== p2) { toast.push("Las contraseñas no coinciden", "error"); return; }
    onSave(p1);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Nueva contraseña" required>
        <PasswordInput required value={p1} onChange={e => setP1(e.target.value)} placeholder="••••••••"/>
      </Field>
      <Field label="Confirmar contraseña" required>
        <PasswordInput required value={p2} onChange={e => setP2(e.target.value)} placeholder="••••••••"/>
      </Field>
      <div className="text-[11px]" style={{color:"var(--muted)"}}>
        El usuario podrá usar esta contraseña en su próximo inicio de sesión.
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Actualizar contraseña</Button>
      </div>
    </form>
  );
}

window.GPAdmin = AdminDashboard;
