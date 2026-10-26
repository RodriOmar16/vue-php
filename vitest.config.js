import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['./vitest.setup.ts'],
      // Las pantallas con formularios grandes (marca, combos) pueden pasar de los 5 s por defecto cuando corren muchos archivos a la vez.
      testTimeout: 20_000,
      hookTimeout: 30_000,
      // Vuetify importa archivos .css desde node_modules: Vite debe procesarlo, no Node.
      server: { deps: { inline: ['vuetify'] } },
    },
  }),
)
