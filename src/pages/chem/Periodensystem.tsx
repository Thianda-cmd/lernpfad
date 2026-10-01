import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { BY_Z, CATS, CAT_BY_ID, ELEMENTS, block, fmtC, fmtDensity, fmtMass, fmtNum, mainGroupRoman, phaseAt, position, yearLabel, type Cat, type Element, type Phase } from '../../chem/elements'
import { Conf } from '../../chem/format'
import { PROPS, PROP_BY_KEY, range, type PropKey } from '../../chem/pse/props'
import Detail from '../../chem/pse/Detail'
import Bohr from '../../chem/pse/Bohr'
import { IconCube, IconSearch, IconShuffle } from '../../components/icons'
import '../../styles/chem.css'

type Mode = 'kat' | 'eig' | 'agg' | 'zeit' | 'quiz'

const MODES: { id: Mode; t: string }[] = [
  { id: 'kat', t: 'Kategorien' },
  { id: 'eig', t: 'Eigenschaften' },
  { id: 'agg', t: 'Aggregatzustand' },
  { id: 'zeit', t: 'Zeitreise' },
  { id: 'quiz', t: 'Quiz' },
]

const PHASES: Phase[] = ['fest', 'flüssig', 'gasförmig', 'unbekannt']

/* Temperatur-Regler: −273 … 100 °C fein, darüber bis 6000 °C grob */
const sToT = (s: number) => (s <= 400 ? -273.15 + (s / 400) * 373.15 : 100 + ((s - 400) / 600) ** 2 * 5900)
const tToS = (t: number) => (t <= 100 ? (400 * (t + 273.15)) / 373.15 : 400 + 600 * Math.sqrt((t - 100) / 5900))
const T_PRESETS = [
  { t: -196, l: '−196 °C', d: 'flüssiger Stickstoff' },
  { t: 0, l: '0 °C', d: '' },
  { t: 20, l: '20 °C', d: 'Raumtemperatur' },
  { t: 100, l: '100 °C', d: '' },
  { t: 1000, l: '1000 °C', d: '' },
  { t: 3000, l: '3000 °C', d: '' },
]

const YEAR_MIN = 1650
const YEAR_MAX = 2026

const QUIZ_BASIS = [...Array.from({ length: 36 }, (_, i) => i + 1), 47, 50, 53, 54, 55, 56, 78, 79, 80, 82, 86, 88, 92]

interface CellProps {
  e: Element
  cls: string
  val: string
  v: number
  hideName: boolean
  hideSym: boolean
}

const Cell = memo(function Cell({ e, cls, val, v, hideName, hideSym }: CellProps) {
  const p = position(e.z)
  return (
    <button
      type="button"
      className={`el c-${e.cat} ${cls}`}
      data-z={e.z}
      style={{ gridRow: p.row + 1, gridColumn: p.col + 1, ['--i' as string]: p.col + p.row * 1.6, ['--v' as string]: v } as CSSProperties}
      aria-label={hideName ? `Element ${e.z}` : `${e.name} (${e.sym}), Ordnungszahl ${e.z}`}
    >
      <span className="el__z">{e.z}</span>
      <span className="el__sym">{hideSym ? '' : e.sym}</span>
      {!hideName && <span className="el__name">{e.name}</span>}
      <span className="el__val">{val}</span>
    </button>
  )
})

function useQuiz() {
  const [asked, setAsked] = useState<'name' | 'sym'>('name')
  const [pool, setPool] = useState<'basis' | 'alle'>('basis')
  const [target, setTarget] = useState(19)
  const [score, setScore] = useState({ ok: 0, n: 0, streak: 0, best: 0 })
  const [fb, setFb] = useState<{ z: number; ok: boolean } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const next = useCallback(
    (p = pool) => {
      const list = p === 'basis' ? QUIZ_BASIS : ELEMENTS.map((e) => e.z)
      setTarget((cur) => {
        let z = cur
        while (z === cur) z = list[Math.floor(Math.random() * list.length)]
        return z
      })
      setFb(null)
    },
    [pool],
  )
  const pick = (z: number) => {
    if (fb) return
    const ok = z === target
    setFb({ z, ok })
    setScore((s) => {
      const streak = ok ? s.streak + 1 : 0
      return { ok: s.ok + (ok ? 1 : 0), n: s.n + 1, streak, best: Math.max(s.best, streak) }
    })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => next(), ok ? 700 : 1700)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return { asked, setAsked, pool, setPool: (p: 'basis' | 'alle') => (setPool(p), next(p)), target, score, fb, pick, next }
}

