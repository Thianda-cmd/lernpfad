import { useState } from 'react'
import { Tex } from '../tex'
import { Stepper, VizHead } from './controls'

export default function AreaModel() {
  const [mode, setMode] = useState<'allg' | 'binom'>('allg')
  const [a, setA] = useState(4)
  const [b, setB] = useState(2)
  const [c0, setC] = useState(3)
  const [d0, setD] = useState(2)
  const c = mode === 'binom' ? a : c0
  const d = mode === 'binom' ? b : d0
  const U = 26
  const W = (a + b) * U
  const H = (c + d) * U
  const pad = 30
  const cells = [
    { x: 0, y: 0, w: a, h: c, lab: mode === 'binom' ? 'a^2' : 'ac', v: a * c, cls: 'am--1' },
    { x: a, y: 0, w: b, h: c, lab: mode === 'binom' ? 'ab' : 'bc', v: b * c, cls: mode === 'binom' ? 'am--mid' : 'am--2' },
    { x: 0, y: c, w: a, h: d, lab: mode === 'binom' ? 'ab' : 'ad', v: a * d, cls: mode === 'binom' ? 'am--mid' : 'am--3' },
    { x: a, y: c, w: b, h: d, lab: mode === 'binom' ? 'b^2' : 'bd', v: b * d, cls: 'am--4' },
  ]
  const total = (a + b) * (c + d)
  return (
    <div className="am">
      <VizHead title="Flächenmodell">
        <div className="seg seg--sm">
          <button type="button" className={`seg__btn ${mode === 'allg' ? 'is-active' : ''}`} onClick={() => setMode('allg')}>
            (a+b)(c+d)
          </button>
          <button type="button" className={`seg__btn ${mode === 'binom' ? 'is-active' : ''}`} onClick={() => setMode('binom')}>
            (a+b)²
          </button>
        </div>
      </VizHead>
      <div className="am__body">
        <svg className="am__svg" viewBox={`0 0 ${W + pad + 8} ${H + pad + 8}`} role="img" aria-label="Rechteck aus vier Teilflächen">
          <g transform={`translate(${pad} ${pad})`}>
            {cells.map((k, i) => (
              <g key={i}>
                <rect x={k.x * U} y={k.y * U} width={k.w * U} height={k.h * U} className={`am__cell ${k.cls}`} />
                <foreignObject x={k.x * U} y={k.y * U} width={k.w * U} height={k.h * U}>
                  <div className="am__lab">
                    <Tex>{k.lab}</Tex>
                    <span className="am__val">{k.v}</span>
                  </div>
                </foreignObject>
              </g>
            ))}
            {/* Maßlinien */}
            <text x={(a * U) / 2} y={-10} className="am__dim" textAnchor="middle">a = {a}</text>
            <text x={a * U + (b * U) / 2} y={-10} className="am__dim" textAnchor="middle">b = {b}</text>
            <text x={-10} y={(c * U) / 2} className="am__dim" textAnchor="end" dominantBaseline="middle">{mode === 'binom' ? 'a' : 'c'}</text>
            <text x={-10} y={c * U + (d * U) / 2} className="am__dim" textAnchor="end" dominantBaseline="middle">{mode === 'binom' ? 'b' : 'd'}</text>
          </g>
        </svg>
        <div className="am__side">
          <div className="am__ctrls">
            <Stepper label={<Tex>a</Tex>} value={a} min={1} max={8} onChange={setA} />
            <Stepper label={<Tex>b</Tex>} value={b} min={1} max={6} onChange={setB} />
            {mode === 'allg' && (
              <>
                <Stepper label={<Tex>c</Tex>} value={c0} min={1} max={8} onChange={setC} />
                <Stepper label={<Tex>d</Tex>} value={d0} min={1} max={6} onChange={setD} />
              </>
            )}
          </div>
          <div className="am__eq">
            {mode === 'allg' ? (
              <>
                <Tex block>{`(a+b)(c+d) = ac + ad + bc + bd`}</Tex>
                <Tex block>{`(${a}+${b})(${c}+${d}) = ${a * c} + ${a * d} + ${b * c} + ${b * d} = ${total}`}</Tex>
              </>
            ) : (
              <>
                <Tex block>{`(a+b)^2 = a^2 + 2ab + b^2`}</Tex>
                <Tex block>{`(${a}+${b})^2 = ${a * a} + 2\\cdot${a * b} + ${b * b} = ${total}`}</Tex>
              </>
            )}
          </div>
          <p className="viz__note">
            {mode === 'allg' ? 'Vier Teilflächen = vier Produkte.' : 'Die zwei Rechtecke ab ergeben das Mittelglied 2ab.'}
          </p>
        </div>
      </div>
    </div>
  )
}
