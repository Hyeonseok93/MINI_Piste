import { useState } from 'react'
import type { Profile } from '../api/types'
import ProfileForm from '../components/ProfileForm'
import { useToast } from '../components/Toast'
import { initial } from '../lib/format'

export default function SettingsPage({ profile }: { profile: Profile }) {
  const toast = useToast()
  const [name, setName] = useState(profile.name)
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
          <div className="row gap-md mb-lg">
            <span className="avatar lg">{initial(name || profile.name)}</span>
            <div>
              <p className="row-title title-lg">{name || profile.name}</p>
              {bmi && <p className="row-sub">시작 BMI {bmi}</p>}
            </div>
          </div>
          <ProfileForm initial={profile} submitLabel="프로필 저장" onNameChange={setName} onSaved={() => toast('프로필을 저장했습니다')} />
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
