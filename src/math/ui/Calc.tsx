import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalcError } from '../q'
import type { Solution } from '../alg/step'
import { Rich, Tex } from '../tex'
import Steps from './Steps'
import { useProgress } from '../../store/progress'
import { IconCheck, IconLink } from '../../components/icons'
import '../../styles/calc.css'

/* ---------------------------- Seite ---------------------------- */

export function CalcPage({ eyebrow, title, intro, path, actions, children }: { eyebrow: string; title: string; intro: string; path: string; actions?: ReactNode; children: ReactNode }) {
  const setLastVisit = useProgress((s) => s.setLastVisit)
  useEffect(() => {
    setLastVisit({ path, title })
  }, [path, title, setLastVisit])
  return (
    <div className="page calc">
      <header className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        {actions}
      </header>
      {children}
    </div>
  )
}

/* ---------------------------- Zustand in der Adresse ---------------------------- */

/** Eingabe in der URL halten (teilbar, „Zurück“ bleibt sauber) */
export function useParam(key: string, init: string): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams()
  const [v, setV] = useState(() => params.get(key) ?? init)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const p = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
      if ((p.get(key) ?? init) === v) return
      if (v === init) p.delete(key)
      else p.set(key, v)
      setParams(p, { replace: true })
    }, 250)
    return () => window.clearTimeout(t)
  }, [key, v, init, setParams])
  return [v, setV]
}

/** Rechnen mit verzögerter Eingabe; Fehler als Text */
export function useSolve<T>(fn: () => T | null, deps: unknown[]): { res: T | null; err: string | null } {
  const d = useDeferredValue(deps)
  return useMemo(() => {
    try {
      return { res: fn(), err: null }
    } catch (e) {
      if (e instanceof CalcError) return { res: null, err: e.message }
      console.error(e)
      return { res: null, err: 'Das konnte ich nicht ausrechnen. Prüfe die Eingabe.' }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, d)
}

/* ---------------------------- Bausteine ---------------------------- */

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg calc__seg" role="tablist" aria-label={label}>
      {options.map(([k, l]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} className={`seg__btn ${value === k ? 'is-active' : ''}`} onClick={() => onChange(k)}>
          {l}
        </button>
      ))}
    </div>
  )
}

export function Examples({ items, onPick, current }: { items: (string | [string, string])[]; onPick: (v: string) => void; current?: string }) {
  return (
    <div className="calc__ex">
      <span className="calc__ex-k">Beispiele</span>
      {items.map((it) => {
        const [v, l] = Array.isArray(it) ? it : [it, it]
        return (
          <button key={v} type="button" className={`calc__chip ${current === v ? 'is-on' : ''}`} onClick={() => onPick(v)}>
            {l}
          </button>
        )
      })}
    </div>
  )
}

export function NumField({
  label,
  value,
  onChange,
  unit,
  units,
  onUnit,
  placeholder,
  sub,
}: {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  unit?: string
  units?: readonly string[]
  onUnit?: (u: string) => void
  placeholder?: string
  sub?: string
}) {
  return (
    <label className="nf">
      <span className="nf__label">
        {label}
        {sub && <small>{sub}</small>}
      </span>
      <span className="nf__row">
        <input className="nf__input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? '–'} inputMode="decimal" spellCheck={false} autoComplete="off" />
        {units && onUnit ? (
          <select className="nf__unit" value={unit} onChange={(e) => onUnit(e.target.value)} aria-label="Einheit">
            {units.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        ) : unit ? (
          <span className="nf__u">{unit}</span>
        ) : null}
      </span>
    </label>
  )
}

export function Rules({ title = 'Regeln', items }: { title?: string; items: [string, string][] }) {
  return (
    <aside className="calc__rules card" aria-label={title}>
      <h3>{title}</h3>
      <dl>
        {items.map(([tex, label]) => (
          <div key={tex}>
            <dt>
              <Tex>{tex}</Tex>
            </dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

/* ---------------------------- Lösung ---------------------------- */

function CopyLink() {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      onClick={() => {
        navigator.clipboard?.writeText(window.location.href).then(
          () => {
            setDone(true)
            window.setTimeout(() => setDone(false), 1600)
          },
          () => undefined,
        )
      }}
      title="Link zu dieser Rechnung kopieren"
    >
      {done ? <IconCheck size={15} /> : <IconLink size={15} />}
      {done ? 'Kopiert' : 'Link'}
    </button>
  )
}

export function SolutionCard({ sol, err, empty = 'Gib oben eine Aufgabe ein – der Lösungsweg erscheint hier.', children }: { sol: Solution | null; err: string | null; empty?: string; children?: ReactNode }) {
  const [stepwise, setStepwise] = useState(false)
  if (err)
    return (
      <section className="calc__out card calc__out--err" aria-live="polite">
        <p>
          <Rich text={err} />
        </p>
      </section>
    )
  if (!sol)
    return (
      <section className="calc__out card calc__out--empty">
        <p>{empty}</p>
      </section>
    )
  return (
    <section className="calc__out card" aria-live="polite">
      <div className="calc__res">
        <span className="calc__res-k">Ergebnis</span>
        <div className="calc__res-v">
          <Tex block>{sol.result}</Tex>
        </div>
        {sol.extra?.map((x) => (
          <div key={x} className="calc__res-x">
            <Tex>{x}</Tex>
          </div>
        ))}
        {sol.remark && (
          <p className="calc__remark">
            <Rich text={sol.remark} />
          </p>
        )}
      </div>
      {children}
      <div className="calc__way">
        <div className="calc__way-head">
          <h2>Lösungsweg</h2>
          <div className="calc__way-actions">
            <label className="switch switch--sm">
              <input type="checkbox" checked={stepwise} onChange={(e) => setStepwise(e.target.checked)} />
              <span className="switch__track" />
              Schritt für Schritt
            </label>
            <CopyLink />
          </div>
        </div>
        <Steps steps={sol.steps} stepwise={stepwise} resetKey={sol.result + sol.steps.length} />
      </div>
    </section>
  )
}
