import type { ReactNode } from 'react'
import { fmt } from '../num'
import { Tex } from '../tex'

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
  tex,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  unit?: string
  tex?: boolean
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="vslider">
      <span className="vslider__top">
        <span className="vslider__label">{tex ? <Tex>{label}</Tex> : label}</span>
        <span className="vslider__val">
          {fmt(value, 2)}
          {unit ? ` ${unit}` : ''}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ ['--p' as string]: `${pct}%` }} />
    </label>
  )
}

export function Stepper({ label, value, min, max, onChange }: { label: ReactNode; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="vstep">
      <span className="vstep__label">{label}</span>
      <div className="vstep__ctrl">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="kleiner">
          −
        </button>
        <span className="vstep__val">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="größer">
          +
        </button>
      </div>
    </div>
  )
}

export function VizHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="viz__head">
      <span className="viz__title">{title}</span>
      {children}
    </div>
  )
}

export function Presets<T>({ items, active, onPick, label }: { items: { t: string; v: T }[]; active: number; onPick: (i: number) => void; label?: string }) {
  return (
    <div className="viz__presets" role="group" aria-label={label ?? 'Beispiele'}>
      {items.map((it, i) => (
        <button key={it.t} type="button" className={`pill pill--sm ${active === i ? 'is-active' : ''}`} onClick={() => onPick(i)}>
          {it.t}
        </button>
      ))}
    </div>
  )
}
