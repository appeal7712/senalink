import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Auth 에뮬레이터와 호스트를 맞춘다 (localhost vs 127.0.0.1 팝업 오류 방지)
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/__firestore-emulator': {
        target: 'http://127.0.0.1:8080',
        rewrite: (path) => path.replace(/^\/__firestore-emulator/, ''),
      },
    },
  },
})
