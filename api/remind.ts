// Recordatorios por mail (Vercel Cron, 1×/día).
//
// Qué hace en cada corrida:
//  1) Calcula la etapa abierta (según el calendario, en UTC).
//  2) Lee usuarios + predicciones + recordatorios ya enviados (Supabase service role).
//  3) Decide a quién avisar (ver src/lib/reminders.ts):
//       - 'open'     → a TODOS los que no lo recibieron para esta etapa.
//       - 'lastcall' → si falta poco para el 1er partido y todavía le falta predecir.
//  4) Envía con Brevo (sin dominio propio: remitente = un mail verificado).
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
// Probar a mano sin enviar: GET /api/remind?dryRun=1  (con el header de CRON_SECRET si está)
import { createClient } from '@supabase/supabase-js'
import { planReminders, buildReminderEmail } from '../src/lib/reminders'

export default async function handler(req: any, res: any) {
  // Seguridad: si hay CRON_SECRET, exigimos el header que manda Vercel Cron.
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
    // 1) Usuarios (paginado) → id + email.
    const users: Array<{ id: string; email?: string }> = []
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 })
      if (error) throw error
      users.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? undefined })))
      if (data.users.length < 200) break
    }

    // 2) Predicciones, nombres y recordatorios ya enviados.
    const [predsR, scoresR, sentR] = await Promise.all([
      supa.from('predictions').select('user_id, results'),
      supa.from('scores').select('user_id, display_name'),
      supa.from('reminders').select('user_id, bucket, kind'),
    ])
    if (predsR.error) throw predsR.error
    if (scoresR.error) throw scoresR.error
    if (sentR.error) {
      // Si la tabla no existe todavía, avisamos en vez de spamear cada día.
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

    // 3) Decidir a quién avisar (lógica pura, ya testeada).
    const bucketSent = new Set<string>() // se completa una vez que sabemos el bucket
    const planAll = planReminders({
      now,
      userIds: users.map((u) => u.id),
      predBy,
      sent: bucketSent, // provisorio; recomputamos con el bucket real abajo
    })
    const bucket = planAll.bucket
    if (!bucket) {
      res.status(200).json({ ok: true, note: 'No hay etapa abierta (¿terminó el Mundial?).' })
      return
    }
    // Ahora sí, armamos el set de enviados FILTRADO por el bucket abierto.
    for (const r of sentR.data || []) {
      if ((r as any).bucket === bucket) bucketSent.add(`${(r as any).user_id}|${(r as any).kind}`)
    }
    const plan = planReminders({ now, userIds: users.map((u) => u.id), predBy, sent: bucketSent })

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
      })
      return
    }

    // 4) Enviar con Brevo.
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
      const { subject, html, text } = buildReminderEmail(bucket, t.kind, t.name, appUrl)
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
        await supa.from('reminders').upsert(
          { user_id: t.userId, bucket, kind: t.kind },
          { onConflict: 'user_id,bucket,kind' },
        )
      } else {
        errors.push(`${t.email}: ${r.status} ${await r.text()}`)
      }
    }

    res.status(200).json({ ok: true, bucket, attempted: targets.length, sent, errors })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
}
