import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CHAPTER_BY_ID, SHEETS, SHEET_BY_ID } from '../../math/meta'
import { SHEET_TASKS } from '../../math/content/sheets'
import ProblemCard from '../../math/ui/ProblemCard'
import { useProgress } from '../../store/progress'
import { IconArrowRight, IconCheck } from '../../components/icons'
import NotFound from '../NotFound'
import '../../styles/math.css'

function Official({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button type="button" className={`official ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
      {open ? <>Lösungsblatt: {text}</> : 'Lösungsblatt zeigen'}
    </button>
  )
}

export default function Worksheet() {
  const { blatt = '' } = useParams()
  const meta = SHEET_BY_ID[blatt]
  const tasks = SHEET_TASKS[blatt]
  const done = useProgress((s) => s.sheetDone)
  const mark = useProgress((s) => s.markSheet)
  const record = useProgress((s) => s.recordMath)
  if (!meta || !tasks) return <NotFound />
  const solved = tasks.filter((t) => done[`${blatt}:${t.nr}`]).length
  const others = SHEETS.filter((s) => s.id !== blatt)
  const notes = tasks.filter((t) => t.p.sheetNote).length

  return (
    <div className="page math sheet">
      <header className="page-head">
        <div>
          <p className="eyebrow">Übungsblatt · {meta.source}</p>
          <h1>{meta.title}</h1>
          <p>
            Ergebnis eintragen, prüfen, Lösungsweg ansehen.
            {notes > 0 && ` ${notes} Abweichung${notes === 1 ? '' : 'en'} vom Lösungsblatt markiert.`}
          </p>
        </div>
        <div className="sheet__progress card">
          <strong>
            {solved}
            <span> / {tasks.length}</span>
          </strong>
          <span>gelöst</span>
          <div className="progress">
            <div className="progress__bar" style={{ width: `${(solved / tasks.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <div className="sheet__chapters">
        Passende Kapitel:{' '}
        {meta.chapters.map((c) => (
          <Link key={c} to={`/mathematik/${c}`} className="pill pill--sm">
            {CHAPTER_BY_ID[c].title}
          </Link>
        ))}
      </div>

      <div className="sheet__list">
        {tasks.map((t) => {
          const key = `${blatt}:${t.nr}`
          const isDone = !!done[key]
          return (
            <div key={t.nr} id={`a-${t.nr}`} className="sheet__task">
              <ProblemCard
                problem={t.p}
                label={`Aufgabe ${t.nr}`}
                head={
                  <>
                    {isDone && (
                      <span className="chip chip--green">
                        <IconCheck size={12} /> gelöst
                      </span>
                    )}
                    {t.p.sheetNote && <span className="chip chip--sand">Lösungsblatt weicht ab</span>}
                    <span className="pcard__spacer" />
                    {t.official && <Official text={t.official} />}
                  </>
                }
                onResult={(ok, first) => {
                  if (ok) mark(key)
                  const ch = meta.chapters[0]
                  if (first && ch) record(ch, ok)
                }}
              />
            </div>
          )
        })}
      </div>

      <section className="section">
        <div className="section__head">
          <h2>Weitere Blätter</h2>
        </div>
        <div className="rows card">
          {others.map((s) => (
            <Link key={s.id} to={`/mathematik/blatt/${s.id}`} className="row">
              <span className="row__text">
                <strong>{s.title}</strong>
                <span>{s.source}</span>
              </span>
              <IconArrowRight size={16} className="row__arrow" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
