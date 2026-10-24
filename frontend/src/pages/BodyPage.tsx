import { useState } from 'react'
import { useDailyLogs, useDeleteMeasurement, useMeasurements, useSaveMeasurement } from '../api/hooks'
import type { Measurement, MeasurementInput } from '../api/types'
import WeightChart from '../components/analysis/WeightChart'
import { useConfirm } from '../components/Confirm'
import DailyLogForm from '../components/DailyLogForm'
import { XIcon } from '../components/icons'
import Select from '../components/Select'
import { useToast } from '../components/Toast'
import { formatLong, formatShort, parseISODate, todayISO } from '../lib/date'
import { kg, toNum, toStr } from '../lib/format'

type Field = Exclude<keyof MeasurementInput, 'note'>
const FIELDS: [Field, string, string][] = [
  ['waist_cm', '허리', 'cm'],
  ['chest_cm', '가슴', 'cm'],
  ['hip_cm', '엉덩이', 'cm'],
  ['thigh_cm', '허벅지', 'cm'],
  ['arm_cm', '팔', 'cm'],
  ['body_fat_pct', '체지방', '%'],
]

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 측정일 후보: 오늘 + 이번 달부터 12개월 전까지 각 달의 마지막 날 (플랜: 매월 마지막 주에 측정) */
function dateOptions(today: string) {
  const d = parseISODate(today)
  const ends = Array.from({ length: 12 }, (_, i) => iso(new Date(d.getFullYear(), d.getMonth() + 1 - i, 0)))
  const all = [...new Set([...ends.filter((e) => e >= today).slice(0, 1), today, ...ends.filter((e) => e < today)])]
  return all.map((v) => ({ value: v, label: formatShort(v), hint: v === today ? '오늘' : '월말' }))
}

export default function BodyPage() {
  const today = todayISO()
  const todayLog = useDailyLogs({ from: today, to: today })
  const measurements = useMeasurements()

  return (
    <div className="page-col">
      <header className="page-header">
        <div className="titles">
          <h1 className="page-title">체중</h1>
          <p className="page-sub">체중은 매일 아침 공복에, 둘레는 매월 마지막 주에 잽니다.</p>
        </div>
      </header>

      <div className="stack loose">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">오늘</h2>
            <span className="muted">{formatLong(today)}</span>
          </div>
          {todayLog.data ? <DailyLogForm key={today} date={today} log={todayLog.data[0] ?? null} /> : <div className="skeleton sm" />}
        </section>
        <WeightChart />
      </div>

      <div className="stack loose mt-md">
        <MeasurementForm today={today} existing={measurements.data ?? []} />
        <MeasurementList list={measurements.data ?? []} />
      </div>
    </div>
  )
}

function MeasurementForm({ today, existing }: { today: string; existing: Measurement[] }) {
  const save = useSaveMeasurement()
  const toast = useToast()
  const options = dateOptions(today)
  const [date, setDate] = useState(options[0].value)
  const found = existing.find((m) => m.date === date)
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map(([f]) => [f, toStr(found?.[f])])))
  const [note, setNote] = useState(found?.note ?? '')

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">월말 측정</h2>
      </div>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          const body: MeasurementInput = { note: note.trim() || null }
          for (const [f] of FIELDS) body[f] = toNum(values[f])
          save
            .mutateAsync({ date, body })
            .then(() => toast(`${formatShort(date)} 측정을 저장했습니다`))
            .catch(() => {}) // 오류는 화면의 isError 로 보여 준다
        }}
      >
        <div className="field">
          <span className="field-label">측정일</span>
          <Select label="측정일" value={date} onChange={setDate} options={options} />
        </div>
        <div className="form-grid cols-3">
          {FIELDS.map(([f, label, unit]) => (
            <label key={f} className="field">
              <span className="field-label">{label}</span>
              <span className="input-suffix">
                <input className="input" inputMode="decimal" value={values[f]} onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))} />
                <span>{unit}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="field">
          <span className="field-label">메모</span>
          <textarea className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="사진은 같은 장소·같은 조명에서 정면/측면/후면" />
        </label>
        {save.isError && <p className="error-text">{save.error.message}</p>}
        <button className="btn btn-primary" type="submit" disabled={save.isPending}>
          측정 저장
        </button>
      </form>
    </section>
  )
}

function MeasurementList({ list }: { list: Measurement[] }) {
  const remove = useDeleteMeasurement()
  const confirm = useConfirm()
  const sorted = [...list].reverse()

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">측정 기록</h2>
      </div>
      {sorted.length === 0 && <p className="empty">첫 월말 측정을 저장하면 여기서 변화를 볼 수 있어요.</p>}
      <ul className="rows">
        {sorted.map((m, i) => {
          const prev = sorted[i + 1]
          const waistDiff = m.waist_cm != null && prev?.waist_cm != null ? +(m.waist_cm - prev.waist_cm).toFixed(1) : null
          return (
            <li key={m.date} className="align-start">
              <span className="grow">
                <span className="row-title block">{formatShort(m.date)}</span>
                <span className="row-sub">
                  {m.weight_avg_7d != null ? `7일 평균 ${kg(m.weight_avg_7d)} (${m.weight_days}일)` : '체중 기록 없음'}
                  {m.body_fat_pct != null && `, 체지방 ${m.body_fat_pct}%`}
                </span>
                {m.note && <span className="row-sub block">{m.note}</span>}
              </span>
              <span className="text-right">
                {m.waist_cm != null && <span className="num num-lg block">허리 {m.waist_cm}cm</span>}
                {waistDiff != null && <span className={`fw-600 ${waistDiff <= 0 ? 'text-hit' : 'text-miss'}`}>{waistDiff > 0 ? `+${waistDiff}` : waistDiff}cm</span>}
              </span>
              <button
                className="icon-btn"
                aria-label={`${formatShort(m.date)} 측정 삭제`}
                onClick={async () => {
                  if (await confirm({ title: `${formatShort(m.date)} 측정을 삭제할까요?`, confirmLabel: '삭제', danger: true })) remove.mutate(m.date)
                }}
              >
                <XIcon />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
