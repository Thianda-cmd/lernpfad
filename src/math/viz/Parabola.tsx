import { useState } from 'react'
import { Tex } from '../tex'
import { tn, tpar } from '../num'
import { sumTex, T } from '../poly'
import { Plot } from '../ui/Figure'
import { Presets, Slider, VizHead } from './controls'

const PRESETS = [
  { t: 'a) x² + 6x + 8', v: [6, 8] },
  { t: 'b) x² − 18x + 81', v: [-18, 81] },
  { t: 'd) x² − 4x + 4', v: [-4, 4] },
  { t: 'e) x² + 5x − 14', v: [5, -14] },
  { t: 'keine Lösung', v: [2, 5] },
]

export default function Parabola() {
  const [p, setP] = useState(6)
  const [q, setQ] = useState(8)
  const [pi, setPi] = useState(0)
  const h = p / 2
  const D = h * h - q
  const sx = -h
  const sy = q - h * h
  const roots = D > 1e-9 ? [-h + Math.sqrt(D), -h - Math.sqrt(D)] : Math.abs(D) <= 1e-9 ? [-h] : []
  // Ausschnitt um den Scheitel
  const cx = Math.max(-14, Math.min(14, Math.round(sx)))
  const span = Math.max(8, Math.ceil(Math.sqrt(Math.max(D, 0))) + 3)
  const x0 = cx - span
  const x1 = cx + span
  const yTop = Math.max(8, Math.ceil(span * 1.2))
  const yBot = Math.min(-4, Math.floor(sy) - 2)
  const range: [number, number, number, number] = [x0, x1, yBot, Math.max(yTop, yBot + 12)]
  const step = x1 - x0 > 24 ? 2 : 1
  const path = (X: (x: number) => number, Y: (y: number) => number) => {
    let d = ''
    for (let i = 0; i <= 160; i++) {
      const x = x0 + ((x1 - x0) * i) / 160
      const y = x * x + p * x + q
      d += `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`
    }
    return d
  }
  return (
    <div className="pb">
      <VizHead title="p-q-Formel am Graphen" />
      <Presets
        items={PRESETS}
        active={pi}
        onPick={(i) => {
          setPi(i)
          setP(PRESETS[i].v[0])
          setQ(PRESETS[i].v[1])
        }}
      />
      <div className="lg__body">
        <Plot range={range} width={340} height={320} step={step}>
          {({ X, Y }) => (
            <>
              <path d={path(X, Y)} className="plot__curve" />
              <circle cx={X(sx)} cy={Y(sy)} r={3.5} className="plot__pt plot__pt--soft" />
              {roots.map((r, i) => (
                <circle key={i} cx={X(r)} cy={Y(0)} r={5} className="plot__pt plot__pt--hot" />
              ))}
            </>
          )}
        </Plot>
        <div className="lg__side">
          <Tex block>{`${sumTex([T(1, 'x2'), T(p, 'x'), T(q)].filter((t) => Math.abs(t.c) > 1e-9))} = 0`}</Tex>
          <div className="pb__ctrls">
            <Slider label="p" tex value={p} min={-20} max={20} step={0.5} onChange={(v) => { setP(v); setPi(-1) }} />
            <Slider label="q" tex value={q} min={-20} max={90} step={0.5} onChange={(v) => { setQ(v); setPi(-1) }} />
          </div>
          <Tex block>{`D = \\left(\\tfrac{p}{2}\\right)^2 - q = ${tpar(h)}^2 - ${tpar(q)} = ${tn(D, 2)}`}</Tex>
          <div className={`lg__result ${D > 1e-9 ? 'is-one' : Math.abs(D) <= 1e-9 ? 'is-inf' : 'is-none'}`}>
            {D > 1e-9 ? (
              <>
                <strong>D &gt; 0: zwei Lösungen</strong>
                <Tex>{`x_{1,2} = ${tn(-h, 2)} \\pm \\sqrt{${tn(D, 2)}} \\;\\Rightarrow\\; x_1 = ${tn(roots[0], 2)},\\; x_2 = ${tn(roots[1], 2)}`}</Tex>
                <span>Die Parabel schneidet die x-Achse zweimal.</span>
              </>
            ) : Math.abs(D) <= 1e-9 ? (
              <>
                <strong>D = 0: eine Lösung</strong>
                <Tex>{`x_1 = x_2 = ${tn(-h, 2)}`}</Tex>
                <span>Der Scheitel liegt genau auf der x-Achse.</span>
              </>
            ) : (
              <>
                <strong>D &lt; 0: keine reelle Lösung</strong>
                <span>Die Parabel liegt komplett über der x-Achse – unter der Wurzel stünde eine negative Zahl.</span>
              </>
            )}
          </div>
          <p className="viz__note">
            Der Scheitel liegt immer bei <Tex>{`x = -\\tfrac{p}{2} = ${tn(-h, 2)}`}</Tex>. Die Wurzel sagt, wie weit die Nullstellen links und rechts davon liegen.
          </p>
        </div>
      </div>
    </div>
  )
}
