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
