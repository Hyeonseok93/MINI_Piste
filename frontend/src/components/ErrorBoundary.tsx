import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * 화면 하나가 렌더 중 오류를 내도 앱 전체가 하얗게 죽지 않게 한다.
 * 경로가 바뀌면 AppShell 이 key 로 새로 마운트해 오류 상태를 푼다.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('화면 오류', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="panel empty" role="alert">
        <p className="row-title">이 화면을 표시하지 못했습니다.</p>
        <p className="row-sub mt-xs">{this.state.error.message}</p>
        <button className="btn btn-secondary mt-md" onClick={() => this.setState({ error: null })}>
          다시 시도
        </button>
      </div>
    )
  }
}
