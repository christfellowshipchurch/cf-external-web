import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig(async ({ isSsrBuild, command }) => {
  const plugins: PluginOption[] = [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ];

  if (process.env.ANALYZE === 'true' && !isSsrBuild) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(
      visualizer({
        filename: 'build/client/stats.html',
        gzipSize: true,
        open: false,
      }),
    );
  }

  // Netlify sets NETLIFY automatically on builds and netlify dev (do not define a custom env named NETLIFY).
  if (process.env.NETLIFY) {
    const { default: netlifyPlugin } =
      await import('@netlify/vite-plugin-react-router');
    plugins.push(netlifyPlugin());
  }

  return {
    server: {
      fs: {
        // When running from a git worktree the node_modules live in the repo
        // root (one level up). Allow Vite to serve from there too.
        allow: [__dirname, path.resolve(__dirname, '../../')],
      },
    },
    build: {
      // Never mark Node builtins external on the client: deps that transitively
      // import `path` (e.g. postcss) would emit bare imports the browser cannot resolve.
      rollupOptions: {},
    },
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './app'),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    ssr: {
      // Bundle router packages so Vercel serverless handlers do not rely on
      // traced node_modules paths (pnpm + external imports often miss dist/index.js).
      noExternal:
        command === 'build' ? ['fs', 'path', 'url', 'react-router'] : undefined,
    },
    plugins,
    optimizeDeps: {
      exclude: ['twilio', 'ioredis'],
    },
  };
});
