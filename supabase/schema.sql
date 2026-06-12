-- ─────────────────────────────────────────────────────────────────────────────
-- Mundialiten · esquema de Supabase
-- Pegá todo esto en el editor SQL de tu proyecto (SQL Editor → New query → Run).
-- ─────────────────────────────────────────────────────────────────────────────

-- Predicciones: una por usuario, PRIVADAS (cada uno ve sólo la suya).
create table if not exists public.predictions (
  user_id uuid primary key references auth.users on delete cascade,
  results jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.predictions enable row level security;
create policy "pred_select_own" on public.predictions
  for select to authenticated using (auth.uid() = user_id);
create policy "pred_insert_own" on public.predictions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "pred_update_own" on public.predictions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Puntajes: alimentan el ranking. Legibles por cualquier usuario logueado
-- (sólo nombre + puntos + %), pero cada uno escribe únicamente el suyo.
-- El ranking se ordena por `points` (puntos acumulados en todo el Mundial).
create table if not exists public.scores (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  accuracy numeric not null default 0,
  points numeric not null default 0,
  factors jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
-- Si ya tenías la tabla creada (sin la columna points), corré además:
--   alter table public.scores add column if not exists points numeric not null default 0;
alter table public.scores enable row level security;
create policy "scores_select_all" on public.scores
  for select to authenticated using (true);
create policy "scores_insert_own" on public.scores
  for insert to authenticated with check (auth.uid() = user_id);
create policy "scores_update_own" on public.scores
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Resultados reales: compartidos por todos (una sola fila, id = 1).
create table if not exists public.real_results (
  id int primary key default 1 check (id = 1),
  results jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.real_results enable row level security;
create policy "real_select_all" on public.real_results
  for select using (true);
create policy "real_insert_auth" on public.real_results
  for insert to authenticated with check (true);
create policy "real_update_auth" on public.real_results
  for update to authenticated using (true);

-- Recordatorios por mail ya enviados (para no repetir). La usa SÓLO el cron con
-- la service role key (que saltea RLS), así que no hace falta ninguna policy:
-- con RLS activado y sin policies, ningún usuario común puede leerla/escribirla.
--   bucket: group | r32 | r16 | qf | finals
--   kind:   'open' (se abrió la etapa) | 'lastcall' (último aviso antes del 1er partido)
create table if not exists public.reminders (
  user_id uuid not null references auth.users on delete cascade,
  bucket text not null,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, bucket, kind)
);
alter table public.reminders enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- RECÁLCULO AUTOMÁTICO DEL RANKING (servidor)
--
-- Antes el puntaje se calculaba en el dispositivo de cada usuario al abrir la
-- app, así que quien no reabría quedaba con el puntaje viejo. Esta función
-- recalcula points/accuracy de TODOS desde las predicciones vs los resultados
-- reales, y un trigger la dispara cada vez que cambian los resultados reales.
--
-- Misma regla que el motor (src/engine/accuracy.ts → STAGE_POINTS):
--   exacto:          grupos 3 · 16avos 4 · 8vos 5 · 4tos 6 · semis 8 · 3º/final 10
--   sólo resultado:  grupos 1 · 16avos 2 · 8vos 2 · 4tos 3 · semis 4 · 3º/final  5
-- Rangos de partido: grupos 1–72 · 16avos 73–88 · 8vos 89–96 · 4tos 97–100 ·
--                    semis 101–102 · 3º 103 · final 104.
-- (Si cambia STAGE_POINTS en el motor, actualizar estos CASE. El test
--  tests/scoring-dataset.test.ts bloquea esos valores para avisar.)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.recompute_all_scores()
returns void
language sql
security definer
set search_path = public
as $$
  with realm as (
    select (e.key)::int as mid, e.value as rv
    from public.real_results rr, lateral jsonb_each(rr.results) e
    where rr.id = 1 and e.key ~ '^[0-9]+$' and (e.value->>'played') = 'true'
  ),
  predm as (
    select p.user_id, (e.key)::int as mid, e.value as pv
    from public.predictions p, lateral jsonb_each(p.results) e
    where e.key ~ '^[0-9]+$' and (e.value->>'played') = 'true'
  ),
  calc as (
    select p.user_id,
      (case when r.mid<=72 then 3 when r.mid<=88 then 4 when r.mid<=96 then 5
            when r.mid<=100 then 6 when r.mid<=102 then 8 else 10 end) as exact_pts,
      case
        when (p.pv->>'homeScore') = (r.rv->>'homeScore')
         and (p.pv->>'awayScore') = (r.rv->>'awayScore')
          then (case when r.mid<=72 then 3 when r.mid<=88 then 4 when r.mid<=96 then 5
                     when r.mid<=100 then 6 when r.mid<=102 then 8 else 10 end)
        when sign(((p.pv->>'homeScore')::int) - ((p.pv->>'awayScore')::int))
           = sign(((r.rv->>'homeScore')::int) - ((r.rv->>'awayScore')::int))
          then (case when r.mid<=72 then 1 when r.mid<=88 then 2 when r.mid<=96 then 2
                     when r.mid<=100 then 3 when r.mid<=102 then 4 else 5 end)
        else 0
      end as award
    from realm r join predm p on p.mid = r.mid
  ),
  agg as (
    select user_id, sum(award) as points, sum(exact_pts) as maxp
    from calc group by user_id
  )
  update public.scores s
  set points = coalesce(a.points, 0),
      accuracy = case when coalesce(a.maxp, 0) > 0
                      then round(coalesce(a.points, 0)::numeric / a.maxp * 100, 2) else 0 end,
      updated_at = now()
  from public.scores s2
  left join agg a on a.user_id = s2.user_id
  where s.user_id = s2.user_id;
$$;

-- Cada vez que cambian los resultados reales (los sube un cliente al sincronizar
-- en vivo), recalculamos el ranking de todos.
create or replace function public.trg_recompute_scores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_all_scores();
  return null;
end;
$$;

drop trigger if exists recompute_on_real_change on public.real_results;
create trigger recompute_on_real_change
  after insert or update on public.real_results
  for each statement execute function public.trg_recompute_scores();

-- Recálculo inmediato (arregla los puntajes ya guardados):
--   select public.recompute_all_scores();
