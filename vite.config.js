import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './',
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'app.localhost',
      'student.localhost',
      'institution.localhost',
      'localhost',
      '127.0.0.1',
    ],
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
  }
})
