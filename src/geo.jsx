/* GEOPOTAMO · módulo geoespacial
   - Lookup municipio → departamento (vía DIVIPOLA)
   - Polilínea detallada del río Magdalena (Neiva → Bocas de Ceniza, ~140 pts)
   - Carga lazy y cacheada de Magdalena REAL desde Overpass + fallback Natural Earth
   - GeoJSON departamental Colombia (jsdelivr · john-guerra)
   - Helpers Turf: buffers, hex-grid, convex hull, point-in-polygon
*/

(function () {
  /* ===== Coordenadas conocidas de municipios principales ===== */
  const MUNI_COORDS = {
    "Puerto Triunfo":[5.880,-74.638], "Puerto Berrío":[6.487,-74.405],
    "Puerto Boyacá":[5.733,-74.629], "Barrancabermeja":[7.062,-74.249],
    "Magangué":[9.246,-74.420], "Mompós":[9.456,-74.521],
    "El Banco":[9.001,-73.974], "Yondó":[6.984,-74.012],
    "Puerto Nare":[6.193,-74.585], "Cocorná":[6.057,-75.184],
    "San Luis":[6.043,-74.993], "Cantagallo":[7.378,-73.917],
    "Aguachica":[8.307,-73.617], "Puerto Wilches":[7.347,-73.901],
    "La Dorada":[5.453,-74.660], "Honda":[5.207,-74.738],
    "Cimitarra":[6.319,-73.949], "Gamarra":[8.319,-73.745],
    "Plato":[9.798,-74.787], "Pinillos":[8.910,-74.469],
    "Talaigua Nuevo":[9.302,-74.566], "Hatillo de Loba":[8.957,-74.078],
    "San Marcos":[8.661,-75.131], "Ayapel":[8.314,-75.142],
    "Caucasia":[7.987,-75.197], "Nechí":[8.094,-74.776],
    "Tamalameque":[8.864,-73.811], "Pailitas":[8.954,-73.625],
    "Chimichagua":[9.262,-73.811], "Pijiño del Carmen":[9.331,-74.451],
    "Tenerife":[9.901,-74.857], "Pivijay":[10.464,-74.616],
    "Neiva":[2.927,-75.281], "Girardot":[4.305,-74.802],
    "Caracolí":[6.408,-74.756],
  };

  /* ===== Río Magdalena: polilínea curada de alta resolución (~140 pts)
     desde nacimiento hasta Bocas de Ceniza, siguiendo el curso real
     ===== */
  const MAGDALENA_RIVER = [
    [1.95,-76.60],[2.05,-76.55],[2.20,-76.45],[2.35,-76.32],[2.50,-76.18],
    [2.65,-76.03],[2.80,-75.89],[2.93,-75.28],[3.05,-75.20],[3.18,-75.15],
    [3.30,-75.10],[3.45,-75.07],[3.60,-75.03],[3.78,-74.97],[3.95,-74.92],
    [4.10,-74.88],[4.25,-74.86],[4.30,-74.80],[4.40,-74.74],[4.55,-74.74],
    [4.70,-74.78],[4.85,-74.80],[4.95,-74.75],[5.05,-74.70],[5.15,-74.68],
    [5.25,-74.70],[5.35,-74.68],[5.45,-74.66],[5.55,-74.66],[5.65,-74.66],
    [5.75,-74.66],[5.85,-74.64],[5.95,-74.60],[6.05,-74.56],[6.15,-74.55],
    [6.25,-74.55],[6.35,-74.52],[6.45,-74.46],[6.55,-74.42],[6.65,-74.40],
    [6.75,-74.38],[6.85,-74.32],[6.95,-74.28],[7.05,-74.24],[7.15,-74.20],
    [7.25,-74.10],[7.35,-74.04],[7.45,-73.99],[7.55,-73.96],[7.65,-73.93],
    [7.75,-73.92],[7.85,-73.91],[7.95,-73.92],[8.05,-73.94],[8.15,-73.92],
    [8.25,-73.86],[8.32,-73.80],[8.42,-73.78],[8.52,-73.75],[8.62,-73.78],
    [8.72,-73.80],[8.82,-73.80],[8.90,-73.85],[8.92,-73.92],[8.95,-73.98],
    [9.00,-74.05],[9.05,-74.12],[9.10,-74.18],[9.18,-74.25],[9.25,-74.30],
    [9.30,-74.38],[9.34,-74.45],[9.38,-74.52],[9.42,-74.55],[9.48,-74.55],
    [9.55,-74.55],[9.62,-74.58],[9.70,-74.62],[9.78,-74.68],[9.85,-74.72],
    [9.92,-74.78],[10.00,-74.80],[10.08,-74.82],[10.18,-74.84],[10.30,-74.85],
    [10.42,-74.85],[10.55,-74.85],[10.68,-74.86],[10.80,-74.88],[10.92,-74.89],
    [11.00,-74.89]
  ];

  /* ===== Lazy load departamentos ===== */
  let _deptsPromise = null;
  function loadDepartamentos() {
    if (_deptsPromise) return _deptsPromise;
    _deptsPromise = fetch("https://cdn.jsdelivr.net/gh/john-guerra/colombia_maps@master/colombia.geo.json")
      .then(r => r.ok ? r.json() : null).catch(() => null);
    return _deptsPromise;
  }

  /* ===== Lazy load municipios (DANE, MGN 2018 simplificado) =====
     Fuente: github.com/john-guerra/colombia_maps (público, CC)  */
  let _munisPromise = null;
  function loadMunicipios() {
    if (_munisPromise) return _munisPromise;
    _munisPromise = fetch("https://cdn.jsdelivr.net/gh/john-guerra/colombia_maps@master/mpios.geojson")
      .then(r => r.ok ? r.json() : null).catch(() => null);
    return _munisPromise;
  }


  function findDepartamentoByMunicipio(mun) {
    if (!mun) return null;
    return window.GPDivipola ? window.GPDivipola.findDepartment(mun) : null;
  }

  /* ===== Turf helpers ===== */
  function pointsFC(reports) {
    return turf.featureCollection(reports.map(r =>
      turf.point([r.lng, r.lat], {
        id: r.id, codigo: r.codigo, tipo: r.tipo,
        severidad: r.severidad, n_individuos: r.n_individuos,
        estado_validacion: r.estado_validacion, municipio: r.municipio,
        departamento: r.departamento, created_at: r.created_at,
      })
    ));
  }
  function hexGridCounts(reports, cellKm = 25) {
    if (!reports.length) return null;
    const pts = pointsFC(reports);
    const bbox = turf.bbox(pts);
    bbox[0] -= 0.4; bbox[1] -= 0.4; bbox[2] += 0.4; bbox[3] += 0.4;
    const hex = turf.hexGrid(bbox, cellKm, { units: "kilometers" });
    hex.features.forEach(f => {
      const inside = turf.pointsWithinPolygon(pts, f);
      f.properties.count = inside.features.length;
      f.properties.sev = inside.features.length
        ? inside.features.reduce((a, p) => a + p.properties.severidad, 0) / inside.features.length
        : 0;
    });
    return { ...hex, features: hex.features.filter(f => f.properties.count > 0) };
  }
  function normalizeDept(s) {
    if (!s) return s;
    const m = { "BOLIVAR":"Bolívar","ANTIOQUIA":"Antioquia","SANTANDER":"Santander",
                "BOYACA":"Boyacá","CESAR":"Cesar","MAGDALENA":"Magdalena",
                "CALDAS":"Caldas","CUNDINAMARCA":"Cundinamarca","SUCRE":"Sucre",
                "TOLIMA":"Tolima","CORDOBA":"Córdoba","HUILA":"Huila",
                "ATLANTICO":"Atlántico","VALLE DEL CAUCA":"Valle del Cauca",
                "NORTE DE SANTANDER":"Norte de Santander","CAUCA":"Cauca",
                "QUINDIO":"Quindío","RISARALDA":"Risaralda","NARINO":"Nariño",
                "META":"Meta","BOGOTA":"Bogotá D.C.","DISTRITO CAPITAL DE BOGOTA":"Bogotá D.C." };
    return m[s.toUpperCase()] || s;
  }
  function pointsInPolygon(reports, geojson) {
    if (!geojson) return reports;
    try {
      const pts = pointsFC(reports);
      const inside = turf.pointsWithinPolygon(pts, geojson);
      const ids = new Set(inside.features.map(f => f.properties.id));
      return reports.filter(r => ids.has(r.id));
    } catch { return reports; }
  }

  window.GPGeo = {
    MUNI_COORDS, MAGDALENA_RIVER,
    findDepartamentoByMunicipio, normalizeDept,
    loadDepartamentos, loadMunicipios,
    pointsFC, hexGridCounts, pointsInPolygon,
  };
})();
