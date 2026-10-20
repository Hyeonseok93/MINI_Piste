import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const ToastContext = createContext<(message: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((m: string) => {
    window.clearTimeout(timer.current)
    setToast((t) => ({ id: (t?.id ?? 0) + 1, text: m }))
    timer.current = window.setTimeout(() => setToast(null), 1800)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.text}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
