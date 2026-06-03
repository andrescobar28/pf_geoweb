# GEOPOTAMO

Sistema web de reporte ciudadano y análisis geoespacial de *Hippopotamus amphibius* en la cuenca del río Magdalena, Colombia. Desarrollado como proyecto de especialización en Geomática — Universidad del Valle.

---

## Características principales

- **Geovisor público** — mapa interactivo con reportes validados, filtros por tipo, severidad, municipio y departamento, y capas WMS institucionales (IGAC, IDEAM, DANE)
- **Módulo de reporte ciudadano** — formulario georreferenciado con validación de coordenadas, subida de evidencia y seguimiento del estado de validación
- **Panel de administración** — validación/rechazo de reportes, gestión del ciclo de vida de cuentas, archivado individual y masivo, bitácora de auditoría
- **Análisis geoespacial** — grilla hexagonal de densidad (25 km), filtrado por polígono dibujado, análisis por unidad administrativa
- **Proyección poblacional** — modelo logístico calibrado (N₀=181, r=0.16/año, K=31 097) con cuatro escenarios de manejo hasta 2100

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| UI | React + Babel Standalone | 18.3.1 / 7.29.0 |
| Mapas | Leaflet + MarkerCluster + Geoman | 1.9.4 / 1.5.3 / 2.17.0 |
| Análisis espacial | @turf/turf | 7.1.0 |
| Gráficos | Chart.js | 4.4.4 |
| Backend | Supabase (Auth + PostgREST + PostgreSQL 15 + PostGIS) | SDK 2.45.4 |
| Estilos | Tailwind CSS (CDN) | — |

> No requiere proceso de compilación. Todos los módulos JSX se transpilan en el navegador mediante Babel Standalone.

---

## Estructura del proyecto

```
geopotamo/
├── index.html          # Enrutador de sesión (redirige según rol)
├── login.html          # Autenticación y registro
├── viewer.html         # Geovisor público (sin login)
├── reporter.html       # Panel del reportero (autenticado)
├── admin.html          # Panel de administración (rol admin)
│
├── js/
│   ├── config.js       # Configuración global
│   ├── models.js       # Entidades del dominio (Perfil, Reporte, GeoPoint)
│   ├── presenter.js    # Capa MVP (AuthPresenter, ReportPresenter, UserPresenter)
│   ├── env.example.js  # Plantilla de credenciales
│   └── env.js          # Credenciales locales (excluido del repo)
│
├── src/
│   ├── data.jsx        # DataService — API unificada Supabase / mock
│   ├── app.jsx         # Enrutador React de estados de sesión
│   ├── viewer.jsx      # Componente geovisor
│   ├── reporter.jsx    # Componente panel reportero
│   ├── admin.jsx       # Componente panel administración
│   ├── maps.jsx        # Capas cartográficas y WMS
│   ├── geo.jsx         # Análisis geoespacial con Turf.js
│   ├── charts.jsx      # Gráficos estadísticos
│   ├── projection.jsx  # Modelo logístico de proyección poblacional
│   ├── divipola.jsx    # Catálogo DIVIPOLA-DANE (1 122 municipios)
│   ├── login.jsx       # Formulario de autenticación
│   └── ui.jsx          # Componentes compartidos
│
├── supabase/
│   ├── 000_schema.sql              # Esquema base (tablas, índices, RLS, triggers)
│   ├── 001_soft_delete_reportes.sql # Archivado lógico y vistas analíticas
│   └── 002_register_function.sql   # RPC gp_register_profile
│
├── css/
├── data/               # magdalena2.geojson (~3.7 MB)
└── package.json        # Solo @turf/turf como dependencia npm
```

---

## Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/andrescobar28/geopotamo.git
cd geopotamo
```

### 2. Configurar credenciales

```bash
cp js/env.example.js js/env.js
```

Editar `js/env.js` con las credenciales del proyecto Supabase:

```js
window.GEOPOTAMO_CONFIG = {
  SUPABASE_URL: "https://TU_PROJECT_ID.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGci..."
};
```

> **Sin credenciales** el sistema opera automáticamente en **modo mock** con datos semilla (132 reportes, 8 usuarios) almacenados en `localStorage`. No se requiere ninguna configuración adicional para explorar la interfaz.

### 3. Ejecutar

No hay proceso de build. Sirve los archivos estáticos con cualquier servidor local:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .

# VS Code
# Extensión Live Server → Open with Live Server
```

