import { useState } from 'react'

interface Series {
  values: (number | null)[]
  color: string
  label: string
  dashed?: boolean
}

interface Props {
  labels: string[]
  series: Series[]
  unit?: string
  height?: number
}

const W = 520
const PAD = { t: 16, r: 12, b: 26, l: 40 }

/** 의존성 없는 가벼운 SVG 선 그래프 */
export default function LineChart({ labels, series, unit = '', height = 200 }: Props) {
  // 브라우저 기본 툴팁(<title>) 대신 쓰는 커스텀 말풍선
  const [hover, setHover] = useState<number | null>(null)
  const all = series.flatMap((s) => s.values).filter((v): v is number => v != null)
  if (all.length === 0) return <p className="empty">아직 데이터가 없습니다</p>

  let min = Math.min(...all)
  let max = Math.max(...all)
  if (min === max) {
    min -= 5
    max += 5
  }
  const span = max - min
  min -= span * 0.1
  max += span * 0.1

  const n = labels.length
  const x = (i: number) => PAD.l + (n === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (n - 1))
  const y = (v: number) => PAD.t + ((max - v) / (max - min)) * (height - PAD.t - PAD.b)
  const ticks = [max, (max + min) / 2, min].map((v) => +v.toFixed(1))
  const labelEvery = Math.max(1, Math.ceil(n / 6))

  return (
    <figure style={{ margin: 0, position: 'relative' }} onPointerLeave={() => setHover(null)}>
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={series.map((s) => s.label).join(', ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="3 4" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)">
              {t}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text
              key={i}
              x={x(i)}
              y={height - 6}
              textAnchor={n > 1 && i === n - 1 ? 'end' : n > 1 && i === 0 ? 'start' : 'middle'}
              fontSize="11"
              fill="var(--text-3)"
            >
              {l}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v == null ? null : ([x(i), y(v)] as const)))
          const d = pts
            .reduce<string[]>((acc, p, i) => {
              if (!p) return acc
              acc.push(`${acc.length && pts[i - 1] ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
              return acc
            }, [])
            .join(' ')
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? '6 5' : undefined} strokeLinejoin="round" />
              {!s.dashed &&
                pts.map((p, i) =>
                  p ? (
                    <g key={i}>
                      <circle cx={p[0]} cy={p[1]} r={hover === i ? 5.5 : 3.5} fill={s.color} stroke="var(--surface)" strokeWidth={hover === i ? 2 : 0} />
                      <circle
                        cx={p[0]}
                        cy={p[1]}
                        r="14"
                        fill="transparent"
                        tabIndex={0}
                        aria-label={`${labels[i]} ${s.values[i]}${unit}`}
                        onPointerEnter={() => setHover(i)}
                        onFocus={() => setHover(i)}
                        onBlur={() => setHover(null)}
                        style={{ cursor: 'pointer', outline: 'none' }}
                      />
                    </g>
                  ) : null,
                )}
            </g>
          )
        })}
      </svg>
      {hover != null && (() => {
        const v = series[0].values[hover] ?? series.find((x) => x.values[hover] != null)?.values[hover]
        if (v == null) return null
        return (
          <div
            className="chart-tip"
            style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(v) / height) * 100}%` }}
            role="status"
          >
            <span className="chart-tip-date">{labels[hover]}</span>
            {series.map((sr) =>
              sr.values[hover] != null ? (
                <span key={sr.label} className="chart-tip-row">
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
        <figcaption className="row muted" style={{ gap: 14, marginTop: 4 }}>
          {series.map((s) => (
            <span key={s.label} className="row" style={{ gap: 6 }}>
              <span className="kind-dot" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}
