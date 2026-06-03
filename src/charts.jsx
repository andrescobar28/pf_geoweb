/* GEOPOTAMO · charts (Chart.js) */
const { useEffect, useRef } = React;

const PALETTE = ["#1f5d4c", "#2a7a64", "#b9701a", "#7a2218", "#564a2a", "#2d6a78", "#0f3d31", "#a87412"];

function useChart(makeConfig, deps) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const cfg = makeConfig();
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current.getContext("2d"), cfg);
    return () => { chartRef.current && chartRef.current.destroy(); };
  }, deps);
  return ref;
}

const DARK_TEXT  = "rgba(234,228,216,0.85)";
const DARK_MUTED = "rgba(234,228,216,0.45)";
const DARK_GRID  = "rgba(255,255,255,0.07)";

/* ── Estilos base del tooltip ─────────────────────────── */
const TOOLTIP_BASE = {
  backgroundColor: "rgba(13,23,20,0.92)",
  titleColor: "#f4efe4", bodyColor: "rgba(234,228,216,0.8)",
  padding: 10, cornerRadius: 8,
  borderColor: "rgba(255,255,255,0.1)", borderWidth: 1,
};

/* Callback para gráficos de dataset único o multi independiente.
   Porcentaje = valor / suma del propio dataset. */
function pctLabel(ctx) {
  const val = Number(ctx.dataset.data[ctx.dataIndex]) || 0;
  const total = ctx.dataset.data.reduce((s, v) => s + (Number(v) || 0), 0);
  const pct = (total > 0 && val > 0) ? ` (${(val / total * 100).toFixed(1)}%)` : "";
  const lbl = ctx.dataset.label ? ` ${ctx.dataset.label}:` : "";
  return `${lbl} ${val}${pct}`;
}

/* Callback para barras apiladas.
   Porcentaje = valor / total de la columna (suma de todos los datasets en ese índice). */
function pctStackedLabel(ctx) {
  const val = ctx.parsed.y ?? ctx.parsed.x ?? 0;
  if (!val) return null;
  const colTotal = ctx.chart.data.datasets.reduce(
    (s, ds) => s + (Number(ds.data[ctx.dataIndex]) || 0), 0
  );
  const pct = colTotal > 0 ? ` (${(val / colTotal * 100).toFixed(1)}%)` : "";
  return ` ${ctx.dataset.label}: ${val}${pct}`;
}

/* commonOpts — fusiona tooltip correctamente para preservar estilos base
   aunque el chart pase callbacks propios. */
function commonOpts(cfg) {
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color = DARK_TEXT;

  cfg.options = cfg.options || {};

  // 👇 aplicar globalmente
  cfg.options.responsive = true;
  cfg.options.maintainAspectRatio = false;

  const userPlugins = cfg.options.plugins || {};
  const { tooltip: userTooltip, ...otherPlugins } = userPlugins;

  cfg.options.plugins = {
    legend: {
      display: userPlugins.legend?.display ?? true,
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        font: { size: 11 },
        color: DARK_TEXT,
      },
      ...userPlugins.legend,
    },
    tooltip: {
      ...TOOLTIP_BASE,
      callbacks: { label: pctLabel },
      ...userTooltip,
    },
    ...otherPlugins,
  };

  cfg.options.scales = cfg.options.scales || {};

  for (const k of Object.keys(cfg.options.scales)) {
    cfg.options.scales[k].grid = { color: DARK_GRID };
    cfg.options.scales[k].border = { color: DARK_GRID };
    cfg.options.scales[k].ticks = {
      font: { size: 11 },
      color: DARK_MUTED,
      ...cfg.options.scales[k].ticks,
    };

    // 👇 elimina márgenes laterales en ejes categóricos
    if (k === "x") {
      cfg.options.scales[k].offset = false;
    }
  }

  return cfg;
}

