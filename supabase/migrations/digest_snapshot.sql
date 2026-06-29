-- ─────────────────────────────────────────────────────────────────────────────
-- DIGEST cada 2 días: snapshot del ranking para detectar quién trepó.
--
-- api/digest.ts compara la posición y los puntos ACTUALES de cada usuario contra
-- los de la última corrida del digest (estas columnas). Quien mejoró 2+ puestos
-- entra en el mail. Después de cada corrida, el endpoint reescribe estas columnas
-- con el estado actual (la ventana siempre mira "desde el último digest").
--
-- Idempotente. Correr entero en el SQL Editor de Supabase.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.scores add column if not exists digest_rank int;
alter table public.scores add column if not exists digest_points numeric;
alter table public.scores add column if not exists digest_at timestamptz;
