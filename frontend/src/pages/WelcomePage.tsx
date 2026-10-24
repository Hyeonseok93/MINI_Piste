import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSaveProfile } from '../api/hooks'
import { BrandMark } from '../components/icons'

const num = (v: string) => (v.trim() === '' ? null : Number(v))

export default function WelcomePage() {
  const save = useSaveProfile()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [goal, setGoal] = useState('')

  return (
    <div className="welcome">
      <section className="welcome-side" aria-hidden>
        <div className="brand">
          <BrandMark className="brand-mark" />
          PISTE
        </div>
        <div>
          <h2>1년짜리 경기를 시작합니다</h2>
          <p>오늘 할 운동과 들어야 할 무게를 알려 주고, 기록이 쌓이면 다음 무게를 정해 드립니다.</p>
        </div>
        <div className="welcome-piste">
          <span />
          <span />
          <span />
        </div>
      </section>

      <main className="welcome-main">
        <div className="brand">
          <BrandMark className="brand-mark" />
          PISTE
        </div>
        <h1 className="welcome-title">이름부터 알려 주세요</h1>
        <p className="welcome-lead">이 기기에서 혼자 쓰는 기록이라 비밀번호는 필요 없습니다. 몸 정보는 나중에 설정에서 바꿀 수 있어요.</p>

        <form
          className="welcome-form"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate(
              { name: name.trim(), height_cm: num(height), start_weight_kg: num(weight), goal_weight_kg: num(goal) },
              { onSuccess: () => navigate('/', { replace: true }) },
            )
          }}
        >
          <label className="field">
            <span className="field-label">이름</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" autoFocus maxLength={40} />
          </label>
          <label className="field">
            <span className="field-label">키</span>
            <span className="input-suffix">
              <input className="input" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="188" />
              <span>cm</span>
            </span>
          </label>
          <div className="two">
            <label className="field">
              <span className="field-label">현재 체중</span>
              <span className="input-suffix">
                <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="110" />
                <span>kg</span>
              </span>
            </label>
            <label className="field">
              <span className="field-label">목표 체중</span>
              <span className="input-suffix">
                <input className="input" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="선택" />
                <span>kg</span>
              </span>
            </label>
          </div>
          {save.isError && <p className="error-text">{save.error.message}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={!name.trim() || save.isPending} style={{ marginTop: 8 }}>
            {save.isPending ? '저장 중…' : '시작하기'}
          </button>
        </form>
      </main>
    </div>
  )
}
