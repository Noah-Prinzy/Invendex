import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

const resolveNodeEnv = (mode) => {
  if (mode === 'test') return 'test';
  if (mode === 'development') return 'development';
  return 'production';
};

const buildDefineEnv = (mode) => {
  const env = loadEnv(mode, process.cwd(), '');
  const define = {
    'process.env.NODE_ENV': JSON.stringify(resolveNodeEnv(mode))
  };

  Object.entries(env).forEach(([key, value]) => {
    if (key.startsWith('REACT_APP_')) {
      define[`process.env.${key}`] = JSON.stringify(value);
    }
  });

  return { env, define };
};

export default defineConfig(({ mode }) => {
  const { env, define } = buildDefineEnv(mode);
  const port = Number(env.PORT || 3000);
  const shouldAnalyze = mode === 'analyze';
  const buildVendorChunkName = (id) => {
    const normalizedId = id.replace(/\\/g, '/');

    if (!normalizedId.includes('/node_modules/')) {
      return undefined;
    }

    if (
      normalizedId.includes('/socket.io-client/') ||
      normalizedId.includes('/engine.io-client/') ||
      normalizedId.includes('/socket.io-parser/')
    ) {
      return 'realtime-vendor';
    }

    if (normalizedId.includes('/@tanstack/react-query/')) {
      return 'query-vendor';
    }

    if (
      normalizedId.includes('/react/') ||
      normalizedId.includes('/react-dom/') ||
      normalizedId.includes('/scheduler/')
    ) {
      return 'react-vendor';
    }

    return undefined;
  };

  return {
    plugins: [
      {
        name: 'invendex-jsx-in-js',
        async transform(code, id) {
          if (!id.includes('/src/') || !id.endsWith('.js')) {
            return null;
          }

          return transformWithEsbuild(code, id, {
            loader: 'jsx',
            jsx: 'automatic'
          });
        }
      },
      react(),
      shouldAnalyze
        ? visualizer({
            filename: 'build/stats.html',
            gzipSize: true,
            brotliSize: true,
            open: false
          })
        : null
    ].filter(Boolean),
    define,
    clearScreen: false,
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx'
        }
      }
    },
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true
    },
    preview: {
      host: '0.0.0.0',
      port,
      strictPort: true
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: buildVendorChunkName
        }
      }
    },
    test: {
      include: ['src/**/*.{test,spec}.js'],
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      css: true,
      clearMocks: true
    }
  };
});
