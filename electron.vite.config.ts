import { defineConfig } from 'electron-vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'

export default defineConfig({
   main: {
      build: {
         outDir: 'out/main',
      },
   },
   preload: {
      build: {
         outDir: 'out/preload',
         rollupOptions: {
            output: {
               format: 'cjs',
               entryFileNames: '[name].cjs',
            },
         },
      },
   },
   renderer: {
      root: resolve(__dirname, 'src/renderer'),
      plugins: [react()],
      resolve: {
         alias: {
            '@': resolve(__dirname, 'src/renderer/src'),
         },
      },
   },
})
