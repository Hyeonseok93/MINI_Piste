import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import s from './Confirm.module.css'

interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** 되돌릴 수 없는 작업이면 빨간 버튼 */
  danger?: boolean
}

type Ask = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Ask>(() => Promise.resolve(false))

/** window.confirm 대신 쓰는 앱 디자인의 확인 대화상자 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)

  const ask = useCallback<Ask>((options) => new Promise((resolve) => setState({ ...options, resolve })), [])

  const finish = (ok: boolean) => {
    state?.resolve(ok)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {state && createPortal(<Dialog {...state} onClose={finish} />, document.body)}
    </ConfirmContext.Provider>
  )
}

function Dialog({ title, message, confirmLabel = '확인', cancelLabel = '취소', danger, onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const cancel = useRef<HTMLButtonElement>(null)
  const ok = useRef<HTMLButtonElement>(null)
  const previous = useRef<Element | null>(null)

  useEffect(() => {
    previous.current = document.activeElement
    // 되돌릴 수 없는 작업은 실수로 Enter 를 눌러도 취소되도록 취소 버튼에 포커스
    ;(danger ? cancel : ok).current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      ;(previous.current as HTMLElement | null)?.focus?.()
    }
  }, [danger])

  // Esc 로 닫기, Tab 은 두 버튼 사이에서만 돈다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose(false)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        ;(document.activeElement === cancel.current ? ok : cancel).current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={s.backdrop} onPointerDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className={s.dialog} role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby={message ? 'dialog-msg' : undefined}>
        <h2 id="dialog-title" className={s.title}>
          {title}
        </h2>
        {message && (
          <div id="dialog-msg" className={s.msg}>
            {message}
          </div>
        )}
        <div className={s.actions}>
          <button ref={cancel} type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
            {cancelLabel}
          </button>
          <button ref={ok} type="button" className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => onClose(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => useContext(ConfirmContext)
