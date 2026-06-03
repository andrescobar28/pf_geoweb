/* GEOPOTAMO · módulos de mapa
   Modos: thematic · cluster · hex
   Overlays toggleables: departamentos · municipios · NASA cobertura
   Basemap: Mapa · Claro · Satélite · Topo
   Herramientas: dibujo de polígono (Geoman) para seleccionar área libre
*/

const { useEffect, useRef } = React;

const SEV_COLORS = { 1:"#7fa66f", 2:"#c9912a", 3:"#c25a1f", 4:"#7a2218" };
const TIPO_COLORS = {
  avistamiento:"#1f5d4c", huella:"#2d6a78", conflicto:"#7a2218",
  cultivo:"#b9701a", vialidad:"#564a2a", ambiental:"#3a5d6e", captura:"#0f3d31",
};

const MAGDALENA_CENTER = [6.8, -74.3];

const BASEMAPS = {
  dark: {
    label: "Oscuro",
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    sub: "abcd", attr: "© OSM © CARTO",
    labels: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
  },
  voyager: {
    label: "Neutro",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    sub: "abcd", attr: "© OSM © CARTO",
    labels: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
  },
  positron: { label: "Claro",    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", sub: "abcd", attr: "© OSM © CARTO" },
  satellite:{ label: "Satélite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", sub: "", attr: "Tiles © Esri" },
  topo:     { label: "Topográfico", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", sub: "abc", attr: "© OSM © OpenTopoMap" },
};

/* Overlays opcionales — servicios CORS-friendly + Overpass API */
const OVERLAYS = {

    colombia_rivers: {
    label: "Drenajes dobles (IGAC)",
    type: "wms",
    url: "https://mapas2.igac.gov.co/server/services/carto/carto100000colombia2019/MapServer/WMSServer?",
    wmsLayers: "13",
    wmsFormat: "image/png",
    wmsVersion: "1.3.0",
    attr: "© IGAC Colombia",
    opacity: 1,
  },

  magdalena_main: {
    label: "Río Magdalena (OSM)",
    type: "geojson",
    url: "data/magdalena2.geojson",
    attr: "© OpenStreetMap contributors",
    color: "#0d47a1",
    weight: 2,
    fillColor: "#0d47a1",
    fillOpacity: 0.3,
  },
  
  /* ── Colombia · capas geográficas especializadas ── */

    pnn_areas_protegidas: {
      label: "Ecosistemas continentales (IDEAM)",
      type: "wms",
      url: "https://visualizador.ideam.gov.co/gisserver/services/Estado_Ecosistemas/MapServer/WMSServer?",
      wmsLayers: "1",
      wmsFormat: "image/png",
      wmsVersion: "1.3.0",
      attr: "© IDEAM Colombia",
      opacity: 0.65,
    },

    igac_uso_suelo: {
      label: "Cobertura del suelo 2018 (IDEAM)",
      type: "wms",
      url: "https://visualizador.ideam.gov.co/gisserver/services/Estado_Cobertura_Tierra/MapServer/WMSServer?",
      wmsLayers: "3",
      wmsFormat: "image/png",
      wmsVersion: "1.3.0",
      attr: "© IDEAM Colombia",
      opacity: 0.55,
    },
  
  /* ── Capas globales confiables (CORS habilitado) ── */
  esri_hillshade: {
    label: "Sombreado del terreno (ESRI)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
    attr: "© Esri", opacity: 0.55, maxZoom: 16,
  },
  esri_physical: {
    label: "Mapa físico: ríos y relieve (ESRI)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}",
    attr: "© Esri", opacity: 0.75, maxZoom: 13,
  },
  osm_humanitarian: {
    label: "Trazas humanitarias (OMS)",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    sub: "abc", attr: "© OSM HOT", opacity: 0.45, maxZoom: 19,
  },
  stamen_terrain: {
    label: "Terreno y pendientes (STADIA)",
    url: "https://tiles.stadiamaps.com/tiles/stamen_terrain_background/{z}/{x}/{y}.png",
    attr: "© Stadia Maps, Stamen Design, © OSM", opacity: 0.5, maxZoom: 14,
  },

  /* ── Límites administrativos Colombia ── */
    limites_administrativos: {
      label: "Límites Departamentales (IGAC)",
      type: "wms",
      url: "https://mapas2.igac.gov.co/server4/services/limites/divisionpoliticoadministrativa/MapServer/WMSServer",
      wmsLayers: "0",
      wmsFormat: "image/png",
      wmsVersion: "1.3.0",
      transparent: true,
      attr: "© IGAC",
      opacity: 0.8
    },

  /* ── Colombia · capas geográficas especializadas ── */
    densidad_poblacion: {
    label: "Densidad de población (DANE 2005)",
    type: "wms",
    url: "https://geoportal.dane.gov.co/mparcgis/services/INDICADORES_DE_POBLACION/Cache_MpiosDensidadDePoblacionResto_2005/MapServer/WMSServer",
    wmsLayers: "0",
    wmsFormat: "image/png",
    wmsVersion: "1.3.0",
    transparent: true,
    attr: "© DANE Colombia",
    opacity: 0.85
  },

};

/* ====================== Helpers visuales ====================== */
function addBaseLayer(map, kind = "voyager") {
  const b = BASEMAPS[kind] || BASEMAPS.voyager;
  const opts = { maxZoom: 19, attribution: b.attr };
  if (b.sub) opts.subdomains = b.sub;
  const tl = L.tileLayer(b.url, opts).addTo(map);
  let labels = null;
  if (b.labels) labels = L.tileLayer(b.labels, { subdomains: b.sub, pane: "shadowPane", maxZoom: 19, opacity: .9 }).addTo(map);
  return { tl, labels };
}

function divIcon(color, isUnverified = false, label = "") {
  return L.divIcon({
    className: "",
    html: `<div class="gp-pin ${isUnverified ? "unverified" : ""}" style="background:${color}">${isUnverified ? "" : label}</div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -8]
  });
}

function popupHTML(r) {
  const v = r.estado_validacion;
  const vTxt = v === "validado" ? "● Validado" : v === "rechazado" ? "● Rechazado" : "● Pendiente";
  const vCol = v === "validado" ? "#1f5d4c" : v === "rechazado" ? "#8e2a18" : "#a87412";
  return `
    <div style="font-family:'DM Sans',sans-serif;min-width:220px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.6">${r.codigo}</span>
        <span style="font-size:11px;color:${vCol}">${vTxt}</span>
      </div>
      <div style="font-size:15px;font-weight:600;line-height:1.2;margin-bottom:4px">${window.GP.tipoLabel(r.tipo)}</div>
      <div style="font-size:12px;line-height:1.4;margin-bottom:6px;opacity:.85">${r.descripcion || ""}</div>
      <div style="font-size:11px;opacity:.65">
        <b>${r.municipio || "—"}</b>${r.departamento ? " · " + r.departamento : ""}<br/>
        Severidad ${r.severidad} · ${r.n_individuos || "?"} ind. · ${window.GP.fmtDate(r.created_at)}
      </div>
    </div>
  `;
}

/* ====================== ReportsMap ====================== */
function ReportsMap({
  reports = [], mode = "thematic", height = 480, onMove, editId,
  colorBy = "severidad", options = {},
  basemap = "dark",
  overlays = {},
  areaPolygon = null,
  drawEnabled = false,
  onDrawPolygon, // (geojson polygon)
  showMuniLayer = false,
  showDeptLayer = false,
  highlightMunicipio = null,
  highlightDepartamento = null,
}) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const areaRef = useRef(null);
  const baseRef = useRef(null);
  const ovRefs = useRef({});
  const muniLayerRef = useRef(null);
  const deptLayerRef = useRef(null);
  const drawnRef = useRef(null);

  /* Init */
  useEffect(() => {
    if (mapRef.current) return;
    const m = L.map(ref.current, {
      center: MAGDALENA_CENTER, zoom: 7,
      zoomControl: true, scrollWheelZoom: true, preferCanvas: true,
    });
    baseRef.current = addBaseLayer(m, basemap);
    mapRef.current = m;
    setTimeout(() => m.invalidateSize(), 60);
  }, []);

  /* Basemap swap */
  useEffect(() => {
    const m = mapRef.current; if (!m || !baseRef.current) return;
    if (baseRef.current.tl) m.removeLayer(baseRef.current.tl);
    if (baseRef.current.labels) m.removeLayer(baseRef.current.labels);
    baseRef.current = addBaseLayer(m, basemap);
  }, [basemap]);

  /* Forzar que las overlays queden encima al cambiar el mapa base */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    
    setTimeout(() => {
      Object.keys(ovRefs.current).forEach(k => {
        const layer = ovRefs.current[k];
        if (layer) {
          try {
            layer.bringToFront();
          } catch(e) { /* ignorar */ }
        }
      });
      if (riverRef.current) riverRef.current.bringToFront();
    }, 100);
  }, [basemap]);

  /* Overlay toggles — tile, WMS, y geojson */
  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    Object.keys(OVERLAYS).forEach(k => {
      const want = overlays[k];
      const exists = ovRefs.current[k];
      if (want && !exists) {
        const o = OVERLAYS[k];

        if (o.type === "geojson") {
          // Limpieza: si ya existía el grupo, lo quitamos para no saturar
          if (ovRefs.current[k]) m.removeLayer(ovRefs.current[k]);
          
          const grp = L.layerGroup().addTo(m);
          ovRefs.current[k] = grp;
          
          fetch("data/magdalena2.geojson") 
            .then(response => {
              if (!response.ok) throw new Error("Archivo no encontrado");
              return response.json();
            })
            .then(data => {
              const geoLayer = L.geoJSON(data, {
                style: {
                  color: "#ff0000", 
                  weight: 5,         // Más grueso para que sea innegable
                  fillColor: "#ff0000",
                  fillOpacity: 0.7,
                  pane: 'markerPane' // TRUCO: Lo movemos al panel de marcadores (siempre arriba)
                }
              }).addTo(grp);

              // Forzamos el frente y el zoom
              setTimeout(() => {
                geoLayer.bringToFront();
                const bounds = geoLayer.getBounds();
                if (bounds.isValid()) m.fitBounds(bounds);
              }, 500);
            })
            .catch(() => {});
          return;
        }

        let layer;
        if (o.type === "wms") {
          layer = L.tileLayer.wms(o.url, {
            layers: o.wmsLayers,
            format: o.wmsFormat || "image/png",
            transparent: true,
            version: o.wmsVersion || "1.1.0",
            opacity: o.opacity ?? 0.55,
            attribution: o.attr || "",
          });
          layer.on("tileerror", () =>
            console.warn("[GP] WMS layer '" + k + "' falló — posible bloqueo CORS del servidor.")
          );
        } else {
          const opts = { opacity: o.opacity ?? 0.6, maxZoom: o.maxZoom || 18, attribution: o.attr };
          if (o.sub) opts.subdomains = o.sub;
          layer = L.tileLayer(o.url, opts);
        }
        layer.addTo(m);

        layer.bringToFront();

        ovRefs.current[k] = layer;
      } else if (!want && exists) {
        m.removeLayer(exists);
        ovRefs.current[k] = null;
      }
    });
  }, [JSON.stringify(overlays)]);

    /* GetFeatureInfo para límites administrativos */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = async (e) => {
      // Verificar qué capa está activa
      const isLimitesActiva = overlays.limites_administrativos;
      const isDensidadActiva = overlays.densidad_poblacion;
      
      if (!isLimitesActiva && !isDensidadActiva) return;
      
      const coords = e.latlng;
      const bounds = map.getBounds();
      
      const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
      
      const url = `https://mapas2.igac.gov.co/server4/services/limites/divisionpoliticoadministrativa/MapServer/WMSServer?service=WMS&version=1.3.0&request=GetFeatureInfo&layers=0&query_layers=0&info_format=text/html&x=${Math.floor(e.containerPoint.x)}&y=${Math.floor(e.containerPoint.y)}&width=${map.getSize().x}&height=${map.getSize().y}&crs=EPSG:4326&bbox=${bbox}`;
      
      try {
        const resp = await fetch(url);
        const html = await resp.text();
        
        const filaMatch = html.match(/<tr>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>Polygon<\/td>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
        
        if (filaMatch) {
          const codigo = filaMatch[2];
          const municipio = filaMatch[3];
          
          // Extraer todas las celdas de la fila
          const celdas = html.match(/<td[^>]*>([^<]*)<\/td>/gi);
          
          let depto = "";
          if (celdas && celdas.length > 9) {
            // Probar posiciones comunes donde está el departamento
            for (let i = 8; i <= 11; i++) {
              if (celdas[i]) {
                const texto = celdas[i].replace(/<[^>]*>/g, '').trim();
                if (texto && texto !== "Restriccion" && texto.length < 50 && !texto.includes("No es apropiada")) {
                  depto = texto;
                  console.log(`Departamento encontrado en celda ${i}: "${depto}"`);
                  break;
                }
              }
            }
          }
          
          let contenido = "";
          if (depto) {
            contenido = `<b>DEPARTAMENTO: ${depto}</b>`;
          } else {
            contenido = "<b>Departamento no identificado</b>";
          }
          
          contenido += `<br/>MUNICIPIO: ${municipio.trim()}`;
          contenido += `<br/><span style="font-size:10px">Código: ${codigo.trim()}</span>`;
          
          L.popup()
            .setLatLng(coords)
            .setContent(contenido)
            .openOn(map);
        } else {
          console.log("=== HTML COMPLETO ===");
          console.log(html);
          L.popup()
            .setLatLng(coords)
            .setContent("No se pudo extraer la información")
            .openOn(map);
        }
      } catch (err) {
        console.warn("GetFeatureInfo error:", err);
        L.popup()
          .setLatLng(coords)
          .setContent("Error al consultar el servidor")
          .openOn(map);
      }
    };

    map.on("click", handleMapClick);
    
    return () => {
      map.off("click", handleMapClick);
    };
  }, [overlays.limites_administrativos]);

  /* Departments overlay */
  useEffect(() => {const m = mapRef.current; if (!m) return;
    
    if (deptLayerRef.current) { m.removeLayer(deptLayerRef.current); deptLayerRef.current = null; }
    if (!showDeptLayer) return;
    window.GPGeo.loadDepartamentos().then(gj => {
      if (!gj || !showDeptLayer) return;
      const layer = L.geoJSON(gj, {
        style: f => {
          const n = window.GPGeo.normalizeDept(f.properties.NOMBRE_DPT || f.properties.name || "");
          const highlight = n === highlightDepartamento;
          return {
            color: highlight ? "#0d1714" : "rgba(13,23,20,.3)",
            weight: highlight ? 2.5 : 0.8,
            fillColor: highlight ? "#1f5d4c" : "transparent",
            fillOpacity: highlight ? 0.18 : 0,
          };
        }
      }).addTo(m);
      deptLayerRef.current = layer;
    });
  }, [showDeptLayer, highlightDepartamento]);

  /* Municipios overlay (lazy) */
  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    if (muniLayerRef.current) { m.removeLayer(muniLayerRef.current); muniLayerRef.current = null; }
    if (!showMuniLayer && !highlightMunicipio) return;
    window.GPGeo.loadMunicipios().then(gj => {
      if (!gj) return;
      const wantHighlight = highlightMunicipio;
      const layer = L.geoJSON(gj, {
        style: f => {
          const name = (f.properties.MPIO_CNMBR || f.properties.NOMBRE_MPI || f.properties.name || "").toString();
          const highlight = wantHighlight && name.toLowerCase() === wantHighlight.toLowerCase();
          if (highlight) {
            return { color: "#0d1714", weight: 2, fillColor: "#b9701a", fillOpacity: 0.25 };
          }
          if (!showMuniLayer) return { color: "transparent", weight: 0, fillOpacity: 0 };
          return { color: "rgba(13,23,20,.18)", weight: 0.4, fillColor: "transparent", fillOpacity: 0 };
        }
      }).addTo(m);
      muniLayerRef.current = layer;
      if (wantHighlight) {
        try {
          const feat = gj.features.find(f =>
            ((f.properties.MPIO_CNMBR || f.properties.NOMBRE_MPI || f.properties.name || "").toString().toLowerCase()
              === wantHighlight.toLowerCase()));
          if (feat) {
            const b = L.geoJSON(feat).getBounds();
            if (b.isValid()) m.fitBounds(b, { padding:[40,40] });
          }
        } catch {}
      }
    });
  }, [showMuniLayer, highlightMunicipio]);

  /* Area polygon overlay (from area selector or hand-drawn) */
  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    if (areaRef.current) { m.removeLayer(areaRef.current); areaRef.current = null; }
    if (!areaPolygon) return;
    areaRef.current = L.geoJSON(areaPolygon, {
      style: { color: "#0d1714", weight: 2, fillColor: "#0d1714", fillOpacity: .05, dashArray: "5,5" }
    }).addTo(m);
    try {
      const b = areaRef.current.getBounds();
      if (b.isValid()) m.fitBounds(b, { padding: [30, 30] });
    } catch {}
  }, [areaPolygon && JSON.stringify(areaPolygon).slice(0, 200)]);

  /* Polygon drawing tool (Geoman) */
  useEffect(() => {
    const m = mapRef.current; if (!m || !m.pm) return;
    if (drawEnabled) {
      m.pm.addControls({
        position: "topright",
        drawCircle: false, drawCircleMarker: false, drawMarker: false, drawText: false,
        drawPolyline: false, drawRectangle: true, drawPolygon: true,
        editMode: false, dragMode: false, cutPolygon: false, removalMode: true,
      });
      m.on("pm:create", e => {
        if (drawnRef.current) { try { m.removeLayer(drawnRef.current); } catch {} }
        drawnRef.current = e.layer;
        const gj = e.layer.toGeoJSON();
        onDrawPolygon && onDrawPolygon(gj);
      });
      m.on("pm:remove", () => {
        drawnRef.current = null;
        onDrawPolygon && onDrawPolygon(null);
      });
    } else {
      try { m.pm.removeControls(); } catch {}
      if (drawnRef.current) { try { m.removeLayer(drawnRef.current); } catch {}; drawnRef.current = null; }
    }
    return () => { try { m.pm.removeControls(); } catch {} };
  }, [drawEnabled]);

  /* Main layer */
  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    if (layerRef.current) { m.removeLayer(layerRef.current); layerRef.current = null; }

    let layer;
    if (mode === "cluster") {
      const cluster = L.markerClusterGroup({
        disableClusteringAtZoom: 11, spiderfyOnMaxZoom: true, chunkedLoading: true,
      });
      reports.forEach(r => {
        const color = colorBy === "tipo" ? (TIPO_COLORS[r.tipo] || "#1f5d4c") : SEV_COLORS[r.severidad];
        const unverified = r.estado_validacion !== "validado";
        L.marker([r.lat, r.lng], { icon: divIcon(color, unverified) }).bindPopup(popupHTML(r)).addTo(cluster);
      });
      layer = cluster;
    }
    else if (mode === "hex") {
      const cellKm = options.cellKm || 25;
      const hex = window.GPGeo.hexGridCounts(reports, cellKm);
      if (hex) {
        const max = Math.max(1, ...hex.features.map(f => f.properties.count));
        layer = L.geoJSON(hex, {
          style: f => {
            const c = f.properties.count;
            const t = c / max;
            const color = interpolate(t);
            return { color, weight: 1, fillColor: color, fillOpacity: .6 };
          },
          onEachFeature: (f, ly) => ly.bindTooltip(
            `<b>${f.properties.count}</b> reportes<br/>sev. prom. ${f.properties.sev.toFixed(1)}`,
            { direction:"top" }),
        });
      } else { layer = L.layerGroup(); }
    }
    else {
      // thematic
      const group = L.layerGroup();
      reports.forEach(r => {
        const color = colorBy === "tipo" ? (TIPO_COLORS[r.tipo] || "#1f5d4c") : SEV_COLORS[r.severidad];
        const unverified = r.estado_validacion !== "validado";
        L.marker([r.lat, r.lng], { icon: divIcon(color, unverified) }).bindPopup(popupHTML(r)).addTo(group);
      });
      layer = group;
    }

    layer.addTo(m);
    layerRef.current = layer;
  }, [reports, mode, colorBy, JSON.stringify(options), basemap]);

  /* Drag-to-edit */
  useEffect(() => {
    if (!editId || !mapRef.current) return;
    const r = reports.find(x => x.id === editId);
    if (!r) return;
    const m = mapRef.current;
    const editLayer = L.marker([r.lat, r.lng], {
      draggable: true,
      icon: L.divIcon({ className: "",
        html: `<div class="gp-pin" style="background:#0d1714;outline:3px solid #d99a3f;outline-offset:1px">↕</div>`,
        iconSize:[22,22], iconAnchor:[11,11] })
    }).addTo(m);
    editLayer.on("dragend", e => {
      const ll = e.target.getLatLng();
      onMove && onMove(editId, ll.lat, ll.lng);
    });
    m.panTo([r.lat, r.lng]);
    return () => m.removeLayer(editLayer);
  }, [editId]);

  return (
    <div ref={ref}
      style={{ height, borderRadius: 14, overflow: "hidden", background:"#0a1610" }}
      className="border border-line"/>
  );
}

