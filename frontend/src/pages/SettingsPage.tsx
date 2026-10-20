import { useState } from 'react'
import { useSaveProfile } from '../api/hooks'
import type { Profile } from '../api/types'
import { initial } from '../lib/format'
import { useToast } from '../components/Toast'

const num = (v: string) => (v.trim() === '' ? null : Number(v))
const str = (v: number | null) => (v == null ? '' : String(v))

export default function SettingsPage({ profile }: { profile: Profile }) {
  const save = useSaveProfile()
  const toast = useToast()
  const [name, setName] = useState(profile.name)
  const [height, setHeight] = useState(str(profile.height_cm))
  const [weight, setWeight] = useState(str(profile.start_weight_kg))
  const [goal, setGoal] = useState(str(profile.goal_weight_kg))

  const h = num(height)
  const w = num(weight)
  const bmi = h && w ? (w / (h / 100) ** 2).toFixed(1) : null

  return (
    <>
      <header className="page-header">
        <div className="titles">
          <h1 className="page-title">설정</h1>
          <p className="page-sub">이 기기에서 혼자 쓰는 앱이라 로그인 없이 이름으로만 구분합니다.</p>
        </div>
      </header>

      <div className="grid cols-2" style={{ maxWidth: 980 }}>
        <section className="panel">
          <div className="row" style={{ gap: 14, marginBottom: 20 }}>
            <span className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
              {initial(name || profile.name)}
            </span>
            <div>
              <p className="row-title" style={{ fontSize: 18 }}>
                {name || profile.name}
              </p>
              {bmi && <p className="row-sub">시작 BMI {bmi}</p>}
            </div>
          </div>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault()
              save.mutate({ name: name.trim(), height_cm: h, start_weight_kg: w, goal_weight_kg: num(goal) }, { onSuccess: () => toast('프로필을 저장했습니다') })
            }}
          >
            <label className="field">
              <span className="field-label">이름</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
            </label>
            <div className="form-grid cols-3">
              <label className="field">
                <span className="field-label">키</span>
                <span className="input-suffix">
                  <input className="input" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
                  <span>cm</span>
                </span>
              </label>
              <label className="field">
                <span className="field-label">시작 체중</span>
                <span className="input-suffix">
                  <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
                  <span>kg</span>
                </span>
              </label>
              <label className="field">
                <span className="field-label">목표 체중</span>
                <span className="input-suffix">
                  <input className="input" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} />
                  <span>kg</span>
                </span>
              </label>
            </div>
            {save.isError && <p className="error-text">{save.error.message}</p>}
            <button className="btn btn-primary" type="submit" disabled={!name.trim() || save.isPending}>
              프로필 저장
            </button>
          </form>
        </section>

        <section className="panel stack">
          <h2 className="panel-title">데이터</h2>
          <p className="row-sub">기록은 PC의 Docker 볼륨(PostgreSQL)에 저장됩니다. 컨테이너를 꺼도 지워지지 않고, 볼륨을 지울 때만 사라집니다.</p>
          <p className="row-sub">같은 와이파이에 연결된 휴대폰에서는 PC의 IP 주소와 8080 포트로 접속하세요.</p>
          <a className="btn btn-secondary" href="/api/docs" target="_blank" rel="noreferrer">
            API 문서 열기
          </a>
        </section>
      </div>
    </>
  )
}
