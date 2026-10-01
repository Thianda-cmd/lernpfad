import { useEffect, useState } from 'react'
import { Rich, Tex } from '../tex'
import type { Step } from '../types'

function Row({ s, i }: { s: Step; i: number }) {
  return (
    <li className="steps__row" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
      <div className="steps__line">
        <span className="steps__tex">
          <Tex d>{s.tex}</Tex>
        </span>
        {s.op && (
          <span className="steps__op">
            <Tex>{s.op}</Tex>
          </span>
        )}
      </div>
      {s.note && (
        <p className="steps__note">
          <Rich text={s.note} />
        </p>
      )}
    </li>
  )
}

/** Lösungsweg – vollständig oder Schritt für Schritt aufdeckbar. */
export default function Steps({ steps, stepwise = false, resetKey }: { steps: Step[]; stepwise?: boolean; resetKey?: unknown }) {
  const [shown, setShown] = useState(stepwise ? 1 : steps.length)
  useEffect(() => setShown(stepwise ? 1 : steps.length), [resetKey, stepwise, steps.length])
  const all = shown >= steps.length
  return (
    <div className="steps">
      <ol className="steps__list">
        {steps.slice(0, shown).map((s, i) => (
          <Row key={i} s={s} i={stepwise ? 0 : i} />
        ))}
      </ol>
      {stepwise && (
        <div className="steps__ctrl">
          {!all ? (
            <>
              <button type="button" className="btn btn--sm btn--primary" onClick={() => setShown((n) => n + 1)}>
                Nächster Schritt
              </button>
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => setShown(steps.length)}>
                Alle zeigen
              </button>
              <span className="steps__count">
                {shown} / {steps.length}
              </span>
            </>
          ) : (
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setShown(1)}>
              Von vorn
            </button>
          )}
        </div>
      )}
    </div>
  )
}
