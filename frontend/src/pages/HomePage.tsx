import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDailyLogs, useDashboard, useSaveDailyLog, useToday } from '../api/hooks'
import type { CalendarDay, Dashboard, DailyLog, Profile, Today } from '../api/types'
import LineChart from '../components/LineChart'
import PisteTimeline from '../components/PisteTimeline'
import { useToast } from '../components/Toast'
import WeekStrip from '../components/WeekStrip'
import { addDays, formatDay, formatMD, formatShort, parseISODate, todayISO, weekdayIndex, weekdayLabel } from '../lib/date'
import { toNum, toStr } from '../lib/format'
import { dayStatus, KIND_LABEL, shortTitle } from '../lib/status'
import { weightTrend } from '../lib/weight'
import s from './HomePage.module.css'

const isRestDay = (d: CalendarDay) => d.kind == null || d.kind === 'rest' || d.rest_day
const dayTitle = (d: CalendarDay) => d.routine?.name ?? d.label

function greeting(name: string, today: CalendarDay) {
  if (dayStatus(today, today.date) === 'done') return `${name}님, 오늘 운동 끝!`
  if (today.rest_day) return `${name}님, 오늘은 못 함으로 표시했어요`
  if (isRestDay(today)) return `${name}님, 오늘은 쉬는 날이에요`
  return `${name}님, 오늘은 ${shortTitle(today)} 하는 날이에요`
}

export default function HomePage({ profile }: { profile: Profile }) {
  const today = todayISO()
  const { data, isPending, isError, error } = useDashboard(today)

  return (
    <>
      <header className={s.head}>
        <p className={s.date}>{formatDay(today)}</p>
        <h1 className={s.greet}>{data ? greeting(profile.name, data.today) : `${profile.name}님`}</h1>
      </header>
      {isPending && (
        <div className="grid">
          <div className="skeleton lg" />
          <div className="skeleton sm" />
        </div>
      )}
      {isError && <p className="error-text">{error.message}</p>}
      {data && <Board data={data} today={today} />}
    </>
  )
}

