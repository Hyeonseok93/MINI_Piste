import { defineConfig, devices } from '@playwright/test'

// E2E: 테스트 전용 API(새 SQLite DB) + Vite 개발 서버를 띄워 실제 사용 흐름을 확인한다.
// 브라우저는 설치된 Chrome 을 쓴다 (별도 다운로드 없음).
const API_PORT = 8100
const WEB_PORT = 5180

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // 시나리오들이 같은 DB 를 순서대로 쓴다
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    channel: 'chrome',
    locale: 'ko-KR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1366, height: 860 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: [
    {
      command: `uv --directory ../backend run python scripts/e2e_server.py ${API_PORT}`,
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { PYTHONUTF8: '1' },
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_URL: `http://127.0.0.1:${API_PORT}` },
    },
  ],
})
