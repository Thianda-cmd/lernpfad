import { useState } from 'react'
import { Tex } from '../tex'
import { fmt, tn } from '../num'
import { Slider, VizHead } from './controls'

type Unknown = 'W' | 'G' | 'p'

const FORMULA: Record<Unknown, string> = {
  W: 'W = \\frac{G \\cdot p}{100}',
  G: 'G = \\frac{W \\cdot 100}{p}',
  p: 'p = \\frac{W}{G} \\cdot 100',
}

export default function PercentViz() {
  const [G, setG] = useState(300)
  const [p, setP] = useState(42)
  const [cover, setCover] = useState<Unknown>('p')
  const W = (G * p) / 100
  const [lotto, setLotto] = useState(false)
  return (
    <div className="pv">
      <VizHead title="Prozent sehen">
        <button type="button" className={`btn btn--sm ${lotto ? 'btn--primary' : ''}`} onClick={() => setLotto((l) => !l)}>
          Lotterie A vs. B
        </button>
      </VizHead>
      {!lotto ? (
        <>
          <div className="pv__bar" role="img" aria-label={`${fmt(p)} Prozent von ${G}`}>
            <div className="pv__fill" style={{ width: `${p}%` }}>
              <span>W = {fmt(W, 2)}</span>
            </div>
            <span className="pv__total">G = {G}</span>
          </div>
          <div className="pv__scale">
            {[0, 25, 50, 75, 100].map((t) => (
              <span key={t} style={{ left: `${t}%` }}>
                {t} %
              </span>
            ))}
          </div>
          <div className="pv__ctrls">
            <Slider label="Grundwert G (das Ganze)" value={G} min={10} max={1000} step={10} onChange={setG} />
            <Slider label="Prozentsatz p" value={p} min={0} max={100} step={1} onChange={setP} unit="%" />
          </div>
          <div className="pv__tri">
            <div className="pv__tri-shape" role="group" aria-label="Formeldreieck">
              {(['W', 'G', 'p'] as Unknown[]).map((k) => (
                <button key={k} type="button" className={`pv__tri-${k} ${cover === k ? 'is-cover' : ''}`} onClick={() => setCover(k)}>
                  <Tex>{k === 'p' ? 'p\\%' : k}</Tex>
                </button>
              ))}
              <span className="pv__tri-line" />
              <span className="pv__tri-dot">·</span>
            </div>
            <div>
              <Tex block>{FORMULA[cover]}</Tex>
              <p className="viz__note">
                Gesuchte Größe antippen: oben wird geteilt, unten nebeneinander multipliziert.
              </p>
              <Tex block>
                {cover === 'W'
                  ? `W = \\frac{${G} \\cdot ${p}}{100} = ${tn(W, 2)}`
                  : cover === 'G'
                    ? `G = \\frac{${tn(W, 2)} \\cdot 100}{${p}} = ${p ? tn(G, 2) : '\\text{–}'}`
                    : `p = \\frac{${tn(W, 2)}}{${G}} \\cdot 100 = ${tn(p, 2)}\\,\\%`}
              </Tex>
            </div>
          </div>
        </>
      ) : (
        <div className="pv__lotto">
          {[
            { n: 'Lotterie A', w: 126, g: 300 },
            { n: 'Lotterie B', w: 150, g: 500 },
          ].map((l) => {
            const pc = (l.w / l.g) * 100
            return (
              <div key={l.n} className="pv__lrow">
                <div className="pv__lhead">
                  <strong>{l.n}</strong>
                  <span>
                    {l.w} Gewinne bei {l.g} Losen
                  </span>
                </div>
                <div className="pv__bar pv__bar--sm">
                  <div className="pv__fill" style={{ width: `${pc}%` }}>
                    <span>{fmt(pc)} %</span>
                  </div>
                </div>
                <Tex>{`\\frac{${l.w}}{${l.g}} \\cdot 100 = ${tn(pc)}\\,\\%`}</Tex>
              </div>
            )
          })}
          <p className="viz__note">B hat mehr Gewinne, aber bei mehr Losen – A hat den größeren Anteil.</p>
        </div>
      )}
    </div>
  )
}