function Board({ data, today }: { data: Dashboard; today: string }) {
  const { stats } = data
  const att = stats.attendance_28d

  return (
    <div className={s.board}>
      <TodayCard day={data.today} next={data.upcoming[0]} today={today} />

      <section className={`panel ${s.week}`} aria-labelledby="week-title">
        <div className="panel-head">
          <h2 className="panel-title" id="week-title">
            이번 주
          </h2>
          <Link to="/calendar" className="panel-link">
            달력
          </Link>
        </div>
        <div className={s.weekStats}>
          <div>
            <b className="num">
              {stats.week_done}
              <small>/{stats.week_planned}</small>
            </b>
            <span>이번 주 완료</span>
          </div>
          <div>
            <b className="num">
              {stats.streak}
              <small>일</small>
            </b>
            <span>연속 운동</span>
          </div>
          <div>
            <b className="num">
              {att == null ? '—' : Math.round(att * 100)}
              {att != null && <small>%</small>}
            </b>
            <span>최근 4주 출석</span>
          </div>
        </div>
        <WeekStrip days={data.week} today={today} />
      </section>

      <section className={`panel ${s.next}`} aria-labelledby="next-title">
        <div className="panel-head">
          <h2 className="panel-title" id="next-title">
            다음 운동
          </h2>
        </div>
        {data.upcoming.length === 0 ? (
          <p className="empty">예정된 운동이 없습니다. 플랜에서 요일 계획을 정하세요.</p>
        ) : (
          <ul className={s.nextList}>
            {data.upcoming.map((d) => (
              <li key={d.date}>
                <Link to={`/workout?date=${d.date}`}>
                  <span className={s.nextDate}>
                    <b className="num">{parseISODate(d.date).getDate()}</b>
                    <span>{weekdayLabel(weekdayIndex(d.date))}요일</span>
                  </span>
                  <span className="grow">
                    <span className={s.nextTitle}>{dayTitle(d)}</span>
                    {d.routine && (
                      <span className="row-sub">
                        {d.routine.item_count}종목{d.cardio_minutes != null && `, 유산소 ${d.cardio_minutes}분 포함`}
                      </span>
                    )}
                  </span>
                  {d.kind && <span className={`pill ${d.kind}`}>{KIND_LABEL[d.kind]}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WeightCard today={today} start={stats.start_weight_kg} goal={stats.goal_weight_kg} />

      <section className={`panel ${s.plan}`} aria-labelledby="plan-title">
        <div className="panel-head">
          <h2 className="panel-title" id="plan-title">
            1년 플랜
          </h2>
          {data.today.phase && stats.day_number != null && (
            <span className={s.planNow}>
              {data.today.phase}, <b className="num">{stats.day_number}</b>일째
            </span>
          )}
          <Link to="/plan" className="panel-link">
            플랜
          </Link>
        </div>
        <PisteTimeline phases={data.phases} today={today} />
      </section>
    </div>
  )
}

/* ---------------- 오늘 운동 ---------------- */
function TodayCard({ day, next, today }: { day: CalendarDay; next: CalendarDay | undefined; today: string }) {
  const st = dayStatus(day, today)
  const strength = day.kind === 'strength' && !day.rest_day && st !== 'done'
  // 쉬는 날에는 다음 운동을 미리 보여 준다
  const preview = isRestDay(day) && next?.kind === 'strength' ? next : null
  const detail = useToday(preview?.date ?? today)

  if (st === 'done') {
    return (
      <section className={`panel ${s.today}`} aria-labelledby="today-title">
        <p className={s.kind}>
          <i className="dot hit" />
          오늘 운동 완료
        </p>
        <h2 className={s.title} id="today-title">
          {day.workout_title ?? dayTitle(day)}
        </h2>
        <p className={s.facts}>
          {day.set_count > 0 && (
            <span>
              <b className="num">{day.set_count}</b> 세트
            </span>
          )}
          {day.cardio_minutes_done != null && (
            <span>
              유산소 <b className="num">{day.cardio_minutes_done}</b>분
            </span>
          )}
        </p>
        <p className={s.note}>수고했어요. 체중과 메모만 남겨 두세요.</p>
        <span className={s.spacer} />
        <div className={s.actions}>
          <Link to="/workout" className="btn btn-secondary btn-lg">
            기록 보기
          </Link>
        </div>
      </section>
    )
  }

  if (isRestDay(day)) {
    return (
      <section className={`panel ${s.today}`} aria-labelledby="today-title">
        <p className={s.kind}>
          <i className={`dot ${day.rest_day ? 'skipped' : ''}`} />
          {day.rest_day ? '못 함' : '휴식'}
        </p>
        <h2 className={s.title} id="today-title">
          {day.rest_day ? `${shortTitle(day)} 쉬어 가기` : '쉬는 날'}
        </h2>
        <p className={s.note}>걷기 30분이나 스트레칭 정도면 충분해요. 아침 체중만 기록해 두세요.</p>
        {next && (
          <div className={s.nextUp}>
            <span className="row-sub">다음 운동</span>
            <b>
              {formatShort(next.date)} {dayTitle(next)}
            </b>
            {preview && detail.data && <TodayExercises data={detail.data} />}
          </div>
        )}
        <span className={s.spacer} />
        <div className={s.actions}>
          <Link to={next ? `/workout?date=${next.date}` : '/plan'} className="btn btn-secondary btn-lg">
            {next ? '다음 운동 미리 보기' : '플랜 보기'}
          </Link>
        </div>
      </section>
    )
  }

  const started = day.set_count > 0
  return (
    <section className={`panel ${s.today}`} aria-labelledby="today-title">
      <p className={s.kind}>
        <i className={`dot ${day.kind}`} />
        {day.kind ? `${KIND_LABEL[day.kind]} 운동` : '운동'}
      </p>
      <h2 className={s.title} id="today-title">
        {dayTitle(day)}
      </h2>
      {strength && detail.data ? (
        <TodayExercises data={detail.data} />
      ) : (
        <p className={s.facts}>
          {day.cardio_minutes != null && (
            <span>
              유산소 <b className="num">{day.cardio_minutes}</b>분
            </span>
          )}
        </p>
      )}
      <span className={s.spacer} />
      <div className={s.actions}>
        {strength ? (
          <>
            <Link to="/session" className="btn btn-primary btn-lg">
              {started ? '이어서 하기' : '운동 시작'}
            </Link>
            <Link to="/workout" className="btn btn-secondary btn-lg">
              운동 화면
            </Link>
          </>
        ) : (
          <Link to="/workout" className="btn btn-primary btn-lg">
            기록하기
          </Link>
        )}
      </div>
    </section>
  )
}

function TodayExercises({ data }: { data: Today }) {
  const { items, plan } = data
  const sets = items.reduce((sum, it) => sum + it.item.sets, 0)
  return (
    <>
      <p className={s.facts}>
        <span>
          <b className="num">{items.length}</b> 종목
        </span>
        <span>
          <b className="num">{sets}</b> 세트
        </span>
        {plan.cardio_minutes != null && (
          <span>
            유산소 <b className="num">{plan.cardio_minutes}</b>분
          </span>
        )}
      </p>
      <ol className={s.exList}>
        {items.map(({ item, recommendation: r }, i) => {
          const diff = r.weight_kg != null && r.last_weight_kg != null ? +(r.weight_kg - r.last_weight_kg).toFixed(2) : 0
          return (
            <li key={item.id}>
              <span className={`${s.pos} num`}>{i + 1}</span>
              <span className={s.exName}>{item.exercise.name}</span>
              {diff > 0 ? <span className={s.up}>+{diff}</span> : diff < 0 ? <span className={s.down}>{diff}</span> : <span />}
              {item.duration_sec ? (
                <span className={`${s.w} num`}>
                  {item.sets}
                  <small>× {item.duration_sec}초</small>
                </span>
              ) : r.weight_kg != null ? (
                <span className={`${s.w} num`}>
                  {+r.weight_kg.toFixed(2)}
                  <small>kg</small>
                </span>
              ) : (
                <span className={s.wFind}>무게 찾기</span>
              )}
            </li>
          )
        })}
      </ol>
    </>
  )
}

/* ---------------- 체중 ---------------- */
function WeightCard({ today, start, goal }: { today: string; start: number | null; goal: number | null }) {
  const logs = useDailyLogs({ from: addDays(today, -29), to: today })
  const trend = weightTrend(logs.data ?? [])
  const latest = trend.at(-1)
  const current = latest?.avg7 ?? null
  const diff = current != null && start != null ? +(current - start).toFixed(1) : null
  const progress = current != null && start != null && goal != null && start > goal ? Math.min(1, Math.max(0, (start - current) / (start - goal))) : null

  return (
    <section className={`panel ${s.weight}`} aria-labelledby="weight-title">
      <div className="panel-head">
        <h2 className="panel-title" id="weight-title">
          체중
        </h2>
        <Link to="/body" className="panel-link">
          몸 기록
        </Link>
      </div>
      <div className={s.weightBody}>
        <div>
          <div className={s.now}>
            <b className="num">
              {current ?? start ?? '—'}
              {(current ?? start) != null && <small>kg</small>}
            </b>
            <p>
              {current == null ? (
                '시작 체중, 아침 체중을 기록해 보세요'
              ) : diff == null || diff === 0 ? (
                '최근 7일 평균'
              ) : (
                <>
                  7일 평균, 시작보다 <span className={diff < 0 ? s.good : s.bad}>{Math.abs(diff)}kg</span> {diff < 0 ? '줄었어요' : '늘었어요'}
                </>
              )}
            </p>
          </div>
          {progress != null && start != null && goal != null && current != null && (
            <div className={s.goal}>
              <div className={s.goalBar} role="progressbar" aria-label="목표 체중까지 진행" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <i style={{ width: `${progress * 100}%` }} />
              </div>
              <div className={s.goalEnds}>
                <span className="num">{start}</span>
                <span>목표까지 {+(current - goal).toFixed(1)}kg</span>
                <span className="num">{goal}</span>
              </div>
            </div>
          )}
          {logs.data && <QuickWeight key={today} date={today} log={logs.data.find((l) => l.date === today) ?? null} />}
        </div>
        {trend.length >= 2 ? (
          <LineChart
            height={190}
            labels={trend.map((p) => formatMD(p.date))}
            series={[
              { label: '아침 체중', values: trend.map((p) => p.weight), color: 'var(--muted)', style: 'dots' },
              { label: '7일 평균', values: trend.map((p) => p.avg7), color: 'var(--primary)', area: true },
            ]}
            unit="kg"
          />
        ) : (
          <p className={s.chartEmpty}>아침 공복 체중을 이틀 이상 기록하면 여기에 추세가 그려져요.</p>
        )}
      </div>
    </section>
  )
}

/** 오늘 아침 체중만 바로 기록. 같은 날의 걸음·수면·메모는 그대로 둔다 */
function QuickWeight({ date, log }: { date: string; log: DailyLog | null }) {
  const save = useSaveDailyLog()
  const toast = useToast()
  const [value, setValue] = useState(toStr(log?.body_weight_kg))
  const n = toNum(value)
  const valid = n != null && Number.isFinite(n) && n > 0 && n <= 400

  return (
    <form
      className={s.log}
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        save
          .mutateAsync({ date, body: { body_weight_kg: n, steps: log?.steps ?? null, sleep_hours: log?.sleep_hours ?? null, memo: log?.memo ?? null } })
          .then(() => toast('오늘 체중을 기록했습니다'))
          .catch(() => {}) // 오류는 아래 문구로 보여 준다
      }}
    >
      <input className="input grow" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="오늘 아침 체중" aria-label="오늘 아침 체중(kg)" />
      <button className="btn btn-secondary" type="submit" disabled={!valid || n === log?.body_weight_kg || save.isPending}>
        {log?.body_weight_kg != null ? '수정' : '기록'}
      </button>
      {save.isError && (
        <p className="error-text" role="alert">
          {save.error.message}
        </p>
      )}
    </form>
  )
}
