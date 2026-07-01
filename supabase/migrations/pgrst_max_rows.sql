-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: past_predictions() (y cualquier otra RPC/tabla) dejaba de exponer datos
-- en silencio a partir de la fila 1001. Supabase limita las respuestas de la API
-- (PostgREST) a 1000 filas por defecto (`db-max-rows`), sin avisar con error: los
-- registros que caen después del corte simplemente no llegan al cliente.
--
-- past_predictions() devuelve UNA fila por (usuario × partido predicho). Con ~21
-- jugadores prediciendo los 72 partidos de grupos + eliminatorias, el total ya
-- supera las 1000 filas (medido: 1093) — y Postgres no garantiza el orden, así
-- que las filas que quedan afuera del corte son impredecibles (le tocó a la
-- predicción de un usuario para un partido de 16avos, "Victor pampa" / P79).
--
-- Sube el techo a 10.000 filas (con margen para lo que resta del torneo) y le
-- avisa a PostgREST que recargue la config. Correr una sola vez.
-- ─────────────────────────────────────────────────────────────────────────────
alter role authenticator set pgrst.db_max_rows = 10000;
notify pgrst, 'reload config';
