import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  // Modo STAGING: SÓLO cuando Vercel compila la rama `staging`. En main
  // (producción) queda en false, así toda la simulación de staging queda inerte
  // aunque el código llegue a main. Local: false por defecto.
  const staging = process.env.VERCEL_GIT_COMMIT_REF === 'staging'
  return {
    plugins: [react()],
    define: { __STAGING__: JSON.stringify(staging) },
    // Permite abrir la app desde la red local (celu) durante el desarrollo.
    server: { host: true },
  }
})
