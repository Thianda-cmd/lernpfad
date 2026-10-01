import { useState } from 'react'
import { Tex } from '../tex'
import { tn } from '../num'
import { Presets, VizHead } from './controls'

type Tm = { c: number; v: string }
const PRESETS: { t: string; v: Tm[] }[] = [
  { t: '(4u + 3w)', v: [{ c: 4, v: 'u' }, { c: 3, v: 'w' }] },
  { t: '(3,2p − 7,1q)', v: [{ c: 3.2, v: 'p' }, { c: -7.1, v: 'q' }] },
  { t: '(−2,4p + 3,6q)', v: [{ c: -2.4, v: 'p' }, { c: 3.6, v: 'q' }] },
  { t: '(b − c)', v: [{ c: 1, v: 'b' }, { c: -1, v: 'c' }] },
]

const body = (t: Tm) => `${Math.abs(t.c) === 1 ? '' : tn(Math.abs(t.c))}${t.v}`

export default function SignFlip() {
  const [preset, setPreset] = useState(0)
  const [minus, setMinus] = useState(true)
  const [open, setOpen] = useState(false)
  const terms = PRESETS[preset].v

  return (
    <div className="sf">
      <VizHead title="Vorzeichen-Schalter">
        <div className="seg seg--sm">
          <button type="button" className={`seg__btn ${!minus ? 'is-active' : ''}`} onClick={() => { setMinus(false); setOpen(false) }}>
            Plusklammer
          </button>
          <button type="button" className={`seg__btn ${minus ? 'is-active' : ''}`} onClick={() => { setMinus(true); setOpen(false) }}>
            Minusklammer
          </button>
        </div>
      </VizHead>
      <Presets items={PRESETS} active={preset} onPick={(i) => { setPreset(i); setOpen(false) }} label="Klammerinhalt" />

      <div className={`sf__stage ${open ? 'is-open' : ''}`} aria-live="polite">
        <span className="sf__chip sf__chip--lead">
          <Tex>a</Tex>
        </span>
        <span className={`sf__outer ${minus ? 'is-minus' : ''}`}>
          <Tex>{minus ? '-' : '+'}</Tex>
        </span>
        <span className="sf__br">(</span>
        {terms.map((t, i) => {
          const before = t.c < 0 ? '-' : i === 0 ? '' : '+'
          const afterNeg = minus ? t.c > 0 : t.c < 0
          const after = afterNeg ? '-' : '+'
          const flipped = minus
          return (
            <span key={i} className={`sf__term ${open && flipped ? 'is-flipped' : ''}`} style={{ transitionDelay: `${open ? 180 + i * 140 : 0}ms` }}>
              <span className="sf__sign">
                <span className="sf__sign-a">{before && <Tex>{before}</Tex>}</span>
                <span className="sf__sign-b">
                  <Tex>{after}</Tex>
                </span>
              </span>
              <span className="sf__chip">
                <Tex>{body(t)}</Tex>
              </span>
            </span>
          )
        })}
        <span className="sf__br">)</span>
      </div>

      <div className="sf__foot">
        <button type="button" className="btn btn--sm btn--primary" onClick={() => setOpen((o) => !o)}>
          {open ? 'Zurück' : 'Klammer auflösen'}
        </button>
        <p className="sf__explain">
          {minus
            ? 'Minus vor der Klammer wirkt wie „mal (−1)“: Jeder Summand in der Klammer wechselt sein Vorzeichen.'
            : 'Plus vor der Klammer: Die Klammer fällt einfach weg, alle Vorzeichen bleiben.'}
        </p>
      </div>
    </div>
  )
}
