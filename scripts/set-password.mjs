#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Fijar una contraseña nueva a un usuario (acción de admin).
//
// Las contraseñas NO se pueden recuperar (están hasheadas): esto SOBRESCRIBE la
// contraseña del usuario por una nueva temporal, que después le pasás a la
// persona para que entre y la cambie.
//
// Requiere la SERVICE ROLE KEY de tu proyecto (NUNCA la subas al repo ni la
// expongas en el front). Sacala de: Supabase → Project Settings → API →
// "service_role" (secret).
//
// Uso:
//   SUPABASE_URL="https://xxxx.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="<service_role secret>" \
//   node scripts/set-password.mjs <email> [nueva_contraseña]
//
// Ejemplo (con la contraseña temporal generada):
//   node scripts/set-password.mjs plutarco@ejemplo.com 'Plutarco-Kpnb0RcgBe'
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = (process.argv[2] || '').trim().toLowerCase()
const newPassword = process.argv[3] || 'Plutarco-Kpnb0RcgBe'

if (!url || !key) {
  console.error('Falta SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}
if (!email) {
  console.error('Pasá el email del usuario: node scripts/set-password.mjs <email> [password]')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// Busca el usuario por email recorriendo las páginas del admin API.
async function findUserByEmail(targetEmail) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((u) => (u.email || '').toLowerCase() === targetEmail)
    if (found) return found
    if (data.users.length < 200) break // última página
  }
  return null
}

const user = await findUserByEmail(email)
if (!user) {
  console.error(`No se encontró ningún usuario con email "${email}".`)
  process.exit(1)
}

const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
if (error) {
  console.error('No se pudo actualizar la contraseña:', error.message)
  process.exit(1)
}

console.log('✅ Contraseña actualizada.')
console.log('   Usuario:', user.email, '(' + user.id + ')')
console.log('   Nueva contraseña:', newPassword)
console.log('   Pasásela a la persona y que la cambie cuando entre.')
