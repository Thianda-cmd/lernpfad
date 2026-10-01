import { useState } from 'react'
import { Tex } from '../tex'
import { fmt, tn } from '../num'
import { Slider, VizHead } from './controls'

function Beaker({ vol, max, temp, label }: { vol: number; max: number; temp: number; label: string }) {
  const h = (vol / max) * 100
  // kalt → grünlich, warm → sandfarben (Mischung über CSS-Variable)
  const t = Math.max(0, Math.min(1, (temp - 5) / 70))
  return (
    <div className="mx__beaker">
      <div className="mx__glass">
        <div className="mx__liquid" style={{ height: `${h}%`, ['--t' as string]: t }} />
        <div className="mx__ticks" aria-hidden="true">
          {Array.from({ length: max }).map((_, i) => (
            <span key={i} style={{ bottom: `${((i + 1) / max) * 100}%` }} />
          ))}
        </div>
      </div>
      <div className="mx__cap">
        <strong>{fmt(temp, 1)} °C</strong>
        <span>
          {fmt(vol, 1)} L {label}
        </span>
      </div>
    </div>
  )
}

export default function MixViz() {
  const [v1, setV1] = useState(2)
  const [t1, setT1] = useState(13.5)
  const [v2, setV2] = useState(3)
  const [t2, setT2] = useState(61)
  const tm = (v1 * t1 + v2 * t2) / (v1 + v2)
  return (
    <div className="mx">
      <VizHead title="Mischtemperatur">
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => { setV1(2); setT1(13.5); setV2(3); setT2(61) }}>
          Aufgabe aus der Mitschrift
        </button>
      </VizHead>
      <div className="mx__row">
        <Beaker vol={v1} max={6} temp={t1} label="kalt" />
        <span className="mx__op">+</span>
        <Beaker vol={v2} max={6} temp={t2} label="warm" />
        <span className="mx__op">=</span>
        <Beaker vol={v1 + v2} max={12} temp={tm} label="Mischung" />
      </div>
      <div className="mx__ctrls">
        <Slider label="kalt: Volumen" value={v1} min={0.5} max={6} step={0.5} onChange={setV1} unit="L" />
        <Slider label="kalt: Temperatur" value={t1} min={5} max={40} step={0.5} onChange={setT1} unit="°C" />
        <Slider label="warm: Volumen" value={v2} min={0.5} max={6} step={0.5} onChange={setV2} unit="L" />
        <Slider label="warm: Temperatur" value={t2} min={40} max={80} step={0.5} onChange={setT2} unit="°C" />
      </div>
      <Tex block>{`T_M = \\frac{V_1 \\cdot T_1 + V_2 \\cdot T_2}{V_1 + V_2} = \\frac{${tn(v1)} \\cdot ${tn(t1)} + ${tn(v2)} \\cdot ${tn(t2)}}{${tn(v1 + v2)}} = ${tn(tm, 2)}\\,°\\text{C}`}</Tex>
      <p className="viz__note">
        Gewichteter Mittelwert: mehr Liter ziehen die Temperatur stärker zu sich. Zwei Mischungen ergeben zwei Gleichungen.
      </p>
    </div>
  )
}
