import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// https://vite.dev/config/
export default defineConfig(async ({ command, mode }) => {
  const enableElectron = mode === 'electron' || command === 'build'
  const basePlugins = [react()]
  const electronPlugins: Plugin[] = enableElectron
    ? (await electron({
        main: {
          entry: 'electron/main.ts',
        },
        preload: {
          input: {
            preload: 'electron/preload.ts',
          },
        },
      } as any)) as Plugin[]
    : []

  return {
    plugins: [...basePlugins, ...electronPlugins],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