export default function Periodensystem() {
  const [mode, setMode] = useState<Mode>('kat')
  const [hover, setHover] = useState<number | null>(null)
  const [last, setLast] = useState(6)
  const [open, setOpen] = useState<number | null>(null)
  const [hlCat, setHlCat] = useState<Cat | null>(null)
  const [hlPhase, setHlPhase] = useState<Phase | null>(null)
  const [blocks, setBlocks] = useState(false)
  const [prop, setProp] = useState<PropKey>('en')
  const [three, setThree] = useState(false)
  const [tS, setTS] = useState(tToS(20))
  const [year, setYear] = useState(YEAR_MAX)
  const [playing, setPlaying] = useState(false)
  const [query, setQuery] = useState('')
  const quiz = useQuiz()
  const temp = sToT(tS)
  const is3d = mode === 'eig' && three

  // Zeitreise abspielen
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setYear((y) => {
        if (y >= YEAR_MAX) {
          setPlaying(false)
          return YEAR_MAX
        }
        return Math.min(YEAR_MAX, y + 2)
      })
    }, 45)
    return () => window.clearInterval(id)
  }, [playing])

  const pdef = PROP_BY_KEY[prop]
  const pr = useMemo(() => range(pdef, ELEMENTS), [pdef])

  const q = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!q) return null
    const n = Number(q)
    return new Set(
      ELEMENTS.filter((e) => (Number.isInteger(n) && n > 0 ? e.z === n : e.sym.toLowerCase() === q || e.name.toLowerCase().startsWith(q) || (q.length > 2 && e.name.toLowerCase().includes(q)))).map((e) => e.z),
    )
  }, [q])

  const cells = useMemo(
    () =>
      ELEMENTS.map((e) => {
        let cls = ''
        let val = fmtMass(e)
        let v = 0
        if (mode === 'kat') {
          if (blocks) cls += ` b-${block(e)}`
          if (hlCat && e.cat !== hlCat) cls += ' is-dim'
        } else if (mode === 'eig') {
          const x = pdef.get(e)
          if (x === null) cls += ' is-nodata'
          else {
            v = pr.max === pr.min ? 1 : (x - pr.min) / (pr.max - pr.min)
            if (v > 0.55) cls += ' is-hot'
          }
          val = pdef.fmt(e)
        } else if (mode === 'agg') {
          const ph = phaseAt(e, temp)
          cls += ` ph-${ph === 'flüssig' ? 'liq' : ph === 'gasförmig' ? 'gas' : ph === 'fest' ? 'sol' : 'unk'}`
          if (hlPhase && ph !== hlPhase) cls += ' is-dim'
          val = ph === 'unbekannt' ? '?' : ph
        } else if (mode === 'zeit') {
          const known = e.year <= year
          cls += known ? ' is-known' : ' is-future'
          if (known && playing && e.year > year - 8 && e.year > 0) cls += ' is-fresh'
          val = yearLabel(e.year)
        } else if (mode === 'quiz') {
          if (quiz.fb) {
            if (quiz.fb.z === e.z) cls += quiz.fb.ok ? ' q-hit' : ' q-miss'
            else if (!quiz.fb.ok && e.z === quiz.target) cls += ' q-reveal'
          }
          val = ''
        }
        if (matches && !matches.has(e.z)) cls += ' is-dim'
        if (matches && matches.has(e.z)) cls += ' is-match'
        if (open === e.z) cls += ' is-open'
        return { e, cls, val, v }
      }),
    [mode, blocks, hlCat, hlPhase, pdef, pr, temp, year, playing, quiz.fb, quiz.target, matches, open],
  )

  const counts = useMemo(() => {
    const c: Record<Phase, number> = { fest: 0, flüssig: 0, gasförmig: 0, unbekannt: 0 }
    for (const e of ELEMENTS) c[phaseAt(e, temp)]++
    return c
  }, [temp])
  const knownCount = useMemo(() => ELEMENTS.filter((e) => e.year <= year).length, [year])

  const onOver = (ev: MouseEvent) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-z]')
    if (!t) return
    const z = Number(t.dataset.z)
    setHover(z)
    if (mode !== 'quiz') setLast(z)
  }
  const onClick = (ev: MouseEvent) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-z]')
    if (!t) return
    const z = Number(t.dataset.z)
    if (mode === 'quiz') quiz.pick(z)
    else setOpen(z)
  }
  const closeDetail = useCallback(() => setOpen(null), [])
  const navDetail = useCallback((z: number) => {
    setOpen(z)
    setLast(z)
  }, [])

  const shown = BY_Z[mode === 'quiz' ? quiz.target : (hover ?? last)]
  const hp = hover ? position(hover) : null
  const hideName = mode === 'quiz'
  const hideSym = mode === 'quiz' && quiz.asked === 'sym'

  const insp =
              mode === 'quiz' ? (
                <div className="insp__quiz">
                  <span className="insp__kicker">Wo steht …</span>
                  <strong className={quiz.fb ? (quiz.fb.ok ? 'is-ok' : 'is-bad') : ''}>
                    {quiz.asked === 'name' ? shown.name : shown.sym}
                  </strong>
                  <span className="insp__qfb">
                    {quiz.fb
                      ? quiz.fb.ok
                        ? 'Richtig!'
                        : `Das war ${BY_Z[quiz.fb.z].name} (${BY_Z[quiz.fb.z].sym}). Gesucht: ${shown.name} (${shown.sym}), Ordnungszahl ${shown.z}.`
                      : 'Klicke auf das richtige Feld.'}
                  </span>
                  <div className="insp__score">
                    <span>
                      <b>{quiz.score.ok}</b> / {quiz.score.n} richtig
                    </span>
                    <span>
                      Serie <b>{quiz.score.streak}</b>
                    </span>
                    <span>
                      Rekord <b>{quiz.score.best}</b>
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className={`insp__tile c-${shown.cat} ${mode === 'kat' && blocks ? `b-${block(shown)}` : ''}`} key={shown.z}>
                    <span className="insp__z">{shown.z}</span>
                    <span className="insp__sym">{shown.sym}</span>
                    <span className="insp__mass">{fmtMass(shown)}</span>
                  </div>
                  <div className="insp__body">
                    <div className="insp__name">
                      <strong>{shown.name}</strong>
                      <span>{CAT_BY_ID[shown.cat].short}</span>
                    </div>
                    <div className="insp__conf">
                      <Conf conf={shown.conf} />
                    </div>
                    {mode === 'kat' && !blocks && (
                      <div className="legend" onMouseLeave={() => setHlCat(null)}>
                        {CATS.map((c) => (
                          <button key={c.id} type="button" className={`legend__i ${hlCat === c.id ? 'is-on' : ''}`} onMouseEnter={() => setHlCat(c.id)} onFocus={() => setHlCat(c.id)} onClick={() => setHlCat(hlCat === c.id ? null : c.id)}>
                            <i className={`c-${c.id}`} />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {mode === 'kat' && blocks && (
                      <div className="legend legend--blocks">
                        {(['s', 'p', 'd', 'f'] as const).map((b) => (
                          <span key={b} className="legend__i">
                            <i className={`b-${b}`} />
                            {b}-Block <small>{b === 's' ? 'Gr. 1–2' : b === 'p' ? 'Gr. 13–18' : b === 'd' ? 'Gr. 3–12' : 'Lanthanoide, Actinoide'}</small>
                          </span>
                        ))}
                      </div>
                    )}
                    {mode === 'eig' && (
                      <div className="insp__prop">
                        <div className="insp__value">
                          <strong>{pdef.fmt(shown)}</strong> <span>{pdef.get(shown) === null || (pdef.key === 'dens' && (shown.dens ?? 1) < 0.02) ? '' : pdef.unit}</span>
                        </div>
                        <div className="scale">
                          <span>{fmtNum(pr.min, 2)}</span>
                          <i />
                          <span>{fmtNum(pr.max, 2)}</span>
                        </div>
                        <p className="insp__trend">{pdef.trend}</p>
                      </div>
                    )}
                    {mode === 'agg' && (
                      <div className="insp__prop">
                        <div className="insp__value">
                          <strong>{Math.round(temp)} °C</strong> <span>{Math.round(temp + 273.15)} K</span>
                        </div>
                        <div className="legend legend--phase" onMouseLeave={() => setHlPhase(null)}>
                          {PHASES.map((ph) => (
                            <button key={ph} type="button" className={`legend__i ${hlPhase === ph ? 'is-on' : ''}`} onMouseEnter={() => setHlPhase(ph)} onClick={() => setHlPhase(hlPhase === ph ? null : ph)}>
                              <i className={`ph-dot ph-dot--${ph === 'flüssig' ? 'liq' : ph === 'gasförmig' ? 'gas' : ph === 'fest' ? 'sol' : 'unk'}`} />
                              {ph} <b>{counts[ph]}</b>
                            </button>
                          ))}
                        </div>
                        <p className="insp__trend">
                          {shown.name}: {phaseAt(shown, temp)}
                          {shown.subl ? ` · sublimiert bei ${fmtC(shown.subl)}` : ` · Smp ${fmtC(shown.mp)} · Sdp ${fmtC(shown.bp)}`}
                        </p>
                      </div>
                    )}
                    {mode === 'zeit' && (
                      <div className="insp__prop">
                        <div className="insp__value insp__value--year">
                          <strong>{year <= YEAR_MIN ? 'bis 1650' : year}</strong> <span>{knownCount} Elemente bekannt</span>
                        </div>
                        <p className="insp__trend">
                          {shown.name}: {shown.year === 0 ? 'seit dem Altertum bekannt' : `entdeckt ${shown.year}`}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )

  return (
    <div className={`pse-page mode-${mode}`}>
      <div className="pse-bar">
        <div className="pse-bar__title">
          <h1>Periodensystem</h1>
          <span>118 Elemente</span>
        </div>
        <div className="seg pse-modes" role="tablist" aria-label="Ansicht">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              className={`seg__btn ${mode === m.id ? 'is-active' : ''}`}
              onClick={() => {
                setMode(m.id)
                setPlaying(false)
                if (m.id === 'zeit' && year === YEAR_MAX) {
                  setYear(YEAR_MIN)
                  setPlaying(true)
                }
              }}
            >
              {m.t}
            </button>
          ))}
        </div>
        <label className="pse-search">
          <IconSearch size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches?.size) setOpen([...matches][0])
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder="Element suchen …"
            aria-label="Element suchen"
          />
        </label>
      </div>

      <div className="pse-sub">
        {mode === 'kat' && (
          <div className="seg seg--sm">
            <button type="button" className={`seg__btn ${!blocks ? 'is-active' : ''}`} onClick={() => setBlocks(false)}>
              Stoffgruppen
            </button>
            <button type="button" className={`seg__btn ${blocks ? 'is-active' : ''}`} onClick={() => setBlocks(true)}>
              s-, p-, d-, f-Block
            </button>
          </div>
        )}
        {mode === 'eig' && (
          <>
            <div className="pse-chips">
              {PROPS.map((p) => (
                <button key={p.key} type="button" className={`pill pill--sm ${prop === p.key ? 'is-active' : ''}`} onClick={() => setProp(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
            <button type="button" className={`btn btn--sm ${three ? 'btn--primary' : ''}`} onClick={() => setThree((x) => !x)} aria-pressed={three}>
              <IconCube size={15} /> 3D
            </button>
          </>
        )}
        {mode === 'agg' && (
          <>
            <div className="pse-temp">
              <input
                type="range"
                min={0}
                max={1000}
                step={1}
                value={tS}
                onChange={(e) => setTS(+e.target.value)}
                aria-label="Temperatur"
                style={{ ['--p' as string]: `${tS / 10}%` }}
              />
            </div>
            <div className="pse-chips">
              {T_PRESETS.map((p) => (
                <button key={p.t} type="button" className={`pill pill--sm ${Math.abs(temp - p.t) < 0.6 ? 'is-active' : ''}`} onClick={() => setTS(tToS(p.t))} title={p.d || undefined}>
                  {p.l}
                </button>
              ))}
            </div>
          </>
        )}
        {mode === 'zeit' && (
          <>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={() => {
                if (year >= YEAR_MAX) setYear(YEAR_MIN)
                setPlaying((p) => !p)
              }}
            >
              {playing ? 'Pause' : year >= YEAR_MAX ? 'Von vorn abspielen' : 'Abspielen'}
            </button>
            <div className="pse-temp">
              <input
                type="range"
                min={YEAR_MIN}
                max={YEAR_MAX}
                value={year}
                onChange={(e) => {
                  setPlaying(false)
                  setYear(+e.target.value)
                }}
                aria-label="Jahr"
                style={{ ['--p' as string]: `${((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%` }}
              />
            </div>
          </>
        )}
        {mode === 'quiz' && (
          <>
            <div className="seg seg--sm">
              <button type="button" className={`seg__btn ${quiz.asked === 'name' ? 'is-active' : ''}`} onClick={() => quiz.setAsked('name')}>
                Nach Namen
              </button>
              <button type="button" className={`seg__btn ${quiz.asked === 'sym' ? 'is-active' : ''}`} onClick={() => quiz.setAsked('sym')}>
                Nach Symbol
              </button>
            </div>
            <div className="seg seg--sm">
              <button type="button" className={`seg__btn ${quiz.pool === 'basis' ? 'is-active' : ''}`} onClick={() => quiz.setPool('basis')}>
                Wichtige Elemente
              </button>
              <button type="button" className={`seg__btn ${quiz.pool === 'alle' ? 'is-active' : ''}`} onClick={() => quiz.setPool('alle')}>
                Alle 118
              </button>
            </div>
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => quiz.next()}>
              <IconShuffle size={14} /> Überspringen
            </button>
          </>
        )}
      </div>

      {mode === 'quiz' && (
        <div className="pse-mq" aria-live="polite">
          Wo steht <b>{quiz.asked === 'name' ? BY_Z[quiz.target].name : BY_Z[quiz.target].sym}</b>?
          <span>
            {quiz.fb ? (quiz.fb.ok ? 'Richtig!' : `Gesucht: ${BY_Z[quiz.target].sym}, Z = ${quiz.target}`) : `${quiz.score.ok} / ${quiz.score.n}`}
          </span>
        </div>
      )}

      <div className={`pse-stage ${is3d ? 'is-3d' : ''}`}>
        <div className="pse-inner">
        <div className="pse-grid" onMouseOver={onOver} onMouseLeave={() => setHover(null)} onClick={onClick}>
          {/* Gruppennummern */}
          {Array.from({ length: 18 }, (_, i) => i + 1).map((g) => (
            <div key={`g${g}`} className={`pse-gh ${hp && hp.group === g && hp.row <= 7 ? 'is-on' : ''}`} style={{ gridRow: 1, gridColumn: g + 1 }}>
              <span>{g}</span>
              {mainGroupRoman(g) && <em>{mainGroupRoman(g)}</em>}
            </div>
          ))}
          {/* Periodennummern */}
          {Array.from({ length: 7 }, (_, i) => i + 1).map((p) => (
            <div key={`p${p}`} className={`pse-ph ${hp && hp.period === p ? 'is-on' : ''}`} style={{ gridRow: p + 1, gridColumn: 1 }}>
              {p}
            </div>
          ))}
          {/* Platzhalter für Lanthanoide/Actinoide */}
          <div className="el el--ph c-la" style={{ gridRow: 7, gridColumn: 4 }} aria-hidden="true">
            <span className="el__sym">57–71</span>
          </div>
          <div className="el el--ph c-ac" style={{ gridRow: 8, gridColumn: 4 }} aria-hidden="true">
            <span className="el__sym">89–103</span>
          </div>
          <div className="pse-frow" style={{ gridRow: 10, gridColumn: '1 / 4' }}>
            Lanthanoide
          </div>
          <div className="pse-frow" style={{ gridRow: 11, gridColumn: '1 / 4' }}>
            Actinoide
          </div>

          {cells.map((c) => (
            <Cell key={c.e.z} e={c.e} cls={c.cls} val={c.val} v={c.v} hideName={hideName} hideSym={hideSym} />
          ))}

          {/* Anzeige im freien Bereich über den Übergangsmetallen */}
          {!is3d && (
            <div className="insp" style={{ gridRow: '2 / 5', gridColumn: '4 / 14' }}>
              {insp}
            </div>
          )}
        </div>

        {/* Hochformat: große Anzeige unter dem Periodensystem */}
        {!is3d && (
          <div className="pse-side">
            <div className="insp insp--side">{insp}</div>
            {mode !== 'quiz' && (
              <div className="pse-side__atom">
                <Bohr e={shown} size={190} />
                <dl className="pse-side__facts">
                  <div><dt>Atommasse</dt><dd>{fmtMass(shown)} u</dd></div>
                  <div><dt>Elektronegativität</dt><dd>{fmtNum(shown.en)}</dd></div>
                  <div><dt>Schmelzpunkt</dt><dd>{shown.subl ? 'sublimiert' : fmtC(shown.mp)}</dd></div>
                  <div><dt>Siedepunkt</dt><dd>{fmtC(shown.subl ?? shown.bp)}</dd></div>
                  <div><dt>Dichte</dt><dd>{fmtDensity(shown)}</dd></div>
                  <div><dt>Entdeckt</dt><dd>{yearLabel(shown.year)}</dd></div>
                </dl>
              </div>
            )}
          </div>
        )}
        </div>

        {is3d && (
          <div className="pse-float">
            <span className="pse-float__k">{pdef.label}</span>
            <strong>
              {shown.sym} · {pdef.fmt(shown)} <small>{pdef.unit}</small>
            </strong>
            <span>{shown.name}</span>
          </div>
        )}
      </div>

      {open !== null && <Detail z={open} onClose={closeDetail} onNav={navDetail} />}
    </div>
  )
}
