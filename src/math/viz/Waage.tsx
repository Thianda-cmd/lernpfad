import { useMemo, useState } from 'react'
import { Tex } from '../tex'
import { VizHead } from './controls'

interface State {
  lx: number
  ln: number
  rx: number
  rn: number
}

interface Stage {
  s: State
  op?: string
  note: string
}

function plan(a: number, b: number, c: number, d: number): Stage[] {
  // a x + b = c x + d, a > c, d > b, (d − b) teilbar durch (a − c)
  const out: Stage[] = [{ s: { lx: a, ln: b, rx: c, rn: d }, note: 'Die Waage ist im Gleichgewicht: Beide Seiten sind gleich schwer.' }]
  let s = { lx: a, ln: b, rx: c, rn: d }
  if (c > 0) {
    s = { ...s, lx: s.lx - c, rx: 0 }
    out.push({ s, op: `| -${c === 1 ? '' : c}x`, note: `Auf beiden Seiten ${c === 1 ? 'eine x-Kiste' : c + ' x-Kisten'} wegnehmen – das Gleichgewicht bleibt.` })
  }
  if (b > 0) {
    s = { ...s, ln: 0, rn: s.rn - b }
    out.push({ s, op: `| -${b}`, note: `Auf beiden Seiten ${b} Gewicht${b === 1 ? '' : 'e'} wegnehmen.` })
  }
  if (s.lx > 1) {
    const k = s.lx
    s = { ...s, lx: 1, rn: s.rn / k }
    out.push({ s, op: `| :${k}`, note: `Beide Seiten in ${k} gleiche Teile teilen: Eine Kiste wiegt so viel wie ${s.rn} Gewicht${s.rn === 1 ? '' : 'e'}.` })
  }
  return out
}

function rand(): [number, number, number, number] {
  for (;;) {
    const x = 1 + Math.floor(Math.random() * 4)
    const c = Math.floor(Math.random() * 3)
    const a = c + 1 + Math.floor(Math.random() * 3)
    const b = Math.floor(Math.random() * 5)
    const d = (a - c) * x + b
    if (d <= 9 && a <= 5 && a + b > 1) return [a, b, c, d]
  }
}

const eqTex = (s: State) => {
  const side = (x: number, n: number) => {
    const parts: string[] = []
    if (x) parts.push(`${x === 1 ? '' : x}x`)
    if (n || !parts.length) parts.push(String(n))
    return parts.join(' + ')
  }
  return `${side(s.lx, s.ln)} = ${side(s.rx, s.rn)}`
}

function Pan({ x, n, cx }: { x: number; n: number; cx: number }) {
  const items: ('x' | 'n')[] = [...Array(x).fill('x'), ...Array(n).fill('n')]
  const perRow = 5
  return (
    <g>
      {items.map((it, i) => {
        const row = Math.floor(i / perRow)
        const col = i % perRow
        const count = Math.min(perRow, items.length - row * perRow)
        const px = cx - (count * 24) / 2 + col * 24 + 12
        const py = 118 - row * 24
        return it === 'x' ? (
          <g key={`${i}-x`} className="wg__item" style={{ animationDelay: `${i * 25}ms` }}>
            <rect x={px - 10} y={py - 20} width={20} height={20} rx={4} className="wg__box" />
            <text x={px} y={py - 6.5} textAnchor="middle" className="wg__box-t">x</text>
          </g>
        ) : (
          <g key={`${i}-n`} className="wg__item" style={{ animationDelay: `${i * 25}ms` }}>
            <circle cx={px} cy={py - 9} r={9} className="wg__w" />
            <text x={px} y={py - 5.5} textAnchor="middle" className="wg__w-t">1</text>
          </g>
        )
      })}
    </g>
  )
}

export default function Waage() {
  const [eq, setEq] = useState<[number, number, number, number]>([3, 2, 1, 8])
  const [i, setI] = useState(0)
  const stages = useMemo(() => plan(...eq), [eq])
  const st = stages[i]
  const done = i === stages.length - 1
  return (
    <div className="wg">
      <VizHead title="Die Gleichung als Waage">
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => { setEq(rand()); setI(0) }}>
          Neue Gleichung
        </button>
      </VizHead>
      <svg viewBox="0 0 420 190" className={`wg__svg ${i ? 'is-wobble' : ''}`} key={i} role="img" aria-label={`Waage: ${eqTex(st.s)}`}>
        <path d="M210 176 L196 186 L224 186 Z" className="wg__foot" />
        <line x1="210" y1="176" x2="210" y2="128" className="wg__post" />
        <g className="wg__beam">
          <line x1="70" y1="128" x2="350" y2="128" className="wg__bar" />
          <circle cx="210" cy="128" r="4" className="wg__pivot" />
          <line x1="110" y1="128" x2="110" y2="122" className="wg__hang" />
          <line x1="310" y1="128" x2="310" y2="122" className="wg__hang" />
          <path d="M40 122 L180 122" className="wg__pan" />
          <path d="M240 122 L380 122" className="wg__pan" />
          <Pan x={st.s.lx} n={st.s.ln} cx={110} />
          <Pan x={st.s.rx} n={st.s.rn} cx={310} />
        </g>
      </svg>
      <div className="wg__eq">
        <Tex block>{eqTex(st.s)}</Tex>
        {!done && stages[i + 1].op && (
          <span className="wg__op">
            <Tex>{stages[i + 1].op!}</Tex>
          </span>
        )}
      </div>
      <p className="viz__note">{done ? `Fertig: Eine Kiste x wiegt ${st.s.rn}. Also x = ${st.s.rn}.` : st.note}</p>
      <div className="wg__ctrl">
        <button type="button" className="btn btn--sm btn--primary" disabled={done} onClick={() => setI((k) => k + 1)}>
          {i === 0 ? 'Umformen' : 'Nächster Schritt'}
        </button>
        <button type="button" className="btn btn--sm btn--ghost" disabled={i === 0} onClick={() => setI(0)}>
          Von vorn
        </button>
        <span className="steps__count">
          {i + 1} / {stages.length}
        </span>
      </div>
    </div>
  )
}