Abrir `http://localhost:8080` en el navegador.

---

## Base de datos (Supabase)

Ejecutar los scripts de migración en orden sobre un proyecto Supabase vacío:

```sql
-- En el SQL Editor de Supabase:
\i supabase/000_schema.sql
\i supabase/001_soft_delete_reportes.sql
\i supabase/002_register_function.sql
```

El esquema crea:

- **3 tablas**: `perfiles`, `reportes`, `audit_log`
- **10 índices**: 1 GIST espacial sobre `geom`, 9 B-tree sobre columnas de filtrado frecuente
- **4 triggers**: generación de código `GP-####`, prevención de autovalidación, protección del último administrador, columna `geom` computada
- **10 políticas RLS**: control de acceso granular por rol y estado de cuenta
- **4 vistas analíticas**: `reportes_activos`, `reportes_por_municipio`, `reportes_por_departamento`, `actividad_usuarios`

---

## Roles y flujo de acceso

```
Usuario anónimo → geovisor público (viewer.html)
                → solicitud de cuenta (login.html)

Reporter        → crear / editar reportes propios
(aprobado)      → análisis geoespacial y proyección poblacional

Administrador   → validar / rechazar reportes
                → aprobar / suspender cuentas
                → archivar reportes (individual o masivo)
                → bitácora de auditoría
```

La aprobación de cuentas es manual: un administrador debe cambiar `estado_cuenta` de `'pendiente'` a `'aprobado'` para que el usuario pueda reportar.

---

## Modo mock (desarrollo sin backend)

Si `js/env.js` no existe o las credenciales son nulas, `window.GP` opera sobre `localStorage`. Los datos semilla incluyen:

- 132 reportes distribuidos en 21 municipios de la cuenca del Magdalena
- 8 usuarios: 2 administradores, 4 reporteros aprobados, 1 pendiente, 1 rechazado
- Todos los estados de validación representados

Para forzar modo mock en cualquier momento, vaciar las credenciales en `js/env.js`.

---

## Fuentes de datos externas

| Fuente | Tipo | Uso |
|--------|------|-----|
| IGAC `divisionpoliticoadministrativa` | WMS | Límites administrativos |
| IDEAM `Estado_Ecosistemas` | WMS | Ecosistemas continentales |
| IDEAM `Estado_Cobertura_Tierra` | WMS | Cobertura del suelo 2018 |
| DANE `Cache_MpiosDensidadDePoblacionResto_2005` | WMS | Densidad poblacional resto |
| jsDelivr / `john-guerra/colombia_maps` | GeoJSON | Límites depts. y municipios |
| SOCRATA / datos.gov.co | JSON API | Catálogo DIVIPOLA actualizado |
| CartoDB / ArcGIS / OpenTopoMap / Stadia | Teselas | Mapas base |

---

## Autores

| Nombre | Rol | Contacto |
|--------|-----|----------|
| Andrés Julián Escobar Cardona | Arquitectura, desarrollo full-stack y modelado de datos | [LinkedIn](https://www.linkedin.com/in/ajulescobar/) |
| Sara Camila Varela | Desarrollo frontend, integración de servicios WMS y cartografía | [LinkedIn](https://www.linkedin.com/in/saracamilavarela/) |

Proyecto desarrollado en el marco de la **Especialización en Geomática**,  
Escuela de Ingeniería de Recursos Naturales y del Ambiente (EIDENAR),  
**Universidad del Valle** — Cali, Colombia, 2025.
---

## Licencia

[![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

Este trabajo está licenciado bajo
[Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Eres libre de compartir y adaptar el material siempre que des
**crédito apropiado**, no lo uses con **fines comerciales** y
distribuyas las contribuciones bajo la **misma licencia**.
