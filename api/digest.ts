// DIGEST cada 2 días: mail a TODOS destacando a quien TREPÓ ≥2 puestos en el
// ranking desde la última corrida (los "resultados que hicieron" = puestos y
// puntos ganados). Si nadie trepó 2+, NO se manda nada.
//
// Reusa el mismo método que api/remind.ts / api/announce.ts: Brevo + Supabase
// service role, con las env vars ya cargadas en Vercel. Autocontenido a propósito
// (Vercel compila cada función de api/ por separado; no empaqueta imports a ../src).
//
// Env vars (mismas que los recordatorios/anuncios):
//   SUPABASE_URL (o VITE_SUPABASE_URL) · SUPABASE_SERVICE_ROLE_KEY
//   BREVO_API_KEY · BREVO_SENDER_EMAIL · BREVO_SENDER_NAME (opc) · APP_URL · CRON_SECRET
//
// Disparos:
//   - Vercel Cron (cada 2 días, ver vercel.json) → manda CRON_SECRET en el header.
//   - Admin logueado (botón "Probar digest" en Mi cuenta) → token de Supabase.
//
// Modos (query):
//   dryRun=1  → calcula quién trepó y devuelve JSON, sin enviar ni tocar el snapshot.
//   test=1    → envía el digest SÓLO al admin (preview); no toca el snapshot.
//   init=1    → fija el snapshot del ranking AHORA para todos (semilla), sin enviar.
//   (sin modo) → corrida real: si hay quien trepó 2+, manda a todos; SIEMPRE
//                reescribe el snapshot (la ventana mira "desde el último digest").
import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 60 }

const ADMIN_EMAIL = 'boggianooctavio@gmail.com'
const DIGEST_BUCKET = 'digest'
// Quién entra en el mail: trepó AL MENOS esta cantidad de puestos desde el último
// digest. "Más de una posición" = 2 o más.
const MIN_CLIMB = 2

interface ScoreRow {
  user_id: string
  display_name: string | null
  points: number
  exact_count: number
  result_count: number
  advance_count: number
  digest_rank: number | null
  digest_points: number | null
}
interface Climber {
  user_id: string
  name: string
  prevRank: number
  currRank: number
  gainedPos: number
  gainedPts: number
  points: number
}

// a es ESTRICTAMENTE mejor que b (mismo criterio que el ranking de la app:
// puntos, luego exactos, luego resultados, luego pases de ronda).
function strictlyBetter(a: ScoreRow, b: ScoreRow): boolean {
  if (a.points !== b.points) return a.points > b.points
  if (a.exact_count !== b.exact_count) return a.exact_count > b.exact_count
  if (a.result_count !== b.result_count) return a.result_count > b.result_count
  return a.advance_count > b.advance_count
}

// Ranking de competición: rank = 1 + cantidad de usuarios estrictamente mejores
// (los empatados comparten puesto → no hay "saltos" por desempates de orden).
function rankOf(rows: ScoreRow[], u: ScoreRow): number {
  let better = 0
  for (const v of rows) if (v.user_id !== u.user_id && strictlyBetter(v, u)) better++
  return better + 1
}

export function computeClimbers(rows: ScoreRow[]): Climber[] {
  const climbers: Climber[] = []
  for (const u of rows) {
    if (u.digest_rank == null) continue // sin baseline previo: no se puede comparar
    const currRank = rankOf(rows, u)
    const gainedPos = u.digest_rank - currRank
    if (gainedPos >= MIN_CLIMB) {
      climbers.push({
        user_id: u.user_id,
        name: u.display_name || 'Un jugador',
        prevRank: u.digest_rank,
        currRank,
        gainedPos,
        gainedPts: Math.max(0, Number(u.points) - Number(u.digest_points ?? u.points)),
        points: Number(u.points),
      })
    }
  }
  // Los que más treparon, primero; desempate por más puntos ganados.
  climbers.sort((a, b) => b.gainedPos - a.gainedPos || b.gainedPts - a.gainedPts)
  return climbers
}

function listNames(climbers: Climber[]): string {
  const n = climbers.map((c) => c.name)
  if (n.length === 1) return n[0]
  if (n.length === 2) return `${n[0]} y ${n[1]}`
  return `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`
}

