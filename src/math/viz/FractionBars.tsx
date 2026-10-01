import { useState } from 'react'
import { Tex } from '../tex'
import { gcd, lcm, tfrac } from '../num'
import { Stepper, VizHead } from './controls'

function Bar({ num, den, parts, label, tone }: { num: number; den: number; parts: number; label: string; tone: 'a' | 'b' | 'sum' }) {
  // „parts“ = Anzahl der Unterteilungen, gefüllt wird num/den des Ganzen
  const filled = (num / den) * parts
  return (
    <div className="fb__row">
      <span className="fb__label">
        <Tex>{label}</Tex>
      </span>
      <div className="fb__bar" style={{ ['--n' as string]: parts }}>
        {Array.from({ length: Math.max(parts, Math.ceil(filled)) }).map((_, i) => (
          <span key={i} className={`fb__cell ${i < filled - 1e-9 ? `is-on fb--${tone}` : ''} ${i >= parts ? 'is-over' : ''}`} style={{ transitionDelay: `${i * 12}ms` }} />
        ))}
      </div>
    </div>
  )
}

export default function FractionBars() {
  const [a, setA] = useState(1)
  const [b, setB] = useState(3)
  const [c, setC] = useState(1)
  const [d, setD] = useState(4)
  const [common, setCommon] = useState(false)
  const hn = lcm(b, d)
  const sum = a * (hn / b) + c * (hn / d)
  const g = gcd(sum, hn)
  const partsA = common ? hn : b
  const partsB = common ? hn : d
  return (
    <div className="fb">
      <VizHead title="Brüche gleichnamig machen">
        <button type="button" className={`btn btn--sm ${common ? 'btn--primary' : ''}`} onClick={() => setCommon((x) => !x)}>
          {common ? `In ${hn}tel geteilt` : 'Auf Hauptnenner bringen'}
        </button>
      </VizHead>
      <div className="fb__ctrls">
        <div className="fb__frac">
          <Stepper label="Zähler" value={a} min={1} max={b} onChange={(v) => setA(v)} />
          <Stepper label="Nenner" value={b} min={2} max={12} onChange={(v) => { setB(v); setA((x) => Math.min(x, v)) }} />
        </div>
        <span className="fb__plus">+</span>
        <div className="fb__frac">
          <Stepper label="Zähler" value={c} min={1} max={d} onChange={(v) => setC(v)} />
          <Stepper label="Nenner" value={d} min={2} max={12} onChange={(v) => { setD(v); setC((x) => Math.min(x, v)) }} />
        </div>
      </div>
      <div className="fb__bars">
        <Bar num={a} den={b} parts={partsA} label={common ? `\\tfrac{${a * (hn / b)}}{${hn}}` : `\\tfrac{${a}}{${b}}`} tone="a" />
        <Bar num={c} den={d} parts={partsB} label={common ? `\\tfrac{${c * (hn / d)}}{${hn}}` : `\\tfrac{${c}}{${d}}`} tone="b" />
        {common && <Bar num={sum} den={hn} parts={hn} label={`\\tfrac{${sum}}{${hn}}`} tone="sum" />}
      </div>
      <div className="fb__eq">
        <Tex block>
          {common
            ? `\\frac{${a}}{${b}} + \\frac{${c}}{${d}} = \\frac{${a}\\cdot ${hn / b}}{${b}\\cdot ${hn / b}} + \\frac{${c}\\cdot ${hn / d}}{${d}\\cdot ${hn / d}} = \\frac{${sum}}{${hn}}${g > 1 ? ` = ${tfrac(sum, hn)}` : ''}`
            : `\\frac{${a}}{${b}} + \\frac{${c}}{${d}} = \\;?`}
        </Tex>
      </div>
      <p className="viz__note">
        {common ? `Beide Streifen in ${hn} gleiche Stücke (kgV von ${b} und ${d}) – jetzt addieren.` : 'Verschieden große Stücke lassen sich nicht addieren.'}
      </p>
    </div>
  )
}
