// Lógica PURA de los recordatorios por mail (sin IO, testeable).
// El serverless api/remind.ts se encarga de leer Supabase y enviar con Brevo;
// acá sólo decidimos A QUIÉN avisar y armamos el contenido del mail.
import { MATCHES } from '../data/schedule'
import { activeBucket, bucketOf, type BucketId } from '../utils/stage'

export type ReminderKind = 'open' | 'lastcall'

// Ventana del "último aviso": si faltan <= estas horas para el primer partido de
// la etapa abierta y la persona todavía no predijo todo, se le manda el último aviso.
export const LASTCALL_HOURS = 30

export interface ReminderInputs {
  now: number
  userIds: string[]
  /** Predicción de cada usuario (results por nº de partido). */
  predBy: Map<string, Record<number, { played?: boolean } | undefined>>
  /** Recordatorios ya enviados para el bucket actual, como `${userId}|${kind}`. */
  sent: Set<string>
}

export interface ReminderPlan {
  bucket: BucketId | null
  hoursToFirst: number
  send: Array<{ userId: string; kind: ReminderKind }>
}

export function bucketMatchIds(bucket: BucketId): number[] {
  return MATCHES.filter((m) => bucketOf(m.stage) === bucket).map((m) => m.id)
}

export function bucketFirstKickoff(bucket: BucketId): number {
  const ks = MATCHES.filter((m) => bucketOf(m.stage) === bucket).map((m) => Date.parse(m.kickoff))
  return Math.min(...ks)
}

/**
 * Decide qué mails corresponde mandar en esta corrida del cron:
 *  - 'open': a TODOS los usuarios que no lo recibieron aún para la etapa abierta.
 *  - 'lastcall': si falta poco para el primer partido y a la persona todavía le
 *    falta predecir algún partido de la etapa (y no recibió el último aviso).
 * Si en una misma corrida corresponde 'open', se manda sólo eso (el último aviso
 * queda para otra corrida) para no enviar dos mails juntos.
 */
export function planReminders(inp: ReminderInputs): ReminderPlan {
  const bucket = activeBucket(inp.now)
  if (!bucket) return { bucket: null, hoursToFirst: 0, send: [] }

  const ids = bucketMatchIds(bucket)
  const hoursToFirst = (bucketFirstKickoff(bucket) - inp.now) / 3_600_000

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
// Contenido del mail (bilingüe, breve).
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
