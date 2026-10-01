import { useState } from 'react'
import { Tex } from '../tex'
import { Stepper, VizHead } from './controls'

type Op = 'mul' | 'div' | 'pow'

function Chips({ n, cls = '', start = 0, cut = 0 }: { n: number; cls?: string; start?: number; cut?: number }) {
  return (
    <span className="ex__chips">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className={`ex__chip ${cls} ${i < cut ? 'is-cut' : ''}`} style={{ animationDelay: `${(start + i) * 35}ms` }}>
          a
        </span>
      ))}
    </span>
  )
}

export default function Exponents() {
  const [op, setOp] = useState<Op>('mul')
  const [m, setM] = useState(3)
  const [n, setN] = useState(2)
  const res = op === 'mul' ? m + n : op === 'div' ? m - n : m * n
  const formula = op === 'mul' ? `a^{${m}} \\cdot a^{${n}} = a^{${m} + ${n}} = a^{${res}}` : op === 'div' ? `\\frac{a^{${m}}}{a^{${n}}} = a^{${m} - ${n}} = ${res === 0 ? '1' : `a^{${res}}`}${res < 0 ? ` = \\frac{1}{a^{${-res}}}` : ''}` : `(a^{${m}})^{${n}} = a^{${m} \\cdot ${n}} = a^{${res}}`
  const rule = op === 'mul' ? 'a^m \\cdot a^n = a^{m+n}' : op === 'div' ? 'a^m : a^n = a^{m-n}' : '(a^m)^n = a^{m \\cdot n}'
  return (
    <div className="ex">
      <VizHead title="Was eine Hochzahl wirklich zählt">
        <div className="seg seg--sm">
          <button type="button" className={`seg__btn ${op === 'mul' ? 'is-active' : ''}`} onClick={() => setOp('mul')}>
            Mal
          </button>
          <button type="button" className={`seg__btn ${op === 'div' ? 'is-active' : ''}`} onClick={() => setOp('div')}>
            Geteilt
          </button>
          <button type="button" className={`seg__btn ${op === 'pow' ? 'is-active' : ''}`} onClick={() => setOp('pow')}>
            Hoch
          </button>
        </div>
      </VizHead>
      <div className="ex__ctrls">
        <Stepper label={<Tex>m</Tex>} value={m} min={1} max={7} onChange={setM} />
        <Stepper label={<Tex>n</Tex>} value={n} min={1} max={op === 'pow' ? 4 : 7} onChange={setN} />
      </div>
      <div className="ex__stage" key={`${op}-${m}-${n}`}>
        {op === 'mul' && (
          <div className="ex__line">
            <Chips n={m} />
            <span className="ex__dot">·</span>
            <Chips n={n} cls="is-b" start={m} />
            <span className="ex__eq">=</span>
            <span className="ex__count">{m + n} Faktoren</span>
          </div>
        )}
        {op === 'div' && (
          <div className="ex__frac">
            <Chips n={m} cut={Math.min(m, n)} />
            <span className="ex__bar" />
            <Chips n={n} cls="is-b" cut={Math.min(m, n)} />
            <span className="ex__count">{Math.min(m, n)} Paare kürzen sich weg</span>
          </div>
        )}
        {op === 'pow' && (
          <div className="ex__line ex__line--wrap">
            {Array.from({ length: n }).map((_, k) => (
              <span key={k} className="ex__group">
                (<Chips n={m} start={k * m} cls={k % 2 ? 'is-b' : ''} />)
              </span>
            ))}
            <span className="ex__eq">=</span>
            <span className="ex__count">
              {n} × {m} = {res} Faktoren
            </span>
          </div>
        )}
      </div>
      <div className="ex__formula">
        <Tex block>{formula}</Tex>
      </div>
      <p className="viz__note">
        Regel: <Tex>{rule}</Tex>
      </p>
    </div>
  )
}