function buildDigestEmail(name: string, climbers: Climber[], appUrl: string): { subject: string; html: string; text: string } {
  const hi = name ? `¡Hola, ${name}!` : '¡Hola!'
  const link = appUrl || ''
  const subject =
    climbers.length === 1
      ? `📈 ${climbers[0].name} trepó ${climbers[0].gainedPos} puestos en Mundialiten`
      : `📈 Se movió la tabla: ${listNames(climbers)} treparon fuerte`
  const pts = (c: Climber) => (c.gainedPts > 0 ? ` sumando <strong>+${c.gainedPts} pts</strong>` : '')
  const ptsT = (c: Climber) => (c.gainedPts > 0 ? ` sumando +${c.gainedPts} pts` : '')
  const items = climbers
    .map(
      (c) =>
        `<li>🔥 <strong>${c.name}</strong> trepó <strong>${c.gainedPos} puestos</strong> (de #${c.prevRank} a #${c.currRank})${pts(c)} — ahora <strong>#${c.currRank}</strong> con ${c.points} pts.</li>`,
    )
    .join('')
  const itemsT = climbers
    .map((c) => `- ${c.name} trepó ${c.gainedPos} puestos (de #${c.prevRank} a #${c.currRank})${ptsT(c)} — ahora #${c.currRank} con ${c.points} pts.`)
    .join('\n')
  const button = link
    ? `<p style="margin:24px 0"><a href="${link}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Predecir ahora · Open the app</a></p>`
    : ''
  const titulo = climbers.length === 1 ? '📈 Alguien se movió en la tabla' : '📈 La tabla se sacudió'
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
  <h2 style="margin:0 0 6px">${titulo}</h2>
  <p style="margin:0 0 16px;color:#475569">${hi}</p>
  <p style="margin:0 0 10px">Estos cracks la rompieron en las últimas predicciones:</p>
  <ul style="margin:0 0 12px;padding-left:18px;color:#334155;line-height:1.7">${items}</ul>
  <p style="margin:0 0 12px"><strong>¿Y vos?</strong> Todavía estás a tiempo de dar el batacazo: quedan cruces por jugarse y toda la fase final por delante.</p>
  <ul style="margin:0 0 12px;padding-left:18px;color:#334155;line-height:1.65">
    <li>🗓️ Tocá cada partido en Calendario y cargá el marcador (el de <strong>después del alargue</strong>).</li>
    <li>⏱️ Cada partido <strong>cierra 5 minutos antes</strong> de empezar.</li>
    <li>🎯 <strong>Puntos</strong>: marcador (exacto o resultado) <strong>+</strong> bonus por acertar quién pasa. 16avos 4/2 +2 · 8vos 5/2 +2 · 4tos 6/3 +3 · semis 8/4 +4 · final 10/5 +5.</li>
  </ul>
  ${button}
  <p style="margin:12px 0 0;color:#475569;font-size:14px">No importa si no predijiste antes: entrás cuando quieras y sumás desde ahí. ¡A escalar! 🍀</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
  <p style="margin:0;color:#64748b;font-size:13px">Movers in the table over the last couple of days. There’s still time — predict the upcoming knockouts (score after extra time; each match closes 5 min before kickoff). You can join anytime and score from there. Full guide in “How to play”.</p>
  <p style="margin:14px 0 0;color:#94a3b8;font-size:12px">Recibís este aviso porque tenés una cuenta en Mundialiten.</p>
</div>`
  const text = `${hi}\n\n${climbers.length === 1 ? 'Alguien se movió en la tabla' : 'La tabla se sacudió'}:\n${itemsT}\n\n¿Y vos? Todavía estás a tiempo: quedan cruces por jugarse y toda la fase final.\n- Cargá el marcador (después del alargue). Cada partido cierra 5 minutos antes.\n- Puntos: marcador (exacto o resultado) + bonus por acertar quién pasa. 16avos 4/2 +2 · 8vos 5/2 +2 · 4tos 6/3 +3 · semis 8/4 +4 · final 10/5 +5.\n- No importa si no predijiste antes: entrás cuando quieras.\n${link ? `\n${link}\n` : ''}\nMás detalle en «¿Cómo jugar?».`
  return { subject, html, text }
}

export default async function handler(req: any, res: any) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    res.status(500).json({ error: 'Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en Vercel.' })
    return
  }
  const supa = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Autorización: CRON_SECRET (header/query) O la sesión del ADMIN.
  const secret = process.env.CRON_SECRET
  const authHeader = String(req.headers?.authorization || '')
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const queryKey = String(req.query?.secret || '')
  let authorized = !!secret && (bearer === secret || queryKey === secret)
  let seenEmail: string | null = null
  let seenUserId: string | null = null
  if (!authorized && bearer) {
    try {
      const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${bearer}` } })
      if (r.ok) {
        const u: any = await r.json()
        seenEmail = u?.email ?? null
        seenUserId = u?.id ?? null
        if ((seenEmail || '').toLowerCase() === ADMIN_EMAIL) authorized = true
      }
    } catch {
      /* noop */
    }
  }
  if (!authorized) {
    res.status(401).json({ error: 'No autorizado.' })
    return
  }

  const dryRun = String(req.query?.dryRun || '') === '1'
  const isTest = String(req.query?.test || '') === '1'
  const isInit = String(req.query?.init || '') === '1'

  try {
    const { data: scoreData, error: scoreErr } = await supa
      .from('scores')
      .select('user_id, display_name, points, exact_count, result_count, advance_count, digest_rank, digest_points')
    if (scoreErr) {
      res.status(500).json({ error: 'No se pudo leer scores.', detail: scoreErr.message })
      return
    }
    const rows = (scoreData || []) as ScoreRow[]

    // Reescribe el snapshot (rank/points/at actuales) para TODOS. Se usa en init y
    // al final de la corrida real.
    const writeSnapshot = async () => {
      const at = new Date().toISOString()
      for (const u of rows) {
        await supa.from('scores').update({ digest_rank: rankOf(rows, u), digest_points: Number(u.points), digest_at: at }).eq('user_id', u.user_id)
      }
    }

    if (isInit) {
      await writeSnapshot()
      res.status(200).json({ ok: true, init: true, jugadores: rows.length, mensaje: 'Snapshot del ranking fijado. El próximo digest compara contra esto.' })
      return
    }

    const climbers = computeClimbers(rows)

    if (dryRun) {
      res.status(200).json({
        ok: true,
        dryRun: true,
        jugadores: rows.length,
        conBaseline: rows.filter((r) => r.digest_rank != null).length,
        treparon2omas: climbers.length,
        seMandaria: climbers.length > 0,
        climbers: climbers.map((c) => ({ name: c.name, gainedPos: c.gainedPos, prevRank: c.prevRank, currRank: c.currRank, gainedPts: c.gainedPts })),
      })
      return
    }

    // Sin nadie que trepó 2+: en corrida real NO se manda (y reseteamos el
    // snapshot para la próxima ventana). En TEST mandamos un EJEMPLO para que el
    // admin vea cómo queda el formato.
    let featured = climbers
    let isSample = false
    if (climbers.length === 0) {
      if (!isTest) {
        await writeSnapshot()
        res.status(200).json({ ok: true, enviado: false, motivo: 'Nadie trepó 2+ puestos desde el último digest.', snapshotActualizado: true })
        return
      }
      isSample = true
      featured = [
        { user_id: 'demo1', name: 'Lio', prevRank: 5, currRank: 2, gainedPos: 3, gainedPts: 12, points: 38 },
        { user_id: 'demo2', name: 'Caro', prevRank: 6, currRank: 4, gainedPos: 2, gainedPts: 8, points: 31 },
      ]
    }

    const brevoKey = process.env.BREVO_API_KEY
    const sender = process.env.BREVO_SENDER_EMAIL
    const senderName = process.env.BREVO_SENDER_NAME || 'Mundialiten'
    const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    if (!brevoKey || !sender) {
      res.status(500).json({ error: 'Faltan BREVO_API_KEY / BREVO_SENDER_EMAIL en Vercel.' })
      return
    }

    const nameBy = new Map<string, string>(rows.map((r) => [r.user_id, r.display_name || '']))
    // Idempotencia: una vez por fecha de corrida (si el cron reintenta, no duplica).
    const kind = `digest-${new Date().toISOString().slice(0, 10)}`

    // Destinatarios: en test, sólo el admin; si no, todos los usuarios con email.
    let targets: Array<{ id: string; email: string; name: string }>
    if (isTest && seenEmail) {
      targets = [{ id: seenUserId || 'admin', email: seenEmail, name: nameBy.get(seenUserId || '') || '' }]
    } else {
      const users: Array<{ id: string; email?: string }> = []
      for (let page = 1; page <= 50; page++) {
        const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 })
        if (error) throw error
        users.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? undefined })))
        if (data.users.length < 200) break
      }
      const { data: sent } = await supa.from('reminders').select('user_id, bucket, kind')
      const already = new Set<string>((sent || []).filter((r: any) => r.bucket === DIGEST_BUCKET && r.kind === kind).map((r: any) => r.user_id))
      targets = users.filter((u) => !!u.email && !already.has(u.id)).map((u) => ({ id: u.id, email: u.email as string, name: nameBy.get(u.id) || '' }))
    }

    let sent = 0
    const errors: string[] = []
    for (const t of targets) {
      const built = buildDigestEmail(t.name, featured, appUrl)
      const subject = isSample ? `(EJEMPLO) ${built.subject}` : built.subject
      const { html, text } = built
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevoKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { email: sender, name: senderName }, to: [{ email: t.email, name: t.name || undefined }], subject, htmlContent: html, textContent: text }),
      })
      if (r.ok) {
        sent++
        if (!isTest) {
          await supa.from('reminders').upsert({ user_id: t.id, bucket: DIGEST_BUCKET, kind }, { onConflict: 'user_id,bucket,kind' })
        }
      } else {
        errors.push(`${t.email}: ${r.status} ${await r.text()}`)
      }
    }

    // Corrida real (no test): reseteamos el snapshot para la próxima ventana.
    if (!isTest) await writeSnapshot()

    res.status(200).json({ ok: true, test: isTest, ejemplo: isSample, enviado: true, destacados: featured.length, intentados: targets.length, enviados: sent, errores: errors })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
}
