import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
   plugins: [react()],
   resolve: {
      dedupe: ['react', 'react-dom'],
      alias: [
         { find: /^react$/, replacement: resolve(import.meta.dirname, 'node_modules/react/index.js') },
         { find: /^react-dom$/, replacement: resolve(import.meta.dirname, 'node_modules/react-dom/index.js') },
      ],
   },
   test: {
      environment: 'jsdom',
      setupFiles: ['./src/renderer/src/test/setup.ts'],
      restoreMocks: true,
   },
})
