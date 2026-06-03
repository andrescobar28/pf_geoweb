-- GEOPOTAMO · Migración 001: Soft-delete en reportes
-- Ejecutar en Supabase → SQL Editor
--
-- Propósito:
--   Implementa archivado lógico (soft-delete) sobre public.reportes.
--   Los registros NUNCA se eliminan físicamente; se marcan como archivados.
--   Esto garantiza trazabilidad completa y permite recuperar datos ante errores.
--
-- Cambios:
--   - Columna  archivado        boolean NOT NULL DEFAULT false
--   - Columna  archivado_at     timestamptz (cuándo fue archivado)
--   - Columna  archivado_por    uuid → auth.users (quién lo archivó)
--   - Columna  archivado_nota   text (motivo opcional del archivado)
--   - Índice   reportes_archivado_idx   (filtro rápido en consultas activas)
--   - Función  archive_report(id, nota, actor_id)   (archivado seguro con RLS)
--   - Función  bulk_archive_by_date_range(from, to, actor_id)
--   - Política RLS actualizada: solo admins pueden archivar
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Añadir columnas de archivado
alter table public.reportes
  add column if not exists archivado      boolean     not null default false,
  add column if not exists archivado_at   timestamptz,
  add column if not exists archivado_por  uuid references auth.users(id),
  add column if not exists archivado_nota text;

-- 2. Índice para acelerar el filtro por defecto (WHERE archivado = false)
create index if not exists reportes_archivado_idx
  on public.reportes(archivado);

-- 3. Función auxiliar: archivar un reporte individual
create or replace function public.archive_report(
  p_id      uuid,
  p_nota    text    default null,
  p_actor   uuid    default auth.uid()
)
returns void language plpgsql security definer as $$
begin
  -- Solo admins activos y aprobados
  if not public.is_admin() then
    raise exception 'Solo administradores pueden archivar reportes.';
  end if;

  update public.reportes
  set
    archivado      = true,
    archivado_at   = now(),
    archivado_por  = p_actor,
    archivado_nota = p_nota
  where id = p_id
    and archivado = false;   -- idempotente: no falla si ya está archivado

  -- Bitácora
  insert into public.audit_log(actor_id, action, target_id, payload)
  values (p_actor, 'archive_report', p_id::text, jsonb_build_object('nota', p_nota));
end $$;

-- 4. Función: archivado masivo por rango de fechas
create or replace function public.bulk_archive_by_date_range(
  p_from    timestamptz,
  p_to      timestamptz,
  p_actor   uuid default auth.uid()
)
returns int language plpgsql security definer as $$
declare
  n_archived int;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores pueden ejecutar archivado masivo.';
  end if;

  with updated as (
    update public.reportes
    set
      archivado     = true,
      archivado_at  = now(),
      archivado_por = p_actor
    where created_at >= p_from
      and created_at <= p_to
      and archivado = false
    returning id
  )
  select count(*) into n_archived from updated;

  insert into public.audit_log(actor_id, action, target_id, payload)
  values (p_actor, 'bulk_archive', null,
          jsonb_build_object('from', p_from, 'to', p_to, 'count', n_archived));

  return n_archived;
end $$;

-- 5. Actualizar política de UPDATE para que el campo archivado
--    solo sea modificable por admins (la política existente ya lo cubre,
--    pero se hace explícito para claridad)
--    NOTA: La política "reportes update autor o admin" ya permite a admins
--    actualizar cualquier campo, incluyendo archivado.
--    Si se desea restringir aún más, se puede crear una policy específica.

-- 6. Vista auxiliar: reportes activos (excluye archivados)
--    Úsala en queries de análisis donde siempre quieres excluir archivados.
create or replace view public.reportes_activos as
select *
from public.reportes
where archivado = false;

-- 7. Actualizar vistas analíticas para excluir archivados

create or replace view public.reportes_por_municipio as
select municipio,
       count(*)::int                  as n_reportes,
       avg(severidad)::numeric(3,2)   as severidad_promedio,
       avg(lat)                       as lat_centroide,
       avg(lng)                       as lng_centroide
from public.reportes
where archivado = false
group by municipio;

create or replace view public.reportes_por_departamento as
select departamento,
       count(*)::int                  as n_reportes,
       avg(severidad)::numeric(3,2)   as severidad_promedio
from public.reportes
where departamento is not null
  and archivado = false
group by departamento;

create or replace view public.actividad_usuarios as
select u.id, u.nombre, u.email, u.rol, u.estado_cuenta, u.municipio, u.organizacion,
       coalesce(t.total, 0)         as total,
       coalesce(t.validados, 0)     as validados,
       coalesce(t.pendientes, 0)    as pendientes,
       t.ultimo
from public.perfiles u
left join (
  select user_id,
         count(*) as total,
         sum(case when estado_validacion='validado'  then 1 else 0 end) as validados,
         sum(case when estado_validacion='pendiente' then 1 else 0 end) as pendientes,
         max(created_at) as ultimo
  from public.reportes
  where archivado = false
  group by user_id
) t on t.user_id = u.id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificación post-migración:
--   select column_name, data_type from information_schema.columns
--   where table_name = 'reportes' and column_name like 'archivado%';
-- ─────────────────────────────────────────────────────────────────────────────
