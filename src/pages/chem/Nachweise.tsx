import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FLAMES, HALIDES, NACHWEISE, type Nachweis, type Step } from '../../chem/nachweise'
import { Burner, Dish, Eq, Sp, Tube, type DishState, type TubeState } from '../../chem/lab'
import { Formula } from '../../chem/format'
import { IconCheck } from '../../components/icons'
import '../../styles/chem.css'

const VIEWS = [
  { id: 'nachweise', label: 'Nachweise' },
  { id: 'halogenide', label: 'Halogenide vergleichen' },
  { id: 'flamme', label: 'Flammenfärbung' },
] as const

/** Zustand des Uhrglases nach Schritt i */
function dishAt(steps: Step[], i: number): DishState {
  let fill = 0
  let liquid = 'transparent'
  let solid = 0
  for (let k = 0; k <= i; k++) {
    const s = steps[k]
    if (s.fill !== undefined) fill = s.fill
    if (s.liquid) liquid = s.liquid
    if (s.solid !== undefined) solid = s.solid
  }
  return { fill, liquid, solid, gas: steps[i].gas, drops: steps[i].drops }
}

/** Zustand des Reagenzglases nach Schritt i */
function tubeAt(steps: Step[], i: number): TubeState {
  let fill = 0
  let liquid = 'transparent'
  let ppt: TubeState['ppt'] = null
  let pptStep = -1
  let ring: string | undefined
  let goneNow: TubeState['ppt'] = null
  for (let k = 0; k <= i; k++) {
    const s = steps[k]
    if (s.fill !== undefined) fill = s.fill
    if (s.liquid) liquid = s.liquid
    if (s.ring) ring = s.ring
    if (s.ppt === 'weg') {
      if (k === i) goneNow = ppt
      ppt = null
    } else if (s.ppt) {
      ppt = s.ppt
      pptStep = k
    }
  }
  const cur = steps[i]
  return {
    fill,
    liquid,
    ppt: ppt ?? goneNow,
    pptMode: goneNow ? 'gone' : ppt ? (pptStep === i ? 'new' : 'settled') : null,
    gas: cur.gas,
    drops: cur.drops,
    ring,
    heat: cur.heat,
  }
}

function Reagents({ s }: { s: string }) {
  return (
    <>
      {s.split(', ').map((r, i) => (
        <span key={i}>
          {i > 0 && ', '}
          <Formula f={r} />
        </span>
      ))}
    </>
  )
}

/* ---------------------------------------------------------------------------
   Nachweis Schritt für Schritt
   --------------------------------------------------------------------------- */

