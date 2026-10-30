import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { detect } from '../math/quick'
import { CalcError } from '../math/q'
import { Tex } from '../math/tex'
import { IconArrowRight } from '../components/icons'
import { QUICK_EX, QuickHead } from './QuickShell'
import '../styles/calc.css'


export default function QuickCalc() {
  const [v, setV] = useState('')
  const dv = useDeferredValue(v)
  const nav = useNavigate()
  const hit = useMemo(() => detect(dv), [dv])
  const out = useMemo(() => {
    if (!hit) return null
    try {
      const r = hit.run()
      return r ? { tex: r.result } : null
    } catch (e) {
      return { err: e instanceof CalcError ? e.message : 'Noch nicht vollständig.' }
    }
  }, [hit])
  const go = () => {
    if (hit) nav(hit.to)
  }
  return (
    <section className="quick card" aria-label="Schnellrechner">
      <QuickHead />
      <form
        className="quick__form"
        onSubmit={(e) => {
          e.preventDefault()
          go()
        }}
      >
        <input
          className="quick__input"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="z. B. 2x + 3 = 7  ·  (a + b)^2  ·  3/4 + 5/6  ·  H2SO4"
          spellCheck={false}
          autoComplete="off"
          aria-label="Aufgabe eingeben"
        />
        <button type="submit" className="btn btn--primary quick__go" disabled={!hit}>
          Lösungsweg <IconArrowRight size={16} />
        </button>
      </form>
      {hit ? (
        <div className="quick__out" aria-live="polite">
          <span className="quick__tool">
            <hit.icon size={15} />
            {hit.title}
          </span>
          {out && 'tex' in out && out.tex && (
            <span className="quick__res">
              <Tex>{out.tex}</Tex>
            </span>
          )}
          {out && 'err' in out && <span className="quick__err">{out.err}</span>}
        </div>
      ) : (
        <div className="quick__ex">
          {QUICK_EX.map((x) => (
            <button key={x} type="button" className="calc__chip" onClick={() => setV(x)}>
              {x}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

