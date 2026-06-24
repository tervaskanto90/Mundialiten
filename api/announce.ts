// Anuncio único por mail a TODOS los usuarios (lanzamiento de la versión nueva).
// Reusa EXACTAMENTE el mismo método que los recordatorios (api/remind.ts): Brevo
// + Supabase service role, con las env vars que ya están cargadas en Vercel.
//
// Autocontenido a propósito (Vercel compila cada función de api/ por separado y
// no empaqueta imports a ../src). Mismo patrón que remind.ts.
//
// Env vars (ya configuradas para los recordatorios):
//   SUPABASE_URL (o VITE_SUPABASE_URL) · SUPABASE_SERVICE_ROLE_KEY
//   BREVO_API_KEY · BREVO_SENDER_EMAIL · BREVO_SENDER_NAME (opc) · APP_URL · CRON_SECRET
//
// Autorización (cualquiera de las dos):
//   - El ADMIN logueado en la app (botón "Enviar anuncio" en Mi cuenta): manda su
//     token de Supabase en el header Authorization; el endpoint valida que el mail
//     sea el admin. NO hace falta exponer ningún secreto.
//   - CRON_SECRET por header o ?secret= (uso programático).
// Es idempotente: registra a quién ya le mandó (tabla reminders, bucket
// 'announce', kind 'v2-2026'), así re-ejecutarlo NO duplica envíos.
// dryRun=1 previsualiza sin enviar.
import { createClient } from '@supabase/supabase-js'

// Damos margen al loop de envíos (es idempotente: si corta, re-ejecutar sigue).
export const config = { maxDuration: 60 }

const ADMIN_EMAIL = 'boggianooctavio@gmail.com'
const ANNOUNCE_BUCKET = 'announce'
const ANNOUNCE_KIND = 'v2-2026'

function buildAnnounceEmail(name: string, appUrl: string): { subject: string; html: string; text: string } {
  const hi = name ? `¡Hola, ${name}!` : '¡Hola!'
  const subject = '🏆 Mundialiten se renovó — entrá a la nueva versión'
  const link = appUrl || ''
  const button = link
    ? `<p style="margin:24px 0"><a href="${link}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Entrar a Mundialiten · Open the app</a></p>`
    : ''
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
  <h2 style="margin:0 0 6px">🏆 Mundialiten se renovó</h2>
  <p style="margin:0 0 16px;color:#475569">${hi}</p>
  <p style="margin:0 0 12px">Renovamos Mundialiten por completo para la fase final del Mundial 2026. Esto es lo nuevo:</p>
  <ul style="margin:0 0 12px;padding-left:18px;color:#334155;line-height:1.6">
    <li>🏠 Nueva pantalla de <strong>Inicio</strong>: noticias, pronósticos de las casas y tu ranking de un vistazo.</li>
    <li>🗓️ <strong>Fixture, tablas y llaves</strong> en un solo lugar, con clasificados y eliminados marcados.</li>
    <li>📊 <strong>Estadísticas</strong> tuyas y comparadas con el resto.</li>
    <li>🥅 <strong>Eliminatorias</strong>: ahora también sumás puntos por acertar <strong>quién pasa</strong> de fase.</li>
    <li>🏆 <strong>Ranking</strong> renovado con fotos de perfil.</li>
  </ul>
  ${button}
  <p style="margin:12px 0 0;color:#475569;font-size:14px">Por la actualización vas a tener que <strong>volver a iniciar sesión</strong>. La primera vez te aparece un tutorial corto con las novedades (lo podés omitir).</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
  <p style="margin:0;color:#64748b;font-size:13px">A fully redesigned Mundialiten is live for the World Cup 2026 knockouts. You'll need to log in again; a short tutorial greets you the first time.</p>
  <p style="margin:14px 0 0;color:#94a3b8;font-size:12px">Recibís este aviso porque tenés una cuenta en Mundialiten.</p>
</div>`
  const text = `${hi}\n\nRenovamos Mundialiten por completo para la fase final del Mundial 2026.\n- Nueva pantalla de Inicio (noticias, pronósticos, ranking)\n- Fixture, tablas y llaves juntos\n- Estadísticas y comparativas\n- Eliminatorias: puntos por acertar quién pasa de fase\n- Ranking renovado con fotos\n${link ? `\n${link}\n` : ''}\nVas a tener que volver a iniciar sesión; la primera vez te aparece un tutorial corto.`
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

  // Autorización: CRON_SECRET (header/query) O la sesión del ADMIN (token de
  // Supabase del navegador → no se expone ningún secreto).
  const secret = process.env.CRON_SECRET
  const authHeader = String(req.headers?.authorization || '')
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const queryKey = String(req.query?.secret || '')
  let authorized = !!secret && (bearer === secret || queryKey === secret)
  let seenEmail: string | null = null
  let getUserErr: string | null = null
  if (!authorized && bearer) {
    try {
      const { data, error } = await supa.auth.getUser(bearer)
      if (error) getUserErr = error.message
      seenEmail = data?.user?.email ?? null
      if ((seenEmail || '').toLowerCase() === ADMIN_EMAIL) authorized = true
    } catch (e: any) {
      getUserErr = String(e?.message || e)
    }
  }
  if (!authorized) {
    res.status(401).json({
      error: 'No autorizado.',
      debug: { build: 'd2', hadBearer: !!bearer, tokenLen: bearer.length, secretSet: !!secret, seenEmail, getUserErr },
    })
    return
  }
  const dryRun = String(req.query?.dryRun || '') === '1'

  try {
    // Todos los usuarios (paginado) → id + email.
    const users: Array<{ id: string; email?: string }> = []
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 })
      if (error) throw error
      users.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? undefined })))
      if (data.users.length < 200) break
    }

    const [scoresR, sentR] = await Promise.all([
      supa.from('scores').select('user_id, display_name'),
      supa.from('reminders').select('user_id, bucket, kind'),
    ])
    if (scoresR.error) throw scoresR.error
    if (sentR.error) {
      res.status(500).json({ error: 'Falta la tabla "reminders" (corré supabase/schema.sql).', detail: sentR.error.message })
      return
    }

    const nameBy = new Map<string, string>((scoresR.data || []).map((s: any) => [s.user_id, s.display_name]))
    const already = new Set<string>(
      (sentR.data || [])
        .filter((r: any) => r.bucket === ANNOUNCE_BUCKET && r.kind === ANNOUNCE_KIND)
        .map((r: any) => r.user_id),
    )
    const targets = users
      .filter((u) => !!u.email && !already.has(u.id))
      .map((u) => ({ id: u.id, email: u.email as string, name: nameBy.get(u.id) || '' }))

    if (dryRun) {
      res.status(200).json({
        ok: true,
        dryRun: true,
        usuarios: users.length,
        yaAvisados: already.size,
        seMandariaA: targets.length,
        ejemplo: targets.slice(0, 5).map((t) => t.email),
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

    let sent = 0
    const errors: string[] = []
    for (const t of targets) {
      const { subject, html, text } = buildAnnounceEmail(t.name, appUrl)
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevoKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: sender, name: senderName },
          to: [{ email: t.email, name: t.name || undefined }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      })
      if (r.ok) {
        sent++
        await supa
          .from('reminders')
          .upsert({ user_id: t.id, bucket: ANNOUNCE_BUCKET, kind: ANNOUNCE_KIND }, { onConflict: 'user_id,bucket,kind' })
      } else {
        errors.push(`${t.email}: ${r.status} ${await r.text()}`)
      }
    }

    res.status(200).json({ ok: true, intentados: targets.length, enviados: sent, errores: errors })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
}
