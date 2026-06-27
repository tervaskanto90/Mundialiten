import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// https://vite.dev/config/
export default defineConfig(() => {
  // Modo STAGING: SÓLO cuando Vercel compila la rama `staging`. En main
  // (producción) queda en false, así toda la simulación de staging queda inerte
  // aunque el código llegue a main. Local: false por defecto.
  const staging = process.env.VERCEL_GIT_COMMIT_REF === 'staging'

  // Versión real (de package.json) + hash del commit (el "build" de cada deploy).
  const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string
  const sha =
    (process.env.VERCEL_GIT_COMMIT_SHA && process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)) ||
    (() => {
      try {
        return execSync('git rev-parse --short HEAD').toString().trim()
      } catch {
        return 'dev'
      }
    })()

  return {
    plugins: [react()],
    define: {
      __STAGING__: JSON.stringify(staging),
      __APP_VERSION__: JSON.stringify(version),
      __BUILD_SHA__: JSON.stringify(sha),
    },
    // Permite abrir la app desde la red local (celu) durante el desarrollo.
    server: { host: true },
  }
})
