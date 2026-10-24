import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Exercise, RoutineItem } from '../api/types'
import ExerciseCard from './ExerciseCard'

const lat: Exercise = {
  id: 3,
  name: '랫풀다운',
  category: 'strength',
  equipment: 'pin',
  increment_kg: 5,
  unilateral: false,
  alternative: null,
  setup_note: null,
  cue: null,
  archived: false,
  muscles: [{ muscle: 'lats', role: 'primary' }],
}

const CHOICES = [
  { label: '못 채움', completed: false, rir: null },
  { label: '0~1개', completed: true, rir: 1 },
  { label: '2~3개', completed: true, rir: 2 },
  { label: '4개', completed: true, rir: 4 },
  { label: '5개+', completed: true, rir: 5 },
]

const item: RoutineItem = { id: 1, position: 3, sets: 3, rep_min: 10, rep_max: 12, duration_sec: null, exercise: lat }

describe('ExerciseCard', () => {
  it('prefills recommended weight and logs a work set', async () => {
    const onAdd = vi.fn().mockResolvedValue({})
    render(
      <ExerciseCard
        index={3}
        exercise={lat}
        item={item}
        recommendation={{ action: 'start', weight_kg: 50, last_weight_kg: 50, reason: '무게 찾기 결과 50kg로 시작' }}
        last={{ date: '2026-10-16', sets: [{ id: 9, exercise_id: 3, set_no: 1, kind: 'find', weight_kg: 50, reps: 12, duration_sec: null, rir: null, side: null }] }}
        sets={[]}
        finderChoices={CHOICES}
        onAdd={onAdd}
        onDelete={() => {}}
      />,
    )

    expect(screen.getAllByText('50kg').length).toBeGreaterThan(0)
    expect(screen.getByText(/10\/16 \(금\): 50kg × 12/)).toBeInTheDocument()
    expect(screen.getByLabelText('무게(kg)')).toHaveValue('50')
    expect(screen.getByLabelText('횟수')).toHaveValue('12')

    await userEvent.click(screen.getByRole('button', { name: '무게(kg) 늘리기' }))
    expect(screen.getByLabelText('무게(kg)')).toHaveValue('55')

    await userEvent.click(screen.getByRole('button', { name: /1세트 기록/ }))
    expect(onAdd).toHaveBeenCalledWith({ exercise_id: 3, kind: 'work', weight_kg: 55, reps: 12, rir: null, side: null })
  })

  it('opens weight finder when there is no history', () => {
    render(
      <ExerciseCard
        index={5}
        exercise={{ ...lat, id: 5, name: '머신 로우' }}
        item={item}
        recommendation={{ action: 'unknown', weight_kg: null, last_weight_kg: null, reason: '기록 없음 · 시작 무게 찾기부터' }}
        sets={[]}
        finderChoices={CHOICES}
        onAdd={vi.fn()}
        onDelete={() => {}}
      />,
    )
    expect(screen.getByText(/몇 개 더 할 수 있었나/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^(못 채움|\d.*개\+?)$/ })).toHaveLength(5)
  })
})
