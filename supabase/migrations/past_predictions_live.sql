-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: past_predictions expone las predicciones de partidos JUGADOS o que YA
-- ARRANCARON (kickoff pasado). Antes sólo mostraba los "jugados", así que dos
-- partidos EN VIVO simultáneos podían mostrar uno con predicciones y el otro
-- vacío (hasta que el flag "played" se propagaba a la base).
--
-- Seguro: las predicciones se cierran 5 min antes del inicio, así que mostrar las
-- de un partido ya empezado no permite copiar a nadie.
--
-- El tipo de retorno NO cambia → con CREATE OR REPLACE alcanza. Correr entero.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.past_predictions()
returns table(match_id int, user_id uuid, display_name text, avatar_url text, home int, away int, home_pens int, away_pens int)
language sql
security definer
set search_path = public
as $$
  with ko(mid, ts) as (values
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
  visible as (
    select (e.key)::int as mid
    from public.real_results rr, lateral jsonb_each(rr.results) e
    where rr.id = 1 and e.key ~ '^[0-9]+$' and (e.value->>'played') = 'true'
    union
    select mid from ko where ts <= (extract(epoch from now()) * 1000)::bigint
  )
  select (pe.key)::int as match_id,
         p.user_id,
         coalesce(s.display_name, 'Jugador') as display_name,
         s.avatar_url,
         (pe.value->>'homeScore')::int as home,
         (pe.value->>'awayScore')::int as away,
         (pe.value->>'homePens')::int as home_pens,
         (pe.value->>'awayPens')::int as away_pens
  from public.predictions p
  cross join lateral jsonb_each(p.results) pe
  join visible v on v.mid = (pe.key)::int
  left join public.scores s on s.user_id = p.user_id
  where pe.key ~ '^[0-9]+$' and (pe.value->>'played') = 'true';
$$;
grant execute on function public.past_predictions() to authenticated;
