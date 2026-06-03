-- GEOPOTAMO · Esquema de base de datos para Supabase (Postgres + PostGIS)
-- Ejecutar en Supabase → SQL Editor

create extension if not exists "uuid-ossp";
create extension if not exists postgis;

------------------------------------------------------------------
-- 1. Perfiles (extiende auth.users) — 3 estados de cuenta + 2 roles
------------------------------------------------------------------
create table if not exists public.perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  nombre          text not null,
  organizacion    text,
  municipio       text,
  rol             text not null default 'reporter' check (rol in ('reporter','admin')),
  estado_cuenta   text not null default 'pendiente' check (estado_cuenta in ('pendiente','aprobado','rechazado')),
  activo          boolean not null default true,
  approved_by     uuid references auth.users(id),
  approved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists perfiles_estado_idx on public.perfiles(estado_cuenta);
create index if not exists perfiles_rol_idx    on public.perfiles(rol);
create index if not exists perfiles_activo_idx on public.perfiles(activo);

-- Guard: el sistema debe mantener al menos un admin activo y aprobado
create or replace function public.ensure_last_admin()
returns trigger language plpgsql as $$
declare
  remaining int;
begin
  if (old.rol = 'admin'
      and old.activo = true
      and old.estado_cuenta = 'aprobado')
     and (new.rol <> 'admin'
          or new.activo = false
          or new.estado_cuenta <> 'aprobado') then
    select count(*) into remaining from public.perfiles
      where rol = 'admin' and activo = true and estado_cuenta = 'aprobado' and id <> old.id;
    if remaining = 0 then
      raise exception 'El sistema debe mantener al menos un administrador activo y aprobado.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_ensure_last_admin on public.perfiles;
create trigger trg_ensure_last_admin before update on public.perfiles
for each row execute function public.ensure_last_admin();

