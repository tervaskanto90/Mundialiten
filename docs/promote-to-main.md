# Plan: pase de `staging` → `main` (producción)

> Documento de planificación. **No ejecutar hasta dar la orden.** Las decisiones
> 1–4 se confirman recién al momento de promover (seguimos tocando staging).

## Estado de divergencia (al momento de escribir)
- `staging` suma ~34 commits sobre `main` (rediseño completo: home/dashboard,
  login nuevo, noticias, odds, foto de perfil, toggle de escenario, "Fixture y
  Tablas" unificado, showcase de proyectos, favicon dinámico, etc.).
- `main` tiene 4 commits que `staging` no:
  - `ac034fd` script admin de contraseña (idéntico en ambas → trivial).
  - `7152a22`, `1957c1f`, `5a9f315` fixes de override de resultados.
- **Único conflicto esperado:** `src/store/useStore.ts` → `RESULT_OVERRIDES`
  - main: `{ 14: 0-0 (ESP-Cabo Verde), 38: 4-0 (ESP-Arabia) }`
  - staging: `{ 38: 4-0 }`

## Decisiones a confirmar antes de promover
1. **Overrides #14 / #38**: ¿la API ya tiene esos marcadores correctos? →
   - si sí, **quitar** ambos del `RESULT_OVERRIDES`.
   - si siguen mal, **dejar** `{ 14: 0-0, 38: 4-0 }` (resolver el conflicto a favor de main).
2. **Vercel env vars para Production** (no solo Preview): `GNEWS_API_KEY`,
   `ODDS_API_KEY`. (Opcional futuro: `NEWSDATA_API_KEY` para noticias frescas con foto.)
3. **Supabase**: ¿`main` y `staging` usan el MISMO proyecto?
   - mismo proyecto → migraciones ya aplicadas (nada que hacer).
   - proyecto separado para prod → correr el SQL consolidado (abajo).
4. **Supabase Auth → Redirect URLs**: agregar el dominio de producción para que
   funcione el recupero de contraseña por mail.

## Pasos de ejecución (al dar la orden)
1. Pre-flight en `staging`: `npx tsc --noEmit` + `npm test` (12/12) + `npm run build`.
2. `git fetch origin main staging` y `git pull` en ambas.
3. `git checkout main` → `git merge staging`.
4. Resolver conflicto `RESULT_OVERRIDES` según decisión 1 (y el script, idéntico).
5. Re-correr `tsc` + `tests` + `build` sobre `main` mergeado.
6. `git push origin main` → deploy de producción en Vercel.
7. Verificación post-deploy (abajo).

## Verificación post-deploy
- Login: imágenes claro/oscuro, recupero de contraseña, showcase de proyectos.
- Home: dashboard (odds, noticias con foto, ranking con avatares, tus stats),
  marcador EN VIVO en el header, toggle de tema sin mover el logo.
- Fixture y Tablas: toggle Resultados/Predicción/What-if, sub-pestañas.
- Cuenta: cambiar contraseña, subir foto de perfil (se ve en ranking).
- Primer fetch de noticias tarda unos segundos (resuelve imágenes), luego cachea.

## Migraciones Supabase (solo si prod es proyecto separado)
```sql
-- branding (imagen del header, escala)
create table if not exists public.branding (
  id int primary key default 1 check (id = 1),
  light_url text, dark_url text,
  img_scale numeric not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.branding add column if not exists img_scale numeric not null default 1;
alter table public.branding enable row level security;
drop policy if exists "branding_select_all" on public.branding;
create policy "branding_select_all" on public.branding for select using (true);
drop policy if exists "branding_insert_admin" on public.branding;
create policy "branding_insert_admin" on public.branding for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'boggianooctavio@gmail.com');
drop policy if exists "branding_update_admin" on public.branding;
create policy "branding_update_admin" on public.branding for update to authenticated
  using ((auth.jwt() ->> 'email') = 'boggianooctavio@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'boggianooctavio@gmail.com');

-- foto de perfil en el ranking
alter table public.scores add column if not exists avatar_url text;
```

## Secuencia de migración acordada (el día del pase)
Orden exacto pedido por el usuario. Cada paso, con mi confirmación en el momento:
1. **OK del usuario** con todos los requisitos (decisiones 1–4 confirmadas).
2. **Deslogueo masivo**: invalidar todas las sesiones para forzar re-login en la
   versión nueva. En Supabase: `Authentication → Users` (cerrar sesiones) o, vía
   service role, `auth.admin.signOut` por usuario / invalidar refresh tokens.
   (Se puede hacer con un script puntual con `SUPABASE_SERVICE_ROLE_KEY`.)
3. **Pase a main**: merge `staging → main` + `push` (deploy de producción).
4. **Tutorial al primer login**: ya implementado. Sale SOLO la primera vez por
   versión (flag `mundi-tutorial-<TUTORIAL_VERSION>` en localStorage). Si hiciera
   falta re-disparar el tour para todos, subir `TUTORIAL_VERSION` en `App.tsx`.
   5 pasos con las novedades + botón "Omitir"; reabrible desde el menú (🎓).
5. **Mail a todos**: avisar que salió la nueva versión de Mundialiten. Envío con
   la lista de `auth.users` (service role) vía el proveedor de mail (Resend/SMTP).
   Marcado como acción del día del pase (no automatizado todavía).

> Importante: la SQL de eliminatorias (`recompute_all_scores` con el bonus
> "quién pasa") ya fue corrida en el proyecto Supabase actual. Si producción usa
> un proyecto separado, hay que correrla también ahí (ver schema.sql).

## Rollback
- Vercel → Instant Rollback al deploy anterior, o `git revert -m 1 <merge> && git push`.
- Los datos (real_results, predictions, scores) no se tocan: el merge es solo código.
