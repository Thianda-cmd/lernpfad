import { useRef, useState, type PointerEvent } from 'react'
import { Tex } from '../tex'
import { fmt, gcd, tfrac, tn, tpar } from '../num'
import { sumTex, T } from '../poly'
import { LinePath, Plot } from '../ui/Figure'
import { Slider, VizHead } from './controls'

const R: [number, number, number, number] = [-8, 8, -8, 8]
const lineTex = (m: number, b: number) => `y = ${sumTex([T(m, 'x'), T(b)].filter((t) => Math.abs(t.c) > 1e-9)) || '0'}`

export default function LineViz() {
  const [mode, setMode] = useState<'mb' | 'pts'>('mb')
  const [m, setM] = useState(0.5)
  const [b, setB] = useState(1)
  const [P, setPP] = useState({ x: -2, y: -3 })
  const [Q, setQQ] = useState({ x: 4, y: 1 })
  const drag = useRef<'P' | 'Q' | null>(null)
  const svgWrap = useRef<HTMLDivElement>(null)

  const onMove = (e: PointerEvent) => {
    if (!drag.current || !svgWrap.current) return
    const svg = svgWrap.current.querySelector('svg')!
    const rect = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    const sx = ((e.clientX - rect.left) / rect.width) * vb.width
    const sy = ((e.clientY - rect.top) / rect.height) * vb.height
    const pad = 18
    const x = Math.round(R[0] + ((sx - pad) / (vb.width - 2 * pad)) * (R[1] - R[0]))
    const y = Math.round(R[3] - ((sy - pad) / (vb.height - 2 * pad)) * (R[3] - R[2]))
    const pt = { x: Math.max(-7, Math.min(7, x)), y: Math.max(-7, Math.min(7, y)) }
    if (drag.current === 'P') {
      if (pt.x !== Q.x) setPP(pt)
    } else if (pt.x !== P.x) setQQ(pt)
  }

  const dx = Q.x - P.x
  const dy = Q.y - P.y
  const mp = dy / dx
  const bp = P.y - mp * P.x
  const g = gcd(dy, dx) || 1
  const mTex = Number.isInteger(mp) ? tn(mp) : tfrac(dy / g, dx / g)

  return (
    <div className="ln">
      <VizHead title="Geraden y = mx + b">
        <div className="seg seg--sm">
          <button type="button" className={`seg__btn ${mode === 'mb' ? 'is-active' : ''}`} onClick={() => setMode('mb')}>
            m und b
          </button>
          <button type="button" className={`seg__btn ${mode === 'pts' ? 'is-active' : ''}`} onClick={() => setMode('pts')}>
            Zwei Punkte
          </button>
        </div>
      </VizHead>
      <div className="lg__body">
        <div ref={svgWrap} className={mode === 'pts' ? 'ln__drag' : undefined} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
          <Plot range={R} width={340} height={340}>
            {({ X, Y, r }) =>
              mode === 'mb' ? (
                <>
                  <LinePath m={m} b={b} X={X} Y={Y} r={r} />
                  {/* Steigungsdreieck ab dem y-Achsenabschnitt */}
                  <path d={`M${X(0)},${Y(b)} L${X(1)},${Y(b)} L${X(1)},${Y(b + m)}`} className="plot__tri" />
                  <text x={X(0.5)} y={Y(b) + (m >= 0 ? 14 : -6)} className="plot__label" textAnchor="middle">
                    1
                  </text>
                  <text x={X(1) + 6} y={Y(b + m / 2) + 4} className="plot__label">
                    m = {fmt(m, 2)}
                  </text>
                  <circle cx={X(0)} cy={Y(b)} r={5} className="plot__pt plot__pt--hot" />
                </>
              ) : (
                <>
                  <LinePath m={mp} b={bp} X={X} Y={Y} r={r} />
                  <path d={`M${X(P.x)},${Y(P.y)} L${X(Q.x)},${Y(P.y)} L${X(Q.x)},${Y(Q.y)}`} className="plot__tri" />
                  <text x={X((P.x + Q.x) / 2)} y={Y(P.y) + (dy >= 0 ? 15 : -7)} className="plot__label" textAnchor="middle">
                    Δx = {dx}
                  </text>
                  <text x={X(Q.x) + 6} y={Y((P.y + Q.y) / 2) + 4} className="plot__label">
                    Δy = {dy}
                  </text>
                  {(['P', 'Q'] as const).map((k) => {
                    const pt = k === 'P' ? P : Q
                    return (
                      <g key={k} className="ln__handle" onPointerDown={(e) => { drag.current = k; (e.target as Element).setPointerCapture?.(e.pointerId) }}>
                        <circle cx={X(pt.x)} cy={Y(pt.y)} r={14} className="ln__hit" />
                        <circle cx={X(pt.x)} cy={Y(pt.y)} r={6} className="plot__pt plot__pt--hot" />
                        <text x={X(pt.x) + 9} y={Y(pt.y) - 9} className="plot__label">
                          {k}({pt.x}|{pt.y})
                        </text>
                      </g>
                    )
                  })}
                </>
              )
            }
          </Plot>
        </div>
        <div className="lg__side">
          {mode === 'mb' ? (
            <>
              <Tex block>{lineTex(m, b)}</Tex>
              <div className="pb__ctrls">
                <Slider label="Steigung m" value={m} min={-4} max={4} step={0.25} onChange={setM} />
                <Slider label="y-Achsenabschnitt b" value={b} min={-6} max={6} step={1} onChange={setB} />
              </div>
              <p className="viz__note">
                <strong>b</strong> ist der Startpunkt auf der y-Achse. <strong>m</strong> sagt: Gehst du 1 nach rechts, geht es m nach oben (m &gt; 0) oder nach unten (m &lt; 0). Bei m = 0 ist die Gerade waagerecht.
              </p>
            </>
          ) : (
            <>
              <Tex block>{`m = \\frac{\\Delta y}{\\Delta x} = \\frac{${Q.y} - ${tpar(P.y)}}{${Q.x} - ${tpar(P.x)}} = \\frac{${dy}}{${dx}} = ${mTex}`}</Tex>
              <Tex block>{`b = y_P - m \\cdot x_P = ${tpar(P.y)} - ${mTex} \\cdot ${tpar(P.x)} = ${tn(bp, 2)}`}</Tex>
              <Tex block>{lineTex(Math.round(mp * 1000) / 1000, Math.round(bp * 1000) / 1000)}</Tex>
              <p className="viz__note">Ziehe die Punkte P und Q. Das Steigungsdreieck zeigt Δx (nach rechts) und Δy (nach oben/unten).</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
