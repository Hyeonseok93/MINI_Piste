import { useState } from 'react'
import { useWidth } from '../hooks/useWidth'
import s from './LineChart.module.css'

interface Series {
  values: (number | null)[]
  color: string
  label: string
  /** line: 선과 점 / dots: 점만 (하루 값처럼 흩어진 값) */
  style?: 'line' | 'dots'
  /** 선 아래를 옅게 채운다 */
  area?: boolean
}

interface Props {
  labels: string[]
  series: Series[]
  unit?: string
  height?: number
  /** 목표선 (예: 목표 체중) */
  guide?: { value: number; label: string; color: string }
}

const PAD = { t: 18, r: 14, b: 28, l: 38 }

/** 의존성 없는 가벼운 SVG 선 그래프 */
export default function LineChart({ labels, series, unit = '', height = 200, guide }: Props) {
  const [ref, measured] = useWidth()
  // 브라우저 기본 툴팁(<title>) 대신 쓰는 커스텀 말풍선
  const [hover, setHover] = useState<number | null>(null)
  const all = series.flatMap((sr) => sr.values).filter((v): v is number => v != null)
  if (all.length === 0) return <p className="empty">아직 데이터가 없습니다</p>

  const W = measured || 520
  let min = Math.min(...all, ...(guide ? [guide.value] : []))
  let max = Math.max(...all, ...(guide ? [guide.value] : []))
  if (min === max) {
    min -= 2
    max += 2
  }
  const span = max - min
  min -= span * 0.12
  max += span * 0.12

  const n = labels.length
  const x = (i: number) => PAD.l + (n === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (n - 1))
  const y = (v: number) => PAD.t + ((max - v) / (max - min)) * (height - PAD.t - PAD.b)
  const ticks = [max, (max + min) / 2, min].map((v) => +v.toFixed(1))
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(W / 90))))
  const bottom = height - PAD.b

  return (
    <figure className={s.fig} ref={ref} onPointerLeave={() => setHover(null)}>
      <svg className={s.svg} width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={series.map((sr) => sr.label).join(', ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line className={s.grid} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className={s.axis} x={PAD.l - 8} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={i} className={s.axis} x={x(i)} y={height - 6} textAnchor={n > 1 && i === n - 1 ? 'end' : n > 1 && i === 0 ? 'start' : 'middle'}>
              {l}
            </text>
          ) : null,
        )}
        {guide && (
          <g>
            <line className={s.guide} x1={PAD.l} x2={W - PAD.r} y1={y(guide.value)} y2={y(guide.value)} stroke={guide.color} />
            <text className={s.guideLabel} x={W - PAD.r} y={y(guide.value) - 6} textAnchor="end" fill={guide.color}>
              {guide.label}
            </text>
          </g>
        )}
        {hover != null && <line className={s.cursor} x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={bottom} />}
        {series.map((sr) => {
          const pts = sr.values.map((v, i) => (v == null ? null : ([x(i), y(v)] as const)))
          const segs = pts.reduce<string[]>((acc, p, i) => {
            if (p) acc.push(`${acc.length && pts[i - 1] ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
            return acc
          }, [])
          const d = segs.join(' ')
          const valid = pts.filter((p) => p != null)
          const dots = sr.style === 'dots'
          return (
            <g key={sr.label}>
              {sr.area && valid.length > 1 && (
                <path d={`${d} L${valid.at(-1)![0]},${bottom} L${valid[0][0]},${bottom} Z`} fill={sr.color} opacity="0.12" />
              )}
              {!dots && <path d={d} fill="none" stroke={sr.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
              {pts.map((p, i) =>
                p ? (
                  <circle
                    key={i}
                    cx={p[0]}
                    cy={p[1]}
                    r={hover === i ? 5.5 : dots ? 3 : 3.5}
                    fill={sr.color}
                    opacity={dots && hover !== i ? 0.55 : 1}
                    stroke="var(--surface)"
                    strokeWidth={hover === i ? 2 : 0}
                  />
                ) : null,
              )}
            </g>
          )
        })}
        {/* 보이지 않는 넓은 칸: 마우스·키보드로 날짜를 고른다 */}
        {labels.map((l, i) => {
          const w = n > 1 ? (W - PAD.l - PAD.r) / (n - 1) : W
          const vals = series.map((sr) => sr.values[i]).filter((v) => v != null)
          if (vals.length === 0) return null
          return (
            <rect
              key={i}
              className={s.hit}
              x={x(i) - w / 2}
              y={PAD.t}
              width={w}
              height={bottom - PAD.t}
              fill="transparent"
              tabIndex={0}
              aria-label={`${l} ${series.map((sr) => (sr.values[i] != null ? `${sr.label} ${sr.values[i]}${unit}` : '')).join(' ')}`}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            />
          )
        })}
      </svg>
      {hover != null &&
        (() => {
          const v = series.map((sr) => sr.values[hover]).find((val) => val != null)
          if (v == null) return null
          return (
            <div className={s.tip} style={{ left: x(hover), top: y(v) }} role="status">
              <span className={s.tipDate}>{labels[hover]}</span>
              {series.map((sr) =>
                sr.values[hover] != null ? (
                  <span key={sr.label} className={s.tipRow}>
                    <i style={{ background: sr.color }} />
                    {series.length > 1 && `${sr.label} `}
                    <b className="num">
                      {sr.values[hover]}
                      {unit}
                    </b>
                  </span>
                ) : null,
              )}
            </div>
          )
        })()}
      {series.length > 1 && (
        <figcaption className={s.legend}>
          {series.map((sr) => (
            <span key={sr.label}>
              <i className={sr.style === 'dots' ? s.dot : undefined} style={{ background: sr.color }} />
              {sr.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}
