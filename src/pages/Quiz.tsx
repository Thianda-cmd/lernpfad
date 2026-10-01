import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { IconAnimalCell, IconArrowRight, IconCheck, IconClose, IconDiagram, IconPlantCell, IconQuiz, IconRestart } from '../components/icons'
import { QUIZ, type QuizQuestion } from '../data/quiz'
import { CELL_ORGANELLES, ORGANELLES, parentOf, type CellType, type OrganelleId } from '../data/organelles'
import { bestQuizPercent, useProgress } from '../store/progress'
import AnimalCell2D from '../cell2d/AnimalCell2D'
import PlantCell2D from '../cell2d/PlantCell2D'
import type { Marker } from '../cell2d/shapes'

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ------------------------------------------------------------------ */
/*  Wissensquiz                                                        */
/* ------------------------------------------------------------------ */

interface Prepared {
  q: QuizQuestion
  order: number[]
}

function prepare(n: number): Prepared[] {
  return shuffle(QUIZ)
    .slice(0, n)
    .map((q) => ({ q, order: shuffle(q.optionen.map((_, i) => i)) }))
}

function Wissensquiz() {
  const [len, setLen] = useState(10)
  const [items, setItems] = useState<Prepared[]>(() => prepare(10))
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const addQuiz = useProgress((s) => s.addQuiz)
  const history = useProgress((s) => s.quizHistory)
  const best = bestQuizPercent(history)

  const restart = (n = len) => {
    setLen(n)
    setItems(prepare(n))
    setIdx(0)
    setAnswers([])
  }

  const cur = items[idx]
  const chosen = answers[idx] ?? null
  const finished = idx >= items.length
  const correct = answers.filter((a, i) => a !== null && items[i] && a === items[i].q.richtig).length

  useEffect(() => {
    if (finished && items.length) addQuiz({ correct, total: items.length, mode: 'wissen' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  if (finished) {
    const pct = Math.round((correct / items.length) * 100)
    const wrong = items.map((it, i) => ({ it, a: answers[i] })).filter((x) => x.a !== x.it.q.richtig)
    return (
      <div className="quiz-result card card--pad">
        <div className="quiz-result__ring" style={{ '--p': pct } as CSSProperties}>
          <span>{pct} %</span>
        </div>
        <h2>{pct >= 90 ? 'Hervorragend!' : pct >= 70 ? 'Gut gemacht!' : pct >= 50 ? 'Solide Basis!' : 'Dranbleiben!'}</h2>
        <p className="muted">
          {correct} von {items.length} Fragen richtig{best !== null ? ` · Bestwert: ${Math.max(best, pct)} %` : ''}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <button className="btn btn--primary" onClick={() => restart()}>
            <IconRestart size={16} /> Neue Runde
          </button>
          <Link to="/biologie/zellbiologie/karteikarten" className="btn">
            Karteikarten <IconArrowRight size={16} />
          </Link>
        </div>
        {wrong.length > 0 && (
          <div className="quiz-review">
            <h3>Nochmal anschauen</h3>
            {wrong.map(({ it }) => (
              <div key={it.q.id} className="quiz-review__item">
                <strong>{it.q.frage}</strong>
                <div className="quiz-review__answer">
                  <IconCheck size={15} /> {it.q.optionen[it.q.richtig]}
                </div>
                <p>{it.q.erklaerung}</p>
                {it.q.organell && (
                  <Link to={`/biologie/zellbiologie/lexikon?o=${it.q.organell}`} className="quiz-link">
                    {ORGANELLES[it.q.organell].name} im Lexikon
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="quiz card">
      <div className="quiz__top">
        <div className="seg">
          {[10, 20, QUIZ.length].map((n) => (
            <button key={n} className={`seg__btn ${len === n ? 'is-active' : ''}`} onClick={() => restart(n)}>
              {n === QUIZ.length ? `Alle (${n})` : `${n} Fragen`}
            </button>
          ))}
        </div>
        <span className="faint" style={{ fontSize: 13.5 }}>
          Frage {idx + 1} / {items.length} · {correct} richtig
        </span>
      </div>
      <div className="progress" style={{ margin: '0 24px' }}>
        <div className="progress__bar" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>
      <div className="quiz__body">
        <div className="quiz__meta">
          {cur.q.organell && (
            <span className="chip" style={{ '--c': ORGANELLES[cur.q.organell].farbe } as CSSProperties}>
              <span className="chip__dot" style={{ color: ORGANELLES[cur.q.organell].farbe }} />
              {ORGANELLES[cur.q.organell].name}
            </span>
          )}
          <span className="chip">Schwierigkeit {cur.q.schwierigkeit} / 3</span>
        </div>
        <h2 className="quiz__q">{cur.q.frage}</h2>
        <div className="quiz__options">
          {cur.order.map((oi, k) => {
            const isRight = oi === cur.q.richtig
            const isChosen = chosen === oi
            const state = chosen === null ? '' : isRight ? 'is-right' : isChosen ? 'is-wrong' : 'is-muted'
            return (
              <button
                key={oi}
                className={`quiz__opt ${state}`}
                disabled={chosen !== null}
                onClick={() => setAnswers((a) => {
                  const n = [...a]
                  n[idx] = oi
                  return n
                })}
              >
                <span className="quiz__letter">{String.fromCharCode(65 + k)}</span>
                <span>{cur.q.optionen[oi]}</span>
                {chosen !== null && isRight && <IconCheck size={19} className="quiz__icon" />}
                {chosen !== null && isChosen && !isRight && <IconClose size={19} className="quiz__icon" />}
              </button>
            )
          })}
        </div>
        {chosen !== null && (
          <div className={`quiz__explain ${chosen === cur.q.richtig ? 'is-right' : 'is-wrong'}`}>
            <strong>{chosen === cur.q.richtig ? 'Richtig!' : 'Leider falsch.'}</strong> {cur.q.erklaerung}
          </div>
        )}
      </div>
      <div className="quiz__foot">
        <button className="btn btn--primary" disabled={chosen === null} onClick={() => setIdx((i) => i + 1)}>
          {idx + 1 === items.length ? 'Auswertung' : 'Weiter'} <IconArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Beschriftungs-Training                                             */
/* ------------------------------------------------------------------ */

const ROUNDS = 10

function Beschriftung() {
  const [cell, setCell] = useState<CellType>('tier')
  const [targets, setTargets] = useState<OrganelleId[]>(() => shuffle(CELL_ORGANELLES.tier).slice(0, ROUNDS))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<{ picked: OrganelleId; ok: boolean } | null>(null)
  const [hovered, setHovered] = useState<OrganelleId | null>(null)
  const labelBest = useProgress((s) => s.labelBest)
  const setLabelBest = useProgress((s) => s.setLabelBest)
  const addQuiz = useProgress((s) => s.addQuiz)

  const restart = (c = cell) => {
    setCell(c)
    setTargets(shuffle(CELL_ORGANELLES[c]).slice(0, ROUNDS))
    setIdx(0)
    setScore(0)
    setFeedback(null)
  }

  const target = targets[idx]
  const finished = idx >= targets.length

  useEffect(() => {
    if (finished) {
      const pct = Math.round((score / targets.length) * 100)
      setLabelBest(cell, pct)
      addQuiz({ correct: score, total: targets.length, mode: cell === 'tier' ? 'beschriftung-tier' : 'beschriftung-pflanze' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  const pick = (id: OrganelleId) => {
    if (feedback || finished) return
    const ok = id === target || (parentOf(id) === target && target === 'zellkern')
    setFeedback({ picked: id, ok })
    if (ok) setScore((s) => s + 1)
  }

  const next = () => {
    setFeedback(null)
    setIdx((i) => i + 1)
  }

  const markers: Partial<Record<OrganelleId, Marker>> = {}
  if (feedback) {
    if (feedback.ok) markers[feedback.picked] = 'correct'
    else {
      markers[feedback.picked] = 'wrong'
      markers[target] = 'target'
    }
  }

  const Diagram = cell === 'tier' ? AnimalCell2D : PlantCell2D

  return (
    <div className="label-quiz">
      <div className="label-quiz__side card card--pad">
        <div className="seg" style={{ width: '100%' }}>
          <button className={`seg__btn ${cell === 'tier' ? 'is-active' : ''}`} style={{ flex: 1 }} onClick={() => restart('tier')}>
            <IconAnimalCell size={15} /> Tierzelle
          </button>
          <button className={`seg__btn ${cell === 'pflanze' ? 'is-active' : ''}`} style={{ flex: 1 }} onClick={() => restart('pflanze')}>
            <IconPlantCell size={15} /> Pflanzenzelle
          </button>
        </div>
        {finished ? (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            
            <h2 style={{ marginTop: 12 }}>
              {score} / {targets.length} richtig
            </h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Bestwert {cell === 'tier' ? 'Tierzelle' : 'Pflanzenzelle'}: {Math.max(labelBest[cell], Math.round((score / targets.length) * 100))} %
            </p>
            <button className="btn btn--primary" style={{ marginTop: 18 }} onClick={() => restart()}>
              <IconRestart size={16} /> Nochmal
            </button>
          </div>
        ) : (
          <>
            <div className="label-quiz__count">
              Aufgabe {idx + 1} / {targets.length} · {score} richtig
            </div>
            <div className="progress" style={{ marginTop: 8 }}>
              <div className="progress__bar" style={{ width: `${(idx / targets.length) * 100}%` }} />
            </div>
            <div className="label-quiz__prompt">
              <span className="faint">Klicke im Schaubild auf:</span>
              <strong>{ORGANELLES[target].name}</strong>
            </div>
            {feedback && (
              <div className={`quiz__explain ${feedback.ok ? 'is-right' : 'is-wrong'}`}>
                {feedback.ok ? (
                  <>
                    <strong>Richtig!</strong> {ORGANELLES[target].kurz}
                  </>
                ) : (
                  <>
                    <strong>Nicht ganz.</strong> Du hast {ORGANELLES[feedback.picked].name} angeklickt. {ORGANELLES[target].name} ist jetzt markiert.
                  </>
                )}
              </div>
            )}
            {feedback && (
              <button className="btn btn--primary" style={{ marginTop: 14, width: '100%' }} onClick={next}>
                {idx + 1 === targets.length ? 'Auswertung' : 'Nächste Aufgabe'} <IconArrowRight size={16} />
              </button>
            )}
            <p className="faint" style={{ fontSize: 12.5, marginTop: 16 }}>
              Tipp: Einige Strukturen sind klein – Ribosomen sind die dunklen Punkte, Kernporen die hellen Lücken in der Kernhülle.
            </p>
          </>
        )}
      </div>
      <div className="label-quiz__stage card">
        <Diagram
          key={cell}
          compact
          hovered={feedback ? null : hovered}
          onHover={setHovered}
          onSelect={pick}
          markers={markers}
          showLabels={false}
          className={feedback && !feedback.ok ? 'has-targets' : ''}
        />
      </div>
    </div>
  )
}

export default function Quiz() {
  const [tab, setTab] = useState<'wissen' | 'beschriftung'>('wissen')
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Quiz</h1>
          <p>Wissensfragen mit Erklärung und Beschriftungs-Training.</p>
        </div>
        <div className="seg">
          <button className={`seg__btn ${tab === 'wissen' ? 'is-active' : ''}`} onClick={() => setTab('wissen')}>
            <IconQuiz size={16} /> Wissensquiz
          </button>
          <button className={`seg__btn ${tab === 'beschriftung' ? 'is-active' : ''}`} onClick={() => setTab('beschriftung')}>
            <IconDiagram size={16} /> Beschriftungs-Training
          </button>
        </div>
      </header>
      {tab === 'wissen' ? <Wissensquiz /> : <Beschriftung />}
    </div>
  )
}
