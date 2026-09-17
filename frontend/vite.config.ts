import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Keep the dist directory contents so frontend/dist/.gitkeep survives a
    // build. main.go embeds "all:frontend/dist", which needs that directory to
    // exist on a fresh clone. Run `make clean` to drop stale bundles.
    emptyOutDir: false,
  },
})