/* ====================== PickMap ====================== */
function PickMap({ value, onChange, height = 280 }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  useEffect(() => {
    if (mapRef.current) return;
    const m = L.map(ref.current, { center: value || MAGDALENA_CENTER, zoom: value ? 11 : 7, scrollWheelZoom: true });
    addBaseLayer(m, "dark");
    L.polyline(window.GPGeo.MAGDALENA_RIVER, { color: "#2d6a78", weight: 3, opacity: .6 }).addTo(m);
    m.on("click", e => onChange([e.latlng.lat, e.latlng.lng]));
    mapRef.current = m;
    setTimeout(() => m.invalidateSize(), 80);
  }, []);
  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    if (markerRef.current) m.removeLayer(markerRef.current);
    if (value) {
      markerRef.current = L.marker(value, {
        icon: L.divIcon({ className: "",
          html: `<div class="gp-pin" style="background:#7a2218">×</div>`,
          iconSize:[22,22], iconAnchor:[11,11] })
      }).addTo(m);
    }
  }, [value && value[0], value && value[1]]);
  return <div ref={ref} style={{ height, borderRadius: 12, overflow: "hidden" }} className="border border-line"/>;
}

/* Color ramp */
function interpolate(t) {
  const stops = [
    [0.00, [203,224,212]],
    [0.35, [125,179,144]],
    [0.60, [201,145,42]],
    [0.85, [194,90,31]],
    [1.00, [122,34,24]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const a = stops[i-1], b = stops[i];
      const k = (t - a[0]) / (b[0] - a[0]);
      const c = a[1].map((v, j) => Math.round(v + k * (b[1][j] - v)));
      return `rgb(${c.join(",")})`;
    }
  }
  return "rgb(122,34,24)";
}

const MAP_MODES = [
  { id:"thematic", label:"Temático" },
  { id:"cluster",  label:"Clúster" },
];

window.GPMaps = {
  ReportsMap, PickMap, BASEMAPS, OVERLAYS, MAP_MODES,
  SEV_COLORS, TIPO_COLORS, interpolate,
};
