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
  -- Snapshot del último partido jugado (lo completa recompute_all_scores), para
  -- mostrar en el ranking la flecha de cambio de puesto + la última predicción.
  last_match_id int,
  last_pred_home int,
  last_pred_away int,
  last_points numeric not null default 0,
  updated_at timestamptz not null default now()
);
-- Si ya tenías la tabla creada, corré además (idempotente):
--   alter table public.scores add column if not exists points numeric not null default 0;
alter table public.scores add column if not exists last_match_id int;
alter table public.scores add column if not exists last_pred_home int;
alter table public.scores add column if not exists last_pred_away int;
alter table public.scores add column if not exists last_points numeric not null default 0;
alter table public.scores add column if not exists avatar_url text; -- foto de perfil (data URL)
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

-- Imagen compartida del encabezado: una sola fila (id = 1) con la imagen para
-- modo claro y la de modo oscuro (guardadas como data URL en texto). La VEN
-- todos (incluso sin login), pero sólo el admin (por su email en el JWT) puede
-- crearla o cambiarla.
create table if not exists public.branding (
  id int primary key default 1 check (id = 1),
  light_url text,
  dark_url text,
  img_scale numeric not null default 1, -- escala de toda la barra de arriba
  updated_at timestamptz not null default now()
);
-- Si ya tenías la tabla creada, agrega la columna (idempotente):
alter table public.branding add column if not exists img_scale numeric not null default 1;
alter table public.branding enable row level security;
-- Lectura para cualquiera: la imagen la ve todo el mundo.
drop policy if exists "branding_select_all" on public.branding;
create policy "branding_select_all" on public.branding
  for select using (true);
-- Escritura SÓLO para el admin, identificado por su email en el JWT.
drop policy if exists "branding_insert_admin" on public.branding;
create policy "branding_insert_admin" on public.branding
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'boggianooctavio@gmail.com');
drop policy if exists "branding_update_admin" on public.branding;
create policy "branding_update_admin" on public.branding
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'boggianooctavio@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'boggianooctavio@gmail.com');

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
  ),
  -- Último partido jugado, por HORA DE INICIO. Los nº de partido NO están en
  -- orden cronológico (p.ej. el 14 arranca antes que el 13), así que NO sirve
  -- max(mid). Mapa id→kickoff (ms UTC), generado de src/data/schedule.ts.
  ko(mid, ts) as (values
    (1,1781204400000), (2,1781229600000), (3,1781290800000), (4,1781312400000), (5,1781377200000), (6,1781388000000), (7,1781398800000), (8,1781409600000),
    (9,1781456400000), (10,1781467200000), (11,1781478000000), (12,1781488800000), (13,1781550000000), (14,1781539200000), (15,1781571600000), (16,1781560800000),
    (17,1781636400000), (18,1781647200000), (19,1781658000000), (20,1781668800000), (21,1781715600000), (22,1781726400000), (23,1781737200000), (24,1781748000000),
    (25,1781798400000), (26,1781809200000), (27,1781820000000), (28,1781830800000), (29,1781895600000), (30,1781906400000), (31,1781924400000), (32,1781915400000),
    (33,1781974800000), (34,1781985600000), (35,1782000000000), (36,1782014400000), (37,1782068400000), (38,1782057600000), (39,1782090000000), (40,1782079200000),
    (41,1782147600000), (42,1782162000000), (43,1782172800000), (44,1782183600000), (45,1782234000000), (46,1782244800000), (47,1782255600000), (48,1782266400000),
    (49,1782338400000), (50,1782338400000), (51,1782349200000), (52,1782349200000), (53,1782327600000), (54,1782327600000), (55,1782417600000), (56,1782417600000),
    (57,1782428400000), (58,1782428400000), (59,1782439200000), (60,1782439200000), (61,1782500400000), (62,1782500400000), (63,1782518400000), (64,1782518400000),
    (65,1782529200000), (66,1782529200000), (67,1782603000000), (68,1782603000000), (69,1782594000000), (70,1782594000000), (71,1782612000000), (72,1782612000000),
    (73,1782673200000), (74,1782765000000), (75,1782781200000), (76,1782752400000), (77,1782853200000), (78,1782838800000), (79,1782867600000), (80,1782921600000),
    (81,1782950400000), (82,1782936000000), (83,1783033200000), (84,1783018800000), (85,1783047600000), (86,1783116000000), (87,1783128600000), (88,1783101600000),
    (89,1783198800000), (90,1783184400000), (91,1783281600000), (92,1783296000000), (93,1783364400000), (94,1783382400000), (95,1783440000000), (96,1783454400000),
    (97,1783627200000), (98,1783710000000), (99,1783803600000), (100,1783818000000), (101,1784055600000), (102,1784142000000), (103,1784408400000), (104,1784487600000)
  ),
  lastm as (
    select r.mid from realm r join ko on ko.mid = r.mid order by ko.ts desc limit 1
  ),
  -- Predicción de cada usuario para ese último partido (y los puntos que le dio).
  lastpred as (
    select p.user_id,
           (p.pv->>'homeScore')::int as ph,
           (p.pv->>'awayScore')::int as pa,
           coalesce(c.award, 0) as lpts
    from predm p
    join lastm l on p.mid = l.mid
    left join calc c on c.user_id = p.user_id and c.mid = l.mid
  )
  update public.scores s
  set points = coalesce(a.points, 0),
      accuracy = case when coalesce(a.maxp, 0) > 0
                      then round(coalesce(a.points, 0)::numeric / a.maxp * 100, 2) else 0 end,
      last_match_id = (select mid from lastm),
      last_pred_home = lp.ph,
      last_pred_away = lp.pa,
      last_points = coalesce(lp.lpts, 0),
      updated_at = now()
  from public.scores s2
  left join agg a on a.user_id = s2.user_id
  left join lastpred lp on lp.user_id = s2.user_id
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
