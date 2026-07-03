-- ─────────────────────────────────────────────────────────────────────────────
-- PROTECCIÓN SERVER-SIDE de resultados CONGELADOS (`locked`).
--
-- El candado `locked` del cliente (v6.2.3) no alcanza: una pestaña vieja con un
-- bundle anterior puede subir su estado local y PISAR la corrección (pasó con el
-- P75: quedó de nuevo con la tanda sumada al marcador y sin el candado).
--
-- Este trigger corre en la base, ANTES de cada update de real_results: si una
-- entrada vieja tiene locked=true y la nueva versión viene SIN la clave 'locked'
-- (típico de un cliente viejo, que ni conoce el campo), restaura la entrada
-- vieja completa. Reglas:
--   · entrada nueva sin 'locked'      → se RESTAURA la vieja (protegido)
--   · entrada nueva con locked:true   → se respeta (re-corrección manual)
--   · entrada nueva con locked:false  → se respeta (deslock intencional)
--
-- Idempotente. Correr entero en el SQL Editor de Supabase.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.protect_locked_results()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  old_v jsonb;
begin
  if old.results is null then
    return new;
  end if;
  if new.results is null then
    new.results = '{}'::jsonb;
  end if;
  for k, old_v in select key, value from jsonb_each(old.results) loop
    if (old_v->>'locked') = 'true' and not coalesce((new.results->k) ? 'locked', false) then
      new.results = jsonb_set(new.results, array[k], old_v);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists protect_locked on public.real_results;
create trigger protect_locked
  before update on public.real_results
  for each row execute function public.protect_locked_results();
