import { defineConfig } from 'vitest/config'

export default defineConfig({
   test: {
      environment: 'node',
      include: ['src/main/test/**/*.test.ts', 'src/preload/test/**/*.test.ts'],
      restoreMocks: true,
   },
})
