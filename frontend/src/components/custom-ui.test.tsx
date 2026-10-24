import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmProvider, useConfirm } from './Confirm'
import Select from './Select'

const OPTIONS = [
  { value: 1, label: '레그프레스', hint: '원판 머신' },
  { value: 2, label: '레그 익스텐션', hint: '핀 머신' },
  { value: 3, label: '랫풀다운', hint: '핀 머신' },
]

function Controlled({ onChange }: { onChange: (v: number) => void }) {
  const [v, setV] = useState<number | null>(null)
  return (
    <Select
      label="종목"
      placeholder="종목 선택"
      searchable
      options={OPTIONS}
      value={v}
      onChange={(x) => {
        setV(x)
        onChange(x)
      }}
    />
  )
}

describe('Select', () => {
  it('filters by search and picks with the keyboard', async () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: '종목' })
    expect(trigger).toHaveTextContent('종목 선택')

    await userEvent.click(trigger)
    expect(screen.getAllByRole('option')).toHaveLength(3)

    await userEvent.type(screen.getByLabelText('종목 검색'), '레그')
    expect(screen.getAllByRole('option')).toHaveLength(2)

    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith(2)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveTextContent('레그 익스텐션')
  })

  it('closes on Escape without choosing', async () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})

function AskButton({ onResult }: { onResult: (ok: boolean) => void }) {
  const confirm = useConfirm()
  return <button onClick={async () => onResult(await confirm({ title: '삭제할까요?', message: '되돌릴 수 없습니다.', confirmLabel: '삭제', danger: true }))}>열기</button>
}

describe('Confirm dialog', () => {
  it('focuses cancel for destructive actions and resolves false on Escape', async () => {
    const onResult = vi.fn()
    render(
      <ConfirmProvider>
        <AskButton onResult={onResult} />
      </ConfirmProvider>,
    )
    await userEvent.click(screen.getByText('열기'))
    expect(screen.getByRole('alertdialog', { name: '삭제할까요?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(onResult).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('resolves true when confirmed', async () => {
    const onResult = vi.fn()
    render(
      <ConfirmProvider>
        <AskButton onResult={onResult} />
      </ConfirmProvider>,
    )
    await userEvent.click(screen.getByText('열기'))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(onResult).toHaveBeenCalledWith(true)
  })
})
