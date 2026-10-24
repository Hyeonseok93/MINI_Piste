import { Link } from 'react-router-dom'
import { useDashboard } from '../api/hooks'
import type { CalendarDay, Dashboard, Profile } from '../api/types'
import PisteTimeline from '../components/PisteTimeline'
import WeekStrip from '../components/WeekStrip'
import { formatLong, parseISODate, todayISO, weekdayIndex, weekdayLabel } from '../lib/date'
import { kg } from '../lib/format'
import { dayStatus, KIND_LABEL, shortTitle } from '../lib/status'

function greeting(name: string, today: CalendarDay) {
  const st = dayStatus(today, today.date)
  if (st === 'done') return `${name}님, 오늘 운동 끝!`
  if (today.kind === 'rest' || today.kind == null || today.rest_day) return `${name}님, 오늘은 쉬는 날이에요`
  return `${name}님, 오늘은 ${shortTitle(today)}`
}

export default function HomePage({ profile }: { profile: Profile }) {
  const today = todayISO()
  const { data, isPending, isError, error } = useDashboard(today)

  return (
    <>
      {isPending && (
        <div className="grid">
          <div className="skeleton" style={{ height: 180 }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
      )}
      {isError && <p className="error-text">{error.message}</p>}
      {data && <HomeView data={data} name={profile.name} today={today} />}
    </>
  )
}

function HomeView({ data, name, today }: { data: Dashboard; name: string; today: string }) {
  const { stats } = data
  const t = data.today

  return (
    <div className="grid">
      <section className="hero">
        <div style={{ alignSelf: 'end' }}>
          <p className="greet-date">
            {formatLong(today)}
            {stats.day_number != null && ` · ${stats.day_number}일째`}
          </p>
          <h1 className="greet-title">{greeting(name, t)}</h1>
          <p className="greet-sub">{t.phase ? `${t.phase} 단계` : '플랜 기간이 아닙니다'}</p>
        </div>
        <TodayCard day={t} today={today} />
      </section>

      <section className="panel" aria-labelledby="piste-title">
        <div className="panel-head">
          <h2 className="panel-title" id="piste-title">
            1년 플랜
          </h2>
          <Link to="/plan" className="panel-link">
            플랜 보기
          </Link>
        </div>
        <PisteTimeline phases={data.phases} today={today} />
      </section>

      <section className="panel flush" aria-label="요약">
        <Stats data={data} />
      </section>

      <div className="grid cols-2">
        <section className="panel" aria-labelledby="week-title">
          <div className="panel-head">
            <h2 className="panel-title" id="week-title">
              이번 주
            </h2>
            <span className="muted num" style={{ fontSize: 17 }}>
              {stats.week_done}/{stats.week_planned}
            </span>
            <Link to="/calendar" className="panel-link">
              달력
            </Link>
          </div>
          <WeekStrip days={data.week} today={today} />
        </section>

        <section className="panel" aria-labelledby="next-title">
          <div className="panel-head">
            <h2 className="panel-title" id="next-title">
              다음 운동
            </h2>
          </div>
          {data.upcoming.length === 0 ? (
            <p className="empty">예정된 운동이 없습니다</p>
          ) : (
            <ul className="rows">
              {data.upcoming.map((d) => (
                <li key={d.date}>
                  <Link to={`/workout?date=${d.date}`} className="row grow" style={{ gap: 14 }}>
                    <span className="date-block">
                      <span className="num">{parseISODate(d.date).getDate()}</span>
                      <span>{weekdayLabel(weekdayIndex(d.date))}요일</span>
                    </span>
                    <span className="grow">
                      <span className="row-title" style={{ display: 'block' }}>
                        {shortTitle(d)}
                      </span>
                      <span className="row-sub">{d.label}</span>
                    </span>
                    <span className={`pill ${d.kind}`}>{d.kind ? KIND_LABEL[d.kind] : ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function TodayCard({ day, today }: { day: CalendarDay; today: string }) {
  const st = dayStatus(day, today)
  const isRest = day.kind == null || day.kind === 'rest' || day.rest_day

  if (st === 'done') {
    return (
      <div className="today-card done">
        <p className="tc-kicker">오늘 운동 완료</p>
        <p className="tc-title">{day.workout_title}</p>
        <div className="tc-meta">
          <span>
            <b>{day.set_count}</b>세트
          </span>
          {day.cardio_minutes_done != null && (
            <span>
              <b>{day.cardio_minutes_done}</b>분 유산소
            </span>
          )}
        </div>
        <Link to="/workout" className="btn btn-primary">
          기록 보기
        </Link>
      </div>
    )
  }

  if (isRest) {
    return (
      <div className="today-card rest">
        <p className="tc-kicker">오늘</p>
        <p className="tc-title">{day.rest_day ? `${shortTitle(day)} · 못 함` : '휴식'}</p>
        <p className="tc-meta">걷기 30분이나 스트레칭 정도면 충분해요. 체중만 기록해 두세요.</p>
        <Link to="/workout" className="btn btn-primary">
          체중 기록하기
        </Link>
      </div>
    )
  }

  return (
    <div className="today-card">
      <p className="tc-kicker">
        <span className={`dot ${day.kind}`} />
        오늘 할 운동
      </p>
      <p className="tc-title">{shortTitle(day)}</p>
      <div className="tc-meta">
        {day.routine && (
          <span>
            <b>45</b>분 근력
          </span>
        )}
        {day.cardio_minutes != null && (
          <span>
            <b>{day.cardio_minutes}</b>분 유산소
          </span>
        )}
      </div>
      <Link to="/workout" className="btn btn-primary">
        운동 시작
      </Link>
    </div>
  )
}

function Stats({ data }: { data: Dashboard }) {
  const s = data.stats
  const start = s.start_weight_kg
  const latest = s.latest_weight_kg
  const diff = start != null && latest != null ? +(latest - start).toFixed(1) : null
  const att = s.attendance_28d

  return (
    <div className="stats">
      <div className="stat">
        <p className="stat-label">연속 운동</p>
        <p className="stat-value">
          {s.streak}
          <small>일</small>
        </p>
        <p className="stat-foot">휴식일은 건너뛰고 셉니다</p>
      </div>
      <div className="stat">
        <p className="stat-label">최근 4주 출석</p>
        <p className="stat-value">
          {att == null ? '—' : Math.round(att * 100)}
          {att != null && <small>%</small>}
        </p>
        <p className={`stat-foot ${att == null ? '' : att >= 0.85 ? 'good' : 'bad'}`}>목표 85%</p>
      </div>
      <div className="stat">
        <p className="stat-label">체중</p>
        <p className="stat-value">
          {latest ?? start ?? '—'}
          {(latest ?? start) != null && <small>kg</small>}
        </p>
        <p className={`stat-foot ${diff == null ? '' : diff <= 0 ? 'good' : 'bad'}`}>
          {diff == null ? '아침 공복 체중을 기록하세요' : `시작 대비 ${diff > 0 ? '+' : ''}${diff}kg`}
        </p>
      </div>
      <div className="stat">
        <p className="stat-label">누적 운동</p>
        <p className="stat-value">
          {s.total_workouts}
          <small>회</small>
        </p>
        <p className="stat-foot">{s.goal_weight_kg != null ? `목표 체중 ${kg(s.goal_weight_kg)}` : '목표 체중은 설정에서'}</p>
      </div>
    </div>
  )
}
