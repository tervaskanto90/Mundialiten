// Recordatorios por mail (Vercel Cron, 1×/día).
//
// IMPORTANTE: este archivo es AUTOCONTENIDO a propósito. Vercel compila cada
// función de api/ por separado y NO empaqueta imports a `../src/...` (da
// ERR_MODULE_NOT_FOUND en runtime). Por eso la lógica y los datos del calendario
// que necesita el cron están acá. `tests/reminders-sync.test.ts` verifica que
// estos datos y esta lógica coincidan EXACTAMENTE con los de src/ (sin desincronizar).
//
// Variables de entorno en Vercel (Project Settings → Environment Variables):
//   SUPABASE_URL                 (o se reusa VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY    (¡secreta! nunca con prefijo VITE_)
//   BREVO_API_KEY                (de tu cuenta Brevo)
//   BREVO_SENDER_EMAIL           (tu mail verificado como remitente en Brevo)
//   BREVO_SENDER_NAME            (opcional, ej. "Mundialiten")
//   APP_URL                      (la URL de tu app; si falta usa VERCEL_URL)
//   CRON_SECRET                  (recomendado: Vercel lo manda en el header del cron)
//
// Probar a mano sin enviar: GET /api/remind?dryRun=1  (con header de CRON_SECRET si está)
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Datos del calendario oficial, derivados de src/data/schedule.ts (estáticos: el
// fixture del Mundial no cambia). El test de paridad garantiza que sigan iguales.
// ─────────────────────────────────────────────────────────────────────────────
export type BucketId = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'finals'
export const BUCKET_ORDER: BucketId[] = ['group', 'r32', 'r16', 'qf', 'sf', 'finals']

interface BucketInfo {
  first: number // primer kickoff del bucket (ms UTC)
  last: number // último kickoff del bucket (ms UTC)
  ids: number[] // nº de partido que componen el bucket
}
const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i)

export const REMIND_BUCKETS: Record<BucketId, BucketInfo> = {
  group: { first: Date.parse('2026-06-11T19:00:00Z'), last: Date.parse('2026-06-28T02:00:00Z'), ids: range(1, 72) },
  r32: { first: Date.parse('2026-06-28T19:00:00Z'), last: Date.parse('2026-07-04T01:30:00Z'), ids: range(73, 88) },
  r16: { first: Date.parse('2026-07-04T17:00:00Z'), last: Date.parse('2026-07-07T20:00:00Z'), ids: range(89, 96) },
  qf: { first: Date.parse('2026-07-09T20:00:00Z'), last: Date.parse('2026-07-12T01:00:00Z'), ids: range(97, 100) },
  sf: { first: Date.parse('2026-07-14T19:00:00Z'), last: Date.parse('2026-07-15T19:00:00Z'), ids: range(101, 102) },
  finals: { first: Date.parse('2026-07-18T21:00:00Z'), last: Date.parse('2026-07-19T19:00:00Z'), ids: range(103, 104) },
}

