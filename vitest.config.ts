import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Existing tests mock v1 calls; Rock v2 tests turn it on with vi.stubEnv.
    env: { ROCK_V2_ENABLED: 'false' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'app/root.tsx',
        'app/entry.client.tsx',
        'app/entry.server.tsx',
      ],
    },
  },
});
