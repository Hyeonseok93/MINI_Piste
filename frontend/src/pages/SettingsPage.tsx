import { useState } from 'react'
import type { Profile } from '../api/types'
import ProfileForm from '../components/ProfileForm'
import { useToast } from '../components/Toast'
import { initial } from '../lib/format'
import { useThemePref, type ThemePref } from '../lib/theme'
import s from './SettingsPage.module.css'

const THEMES: [ThemePref, string][] = [
  ['dark', '다크'],
  ['light', '라이트'],
  ['system', '기기 설정 따름'],
]

export default function SettingsPage({ profile }: { profile: Profile }) {
  const toast = useToast()
  const [name, setName] = useState(profile.name)
  const [theme, setTheme] = useThemePref()
  const { height_cm: h, start_weight_kg: w } = profile
  const bmi = h && w ? (w / (h / 100) ** 2).toFixed(1) : null

  return (
    <>
      <header className="page-header">
        <div className="titles">
          <h1 className="page-title">설정</h1>
          <p className="page-sub">이 기기에서 혼자 쓰는 앱이라 로그인 없이 이름으로만 구분합니다.</p>
        </div>
      </header>

      <div className="grid cols-2 narrow-lg">
        <section className="panel">
          <div className={s.me}>
            <span className={s.avatar}>{initial(name || profile.name)}</span>
            <div>
              <p className={s.name}>{name || profile.name}</p>
              {bmi && <p className="row-sub">시작 BMI {bmi}</p>}
            </div>
          </div>
          <ProfileForm initial={profile} submitLabel="프로필 저장" onNameChange={setName} onSaved={() => toast('프로필을 저장했습니다')} />
        </section>

        <div className="stack loose">
          <section className="panel stack">
            <h2 className="panel-title">화면</h2>
            <div className="seg" role="group" aria-label="화면 테마">
              {THEMES.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={theme === k} onClick={() => setTheme(k)}>
                  {label}
                </button>
              ))}
            </div>
            <p className="row-sub">이 기기에만 저장됩니다. 휴대폰과 PC를 따로 정할 수 있어요.</p>
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
      </div>
    </>
  )
}