/** Bucket de predicción abierto ahora (el primero no terminado), o null si terminó todo. */
export function activeBucket(now: number): BucketId | null {
  for (const b of BUCKET_ORDER) if (now <= REMIND_BUCKETS[b].last) return b
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Lógica de a quién avisar (copia de src/lib/reminders.ts; el test verifica paridad).
// ─────────────────────────────────────────────────────────────────────────────
export type ReminderKind = 'open' | 'lastcall'
export const LASTCALL_HOURS = 30

export interface ReminderInputs {
  now: number
  userIds: string[]
  predBy: Map<string, Record<number, { played?: boolean } | undefined>>
  sent: Set<string>
}
export interface ReminderPlan {
  bucket: BucketId | null
  hoursToFirst: number
  send: Array<{ userId: string; kind: ReminderKind }>
}

export function planReminders(inp: ReminderInputs): ReminderPlan {
  const bucket = activeBucket(inp.now)
  if (!bucket) return { bucket: null, hoursToFirst: 0, send: [] }
  const ids = REMIND_BUCKETS[bucket].ids
  const hoursToFirst = (REMIND_BUCKETS[bucket].first - inp.now) / 3_600_000
  const missingAny = (uid: string): boolean => {
    const r = inp.predBy.get(uid) || {}
    return ids.some((id) => !r[id]?.played)
  }
  const send: Array<{ userId: string; kind: ReminderKind }> = []
  for (const uid of inp.userIds) {
    if (!inp.sent.has(`${uid}|open`)) {
      send.push({ userId: uid, kind: 'open' })
      continue
    }
    if (
      hoursToFirst > 0 &&
      hoursToFirst <= LASTCALL_HOURS &&
      !inp.sent.has(`${uid}|lastcall`) &&
      missingAny(uid)
    ) {
      send.push({ userId: uid, kind: 'lastcall' })
    }
  }
  return { bucket, hoursToFirst, send }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contenido del mail (copia de src/lib/reminders.ts; el test verifica paridad).
// ─────────────────────────────────────────────────────────────────────────────
const BUCKET_ES: Record<BucketId, string> = {
  group: 'la fase de grupos',
  r32: 'los 16avos de final',
  r16: 'los octavos de final',
  qf: 'los cuartos de final',
  sf: 'las semifinales',
  finals: 'la final y el 3.º puesto',
}
const BUCKET_EN: Record<BucketId, string> = {
  group: 'the group stage',
  r32: 'the round of 32',
  r16: 'the round of 16',
  qf: 'the quarter-finals',
  sf: 'the semi-finals',
  finals: 'the final and 3rd place',
}

export function buildReminderEmail(
  bucket: BucketId,
  kind: ReminderKind,
  name: string,
  appUrl: string,
): { subject: string; html: string; text: string } {
  const es = BUCKET_ES[bucket]
  const en = BUCKET_EN[bucket]
  const hi = name ? `¡Hola, ${name}!` : '¡Hola!'
  const subject =
    kind === 'open'
      ? `⚽ Se abrió ${es} en Mundialiten — cargá tu predicción`
      : `⏰ Último aviso: te falta predecir ${es} en Mundialiten`
  const leadEs =
    kind === 'open'
      ? `Ya se puede predecir <strong>${es}</strong>. Entrá y cargá tus pronósticos antes de que cierre cada partido (5 minutos antes de su inicio).`
      : `¡Última llamada! Está por arrancar <strong>${es}</strong> y todavía te falta cargar algún pronóstico. Cada partido se cierra 5 minutos antes de empezar.`
  const leadEn =
    kind === 'open'
      ? `You can now predict <strong>${en}</strong>. Log in and set your picks before each match closes (5 minutes before kick-off).`
      : `Last call! <strong>${en}</strong> is about to start and you still have picks to make. Each match closes 5 minutes before kick-off.`
  const link = appUrl || ''
  const button = link
    ? `<p style="margin:24px 0"><a href="${link}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Abrir Mundialiten · Open the app</a></p>`
    : ''
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
  <h2 style="margin:0 0 6px">🏆 Mundialiten</h2>
  <p style="margin:0 0 16px;color:#475569">${hi}</p>
  <p style="margin:0 0 12px">${leadEs}</p>
  ${button}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
  <p style="margin:0 0 6px;color:#64748b;font-size:13px">${leadEn}</p>
  <p style="margin:14px 0 0;color:#94a3b8;font-size:12px">Recibís este aviso porque tenés una cuenta en Mundialiten.</p>
</div>`
  const text = `${hi}\n\n${leadEs.replace(/<[^>]+>/g, '')}\n${link ? `\n${link}\n` : ''}\n${leadEn.replace(/<[^>]+>/g, '')}`
  return { subject, html, text }
}

// ─────────────────────────────────────────────────────────────────────────────
// HIGHLIGHTS DE FIN DE FASE: cuando una fase termina (pasaron todos sus
// kickoffs + margen para alargue/penales), un único mail por usuario con el
// resumen: top 3 de la fase, exactos clavados y líder general. Dedup por
// (user, bucket, kind='highlights') en la misma tabla reminders.
// ─────────────────────────────────────────────────────────────────────────────
export const HIGHLIGHTS_GRACE_MS = 3.5 * 3_600_000 // último kickoff + 120' + penales + colchón
// Ventana de frescura: si la fase terminó hace MÁS de esto, el highlight ya no
// se manda (evita spamear resúmenes viejos, p.ej. al estrenar la feature con
// fases ya jugadas, o si el cron estuvo caído varios días). 48h = 2 corridas
// del cron diario de margen.
export const HIGHLIGHTS_FRESH_MS = 48 * 3_600_000

export function endedBuckets(now: number): BucketId[] {
  return BUCKET_ORDER.filter((b) => {
    const endedAt = REMIND_BUCKETS[b].last + HIGHLIGHTS_GRACE_MS
    return now > endedAt && now <= endedAt + HIGHLIGHTS_FRESH_MS
  })
}

// Valores por partido (mismos rangos que recompute_all_scores en SQL).
const exactPts = (mid: number) => (mid <= 72 ? 3 : mid <= 88 ? 4 : mid <= 96 ? 5 : mid <= 100 ? 6 : mid <= 102 ? 8 : 10)
const tendPts = (mid: number) => (mid <= 72 ? 1 : mid <= 88 ? 2 : mid <= 96 ? 2 : mid <= 100 ? 3 : mid <= 102 ? 4 : 5)
const advPts = (mid: number) => (mid <= 72 ? 0 : mid <= 88 ? 2 : mid <= 96 ? 2 : mid <= 100 ? 3 : mid <= 102 ? 4 : 5)

interface RV {
  played?: boolean
  homeScore?: number
  awayScore?: number
  homePens?: number
  awayPens?: number
}
// Lado que avanza: ganador del marcador o, en empate, de la tanda. null si indefinido.
const sideOf = (r: RV): 'h' | 'a' | null => {
  const h = r.homeScore ?? 0, a = r.awayScore ?? 0
  if (h !== a) return h > a ? 'h' : 'a'
  const hp = r.homePens ?? 0, ap = r.awayPens ?? 0
  if (hp !== ap) return hp > ap ? 'h' : 'a'
  return null
}

export interface PhaseStats {
  top: Array<{ name: string; pts: number; exacts: number }>
  totalExacts: number
  leader: { name: string; pts: number } | null
}

export function computePhaseStats(
  bucket: BucketId,
  real: Record<string, RV>,
  preds: Array<{ user_id: string; results: Record<string, RV> }>,
  names: Map<string, string>,
  totals: Array<{ user_id: string; points: number }>,
): PhaseStats {
  const ids = REMIND_BUCKETS[bucket].ids
  const rows: Array<{ name: string; pts: number; exacts: number }> = []
  let totalExacts = 0
  for (const p of preds) {
    let pts = 0, exacts = 0
    for (const mid of ids) {
      const rv = real[String(mid)]
      const pv = p.results?.[String(mid)]
      if (!rv?.played || !pv?.played) continue
      if (pv.homeScore === rv.homeScore && pv.awayScore === rv.awayScore) { pts += exactPts(mid); exacts++ }
      else if (Math.sign((pv.homeScore ?? 0) - (pv.awayScore ?? 0)) === Math.sign((rv.homeScore ?? 0) - (rv.awayScore ?? 0))) pts += tendPts(mid)
      if (advPts(mid) > 0) {
        const ps = sideOf(pv), rs = sideOf(rv)
        if (ps != null && rs != null && ps === rs) pts += advPts(mid)
      }
    }
    totalExacts += exacts
    if (pts > 0) rows.push({ name: names.get(p.user_id) || 'Jugador', pts, exacts })
  }
  rows.sort((a, b) => b.pts - a.pts || b.exacts - a.exacts || a.name.localeCompare(b.name))
  let leader: PhaseStats['leader'] = null
  for (const tot of totals) {
    if (!leader || Number(tot.points) > leader.pts) leader = { name: names.get(tot.user_id) || 'Jugador', pts: Number(tot.points) }
  }
  return { top: rows.slice(0, 3), totalExacts, leader }
}

export function buildHighlightsEmail(
  bucket: BucketId,
  name: string,
  s: PhaseStats,
  appUrl: string,
): { subject: string; html: string; text: string } {
  const es = BUCKET_ES[bucket]
  const en = BUCKET_EN[bucket]
  const hi = name ? `¡Hola, ${name}!` : '¡Hola!'
  const subject = `🏁 Terminaron ${es}: los highlights de la fase`
  const medals = ['🥇', '🥈', '🥉']
  const topHtml = s.top.length
    ? `<ul style="margin:0 0 12px;padding-left:18px;color:#334155;line-height:1.7">${s.top
        .map((r, i) => `<li>${medals[i]} <strong>${r.name}</strong>: +${r.pts} pts en la fase${r.exacts > 0 ? ` (🎯 ${r.exacts} exacto${r.exacts === 1 ? '' : 's'})` : ''}</li>`)
        .join('')}</ul>`
    : '<p style="margin:0 0 12px;color:#334155">Nadie sumó puntos en esta fase. 😅</p>'
  const topText = s.top.length
    ? s.top.map((r, i) => `${medals[i]} ${r.name}: +${r.pts} pts${r.exacts > 0 ? ` (${r.exacts} exactos)` : ''}`).join('\n')
    : 'Nadie sumó puntos en esta fase.'
  const link = appUrl || ''
  const button = link
    ? `<p style="margin:24px 0"><a href="${link}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Predecir la próxima ronda · Open the app</a></p>`
    : ''
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
  <h2 style="margin:0 0 6px">🏁 Se cerraron ${es}</h2>
  <p style="margin:0 0 16px;color:#475569">${hi}</p>
  <p style="margin:0 0 10px">Los que más la rompieron en la fase:</p>
  ${topHtml}
  <p style="margin:0 0 8px;color:#334155">🎯 Entre todos clavaron <strong>${s.totalExacts}</strong> resultado${s.totalExacts === 1 ? '' : 's'} exacto${s.totalExacts === 1 ? '' : 's'} en la fase.</p>
  ${s.leader ? `<p style="margin:0 0 12px;color:#334155">👑 Líder general: <strong>${s.leader.name}</strong> con <strong>${s.leader.pts} pts</strong>.</p>` : ''}
  <p style="margin:0 0 12px">La próxima ronda ya está en juego: entrá y meté tus predicciones antes de que cierren (cada partido cierra 5 minutos antes de empezar).</p>
  ${button}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
  <p style="margin:0;color:#64748b;font-size:13px">${en.charAt(0).toUpperCase() + en.slice(1)} is over — phase highlights above. The next round is open: get your picks in before each match closes (5 min before kick-off).</p>
  <p style="margin:14px 0 0;color:#94a3b8;font-size:12px">Recibís este aviso porque tenés una cuenta en Mundialiten.</p>
</div>`
  const text = `${hi}\n\nSe cerraron ${es}. Los mejores de la fase:\n${topText}\n\n🎯 Exactos de la fase (entre todos): ${s.totalExacts}.${s.leader ? `\n👑 Líder general: ${s.leader.name} con ${s.leader.pts} pts.` : ''}\n\nLa próxima ronda ya está en juego.${link ? `\n\n${link}` : ''}`
  return { subject, html, text }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler del cron (entrada/salida: Supabase + Brevo).
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers?.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'No autorizado.' })
    return
  }
  const dryRun = String(req.query?.dryRun || '') === '1'

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    res.status(500).json({ error: 'Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en Vercel.' })
    return
  }

  const supa = createClient(url, serviceKey, { auth: { persistSession: false } })
  const now = Date.now()

  try {
    const bucket = activeBucket(now)

    // Usuarios (paginado) → id + email.
    const users: Array<{ id: string; email?: string }> = []
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 })
      if (error) throw error
      users.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? undefined })))
      if (data.users.length < 200) break
    }

    const [predsR, scoresR, sentR, realR] = await Promise.all([
      supa.from('predictions').select('user_id, results'),
      supa.from('scores').select('user_id, display_name, points'),
      supa.from('reminders').select('user_id, bucket, kind'),
      supa.from('real_results').select('results').eq('id', 1).maybeSingle(),
    ])
    if (predsR.error) throw predsR.error
    if (scoresR.error) throw scoresR.error
    if (sentR.error) {
      res.status(500).json({
        error: 'Falta la tabla "reminders". Corré el SQL de supabase/schema.sql antes de activar el cron.',
        detail: sentR.error.message,
      })
      return
    }

    const predBy = new Map<string, Record<number, { played?: boolean }>>(
      (predsR.data || []).map((p: any) => [p.user_id, (p.results || {}) as Record<number, { played?: boolean }>]),
    )
    const nameBy = new Map<string, string>((scoresR.data || []).map((s: any) => [s.user_id, s.display_name]))
    const sentSet = new Set<string>()
    const highlightsSentBy = new Map<string, Set<string>>() // bucket -> user_ids ya avisados
    for (const r of sentR.data || []) {
      if ((r as any).bucket === bucket) sentSet.add(`${(r as any).user_id}|${(r as any).kind}`)
      if ((r as any).kind === 'highlights') {
        const b = (r as any).bucket as string
        if (!highlightsSentBy.has(b)) highlightsSentBy.set(b, new Set())
        highlightsSentBy.get(b)!.add((r as any).user_id)
      }
    }

    // ── HIGHLIGHTS de fases TERMINADAS (independiente de la fase activa) ──
    const realResults = ((realR as any)?.data?.results ?? {}) as Record<string, RV>
    const emailByIdH = new Map(users.map((u) => [u.id, u.email]))
    const highlightsPlan: Array<{ bucket: BucketId; userId: string; email: string; name: string }> = []
    for (const b of endedBuckets(now)) {
      const already = highlightsSentBy.get(b) ?? new Set<string>()
      for (const u of users) {
        if (!u.email || already.has(u.id)) continue
        highlightsPlan.push({ bucket: b, userId: u.id, email: u.email, name: nameBy.get(u.id) || '' })
      }
    }
    const statsByBucket = new Map<BucketId, PhaseStats>()
    for (const b of new Set(highlightsPlan.map((h) => h.bucket))) {
      statsByBucket.set(
        b,
        computePhaseStats(
          b,
          realResults,
          (predsR.data || []) as Array<{ user_id: string; results: Record<string, RV> }>,
          nameBy,
          (scoresR.data || []) as Array<{ user_id: string; points: number }>,
        ),
      )
    }

    if (!bucket && highlightsPlan.length === 0) {
      res.status(200).json({ ok: true, note: 'No hay etapa abierta ni highlights pendientes (¿terminó el Mundial?).' })
      return
    }

    const plan = bucket
      ? planReminders({ now, userIds: users.map((u) => u.id), predBy, sent: sentSet })
      : { bucket: null, hoursToFirst: 0, send: [] }
    const emailById = new Map(users.map((u) => [u.id, u.email]))
    const targets = plan.send
      .map((s) => ({ ...s, email: emailById.get(s.userId), name: nameBy.get(s.userId) || '' }))
      .filter((t) => !!t.email)

    if (dryRun) {
      res.status(200).json({
        ok: true,
        dryRun: true,
        bucket,
        hoursToFirst: Math.round(plan.hoursToFirst),
        users: users.length,
        wouldSend: targets.map((t) => ({ email: t.email, kind: t.kind })),
        wouldSendHighlights: highlightsPlan.map((h) => ({ email: h.email, bucket: h.bucket })),
        phaseStats: Object.fromEntries([...statsByBucket].map(([b, s]) => [b, s])),
      })
      return
    }

    const brevoKey = process.env.BREVO_API_KEY
    const sender = process.env.BREVO_SENDER_EMAIL
    const senderName = process.env.BREVO_SENDER_NAME || 'Mundialiten'
    const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    if (!brevoKey || !sender) {
      res.status(500).json({ error: 'Faltan BREVO_API_KEY / BREVO_SENDER_EMAIL en Vercel.' })
      return
    }

    const sendMail = async (email: string, name: string, subject: string, html: string, text: string) =>
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevoKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: sender, name: senderName },
          to: [{ email, name: name || undefined }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      })

    let sent = 0
    let sentHighlights = 0
    const errors: string[] = []

    // 1) Highlights de fases terminadas.
    for (const h of highlightsPlan) {
      const stats = statsByBucket.get(h.bucket)!
      const { subject, html, text } = buildHighlightsEmail(h.bucket, h.name, stats, appUrl)
      const r = await sendMail(h.email, h.name, subject, html, text)
      if (r.ok) {
        sentHighlights++
        await supa.from('reminders').upsert(
          { user_id: h.userId, bucket: h.bucket, kind: 'highlights' },
          { onConflict: 'user_id,bucket,kind' },
        )
      } else {
        errors.push(`highlights ${h.email}: ${r.status} ${await r.text()}`)
      }
    }

    // 2) Recordatorios de la fase activa (abrió / última llamada).
    for (const t of targets) {
      const { subject, html, text } = buildReminderEmail(bucket!, t.kind, t.name, appUrl)
      const r = await sendMail(t.email!, t.name, subject, html, text)
      if (r.ok) {
        sent++
        await supa.from('reminders').upsert(
          { user_id: t.userId, bucket, kind: t.kind },
          { onConflict: 'user_id,bucket,kind' },
        )
      } else {
        errors.push(`${t.email}: ${r.status} ${await r.text()}`)
      }
    }

    res.status(200).json({ ok: true, bucket, attempted: targets.length, sent, highlightsAttempted: highlightsPlan.length, sentHighlights, errors })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
}