/* ── BarByCategory ─────────────────────────────────────── */
function BarByCategory({ reports, field = "tipo", horizontal = false, height = 220 }) {
  const ref = useChart(() => {
    const counts = {};
    reports.forEach(r => { const k = r[field] || "—"; counts[k] = (counts[k] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const labels  = entries.map(([k]) => field === "tipo" ? window.GP.tipoLabel(k) : k);
    const data    = entries.map(([, v]) => v);
    return commonOpts({
      type: "bar",
      data: { labels, datasets: [{ data, label: "Reportes",
              backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
              borderRadius: 5, borderSkipped: false }] },
      options: {
        indexAxis: horizontal ? "y" : "x",
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
      },
    });
  }, [reports, field, horizontal]);
  return <div style={{ height }}><canvas ref={ref}/></div>;
}

/* ── TrendLine ──────────────────────────────────────────── */
function TrendLine({ reports, bucket = "month", height = 220 }) {
  const ref = useChart(() => {
    const fmt = d =>
      bucket === "day"
        ? d.toISOString().slice(0, 10)
        : d.toISOString().slice(0, 7);

    const counts = {};

    reports.forEach(r => {
      const k = fmt(new Date(r.created_at));
      counts[k] = (counts[k] || 0) + 1;
    });

    const labels = Object.keys(counts).sort();
    const data = labels.map(l => counts[l]);

    return commonOpts({
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Reportes por " + (bucket === "day" ? "día" : "mes"),
          data,
          fill: true,
          backgroundColor: "rgba(31,93,76,.15)",
          borderColor: "#1f5d4c",
          borderWidth: 2,
          pointBackgroundColor: "#1f5d4c",
          pointRadius: 2,
          tension: .35,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {},
          y: { beginAtZero: true }
        }
      }
    });
  }, [reports, bucket]);

  return (
    <div style={{ width: "100%", height }}>
      <canvas
        ref={ref}
        style={{
          width: "100%",
          height: "100%"
        }}
      />
    </div>
  );
}

/* ── SeverityDonut ─────────────────────────────────────── */
function SeverityDonut({ reports, height = 220 }) {
  const ref = useChart(() => {
    const sev    = [1,2,3,4];
    const counts = sev.map(s => reports.filter(r => r.severidad === s).length);
    const labels = sev.map(s => window.GP.severityLabel(s));
    const colors = ["#7fa66f", "#c9912a", "#c25a1f", "#7a2218"];
    return commonOpts({
      type: "doughnut",
      data: { labels, datasets: [{ data: counts, backgroundColor: colors,
              borderColor: "rgba(13,23,20,0.6)", borderWidth: 2 }] },
      options: {
        cutout: "62%",
        plugins: { legend: { position: "right" } },
      },
    });
  }, [reports]);
  return <div style={{ height }}><canvas ref={ref}/></div>;
}

/* ── StackedByMonth ─────────────────────────────────────── */
function StackedByMonth({ reports, height = 240 }) {
  const ref = useChart(() => {
    const months   = Array.from(new Set(reports.map(r => r.created_at.slice(0,7)))).sort();
    const tipos    = window.GP.catalog.TIPOS.map(t => t.id);
    const datasets = tipos.map((tipo, i) => ({
      label: window.GP.tipoLabel(tipo),
      backgroundColor: PALETTE[i % PALETTE.length],
      data: months.map(m => reports.filter(r => r.created_at.slice(0,7) === m && r.tipo === tipo).length),
      borderRadius: 3, borderSkipped: false,
    }));
    return commonOpts({
      type: "bar",
      data: { labels: months, datasets },
      options: {
        plugins: {
          legend: { position: "bottom" },
          /* Porcentaje dentro de la columna (ese mes) */
          tooltip: { callbacks: { label: pctStackedLabel } },
        },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
      },
    });
  }, [reports]);
  return <div style={{ height }}><canvas ref={ref}/></div>;
}

/* ── UsersBar ────────────────────────────────────────────── */
function UsersBar({ activity, height = 240 }) {
  const ref = useChart(() => {
    const top = activity.slice(0, 8);

    return commonOpts({
      type: "bar",
      data: {
        labels: top.map(u => u.nombre),
        datasets: [
          {
            label: "Validados",
            data: top.map(u => u.validados),
            backgroundColor: "#1f5d4c",
            borderRadius: 4,
            stack: "s",
          },
          {
            label: "Pendientes",
            data: top.map(u => u.pendientes),
            backgroundColor: "#c9912a",
            borderRadius: 4,
            stack: "s",
          },
          {
            label: "Otros",
            data: top.map(u =>
              Math.max(0, u.total - u.validados - u.pendientes)
            ),
            backgroundColor: "#6a7770",
            borderRadius: 4,
            stack: "s",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: {
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              label: pctStackedLabel,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            stacked: true,
          },
          y: {
            stacked: true,
          },
        },
      },
    });
  }, [activity]);

  return (
    <div style={{ width: "100%", height }}>
      <canvas
        ref={ref}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

/* ── ProjectionChart ─────────────────────────────────────── */
function ProjectionChart({ series, height = 240 }) {
  const ref = useChart(() => {
    return commonOpts({
      type: "line",
      data: {
        labels: series.years,
        datasets: series.datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
        scales: {
          x: {
            offset: false,
          },
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }, [JSON.stringify(series)]);

  return (
    <div style={{ width: "100%", height }}>
      <canvas
        ref={ref}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

window.GPCharts = { BarByCategory, TrendLine, SeverityDonut, StackedByMonth, UsersBar, ProjectionChart };
