import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GRADE_NAMES, MOCK_BY_ID, KLAUSUREN, CHAPTER_BY_ID, daysUntil, fmtDate, grade, relDays } from '../../math/meta'
import { buildExam, examPoints, type ExamTask } from '../../math/content/exams'
import { check, answerText, type UserInput } from '../../math/check'
import AnswerFields, { emptyInput } from '../../math/ui/AnswerFields'
import Figure from '../../math/ui/Figure'
import Steps from '../../math/ui/Steps'
import { Rich, Tex } from '../../math/tex'
import { useProgress } from '../../store/progress'
import { IconCheck, IconRestart } from '../../components/icons'
import NotFound from '../NotFound'
import '../../styles/math.css'

type Phase = 'start' | 'run' | 'done'

const SCALE = [
  { g: 1, r: '92 – 100 %' },
  { g: 2, r: '81 – 91 %' },
  { g: 3, r: '67 – 80 %' },
  { g: 4, r: '50 – 66 %' },
  { g: 5, r: '30 – 49 %' },
  { g: 6, r: '0 – 29 %' },
]

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`

function Result({ tasks, inputs, minutes, onAgain }: { tasks: ExamTask[]; inputs: UserInput[]; minutes: number; onAgain: () => void }) {
  const results = useMemo(() => tasks.map((t, i) => check(t.p.answer, inputs[i])), [tasks, inputs])
  const got = tasks.reduce((s, t, i) => s + (results[i].ok ? t.points : 0), 0)
  const max = tasks.reduce((s, t) => s + t.points, 0)
  const pct = (got / max) * 100
  const note = grade(pct)
  const [open, setOpen] = useState<number | null>(null)
  const weak = [...new Set(tasks.filter((_, i) => !results[i].ok).map((t) => t.chapter))]
  return (
    <div className="exres">
      <section className="exres__head card">
        <div className="exres__grade">
          <span>Note</span>
          <strong>{note}</strong>
          <em>{GRADE_NAMES[note]}</em>
        </div>
        <div className="exres__nums">
          <div>
            <strong>
              {got}
              <span> / {max}</span>
            </strong>
            <span>Punkte</span>
          </div>
          <div>
            <strong>
              {Math.round(pct)}
              <span> %</span>
            </strong>
            <span>erreicht</span>
          </div>
          <div>
            <strong>
              {minutes}
              <span> min</span>
            </strong>
            <span>gebraucht</span>
          </div>
        </div>
        <div className="exres__actions">
          <button type="button" className="btn btn--primary" onClick={onAgain}>
            <IconRestart size={16} /> Neue Probeklausur
          </button>
          <Link to="/mathematik" className="btn">
            Zur Übersicht
          </Link>
        </div>
      </section>
      {weak.length > 0 && (
        <p className="exres__weak">
          Noch einmal ansehen:{' '}
          {weak.map((c) => (
            <Link key={c} to={`/mathematik/${c}`} className="pill pill--sm">
              {CHAPTER_BY_ID[c].title}
            </Link>
          ))}
        </p>
      )}
      <ol className="exres__list">
        {tasks.map((t, i) => {
          const r = results[i]
          return (
            <li key={i} className={`exres__item card ${r.ok ? 'is-ok' : 'is-bad'}`}>
              <button type="button" className="exres__row" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className="exres__n">{i + 1}</span>
                <span className="exres__topic">
                  <strong>{t.topic}</strong>
                  <span>{CHAPTER_BY_ID[t.chapter]?.title}</span>
                </span>
                <span className="exres__pts">
                  {r.ok ? t.points : 0} / {t.points} P.
                </span>
                <span className={`exres__mark ${r.ok ? 'is-ok' : ''}`}>{r.ok ? <IconCheck size={14} /> : '–'}</span>
              </button>
              {open === i && (
                <div className="exres__detail">
                  <div className="pcard__prompt">
                    <Rich text={t.p.prompt} />
                  </div>
                  {t.p.tex && <Tex block>{t.p.tex}</Tex>}
                  <div className="exres__cmp">
                    <div>
                      <span>Deine Antwort</span>
                      <strong>{inputs[i].none ? 'keine Lösung' : inputs[i].choice !== undefined && t.p.answer.kind === 'choice' ? t.p.answer.options[inputs[i].choice!] : inputs[i].rel ? `${inputs[i].rel} ${inputs[i].text[0]}` : inputs[i].text.filter(Boolean).join(' ; ') || '–'}</strong>
                    </div>
                    <div>
                      <span>Richtig</span>
                      <strong>{answerText(t.p.answer)}</strong>
                    </div>
                  </div>
                  {r.msg && <p className="exres__msg">{r.msg}</p>}
                  <Steps steps={t.p.steps} />
                </div>
              )}
            </li>
          )
        })}
      </ol>
      <p className="faint exres__foot">Gewertet wird nur das Endergebnis – in der echten Klausur zählt auch der Rechenweg.</p>
    </div>
  )
}

export default function MockExam() {
  const { exam = '' } = useParams()
  const meta = MOCK_BY_ID[exam]
  const [phase, setPhase] = useState<Phase>('start')
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [minutes, setMinutes] = useState(meta?.minutes ?? 60)
  const tasks = useMemo(() => (meta ? buildExam(meta.id, seed) : []), [meta, seed])
  const [inputs, setInputs] = useState<UserInput[]>([])
  const [left, setLeft] = useState(0)
  const startedAt = useRef(0)
  const [used, setUsed] = useState(0)
  const history = useProgress((s) => s.examHistory)
  const addExam = useProgress((s) => s.addExam)

  const submit = useCallback(() => {
    const mins = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))
    setUsed(mins)
    const got = tasks.reduce((s, t, i) => s + (check(t.p.answer, inputs[i] ?? emptyInput(t.p.answer)).ok ? t.points : 0), 0)
    const max = tasks.reduce((s, t) => s + t.points, 0)
    addExam({ id: exam, points: got, max, grade: grade((got / max) * 100), minutes: mins })
    setPhase('done')
    window.scrollTo({ top: 0 })
  }, [tasks, inputs, addExam, exam])

  useEffect(() => {
    if (phase !== 'run') return
    const id = window.setInterval(() => {
      const rest = minutes * 60 - Math.floor((Date.now() - startedAt.current) / 1000)
      setLeft(rest)
    }, 500)
    return () => window.clearInterval(id)
  }, [phase, minutes])

  useEffect(() => {
    if (phase === 'run' && left <= 0 && startedAt.current) submit()
  }, [left, phase, submit])

  useEffect(() => {
    if (phase !== 'run') return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [phase])

  if (!meta) return <NotFound />

  const start = () => {
    setInputs(tasks.map((t) => emptyInput(t.p.answer)))
    startedAt.current = Date.now()
    setLeft(minutes * 60)
    setPhase('run')
    window.scrollTo({ top: 0 })
  }
  const again = () => {
    setSeed((s) => s + 7919)
    setPhase('start')
    window.scrollTo({ top: 0 })
  }

  const klausur = KLAUSUREN.find((k) => k.id === meta.klausur)
  const answered = inputs.filter((u) => u.none || u.choice !== undefined || u.text.some((x) => x.trim())).length
  const hist = history.filter((h) => h.id === exam).slice(-5).reverse()
  const total = examPoints(exam)

  return (
    <div className="page math mock-page">
      {phase === 'start' && (
        <>
          <header className="page-head">
            <div>
              <p className="eyebrow">
                Probeklausur{klausur ? ` · ${klausur.title} am ${fmtDate(klausur.date, { day: 'numeric', month: 'long' })} (${relDays(daysUntil(klausur.date))})` : ''}
              </p>
              <h1>{meta.title}</h1>
              <p>{meta.sub} · jedes Mal neue Aufgaben</p>
            </div>
          </header>
          <div className="exstart">
            <section className="card card--pad exstart__main">
              <h2>
                {tasks.length} Aufgaben · {total} Punkte
              </h2>
              <ul className="exstart__list">
                <li>Nur Endergebnisse eintragen – geprüft wird beim Abgeben.</li>
                <li>Läuft die Zeit ab, wird automatisch abgegeben.</li>
              </ul>
              <div className="exstart__time">
                <span>Bearbeitungszeit</span>
                <div className="seg">
                  {[30, 45, 60, 90].map((m) => (
                    <button key={m} type="button" className={`seg__btn ${minutes === m ? 'is-active' : ''}`} onClick={() => setMinutes(m)}>
                      {m} min
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className="btn btn--primary btn--lg" onClick={start}>
                Probeklausur starten
              </button>
            </section>
            <aside className="exstart__side">
              <section className="card card--pad">
                <h3>Notenschlüssel (IHK)</h3>
                <table className="scale-table">
                  <tbody>
                    {SCALE.map((s) => (
                      <tr key={s.g}>
                        <td>{s.g}</td>
                        <td>{GRADE_NAMES[s.g]}</td>
                        <td>{s.r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              {hist.length > 0 && (
                <section className="card card--pad">
                  <h3>Deine letzten Versuche</h3>
                  <ul className="exhist">
                    {hist.map((h) => (
                      <li key={h.date}>
                        <span>{new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(h.date))}</span>
                        <span>
                          {h.points}/{h.max} P.
                        </span>
                        <strong>Note {h.grade}</strong>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </>
      )}

      {phase === 'run' && (
        <>
          <div className="exbar">
            <div className="exbar__title">{meta.title}</div>
            <div className={`exbar__time ${left < 300 ? 'is-low' : ''}`} aria-live="off">
              {mmss(Math.max(0, left))}
            </div>
            <div className="exbar__count">
              {answered} / {tasks.length} bearbeitet
            </div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                if (answered < tasks.length && !window.confirm(`Noch ${tasks.length - answered} Aufgaben ohne Antwort. Trotzdem abgeben?`)) return
                submit()
              }}
            >
              Abgeben
            </button>
          </div>
          <ol className="exlist">
            {tasks.map((t, i) => (
              <li key={i} className="pcard extask">
                <div className="pcard__head">
                  <span className="pcard__label">Aufgabe {i + 1}</span>
                  <span className="pcard__spacer" />
                  <span className="chip">{t.points} P.</span>
                </div>
                <div className="pcard__prompt">
                  <Rich text={t.p.prompt} />
                </div>
                {t.p.tex && (
                  <div className="pcard__tex">
                    <Tex block>{t.p.tex}</Tex>
                  </div>
                )}
                {t.p.figure && <Figure fig={t.p.figure} />}
                <div className="pcard__answer">
                  <AnswerFields
                    answer={t.p.answer}
                    input={inputs[i] ?? emptyInput(t.p.answer)}
                    setInput={(u) => setInputs((arr) => arr.map((x, k) => (k === i ? u : x)))}
                  />
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {phase === 'done' && (
        <>
          <header className="page-head">
            <div>
              <p className="eyebrow">Auswertung</p>
              <h1>{meta.title}</h1>
            </div>
          </header>
          <Result tasks={tasks} inputs={inputs} minutes={used} onAgain={again} />
        </>
      )}
    </div>
  )
}
