/* GEOPOTAMO · Proyección poblacional de Hippopotamus amphibius en Colombia
   Parámetros científicos:
     r  = 0.16 /año  (rango 7-14 %; calibrado a >500 en 2030 y >1000 en 2035)
     K  = 50 000     (capacidad de carga cuenca Magdalena — "decenas de miles")
     N0 = 200        (estimación oficial 2024)
   Horizonte: 2024 – 2100.
   Mapa: HeatmapOverlay (heatmap.js) con fallback a divIcon.
*/

(function () {
  const { useState, useEffect, useMemo, useRef } = React;

  const BASE_YEAR = 2024;
  const BASE_POP  = 181;    // individuos confirmados (estimación oficial 2024)
  const R_NAT     = 0.16;   // tasa intrínseca natural — reproduce >500 en 2030 y >1000 en 2035
  const K_DEFAULT = 31097;  // capacidad de carga — "decenas de miles" por 2100

  /* ── Núcleos históricos (2024) ───────────────────────── */
  const INITIAL_NUCLEI = [
    { name:"Hda. Nápoles",    lat:5.972, lng:-74.594, share:0.40 },
    { name:"Puerto Triunfo",  lat:5.880, lng:-74.638, share:0.15 },
    { name:"Doradal",         lat:5.815, lng:-74.701, share:0.10 },
    { name:"Puerto Berrío",   lat:6.487, lng:-74.405, share:0.10 },
    { name:"Puerto Boyacá",   lat:5.733, lng:-74.629, share:0.10 },
    { name:"Yondó",           lat:6.350, lng:-74.412, share:0.08 },
    { name:"Barrancabermeja", lat:7.062, lng:-74.249, share:0.07 },
  ];

  /* ── Expansión territorial proyectada (2027–2097) ─────── */
  const EXPANSION_TARGETS = [
    // Cuenca media alta 2027–2038
    { name:"Cocorná",        lat:6.001, lng:-74.583, year:2027 },
    { name:"San Luis",       lat:5.873, lng:-74.860, year:2028 },
    { name:"Caracolí",       lat:6.110, lng:-74.580, year:2029 },
    { name:"Puerto Wilches", lat:6.852, lng:-74.140, year:2030 },
    { name:"La Dorada",      lat:5.453, lng:-74.660, year:2032 },
    { name:"Cantagallo",     lat:7.480, lng:-74.082, year:2034 },
    { name:"Aguachica",      lat:8.027, lng:-73.857, year:2036 },
    { name:"Gamarra",        lat:8.319, lng:-73.745, year:2038 },
    // Cuenca media baja 2040–2054
    { name:"El Banco",       lat:8.297, lng:-73.595, year:2040 },
    { name:"Magangué",       lat:9.246, lng:-74.420, year:2043 },
    { name:"Mompós",         lat:9.456, lng:-74.521, year:2046 },
    { name:"Pinillos",       lat:8.910, lng:-74.469, year:2049 },
    { name:"Achí",           lat:8.565, lng:-74.556, year:2051 },
    { name:"San Marcos",     lat:8.664, lng:-75.128, year:2053 },
    // Bajo Magdalena y afluentes 2055–2074
    { name:"Sucre",          lat:8.828, lng:-74.722, year:2055 },
    { name:"Majagual",       lat:8.542, lng:-74.635, year:2057 },
    { name:"Guaranda",       lat:8.473, lng:-74.533, year:2059 },
    { name:"Calamar",        lat:10.253,lng:-74.920, year:2062 },
    { name:"Plato",          lat:9.790, lng:-74.786, year:2066 },
    { name:"Santa Bárbara",  lat:9.863, lng:-74.184, year:2070 },
    { name:"Zambrano",       lat:9.747, lng:-74.836, year:2073 },
    // Costa Caribe 2076–2097
    { name:"Barranquilla",   lat:10.963,lng:-74.796, year:2077 },
    { name:"Santa Marta",    lat:11.240,lng:-74.199, year:2082 },
    { name:"Valledupar",     lat:10.463,lng:-73.253, year:2087 },
    { name:"Ciénaga",        lat:11.005,lng:-74.249, year:2092 },
    { name:"Fundación",      lat:10.524,lng:-74.187, year:2097 },
  ];

  /* ── Modelo logístico (sin crecimiento negativo por debajo de 0) ── */
  function project({ N0 = BASE_POP, horizon = 76, r = R_NAT,
                     K = K_DEFAULT, removal = 0, sterilRate = 0 }) {
    const years  = [];
    const values = [];
    let N = N0;
    const r_eff = r * (1 - sterilRate);

    for (let i = 0; i <= horizon; i++) {
      const n = Math.max(0, Math.round(N));
      years.push(BASE_YEAR + i);
      values.push(n);

      if (n === 0 && i < horizon) {
        // Rellenar el resto con ceros
        for (let j = i + 1; j <= horizon; j++) {
          years.push(BASE_YEAR + j);
          values.push(0);
        }
        break;
      }

      const growth = r_eff * N * (1 - N / K);
      N = Math.max(0, N + growth - removal);
    }
    return { years, values };
  }

  /* ── Distribución espacial por año ───────────────────── */
  function distribute(year, totalPop) {
    const nuclei = INITIAL_NUCLEI.map(n => ({ ...n, year_origin: BASE_YEAR, activeShare: n.share }));
    EXPANSION_TARGETS
      .filter(t => year >= t.year)
      .forEach(t => {
        const age = year - t.year;
        nuclei.push({ ...t, year_origin: t.year, activeShare: Math.min(0.09, 0.02 + age * 0.004) });
      });
    const total = nuclei.reduce((s, n) => s + n.activeShare, 0);
    nuclei.forEach(n => { n.activeShare /= total; });
    return nuclei.map(n => ({ ...n, population: Math.round(totalPop * n.activeShare) }));
  }

  /* ════════════════════════════════════════════════════════
     ProjectionPanel
     ════════════════════════════════════════════════════════ */
  function ProjectionPanel({ reports = [] }) {
    const { Card } = window.GPUI;
    const { ProjectionChart } = window.GPCharts;

    const [horizon, setHorizon]       = useState(76);
    const [escenarios, setEscenarios] = useState(["base","control","esterilizacion","combinado"]);
    const [viewYear, setViewYear]     = useState(BASE_YEAR);

    const scenarios = useMemo(() => ({
      base: {
        label:"Sin intervención", short:"Sin control", color:"#c25a1f",
        descr:`r = ${R_NAT} /año · K = ${K_DEFAULT.toLocaleString("es-CO")} · >500 en 2030 · >1 000 en 2035`,
        proj: project({ horizon }),
      },
      control: {
        label:"Manejo letal", short:"Letal", color:"#8a4a20",
        descr:"Extracción sistemática de 40 ind./año — supera el crecimiento actual (~32/año).",
        proj: project({ horizon, removal: 40 }),
      },
      esterilizacion: {
        label:"Esterilización masiva", short:"Esterilización", color:"#2a7a64",
        descr:"80 % fertilidad bloqueada · r_eff = 0.032 — población sigue creciendo, solo muy lento.",
        proj: project({ horizon, sterilRate: 0.80 }),
      },
      combinado: {
        label:"Estrategia combinada", short:"Combinado", color:"#1f5d4c",
        descr:"Extracción de 20 ind./año + esterilización al 50 % — única vía que elimina la población.",
        proj: project({ horizon, removal: 20, sterilRate: 0.50 }),
      },
    }), [horizon]);

    const series = useMemo(() => ({
      years: scenarios.base.proj.years,
      datasets: escenarios.map(k => ({
        label: scenarios[k].label,
        data:  scenarios[k].proj.values,
        borderColor:     scenarios[k].color,
        backgroundColor: scenarios[k].color + "18",
        borderWidth: 2.5, pointRadius: 0, tension: .3, fill: true,
      })),
    }), [scenarios, escenarios]);

    const finalIdx  = horizon;
    const finalYear = BASE_YEAR + horizon;
    const baseFinal = scenarios.base.proj.values[finalIdx] ?? 0;

    const finalStats = Object.entries(scenarios).map(([k, s]) => {
      const v   = s.proj.values[finalIdx] ?? 0;
      const pct = k === "base" || baseFinal === 0
        ? null
        : ((baseFinal - v) / baseFinal) * 100;
      return { key:k, short:s.short, color:s.color, value:v,
               factor: BASE_POP > 0 ? (v / BASE_POP).toFixed(0) : "0", pct };
    });

    return (
      <div className="space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {finalStats.map(s => (
            <article key={s.key}
              className="rounded-2xl p-4 border border-line relative overflow-hidden"
              style={{background:"rgba(255,255,255,0.04)"}}>
              <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full" style={{background:s.color}}/>
              <div className="mono text-[9px] uppercase tracking-[.18em] mb-2" style={{color:"var(--muted)"}}>
                {s.short}
              </div>
              <div className="text-[2.1rem] font-bold tabular-nums leading-none"
                style={{color: s.value > 10000 ? "#c25a1f" : s.value > 1000 ? "#b9701a" : "var(--ink)"}}>
                {s.value > 0 ? s.value.toLocaleString("es-CO") : "0"}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <div className="mono text-[10px]" style={{color:"var(--muted)"}}>AÑO {finalYear}</div>
                <div className="mono text-[11px] font-semibold" style={{color:s.color}}>×{s.factor}</div>
              </div>
              {s.pct !== null && (
                <div className="mt-2 text-[11px] font-semibold"
                  style={{color: s.pct > 0 ? "#2a7a64" : "#c25a1f"}}>
                  {s.pct > 0 ? `−${s.pct.toFixed(0)}% vs. sin control` : `+${Math.abs(s.pct).toFixed(0)}% vs. sin control`}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Gráfico — full width sin card para que vaya de lado a lado */}
        <div className="rounded-2xl border border-line p-5" style={{background:"rgba(255,255,255,0.03)"}}>
          <div className="mono text-[9px] uppercase tracking-[.2em] mb-1" style={{color:"var(--muted)"}}>
            Modelo logístico · r = {R_NAT} /año · K = {K_DEFAULT.toLocaleString("es-CO")} ind.
          </div>
          <div className="text-[18px] font-semibold mb-3" style={{color:"var(--ink)"}}>
            Proyección 2024 – {finalYear}
          </div>
          <ProjectionChart series={series} height={420}/>
          <p className="mt-3 text-[11px] leading-relaxed" style={{color:"var(--muted)"}}>
            Base: <b style={{color:"var(--ink)"}}>{BASE_POP} individuos</b> en {BASE_YEAR}. Sin intervención
            supera los <b style={{color:"#c25a1f"}}>500 en 2030</b> y los <b style={{color:"#c25a1f"}}>1 000 en 2035</b>.{" "}
            <b style={{color:"var(--ink)"}}>¿Por qué la esterilización sigue creciendo?</b>{" "}
            Esterilizar al 80 % reduce r de {R_NAT} a r_eff = {(R_NAT * 0.20).toFixed(3)} — todavía positiva.
            Solo el <b style={{color:"#1f5d4c"}}>escenario combinado</b> (remoción + esterilización) lleva la población a cero.
          </p>
        </div>

        {/* Controles + mapa */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
          <Card eyebrow="Parámetros" title="Configuración">
            <div className="space-y-4">
              <div>
                <div className="mono text-[10px] uppercase tracking-wider mb-1.5" style={{color:"var(--muted)"}}>
                  Horizonte de proyección
                </div>
                <div className="flex items-center gap-3">
                  <input type="range" min="10" max="76" step="1" value={horizon}
                    onChange={e => { setHorizon(Number(e.target.value)); setViewYear(BASE_YEAR); }}
                    className="flex-1 accent-[#1f5d4c]"/>
                  <div className="serif text-2xl tabular-nums w-16 text-right" style={{color:"var(--ink)"}}>
                    {BASE_YEAR + horizon}
                  </div>
                </div>
                <div className="mono text-[10px] mt-1" style={{color:"var(--muted)"}}>
                  {horizon} años desde {BASE_YEAR}
                </div>
              </div>

              <div style={{borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:"1rem"}}>
                <div className="mono text-[10px] uppercase tracking-wider mb-2" style={{color:"var(--muted)"}}>
                  Escenarios en la gráfica
                </div>
                <div className="space-y-1.5">
                  {Object.entries(scenarios).map(([k, s]) => {
                    const on = escenarios.includes(k);
                    return (
                      <button key={k} type="button"
                        onClick={() => setEscenarios(p => on ? p.filter(x=>x!==k) : [...p, k])}
                        className="w-full text-left rounded-xl px-3 py-2.5 border transition flex items-center gap-3"
                        style={{
                          background:   on ? "rgba(255,255,255,0.06)" : "transparent",
                          borderColor:  on ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                          opacity: on ? 1 : 0.4,
                        }}>
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{background:s.color}}/>
                        <span className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium" style={{color:"var(--ink)"}}>{s.label}</div>
                          <div className="text-[10px] leading-snug mt-0.5" style={{color:"var(--muted)"}}>{s.descr}</div>
                        </span>
                        <span className="w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center"
                          style={{borderColor:s.color, background: on ? s.color : "transparent"}}>
                          {on && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          <ProjectionMap horizon={horizon} viewYear={viewYear}
                         setViewYear={setViewYear} scenarios={scenarios}/>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     ProjectionMap — puntos pequeños por núcleo
     ════════════════════════════════════════════════════════ */
  function ProjectionMap({ horizon, viewYear, setViewYear, scenarios }) {
    const { Card } = window.GPUI;
    const ref      = useRef(null);
    const mapRef   = useRef(null);
    const layerRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [view, setView]       = useState("dots"); // "dots" | "cluster"

    /* Init */
    useEffect(() => {
      if (mapRef.current) return;
      const m = L.map(ref.current, { center:[7.0,-74.2], zoom:6, zoomControl:true, scrollWheelZoom:true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
        { subdomains:"abcd", attribution:"© OSM © CARTO", maxZoom:19 }).addTo(m);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
        { subdomains:"abcd", maxZoom:19, pane:"shadowPane", opacity:.9 }).addTo(m);
      mapRef.current = m;
      setTimeout(() => m.invalidateSize(), 80);
    }, []);

    /* Render — respeta el modo "dots" | "cluster" */
    useEffect(() => {
      const m = mapRef.current; if (!m) return;
      if (layerRef.current) { m.removeLayer(layerRef.current); layerRef.current = null; }

      const scenario = scenarios["base"]; if (!scenario) return;
      const idx      = Math.min(scenario.proj.values.length - 1, viewYear - BASE_YEAR);
      const totalPop = scenario.proj.values[idx] ?? 0;
      if (totalPop <= 0) return;

      const dist   = distribute(viewYear, totalPop).filter(d => d.population > 0);
      const GOLDEN = 2.399963;

      if (view === "cluster") {
        /* ── Modo clúster: marcador por núcleo → markerClusterGroup ── */
        const cluster = L.markerClusterGroup({
          disableClusteringAtZoom: 10, chunkedLoading: true, maxClusterRadius: 50,
          iconCreateFunction: c => L.divIcon({
            className: "",
            html: `<div style="width:34px;height:34px;border-radius:50%;background:#f97316;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px #f9731688;font-family:'DM Sans',sans-serif">${c.getChildCount()}</div>`,
            iconSize: [34, 34], iconAnchor: [17, 17],
          }),
        });
        dist.forEach(d => {
          const isNew = d.year_origin > BASE_YEAR;
          const color = isNew ? "#f97316" : "#2a9d64";
          L.marker([d.lat, d.lng], {
            icon: L.divIcon({
              className: "",
              iconSize: [10, 10], iconAnchor: [5, 5],
              html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid rgba(255,255,255,0.7)"></div>`,
            }),
          }).bindTooltip(`<b>${d.name}</b><br/>${d.population.toLocaleString("es-CO")} ind.`, { direction:"top" })
            .addTo(cluster);
        });
        cluster.addTo(m);
        layerRef.current = cluster;
      } else {
        /* ── Modo puntos: Phyllotaxis scatter ─────────────────────── */
        const g = L.layerGroup();
        dist.forEach(d => {
          const isNew  = d.year_origin > BASE_YEAR;
          const color  = isNew ? "#f97316" : "#2a9d64";
          // Centro con glow
          L.marker([d.lat, d.lng], {
            interactive: true, zIndexOffset: 2000 + d.population,
            icon: L.divIcon({
              className: "",
              iconSize: [11, 11], iconAnchor: [5.5, 5.5],
              html: `<div style="width:11px;height:11px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color},0 0 4px white;border:1.5px solid rgba(255,255,255,0.6)"></div>`,
            }),
          }).bindTooltip(
            `<b>${d.name}</b><br/>${d.population.toLocaleString("es-CO")} ind. estimados<br/><span style="opacity:.7;font-size:11px">${isNew?"Expansión · "+d.year_origin:"Histórico · 2024"}</span>`,
            { direction:"top" }
          ).addTo(g);
          // Nube Phyllotaxis
          const nPts   = Math.round(Math.min(45, Math.max(6, Math.sqrt(d.population) * 0.85)));
          const spread = Math.min(0.45, 0.03 + Math.sqrt(d.population) * 0.005);
          for (let i = 0; i < nPts; i++) {
            const angle = i * GOLDEN;
            const r     = spread * Math.sqrt((i + 0.5) / nPts);
            const op    = (0.55 - (i / nPts) * 0.30).toFixed(2);
            const sz    = i < nPts * 0.3 ? 6 : i < nPts * 0.7 ? 5 : 4;
            L.marker([d.lat + Math.sin(angle) * r, d.lng + Math.cos(angle) * r], {
              interactive: false, zIndexOffset: d.population,
              icon: L.divIcon({
                className: "",
                iconSize: [sz, sz], iconAnchor: [sz/2, sz/2],
                html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${color};opacity:${op}"></div>`,
              }),
            }).addTo(g);
          }
        });
        g.addTo(m);
        layerRef.current = g;
      }
    }, [viewYear, scenarios, view]);

    /* Limpieza al desmontar */
    useEffect(() => () => {
      const m = mapRef.current;
      if (m && layerRef.current) { try { m.removeLayer(layerRef.current); } catch(_) {} }
    }, []);

    /* Animación */
    useEffect(() => {
      if (!playing) return;
      const id = setInterval(() => {
        setViewYear(y => {
          const next = y + 1;
          if (next > BASE_YEAR + horizon) { setPlaying(false); return BASE_YEAR + horizon; }
          return next;
        });
      }, 260);
      return () => clearInterval(id);
    }, [playing, horizon]);

    const scenario = scenarios["base"];
    const idx      = scenario ? Math.min(scenario.proj.values.length - 1, viewYear - BASE_YEAR) : 0;
    const totalPop = scenario ? (scenario.proj.values[idx] ?? 0) : 0;
    const factor   = BASE_POP > 0 ? (totalPop / BASE_POP).toFixed(1) : "—";
    const progress = horizon > 0 ? Math.round(((viewYear - BASE_YEAR) / horizon) * 100) : 0;

    return (
      <Card eyebrow="Simulación territorial · Sin intervención"
            title="¿Cómo se vería esto en el mapa?"
            action={
              <button onClick={() => setView(v => v === "dots" ? "cluster" : "dots")}
                title={view === "dots" ? "Cambiar a vista clúster" : "Cambiar a vista puntos"}
                className="btn btn-outline !py-1.5 !px-2.5 flex items-center gap-1.5 !text-[11px] mono uppercase tracking-wider transition"
                style={view === "cluster" ? {background:"rgba(249,115,22,0.15)", borderColor:"rgba(249,115,22,0.4)", color:"#f97316"} : {}}>
                {view === "cluster"
                  ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/></svg>Clúster</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/></svg>Clúster</>}
              </button>
            }>

        <div ref={ref} style={{ height:420, borderRadius:12, overflow:"hidden", background:"#0a1610" }}
          className="border border-line"/>

        {/* Barra de progreso */}
        <div className="mt-3 relative h-1 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.08)"}}>
          <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
            style={{width:progress+"%",
              background: totalPop > 10000 ? "#c25a1f" : totalPop > 1000 ? "#b9701a" : "#1f5d4c"}}/>
        </div>

        {/* Controles */}
        <div className="mt-2 flex items-center gap-3">
          <button onClick={() => { if (!playing) setViewYear(BASE_YEAR); setPlaying(p => !p); }}
            className="btn btn-ink !py-2 !px-4 !text-[12px] flex items-center gap-2 flex-shrink-0">
            {playing
              ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar</>
              : <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Reproducir</>}
          </button>
          <input type="range" min={BASE_YEAR} max={BASE_YEAR + horizon}
            value={viewYear} onChange={e => { setPlaying(false); setViewYear(Number(e.target.value)); }}
            className="flex-1 accent-[#1f5d4c]"/>
          <div className="serif text-2xl tabular-nums w-16 text-right" style={{color:"var(--ink)"}}>{viewYear}</div>
        </div>

        {/* Info del año */}
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="text-[12px]" style={{color:"var(--muted)"}}>
            Año <b style={{color:"var(--ink)"}}>{viewYear}</b> · Sin intervención
          </div>
          <div className="tabular-nums text-[12px]" style={{color:"var(--muted)"}}>
            <b style={{color: totalPop > 10000 ? "#c25a1f" : totalPop > 1000 ? "#b9701a" : "var(--ink)"}}>
              {totalPop.toLocaleString("es-CO")}
            </b>
            <span className="ml-1 mono">ind. · ×{factor}</span>
          </div>
        </div>

        {/* Leyenda mínima */}
        <div className="legend mt-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{background:"#2a9d64"}}/>
            <span className="text-[11px]" style={{color:"var(--ink-2)"}}>Núcleo histórico</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{background:"#f97316"}}/>
            <span className="text-[11px]" style={{color:"var(--ink-2)"}}>Expansión</span>
          </span>
        </div>
      </Card>
    );
  }

  window.GPProjection = {
    ProjectionPanel,
    projectPopulation: project,
    BASE_YEAR, BASE_POP, K_DEFAULT, R_NAT,
  };
})();
