-- GEOPOTAMO · Función para registro de perfil
-- Ejecutar en Supabase → SQL Editor
--
-- Por qué es necesaria:
--   Cuando signUp() retorna un usuario existente (email confirm OFF),
--   la sesión RPC puede estar sin JWT activo, haciendo que INSERT/SELECT
--   fallen silenciosamente por RLS. Esta función corre con security definer
--   (privilegios del creador), bypassa RLS solo para la operación de registro,
--   y retorna el estado para que el frontend muestre el mensaje correcto.

create or replace function public.gp_register_profile(
  p_user_id    uuid,
  p_email      text,
  p_nombre     text,
  p_organizacion text,
  p_municipio  text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
begin
  -- Solo el propio usuario puede registrar su perfil
  if auth.uid() is distinct from p_user_id then
    raise exception 'No autorizado';
  end if;

  -- Verificar si ya existe un perfil para este user_id
  select estado_cuenta into v_estado
  from public.perfiles
  where id = p_user_id;

  if not found then
    -- Nuevo registro
    insert into public.perfiles (
      id, email, nombre, organizacion, municipio, rol, estado_cuenta
    ) values (
      p_user_id,
      lower(trim(p_email)),
      trim(p_nombre),
      nullif(trim(coalesce(p_organizacion, '')), ''),
      nullif(trim(coalesce(p_municipio, '')), ''),
      'reporter',
      'pendiente'
    );
    return 'created';
  end if;

  -- Perfil ya existe: manejar según estado
  if v_estado = 'rechazado' then
    update public.perfiles set
      nombre         = trim(p_nombre),
      organizacion   = nullif(trim(coalesce(p_organizacion, '')), ''),
      municipio      = nullif(trim(coalesce(p_municipio, '')), ''),
      estado_cuenta  = 'pendiente',
      approved_by    = null,
      approved_at    = null
    where id = p_user_id;
    return 'updated';

  elsif v_estado = 'pendiente' then
    return 'already_pending';

  else
    -- aprobado o inactivo
    return 'already_active';
  end if;
end;
$$;

-- Permitir llamar la función desde el cliente anon/authenticated
grant execute on function public.gp_register_profile(uuid, text, text, text, text) to anon, authenticated;
