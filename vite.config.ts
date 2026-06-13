import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3000,
  },
  ssr: {
    // Explicit SSR config block — add noExternal entries here if third-party packages
    // fail to resolve during the server build (e.g. "cannot use import statement").
    noExternal: [],
  },
  build: {
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.ts'],
  },
})
