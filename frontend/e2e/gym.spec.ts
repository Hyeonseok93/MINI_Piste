import { expect, test } from '@playwright/test'

// 헬스장에서 실제로 하는 흐름: 처음 시작 → 운동 모드로 세트 기록·휴식 → 루틴 수정 → 홈 체중 → 단계 기간·추가·삭제 → 몸 기록 → 못 한 날 표시.
// 날짜는 시드 플랜 기준으로 고정한다 (2026-10-25 일요일 = 전신 A, 10/16 무게 찾기 기록 있음).
const API = 'http://127.0.0.1:8100/api'

// 데스크톱·모바일 두 기기가 같은 테스트 DB 를 차례로 쓰므로 기기마다 다른 날짜·값을 쓴다
const PER_DEVICE = {
  desktop: { session: '2026-10-25', firstWeight: '120kg', addSearch: '카프', addName: '카프레이즈 머신', bodyWeight: '109.6', skipDay: '2026-10-22' },
  mobile: { session: '2026-11-08', firstWeight: null, addSearch: '익스텐션', addName: '레그 익스텐션', bodyWeight: '108.9', skipDay: '2026-10-27' },
} as const
const dev = (name: string) => PER_DEVICE[name as keyof typeof PER_DEVICE]

test.describe.configure({ mode: 'serial' })

test('처음 방문하면 이름을 정하고 홈으로 간다', async ({ page, request }, info) => {
  // 두 번째 프로젝트(모바일)에서는 이미 프로필이 있으므로 이 시나리오만 건너뛴다
  const existing = await request.get(`${API}/profile`)
  test.skip(existing.ok(), `${info.project.name}: 프로필이 이미 있음`)

  await page.goto('/')
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByPlaceholder('예: 홍길동').fill('테스트')
  await page.getByRole('button', { name: '시작하기' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('테스트님')
})

test('운동 모드: 세트를 기록하면 휴식 타이머가 돌고, 종목을 다 하면 다음으로 넘어간다', async ({ page }, info) => {
  const d = dev(info.project.name)
  await page.goto(`/session?date=${d.session}`)
  const card = page.getByRole('article', { name: '레그프레스' })
  await expect(card).toBeVisible()
  if (d.firstWeight) await expect(card.getByText(d.firstWeight).first()).toBeVisible() // 금요일 무게 찾기 결과로 시작

  await card.getByRole('button', { name: '1세트 기록' }).click()
  const timer = page.getByRole('timer')
  await expect(timer).toBeVisible()
  await timer.getByRole('button', { name: '+30초' }).click()
  await timer.getByRole('button', { name: '바로 시작' }).click()
  await expect(timer).toBeHidden()

  await card.getByRole('button', { name: '2세트 기록' }).click()
  await page.getByRole('timer').getByRole('button', { name: '바로 시작' }).click()
  await card.getByRole('button', { name: '3세트 기록' }).click()

  // 3세트를 채우면 다음 종목 카드로 자동 이동
  await expect(page.getByRole('article', { name: '체스트프레스 머신' })).toBeVisible()
  await page.getByRole('timer').getByRole('button', { name: '바로 시작' }).click()
  // 앞 시나리오가 루틴에 종목을 더할 수 있어 전체 개수는 고정하지 않는다
  await expect(page.getByText(/1\/\d+ 종목/)).toBeVisible()
})

test('플랜: 루틴에 종목을 추가하고 저장한다', async ({ page, request }, info) => {
  const d = dev(info.project.name)
  const routines = (await (await request.get(`${API}/routines`)).json()) as { name: string; item_count: number }[]
  const before = routines.find((r) => r.name === '전신 A')!.item_count

  await page.goto('/plan')
  await page.getByRole('tab', { name: '루틴' }).click()
  await page.getByRole('button', { name: /^전신 A/ }).click()

  await page.getByRole('combobox', { name: '루틴에 종목 추가' }).click()
  await page.getByLabel('루틴에 종목 추가 검색').fill(d.addSearch)
  await page.getByRole('option', { name: new RegExp(d.addName) }).click()
  await expect(page.getByText(d.addName).first()).toBeVisible()

  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '루틴을 저장했습니다' })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(`^전신 A\\s*${before + 1}$`) })).toBeVisible()
})

