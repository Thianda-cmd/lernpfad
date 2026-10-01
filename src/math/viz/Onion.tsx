import { useState } from 'react'
import { Tex } from '../tex'
import { Presets, VizHead } from './controls'

interface Layer {
  /** was um die gesuchte Größe herum passiert */
  label: string
  /** Umkehroperation */
  inv: string
  /** Gleichung nach dem Abschälen */
  eq: string
}

interface OnionDef {
  t: string
  target: string
  start: string
  layers: Layer[]
}

const ONIONS: OnionDef[] = [
  {
    t: 'Raute nach f',
    target: 'f',
    start: 'A_R = \\frac{e \\cdot f}{2}',
    layers: [
      { label: ':2', inv: '\\cdot 2', eq: '2A_R = e \\cdot f' },
      { label: 'e \\cdot', inv: ':e', eq: '\\frac{2A_R}{e} = f' },
    ],
  },
  {
    t: 'f = 1/√(LCT) nach C',
    target: 'C',
    start: 'f = \\frac{1}{\\sqrt{L C T}}',
    layers: [
      { label: '1/\\ldots', inv: '\\cdot \\sqrt{LCT}', eq: 'f\\sqrt{LCT} = 1' },
      { label: '\\sqrt{\\ldots}', inv: '(\\;)^2', eq: 'f^2 \\cdot LCT = 1' },
      { label: 'L \\cdot \\ldots \\cdot T', inv: ':(f^2 L T)', eq: 'C = \\frac{1}{f^2 L T}' },
    ],
  },
  {
    t: 'Dreieck nach s',
    target: 's',
    start: 'A = \\frac{s^2}{4} \\cdot \\sqrt{3}',
    layers: [
      { label: '\\cdot\\sqrt{3}', inv: ':\\sqrt{3}', eq: '\\frac{A}{\\sqrt3} = \\frac{s^2}{4}' },
      { label: ':4', inv: '\\cdot 4', eq: '\\frac{4A}{\\sqrt3} = s^2' },
      { label: '(\\;)^2', inv: '\\sqrt{\\;}', eq: 's = \\sqrt{\\frac{4A}{\\sqrt3}}' },
    ],
  },
  {
    t: 'Seitenhalbierende nach a',
    target: 'a',
    start: 's_b = \\tfrac{1}{2}\\sqrt{2(a^2+c^2) - b^2}',
    layers: [
      { label: '\\tfrac12 \\cdot', inv: '\\cdot 2', eq: '2s_b = \\sqrt{2(a^2+c^2)-b^2}' },
      { label: '\\sqrt{\\ldots}', inv: '(\\;)^2', eq: '(2s_b)^2 = 2(a^2+c^2) - b^2' },
      { label: '-b^2', inv: '+b^2', eq: '(2s_b)^2 + b^2 = 2(a^2+c^2)' },
      { label: '2 \\cdot', inv: ':2', eq: '\\tfrac{(2s_b)^2+b^2}{2} = a^2 + c^2' },
      { label: '+c^2', inv: '-c^2', eq: '\\tfrac{(2s_b)^2+b^2}{2} - c^2 = a^2' },
      { label: '(\\;)^2', inv: '\\sqrt{\\;}', eq: 'a = \\sqrt{\\tfrac{(2s_b)^2+b^2}{2} - c^2}' },
    ],
  },
]

export default function Onion() {
  const [oi, setOi] = useState(1)
  const [peeled, setPeeled] = useState(0)
  const o = ONIONS[oi]
  const n = o.layers.length
  const remaining = o.layers.slice(peeled)
  const eq = peeled === 0 ? o.start : o.layers[peeled - 1].eq
  return (
    <div className="on">
      <VizHead title="Zwiebelprinzip" />
      <Presets items={ONIONS.map((x) => ({ t: x.t, v: x }))} active={oi} onPick={(i) => { setOi(i); setPeeled(0) }} label="Formel" />
      <div className="on__body">
        <div className="on__onion" aria-hidden="true">
          {o.layers.map((l, i) => {
            const size = 100 - ((i + 1) * 70) / (n + 1)
            const gone = i < peeled
            return (
              <div key={i} className={`on__layer ${gone ? 'is-gone' : ''} ${i === peeled ? 'is-next' : ''}`} style={{ width: `${size + 18}%`, height: `${size + 18}%`, zIndex: i }}>
                <span className="on__layer-t">
                  <Tex>{l.label}</Tex>
                </span>
              </div>
            )
          }).reverse()}
          <div className="on__core">
            <Tex>{o.target}</Tex>
          </div>
        </div>
        <div className="on__side">
          <div className="on__eq">
            <Tex block>{eq}</Tex>
          </div>
          {remaining.length > 0 ? (
            <p className="viz__note">
              Äußerste Schicht um <Tex>{o.target}</Tex>: <Tex>{remaining[0].label}</Tex> → Umkehrung{' '}
              <strong>
                <Tex>{`| ${remaining[0].inv}`}</Tex>
              </strong>
            </p>
          ) : (
            <p className="viz__note">
              Alle Schichten abgeschält – <Tex>{o.target}</Tex> steht allein.
            </p>
          )}
          <div className="wg__ctrl">
            <button type="button" className="btn btn--sm btn--primary" disabled={!remaining.length} onClick={() => setPeeled((p) => p + 1)}>
              Schicht abschälen
            </button>
            <button type="button" className="btn btn--sm btn--ghost" disabled={!peeled} onClick={() => setPeeled(0)}>
              Von vorn
            </button>
            <span className="steps__count">
              {peeled} / {n}
            </span>
          </div>
          <ol className="on__log">
            {o.layers.slice(0, peeled).map((l, i) => (
              <li key={i}>
                <Tex>{`| ${l.inv}`}</Tex>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