------------------------------------------------------------------
-- 2. Reportes
------------------------------------------------------------------
create table if not exists public.reportes (
  id                  uuid primary key default uuid_generate_v4(),
  codigo              text unique not null,
  tipo                text not null check (tipo in
                       ('avistamiento','huella','conflicto','cultivo','vialidad','ambiental','captura')),
  severidad           int  not null check (severidad between 1 and 4),
  n_individuos        int  not null default 1 check (n_individuos > 0),
  descripcion         text,
  lat                 double precision not null,
  lng                 double precision not null,
  municipio           text,
  departamento        text,
  estado_validacion   text not null default 'pendiente'
                        check (estado_validacion in ('pendiente','validado','rechazado')),
  validated_by        uuid references auth.users(id),
  validated_at        timestamptz,
  validation_note     text,
  user_id             uuid references auth.users(id) on delete set null,
  evidencia_url       text,
  geom                geography(point, 4326) generated always as
                        (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  created_at          timestamptz not null default now()
);
create index if not exists reportes_geom_idx        on public.reportes using gist(geom);
create index if not exists reportes_created_idx     on public.reportes(created_at desc);
create index if not exists reportes_estado_idx      on public.reportes(estado_validacion);
create index if not exists reportes_tipo_idx        on public.reportes(tipo);
create index if not exists reportes_departamento_idx on public.reportes(departamento);
create index if not exists reportes_user_idx        on public.reportes(user_id);

------------------------------------------------------------------
-- 3. Bitácora de auditoría
------------------------------------------------------------------
create table if not exists public.audit_log (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid references auth.users(id),
  action      text not null,
  target_id   text,
  payload     jsonb,
  ts          timestamptz not null default now()
);
create index if not exists audit_log_ts_idx on public.audit_log(ts desc);

------------------------------------------------------------------
-- 4. Trigger: generar código GP-#### automáticamente
------------------------------------------------------------------
create sequence if not exists reportes_codigo_seq start 1;
create or replace function public.set_codigo()
returns trigger language plpgsql as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := 'GP-' || lpad(nextval('reportes_codigo_seq')::text, 4, '0');
  end if;
  return new;
end $$;
drop trigger if exists trg_set_codigo on public.reportes;
create trigger trg_set_codigo before insert on public.reportes
for each row execute function public.set_codigo();

------------------------------------------------------------------
-- 5. Trigger: impedir AUTOVALIDACIÓN
--   Un admin no puede validar/rechazar su propio reporte.
------------------------------------------------------------------
create or replace function public.prevent_self_validation()
returns trigger language plpgsql as $$
begin
  if new.estado_validacion <> old.estado_validacion
     and new.validated_by is not null
     and new.validated_by = old.user_id then
    raise exception 'Un administrador no puede validar su propio reporte.';
  end if;
  return new;
end $$;
drop trigger if exists trg_no_autoval on public.reportes;
create trigger trg_no_autoval before update on public.reportes
for each row execute function public.prevent_self_validation();

------------------------------------------------------------------
-- 6. Row Level Security
------------------------------------------------------------------
alter table public.perfiles  enable row level security;
alter table public.reportes  enable row level security;
alter table public.audit_log enable row level security;

-- helper: ¿el usuario actual es admin?
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists (select 1 from public.perfiles p
                 where p.id = auth.uid()
                   and p.rol = 'admin'
                   and p.activo = true
                   and p.estado_cuenta = 'aprobado');
$$;

-- ===== Perfiles =====
drop policy if exists "perfil select"         on public.perfiles;
drop policy if exists "perfil insert propio"  on public.perfiles;
drop policy if exists "perfil update propio"  on public.perfiles;
drop policy if exists "perfil update admin"   on public.perfiles;

create policy "perfil select"
  on public.perfiles for select
  using (auth.uid() = id or public.is_admin());

create policy "perfil insert propio"
  on public.perfiles for insert
  with check (auth.uid() = id);

create policy "perfil update propio"
  on public.perfiles for update
  using (auth.uid() = id);

create policy "perfil update admin"
  on public.perfiles for update
  using (public.is_admin());

-- ===== Reportes =====
drop policy if exists "reportes lectura publica" on public.reportes;
drop policy if exists "reportes insert reporter aprobado" on public.reportes;
drop policy if exists "reportes update autor o admin" on public.reportes;
drop policy if exists "reportes delete admin" on public.reportes;

-- Lectura pública (geovisor abierto)
create policy "reportes lectura publica"
  on public.reportes for select using (true);

-- Insert: solo usuarios autenticados Y con cuenta aprobada y activa
create policy "reportes insert reporter aprobado"
  on public.reportes for insert
  with check (
    auth.uid() = user_id and
    exists (select 1 from public.perfiles p
             where p.id = auth.uid() and p.activo = true and p.estado_cuenta = 'aprobado')
  );

-- Update: autor (sin tocar estado_validacion) o admin
create policy "reportes update autor o admin"
  on public.reportes for update
  using (auth.uid() = user_id or public.is_admin());

-- Delete: solo admin
create policy "reportes delete admin"
  on public.reportes for delete
  using (public.is_admin());

-- ===== Audit log =====
drop policy if exists "audit insert auth"  on public.audit_log;
drop policy if exists "audit select admin" on public.audit_log;
create policy "audit insert auth"  on public.audit_log for insert with check (auth.uid() is not null);
create policy "audit select admin" on public.audit_log for select using (public.is_admin());

------------------------------------------------------------------
-- 7. Vistas analíticas
------------------------------------------------------------------
create or replace view public.reportes_por_municipio as
select municipio,
       count(*)::int                  as n_reportes,
       avg(severidad)::numeric(3,2)   as severidad_promedio,
       avg(lat)                       as lat_centroide,
       avg(lng)                       as lng_centroide
from public.reportes
group by municipio;

create or replace view public.reportes_por_departamento as
select departamento,
       count(*)::int                  as n_reportes,
       avg(severidad)::numeric(3,2)   as severidad_promedio
from public.reportes
where departamento is not null
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
  from public.reportes group by user_id
) t on t.user_id = u.id;

------------------------------------------------------------------
-- 8. Bootstrap del primer admin
--   Tras crear el primer usuario en Authentication, ejecuta:
------------------------------------------------------------------
select id, email
from auth.users;
---------

insert into public.perfiles (id, email, nombre, rol, estado_cuenta, approved_at)
values ('cb4b0750-20c1-4afd-b1ae-d229f4f00779', 'admin@geopotamo.co', 'Admin Cuenca', 'admin', 'aprobado', now());

insert into public.perfiles (id, email, nombre, rol, estado_cuenta, approved_at)
values ('e96a16dd-91ca-40b1-bdc5-caed765dd270', 'admin2@geopotamo.co', 'Admin Cuenca2', 'admin', 'aprobado', now());

insert into public.perfiles (id, email, nombre, rol, estado_cuenta, approved_at)
values ('e061bb72-7066-4f68-9d27-e0b3eda8e2d1', 'reporter@geopotamo.co', 'Reporter Test', 'reporter', 'aprobado', now());