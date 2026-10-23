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
      root: resolve(import.meta.dirname, 'src/renderer'),
      publicDir: resolve(import.meta.dirname, 'src/renderer/src/public'),
      plugins: [react()],
      resolve: {
         dedupe: ['react', 'react-dom'],
         alias: [
            { find: /^react$/, replacement: resolve(import.meta.dirname, 'node_modules/react/index.js') },
            { find: /^react-dom$/, replacement: resolve(import.meta.dirname, 'node_modules/react-dom/index.js') },
            { find: '@', replacement: resolve(import.meta.dirname, 'src/renderer/src') },
         ],
      },
   },
})
