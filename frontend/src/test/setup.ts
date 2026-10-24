import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// vitest globals 를 쓰지 않으므로 테스트마다 렌더 결과를 직접 정리한다
afterEach(() => cleanup())
