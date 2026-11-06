import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    pool: 'forks',
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/**/*.d.ts',
        'src/lib/server/request.ts',
        'src/lib/server/session-cookie.ts',
      ],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 80, branches: 70 },
    },
  },
});
