import { outerSubs, type Element } from '../elements'

const BOXES = { s: 1, p: 3, d: 5, f: 7 }

/** Kästchenschreibweise der äußeren Unterschalen (Hundsche Regel) */
export default function Orbitals({ e }: { e: Element }) {
  const subs = outerSubs(e.conf)
  return (
    <div className="orb" aria-label="Orbitalschema">
      {subs.map((s, i) => {
        const n = BOXES[s.l]
        const up = Math.min(n, s.e)
        const down = Math.max(0, s.e - n)
        return (
          <div key={i} className="orb__sub" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="orb__boxes">
              {Array.from({ length: n }).map((_, k) => (
                <span key={k} className="orb__box">
                  {k < up && <i className="orb__up">↑</i>}
                  {k < down && <i className="orb__down">↓</i>}
                </span>
              ))}
            </div>
            <span className="orb__label">
              {s.n}
              {s.l}
            </span>
          </div>
        )
      })}
    </div>
  )
}
