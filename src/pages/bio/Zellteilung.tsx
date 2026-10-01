import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DivisionSvg from '../../bio/DivisionSvg'
import { COMPARE, CYCLE, FACTS, MEIOSE, MITOSE, type Phase } from '../../bio/division'
import '../../styles/bio.css'

const VIEWS = [
  { id: 'zyklus', label: 'Zellzyklus' },
  { id: 'mitose', label: 'Mitose' },
  { id: 'meiose', label: 'Meiose' },
  { id: 'vergleich', label: 'Vergleich' },
  { id: 'quiz', label: 'Quiz' },
] as const

/* ---------------------------------------------------------------------------
   Abspieler für Mitose / Meiose
   --------------------------------------------------------------------------- */

function Player({ phases, kind }: { phases: Phase[]; kind: 'mitose' | 'meiose' }) {
  const [target, setTarget] = useState(0)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const tRef = useRef(0)
  const last = phases.length - 1

  // weich zur Zielphase gleiten
  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const d = target - tRef.current
      if (Math.abs(d) < 0.002) {
        tRef.current = target
        setT(target)
        return
      }
      tRef.current += d * (1 - Math.exp(-dt * 3.4))
      setT(tRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  useEffect(() => {
    if (!playing) return
    if (target >= last) {
      setPlaying(false)
      return
    }
    const id = setTimeout(() => setTarget((x) => Math.min(last, x + 1)), 2600)
    return () => clearTimeout(id)
  }, [playing, target, last])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && /input|textarea|select/i.test(el.tagName)) return
      if (e.key === 'ArrowRight') setTarget((x) => Math.min(last, x + 1))
      if (e.key === 'ArrowLeft') setTarget((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  const cur = Math.round(t)
  const ph = phases[cur]
  const c = ph.counts
  const human = (n: number) => (n * 23) / 2

  const scrub = (v: number) => {
    tRef.current = v
    setT(v)
    setTarget(Math.round(v))
  }

  // Phasen nach Abschnitt gruppieren (Interphase · Meiose I · Meiose II …)
  const groups: { name: string; idx: number[] }[] = []
  phases.forEach((p, k) => {
    const g = groups[groups.length - 1]
    if (g && g.name === p.group) g.idx.push(k)
    else groups.push({ name: p.group, idx: [k] })
  })
  const cpc = parseInt(c.cpc, 10)

  return (
    <div className="zt-player">
      <section className="zt-stage card">
        <header className="zt-stage__head">
          <div>
            <span className="zt-stage__group">{ph.group}</span>
            <strong key={ph.id}>{ph.name}</strong>
          </div>
          <div className="zt-legend">
            <span>
              <i className="is-m" /> von der Mutter
            </span>
            <span>
              <i className="is-p" /> vom Vater
            </span>
          </div>
        </header>
        <div className="zt-canvas">
          <DivisionSvg phases={phases} t={t} />
        </div>
        <div className="zt-timeline" role="tablist" aria-label="Phasen">
          {groups.map((g) => (
            <div key={g.name + g.idx[0]} className={`zt-tg ${g.idx.includes(cur) ? 'is-on' : ''}`} style={{ flexGrow: g.idx.length }}>
              <span className="zt-tg__name">{g.name}</span>
              <div className="zt-tg__items">
                {g.idx.map((k) => (
                  <button key={phases[k].id} type="button" role="tab" aria-selected={k === cur} className={`zt-tl ${k === cur ? 'is-on' : ''} ${k < cur ? 'is-done' : ''}`} onClick={() => setTarget(k)}>
                    <span className="zt-tl__dot" />
                    <span className="zt-tl__name">{phases[k].name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="zt-ctrl">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setTarget(Math.max(0, target - 1))} disabled={target === 0}>
            Zurück
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              if (target >= last) setTarget(0)
              setPlaying((p) => !p)
            }}
          >
            {playing ? 'Pause' : target >= last ? 'Von vorn abspielen' : 'Abspielen'}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setTarget(Math.min(last, target + 1))} disabled={target === last}>
            Weiter
          </button>
          <input className="zt-range" type="range" min={0} max={last} step={0.01} value={t} onChange={(e) => scrub(parseFloat(e.target.value))} aria-label="Zeitleiste" />
          <span className="zt-keys" aria-hidden="true">
            <kbd>←</kbd>
            <kbd>→</kbd>
          </span>
        </div>
      </section>

      <aside className="zt-info card">
        <p className="zt-info__step">
          {kind === 'mitose' ? 'Mitose' : 'Meiose'} · Phase {cur + 1} von {phases.length}
        </p>
        <h2 key={ph.id} className="zt-info__name">
          {ph.name}
        </h2>
        <ol key={ph.id + 'p'} className="zt-points">
          {ph.points.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>

        <div className="zt-meter">
          <div className="zt-meter__row">
            <span>Chromosomen je Zelle</span>
            <b>{c.chr}</b>
            <small>Mensch {human(c.chr)}</small>
          </div>
          <div className="zt-glyphs" aria-hidden="true">
            {Array.from({ length: c.chr }, (_, k) => (
              <svg key={k} viewBox="0 0 12 20">
                {cpc === 2 ? (
                  <>
                    <path d="M3.5 2 L8.5 18" />
                    <path d="M8.5 2 L3.5 18" />
                  </>
                ) : (
                  <path d="M6 2 L6 18" />
                )}
              </svg>
            ))}
          </div>
          <div className="zt-meter__row">
            <span>DNA-Gehalt</span>
            <b>{c.dna}</b>
          </div>
          <div className="zt-dna" aria-hidden="true">
            {[1, 2, 3, 4].map((k) => (
              <i key={k} className={k <= c.C ? 'is-on' : ''} />
            ))}
            <span>{c.C}C je Kern</span>
          </div>
        </div>

        <dl className="zt-counts">
          <div>
            <dt>Zellen</dt>
            <dd>{c.cells}</dd>
          </div>
          <div>
            <dt>Chromosomensatz</dt>
            <dd>{c.set}</dd>
          </div>
          <div className="zt-counts__wide">
            <dt>Chromatiden je Chromosom</dt>
            <dd>{c.cpc}</dd>
          </div>
        </dl>
        <p className="zt-model">Modellzelle mit 2n = 4 Chromosomen · Mensch: 2n = 46</p>
      </aside>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Zellzyklus als Ring
   --------------------------------------------------------------------------- */

function arc(cx: number, cy: number, r1: number, r2: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)]
  const large = a1 - a0 > Math.PI ? 1 : 0
  const [x0, y0] = p(r2, a0)
  const [x1, y1] = p(r2, a1)
  const [x2, y2] = p(r1, a1)
  const [x3, y3] = p(r1, a0)
  return `M${x0} ${y0} A${r2} ${r2} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r1} ${r1} 0 ${large} 0 ${x3} ${y3} Z`
}

function Cycle() {
  const [sel, setSel] = useState<string>('S')
  const total = CYCLE.reduce((s, x) => s + x.h, 0)
  let acc = 0
  const segs = CYCLE.map((c) => {
    const a0 = (acc / total) * Math.PI * 2
    acc += c.h
    const a1 = (acc / total) * Math.PI * 2
    return { ...c, a0, a1, mid: (a0 + a1) / 2 }
  })
  const cur = CYCLE.find((c) => c.id === sel)!
  return (
    <section className="zt-cycle card">
      <svg viewBox="0 0 320 320" className="zt-ring" role="img" aria-label="Zellzyklus">
        {segs.map((s) => {
          const on = s.id === sel
          const off = on ? 7 : 0
          const tx = Math.sin(s.mid) * off
          const ty = -Math.cos(s.mid) * off
          const lr = 128
          return (
            <g key={s.id} transform={`translate(${tx} ${ty})`} className={`zt-seg zt-seg--${s.id} ${on ? 'is-on' : ''}`} onClick={() => setSel(s.id)} role="button" aria-label={s.name}>
              <path d={arc(160, 160, 100, 150, s.a0 + 0.012, s.a1 - 0.012)} />
              <text x={160 + Math.sin(s.mid) * lr} y={164 - Math.cos(s.mid) * lr}>
                {s.id}
              </text>
            </g>
          )
        })}
        <text x="160" y="150" className="zt-ring__big">
          {cur.h} h
        </text>
        <text x="160" y="174" className="zt-ring__small">
          von etwa {total} h
        </text>
        <path d={arc(160, 160, 92, 95, 0.02, (23 / 24) * Math.PI * 2 - 0.02)} className="zt-ring__inter" />
      </svg>
      <div className="zt-cycle__info">
        <div className="seg">
          {CYCLE.map((c) => (
            <button key={c.id} type="button" className={`seg__btn ${c.id === sel ? 'is-active' : ''}`} onClick={() => setSel(c.id)}>
              {c.id}
            </button>
          ))}
        </div>
        <h2>{cur.name}</h2>
        <p>{cur.text}</p>
        <dl className="zt-counts">
          <div>
            <dt>Dauer (Beispiel)</dt>
            <dd>ca. {cur.h} h</dd>
          </div>
          <div>
            <dt>DNA-Gehalt</dt>
            <dd>{cur.dna}</dd>
          </div>
        </dl>
        <p className="zt-note">Interphase = G1 + S + G2. Zellen, die sich nicht mehr teilen (z. B. Nervenzellen), verlassen den Zyklus in die G0-Phase.</p>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   Quiz
   --------------------------------------------------------------------------- */

type Q = { prompt: string; options: string[]; correct: number; phases?: Phase[]; t?: number }

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

function makeQuiz(): Q[] {
  const qs: Q[] = []
  for (const [phases, name] of [
    [MITOSE, 'Mitose'],
    [MEIOSE, 'Meiose'],
  ] as const) {
    const pool = phases.filter((p) => name === 'Mitose' || (p.id !== 'interphase' && p.id !== 'crossing-over'))
    for (const p of shuffle(pool).slice(0, 3)) {
      const opts = shuffle([p.name, ...shuffle(pool.filter((x) => x.id !== p.id).map((x) => x.name)).slice(0, 3)])
      qs.push({ prompt: `Welche Phase der ${name} ist das?`, options: opts, correct: opts.indexOf(p.name), phases, t: phases.indexOf(p) })
    }
  }
  for (const f of shuffle(FACTS).slice(0, 6)) {
    const opts = shuffle(f.o)
    qs.push({ prompt: f.q, options: opts, correct: opts.indexOf(f.o[0]) })
  }
  return shuffle(qs)
}

function Quiz() {
  const [round, setRound] = useState(0)
  const qs = useMemo(() => makeQuiz(), [round]) // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const q = qs[i]
  if (!q)
    return (
      <section className="zt-quiz card">
        <div className="zt-quiz__end">
          <strong>
            {score} von {qs.length}
          </strong>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              setRound((r) => r + 1)
              setI(0)
              setScore(0)
              setPicked(null)
            }}
          >
            Neue Runde
          </button>
        </div>
      </section>
    )
  return (
    <section className="zt-quiz card">
      <div className="zt-quiz__top">
        <span>
          Frage {i + 1} / {qs.length}
        </span>
        <span>{score} richtig</span>
      </div>
      <p className="zt-quiz__q">{q.prompt}</p>
      {q.phases && <DivisionSvg phases={q.phases} t={q.t!} labels={false} className="zt-quiz__img" />}
      <div className="zt-quiz__opts">
        {q.options.map((o, k) => {
          const st = picked === null ? '' : k === q.correct ? 'is-right' : k === picked ? 'is-wrong' : 'is-dim'
          return (
            <button
              key={o}
              type="button"
              className={`zt-opt ${st}`}
              disabled={picked !== null}
              onClick={() => {
                setPicked(k)
                if (k === q.correct) setScore((s) => s + 1)
              }}
            >
              {o}
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <div className="zt-quiz__after">
          <span className={picked === q.correct ? 'is-right' : 'is-wrong'}>{picked === q.correct ? 'Richtig.' : `Richtig wäre: ${q.options[q.correct]}`}</span>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              setI(i + 1)
              setPicked(null)
            }}
          >
            {i + 1 < qs.length ? 'Weiter' : 'Auswertung'}
          </button>
        </div>
      )}
    </section>
  )
}

/* --------------------------------------------------------------------------- */

export default function Zellteilung() {
  const [params, setParams] = useSearchParams()
  const view = params.get('ansicht') ?? 'mitose'
  const setView = (v: string) => {
    const p = new URLSearchParams(params)
    p.set('ansicht', v)
    setParams(p, { replace: true })
  }
  return (
    <div className="page zt-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Biologie · Zellteilung</p>
          <h1>Mitose & Meiose</h1>
          <p>Vom Zellzyklus bis zur Keimzelle – Phase für Phase mit Chromosomenzahlen.</p>
        </div>
        <div className="seg" role="tablist">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`seg__btn ${view === v.id ? 'is-active' : ''}`} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      </header>
      {view === 'zyklus' && <Cycle />}
      {view === 'mitose' && <Player key="mitose" phases={MITOSE} kind="mitose" />}
      {view === 'meiose' && <Player key="meiose" phases={MEIOSE} kind="meiose" />}
      {view === 'vergleich' && (
        <section className="zt-compare card">
          <table>
            <thead>
              <tr>
                <th />
                <th>Mitose</th>
                <th>Meiose</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([k, a, b]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{a}</td>
                  <td>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="zt-compare__pics">
            <figure>
              <DivisionSvg phases={MITOSE} t={MITOSE.length - 1} labels={false} />
              <figcaption>Mitose: 2 gleiche Zellen, 2n</figcaption>
            </figure>
            <figure>
              <DivisionSvg phases={MEIOSE} t={MEIOSE.length - 1} labels={false} />
              <figcaption>Meiose: 4 verschiedene Zellen, n</figcaption>
            </figure>
          </div>
        </section>
      )}
      {view === 'quiz' && <Quiz />}
    </div>
  )
}
