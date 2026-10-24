import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/icons'
import ProfileForm from '../components/ProfileForm'
import s from './WelcomePage.module.css'

// 왼쪽 그림: 이런 식으로 요일별 계획을 짠다는 예시 (실제 데이터 아님)
const SAMPLE_WEEK = [
  ['월', 'cardio', '유산소'],
  ['화', 'strength', '전신 B'],
  ['수', 'cardio', '유산소'],
  ['목', 'strength', '전신 A'],
  ['금', 'rest', '휴식'],
  ['토', 'rest', '휴식'],
  ['일', 'strength', '전신 B'],
] as const

export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className={s.welcome}>
      <section className={s.side} aria-hidden>
        <div className={s.brand}>
          <BrandMark />
          PISTE
        </div>
        <div>
          <h2>운동 스케줄을 한곳에서</h2>
          <p>요일별 계획을 세우고, 오늘 할 운동과 무게를 확인하고, 세트를 기록하세요. 기록이 쌓이면 다음 무게를 정해 드립니다.</p>
        </div>
        <ol className={s.week}>
          {SAMPLE_WEEK.map(([wd, kind, label]) => (
            <li key={wd} className={s[kind]}>
              <span className={s.wd}>{wd}</span>
              <span className={s.bar} />
              <span className={s.label}>{label}</span>
            </li>
          ))}
        </ol>
      </section>

      <main className={s.main}>
        <div className={s.brand}>
          <BrandMark />
          PISTE
        </div>
        <h1 className={s.title}>이름부터 알려 주세요</h1>
        <p className={s.lead}>이 기기에서 혼자 쓰는 기록이라 비밀번호는 필요 없습니다. 몸 정보는 나중에 설정에서 바꿀 수 있어요.</p>
        <ProfileForm submitLabel="시작하기" focusName onSaved={() => navigate('/', { replace: true })} />
      </main>
    </div>
  )
}