function Bench({ n }: { n: Nachweis }) {
  const [i, setI] = useState(0)
  const last = n.steps.length - 1
  const step = n.steps[i]
  const t = tubeAt(n.steps, i)
  const flameStep = n.method === 'flamme'
  const flame = flameStep ? [...n.steps.slice(0, i + 1)].reverse().find((s) => s.flame)?.flame ?? null : null

  return (
    <section className="nw-bench card">
      <header className="nw-bench__head">
        <h2>
          <Sp s={n.ion} /> {n.name}-Nachweis
        </h2>
        <span className={`chip ${n.status === 'praktikum' ? 'chip--green' : 'chip--sand'}`}>{n.status === 'praktikum' ? 'Praktikum' : 'kommt noch'}</span>
      </header>

      <div className="nw-bench__body">
        <div className="nw-scene">
          {flameStep ? (
            <Burner color={step.flame ?? (step.stick ? flame : 'base')} stick={step.stick ?? !!step.reagent} cobalt={step.cobalt} />
          ) : n.vessel === 'uhrglas' ? (
            <svg viewBox="18 112 204 166" role="img" aria-label="Uhrglas">
              <Dish state={dishAt(n.steps, i)} uid={`${n.id}-${i}`} />
            </svg>
          ) : (
            <svg viewBox="0 -18 240 340" role="img" aria-label="Reagenzglas">
              <Tube cx={120} state={t} id={n.id} uid={`${n.id}-${i}`} />
            </svg>
          )}
        </div>

        <ol className="nw-steps">
          {n.steps.map((s, k) => (
            <li key={k} className={k === i ? 'is-now' : k < i ? 'is-done' : ''}>
              <button type="button" onClick={() => setI(k)}>
                <span className="nw-steps__n">{k < i ? <IconCheck size={13} /> : k + 1}</span>
                <span className="nw-steps__t">
                  {s.act}
                  {s.reagent && (
                    <span className="nw-steps__r">
                      <Formula f={s.reagent} />
                    </span>
                  )}
                </span>
              </button>
              {k <= i && s.obs && <p className="nw-steps__obs">{s.obs}</p>}
            </li>
          ))}
        </ol>
      </div>

      <div className="nw-bench__ctrl">
        <button type="button" className="btn btn--ghost btn--sm" disabled={i === 0} onClick={() => setI(i - 1)}>
          Zurück
        </button>
        {i < last ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setI(i + 1)}>
            Nächster Schritt
          </button>
        ) : (
          <button type="button" className="btn btn--sm" onClick={() => setI(0)}>
            Von vorn
          </button>
        )}
        <span className="nw-bench__count">
          {i + 1} / {n.steps.length}
        </span>
      </div>

      <div className={`nw-result ${i === last ? 'is-on' : ''}`}>
        <div className="nw-eqs">
          {n.eq.map((e) => (
            <Eq key={e} s={e} />
          ))}
        </div>
        <p className="nw-result__obs">
          <span className="nw-swatch" style={{ background: n.swatch }} />
          {n.result}
        </p>
        {n.notes && (
          <ul className="nw-notes">
            {n.notes.map((x) => (
              <li key={x.t}>
                {x.t}
                {x.eq && <Eq s={x.eq} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function NachweisView() {
  const [params, setParams] = useSearchParams()
  const id = params.get('n') ?? NACHWEISE[0].id
  const n = NACHWEISE.find((x) => x.id === id) ?? NACHWEISE[0]
  const pick = (nid: string) => {
    const p = new URLSearchParams(params)
    p.set('n', nid)
    setParams(p, { replace: true })
  }
  return (
    <div className="nw">
      <nav className="nw-list" aria-label="Nachweise">
        {(['praktikum', 'spaeter'] as const).map((st) => (
          <div key={st} className="nw-list__group">
            <h3>{st === 'praktikum' ? 'Aus dem Praktikum' : 'Kommt noch'}</h3>
            {(['anion', 'kation'] as const).map((kind) => {
              const items = NACHWEISE.filter((x) => x.status === st && x.kind === kind)
              if (!items.length) return null
              return (
                <div key={kind} className="nw-list__kind">
                  <span className="nw-list__k">{kind === 'anion' ? 'Anionen' : 'Kationen'}</span>
                  {items.map((x) => (
                    <button key={x.id} type="button" className={`nw-item ${x.id === n.id ? 'is-on' : ''} nw-item--${kind}`} onClick={() => pick(x.id)}>
                      <span className="nw-item__ion">
                        <Sp s={x.ion} />
                      </span>
                      <span className="nw-item__txt">
                        <b>{x.name}</b>
                        <small>
                          <Reagents s={x.short} />
                        </small>
                      </span>
                      <span className="nw-swatch nw-swatch--sm" style={{ background: x.swatch }} />
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </nav>
      <Bench key={n.id} n={n} />
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Halogenide nebeneinander
   --------------------------------------------------------------------------- */

const HAL_STAGES = ['Angesäuerte Probe', '+ Silbernitrat', '+ NH₃ verdünnt', '+ NH₃ konzentriert']

function HalideView() {
  const [stage, setStage] = useState(0)
  const fills = [0.34, 0.42, 0.52, 0.62]
  const dissolvedAt = (h: (typeof HALIDES)[number]) => (h.dil ? 2 : h.conc ? 3 : 99)
  return (
    <section className="nw-hal card">
      <div className="seg nw-hal__seg" role="tablist">
        {HAL_STAGES.map((s, k) => (
          <button key={s} type="button" role="tab" aria-selected={stage === k} className={`seg__btn ${stage === k ? 'is-active' : ''}`} onClick={() => setStage(k)}>
            {s}
          </button>
        ))}
      </div>
      <svg className="nw-hal__svg" viewBox="0 -18 360 340" role="img" aria-label="Drei Reagenzgläser mit Chlorid, Bromid und Iodid">
        {HALIDES.map((h, k) => {
          const d = dissolvedAt(h)
          const has = stage >= 1
          const gone = stage >= d
          const mode = !has ? null : stage === d ? 'gone' : gone ? null : stage === 1 ? 'new' : 'settled'
          return (
            <Tube
              key={h.id}
              cx={60 + k * 120}
              id={h.id}
              uid={`hal-${h.id}-${stage}`}
              state={{ fill: fills[stage], liquid: 'rgba(160, 196, 214, 0.22)', ppt: mode ? { color: h.color, size: 'kaesig' } : null, pptMode: mode, drops: stage >= 1 }}
            />
          )
        })}
      </svg>
      <div className="nw-hal__labels">
        {HALIDES.map((h) => {
          const gone = stage >= dissolvedAt(h)
          return (
            <div key={h.id}>
              <Sp s={h.ion} />
              <span>
                <Formula f={h.salt} /> {h.text}
              </span>
              <b className={stage === 0 ? '' : gone ? 'is-gone' : 'is-ppt'}>{stage === 0 ? 'klar' : gone ? 'gelöst' : 'Niederschlag'}</b>
            </div>
          )
        })}
      </div>
      <table className="nw-hal__table">
        <thead>
          <tr>
            <th>Ion</th>
            <th>mit Ag⁺</th>
            <th>NH₃ verdünnt</th>
            <th>NH₃ konzentriert</th>
          </tr>
        </thead>
        <tbody>
          {HALIDES.map((h) => (
            <tr key={h.id}>
              <td>
                <Sp s={h.ion} />
              </td>
              <td>
                <span className="nw-swatch nw-swatch--sm" style={{ background: h.color }} /> <Formula f={h.salt} /> {h.text}
              </td>
              <td>{h.dil ? 'löslich' : 'kaum löslich'}</td>
              <td>{h.conc ? 'löslich' : 'unlöslich'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="nw-eqs">
        <Eq s="Ag^+ + X^- → AgX↓" />
        <Eq s="AgX + 2 NH3 → [Ag(NH3)2]^+ + X^-" />
      </div>
      <p className="nw-hal__hint">Von Cl⁻ zu I⁻ wird das Silbersalz schwerer löslich – und gelber.</p>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   Flammenfärbung
   --------------------------------------------------------------------------- */

function FlameView() {
  const [id, setId] = useState('Na')
  const [cobalt, setCobalt] = useState(false)
  const f = FLAMES.find((x) => x.id === id)!
  const shown = cobalt ? (f.cobalt ?? 'base') : f.color
  return (
    <section className="nw-flame card">
      <div className="nw-flame__stage">
        <Burner color={shown} stick cobalt={cobalt} />
      </div>
      <div className="nw-flame__side">
        <div className="nw-flame__chips">
          {FLAMES.map((x) => (
            <button key={x.id} type="button" className={`nw-fchip ${x.id === id ? 'is-on' : ''}`} onClick={() => setId(x.id)}>
              <span className="nw-swatch nw-swatch--sm" style={{ background: x.color }} />
              {x.label}
            </button>
          ))}
        </div>
        <button type="button" className={`btn btn--sm ${cobalt ? 'btn--primary' : ''}`} onClick={() => setCobalt((c) => !c)} aria-pressed={cobalt}>
          Cobaltglas {cobalt ? 'an' : 'aus'}
        </button>
        <dl className="nw-flame__facts">
          <div>
            <dt>Element</dt>
            <dd>{f.name}</dd>
          </div>
          <div>
            <dt>Ion</dt>
            <dd>
              <Sp s={f.ion} />
              {f.id === 'NaK' && (
                <>
                  {' '}
                  + <Sp s="K^+" />
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>Farbe</dt>
            <dd>{cobalt ? (f.cobalt ? (f.id === 'Li' ? 'violettrot' : 'rotviolett') : 'kaum sichtbar') : f.text}</dd>
          </div>
          {f.nm && (
            <div>
              <dt>Wellenlänge</dt>
              <dd>{f.nm}</dd>
            </div>
          )}
        </dl>
        <p className="nw-flame__hint">Magnesiastäbchen ausglühen, in Salzsäure tauchen, dann in die Probe – und in die nichtleuchtende Flamme halten.</p>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------- */

export default function Nachweise() {
  const [params, setParams] = useSearchParams()
  const view = params.get('ansicht') ?? 'nachweise'
  const setView = (v: string) => {
    const p = new URLSearchParams(params)
    p.set('ansicht', v)
    setParams(p, { replace: true })
  }
  return (
    <div className="page chem-tool nw-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Chemie · Analytik</p>
          <h1>Ionennachweise</h1>
          <p>Ablauf, Beobachtung und Reaktionsgleichung – Schritt für Schritt.</p>
        </div>
        <div className="seg" role="tablist">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`seg__btn ${view === v.id ? 'is-active' : ''}`} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      </header>
      {view === 'nachweise' && <NachweisView />}
      {view === 'halogenide' && <HalideView />}
      {view === 'flamme' && <FlameView />}
    </div>
  )
}