test('홈: 오늘 아침 체중을 바로 기록한다', async ({ page }, info) => {
  const d = dev(info.project.name)
  const w = (Number(d.bodyWeight) + 0.4).toFixed(1)
  await page.goto('/')
  const card = page.locator('section').filter({ has: page.getByRole('heading', { name: '체중' }) })
  await card.getByLabel('오늘 아침 체중(kg)').fill(w)
  await card.getByRole('button', { name: /^(기록|수정)$/ }).click()
  await expect(page.getByRole('status').filter({ hasText: '오늘 체중을 기록했습니다' })).toBeVisible()
})

test('플랜: 단계 종료일을 날짜 선택기로 하루 당긴다', async ({ page }) => {
  await page.goto('/plan')
  const edit = page.getByRole('button', { name: /이름과 기간 수정$/ }).last()
  await edit.click()
  const end = page.getByRole('button', { name: /^종료일, / })
  const before = await end.getAttribute('aria-label')
  await end.click()
  // 달력이 열리면 고른 날짜에 포커스가 간다: 왼쪽 화살표로 하루 전, Enter 로 고른다
  await expect(page.getByRole('dialog', { name: '종료일 달력' })).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: '종료일 달력' })).toBeHidden()
  await expect(end).not.toHaveAttribute('aria-label', before!)
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '단계를 저장했습니다' })).toBeVisible()
})

test('플랜: 새 단계를 만들고 삭제한다', async ({ page }, info) => {
  const name = `테스트 단계 ${info.project.name}`
  await page.goto('/plan')
  await page.getByRole('button', { name: '새 단계' }).click()
  const form = page.getByRole('region', { name: '새 단계' })
  await form.getByLabel('단계 이름').fill(name)
  // 시작일은 마지막 단계 다음 날, 요일 계획은 마지막 단계 복사가 기본
  await form.getByRole('button', { name: '단계 만들기' }).click()
  await expect(page.getByRole('status').filter({ hasText: `${name} 단계를 만들었습니다` })).toBeVisible()

  await page.getByRole('button', { name: `${name} 이름과 기간 수정` }).click()
  await page.getByRole('button', { name: '단계 삭제' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click()
  await expect(page.getByRole('status').filter({ hasText: '단계를 삭제했습니다' })).toBeVisible()
  await expect(page.getByRole('heading', { name })).toBeHidden()
})

test('몸: 오늘 체중을 저장하면 그래프에 반영된다', async ({ page }, info) => {
  const d = dev(info.project.name)
  await page.goto('/body')
  const today = page.locator('section').filter({ has: page.getByRole('heading', { name: '오늘' }) })
  await today.getByLabel('체중').fill(d.bodyWeight)
  await today.getByRole('button', { name: '몸 상태 저장' }).click()
  await expect(page.getByRole('status').filter({ hasText: '몸 상태를 저장했습니다' })).toBeVisible()
  await expect(page.getByText(`${d.bodyWeight}kg`).first()).toBeVisible()
})

test('못 한 날: 운동일을 못 함으로 표시하면 달력에 회색으로 남는다', async ({ page }, info) => {
  const d = dev(info.project.name)
  await page.goto(`/workout?date=${d.skipDay}`)
  await page.getByRole('button', { name: '오늘은 못 함' }).click()
  await expect(page.getByText("이 날은 '못 함'으로 표시했어요.")).toBeVisible()

  await page.goto('/calendar')
  // isVisible 은 기다리지 않으므로 달력 데이터가 뜬 뒤에 확인한다
  await expect(page.getByRole('grid', { name: '월간 달력' })).toBeVisible()
  // 달력은 오늘 기준 달을 연다. 2026-10 이 아니면 건너뛴다
  const cell = page.getByRole('gridcell', { name: new RegExp(`^${d.skipDay} `) })
  if (!(await cell.isVisible())) test.skip(true, '오늘이 2026년 10월이 아님')
  await expect(cell).toHaveAccessibleName(/못 함/)
})
