import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/icons'
import ProfileForm from '../components/ProfileForm'

export default function WelcomePage() {
  const navigate = useNavigate()

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
        <ProfileForm submitLabel="시작하기" focusName onSaved={() => navigate('/', { replace: true })} />
      </main>
    </div>
  )
}
