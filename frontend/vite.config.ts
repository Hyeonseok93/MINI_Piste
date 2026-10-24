/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // SVG 는 파일로 둔다: 아이콘 스프라이트는 <use href="파일#이름"> 로 부르는데 data: 주소는 브라우저가 막는다
    assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined),
  },
  server: {
    proxy: {
      '/api': process.env.API_URL ?? 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ 는 Playwright 가 돌린다
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
