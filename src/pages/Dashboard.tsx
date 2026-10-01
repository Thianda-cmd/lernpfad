import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ALL_ORGANELLE_IDS, CELL_ORGANELLES } from '../data/organelles'
import { bestQuizPercent, computeStreak, useProgress } from '../store/progress'
import { CHAPTERS, CHAPTER_BY_ID, MASTERY_GOAL, SHEETS, daysUntil, fmtDate, mastery, nextKlausur } from '../math/meta'
import {
  IconAnimalCell,
  IconArrowRight,
  IconBiology,
  IconCards,
  IconChapters,
  IconChemistry,
  IconDivide,
  IconExam,
  IconFlask,
  IconFormula,
  IconIons,
  IconMath,
  IconPeriodic,
  IconPlantCell,
  IconQuiz,
  IconSheet,
  IconTube,
} from '../components/icons'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

type IconT = ComponentType<{ size?: number }>

interface SubjectCard {
  name: string
  to: string
  icon: IconT
  links: { t: string; to: string; icon: IconT; meta?: string }[]
}

export default function Dashboard() {
  const learned = useProgress((s) => s.learned)
  const history = useProgress((s) => s.quizHistory)
  const days = useProgress((s) => s.activeDays)
  const cards = useProgress((s) => s.cards)
  const lastVisit = useProgress((s) => s.lastVisit)
  const math = useProgress((s) => s.math)
  const sheetDone = useProgress((s) => s.sheetDone)
  const exams = useProgress((s) => s.examHistory)

  const date = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const next = nextKlausur()
  const nextDays = next ? daysUntil(next.date) : 0
  const streak = computeStreak(days)
  const learnedCount = Object.keys(learned).length
  const mastered = Object.values(cards).filter((b) => (b ?? 0) >= 3).length
  const best = bestQuizPercent(history)
  const mathCorrect = Object.values(math).reduce((s, x) => s + x.correct, 0)
  const safeChapters = CHAPTERS.filter((c) => mastery(math[c.id]) >= 1).length
  const sheetTotal = SHEETS.reduce((s, x) => s + x.count, 0)
  const sheetSolved = Object.keys(sheetDone).length
  const bestGrade = exams.length ? Math.min(...exams.map((e) => e.grade)) : null
  const inTier = CELL_ORGANELLES.tier.filter((id) => learned[id]).length
  const inPflanze = CELL_ORGANELLES.pflanze.filter((id) => learned[id]).length

  const examTopics = next?.topics ?? []
  const examSafe = examTopics.filter((id) => mastery(math[id]) >= 1).length

  const stats = [
    { k: 'Lernserie', v: String(streak), u: streak === 1 ? 'Tag' : 'Tage' },
    { k: 'Mathe richtig', v: String(mathCorrect), u: 'Aufgaben' },
    { k: 'Organellen', v: String(learnedCount), u: `/ ${ALL_ORGANELLE_IDS.length}` },
    { k: 'Beste Probeklausur', v: bestGrade === null ? '–' : String(bestGrade), u: bestGrade === null ? '' : 'Note' },
  ]

  const subjects: SubjectCard[] = [
    {
      name: 'Biologie',
      to: '/biologie/zellbiologie',
      icon: IconBiology,
      links: [
        { t: 'Tierzelle', to: '/biologie/zellbiologie/tierzelle', icon: IconAnimalCell, meta: `${inTier}/${CELL_ORGANELLES.tier.length}` },
        { t: 'Pflanzenzelle', to: '/biologie/zellbiologie/pflanzenzelle', icon: IconPlantCell, meta: `${inPflanze}/${CELL_ORGANELLES.pflanze.length}` },
        { t: 'Mitose & Meiose', to: '/biologie/zellteilung', icon: IconDivide },
        { t: 'Karteikarten', to: '/biologie/zellbiologie/karteikarten', icon: IconCards, meta: `${mastered} sicher` },
        { t: 'Quiz', to: '/biologie/zellbiologie/quiz', icon: IconQuiz, meta: best === null ? undefined : `${best} %` },
      ],
    },
    {
      name: 'Chemie',
      to: '/chemie',
      icon: IconChemistry,
      links: [
        { t: 'Periodensystem', to: '/chemie/periodensystem', icon: IconPeriodic, meta: '118' },
        { t: 'Molare Masse', to: '/chemie/molmasse', icon: IconFlask },
        { t: 'Ionen & Salze', to: '/chemie/ionen', icon: IconIons },
        { t: 'Ionennachweise', to: '/chemie/nachweise', icon: IconTube },
      ],
    },
    {
      name: 'Mathematik',
      to: '/mathematik',
      icon: IconMath,
      links: [
        { t: 'Kapitel', to: '/mathematik', icon: IconChapters, meta: `${safeChapters}/${CHAPTERS.length} sicher` },
        { t: 'Übungsblätter', to: '/mathematik/blatt/klammern', icon: IconSheet, meta: `${sheetSolved}/${sheetTotal}` },
        { t: 'Probeklausur', to: '/mathematik/probeklausur/lf1t', icon: IconExam, meta: bestGrade === null ? undefined : `Note ${bestGrade}` },
        { t: 'Formelsammlung', to: '/mathematik/formelsammlung', icon: IconFormula },
      ],
    },
  ]

  return (
    <div className="page dash">
      <header className="dash__head">
        <h1 className="title">{greeting()}</h1>
        <span className="dash__date">{date}</span>
      </header>

      <div className="dash__top">
        {next && (
          <Link to={next.mock ? `/mathematik/probeklausur/${next.mock}` : '/mathematik'} className="dexam card card--link">
            <div className="dexam__count">
              <strong>{nextDays}</strong>
              <span>{nextDays === 1 ? 'Tag' : 'Tage'}</span>
            </div>
            <div className="dexam__body">
              <span className="dexam__k">Nächste Klausur · {fmtDate(next.date, { weekday: 'short', day: 'numeric', month: 'long' })}</span>
              <strong>
                {next.title} <em>{next.sub}</em>
              </strong>
              {examTopics.length > 0 && (
                <div className="dexam__prog">
                  <div className="progress">
                    <div className="progress__bar" style={{ width: `${(examSafe / examTopics.length) * 100}%` }} />
                  </div>
                  <span>
                    {examSafe}/{examTopics.length} Kapitel sicher
                  </span>
                </div>
              )}
            </div>
            {next.mock && <span className="dexam__cta">Probeklausur</span>}
          </Link>
        )}
        <div className="dstats card">
          {stats.map((s) => (
            <div key={s.k} className="dstat">
              <span>{s.k}</span>
              <strong>
                {s.v}
                {s.u && <small>{s.u}</small>}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {lastVisit && (
        <Link to={lastVisit.path} className="dresume">
          <span>Weiter bei</span>
          <strong>{lastVisit.title}</strong>
          <IconArrowRight size={15} />
        </Link>
      )}

      <div className="dsubjects">
        {subjects.map((s) => (
          <section key={s.name} className="dsub card">
            <Link to={s.to} className="dsub__head">
              <span className="dsub__icon">
                <s.icon size={18} />
              </span>
              <strong>{s.name}</strong>
              <IconArrowRight size={15} />
            </Link>
            <div className="dsub__links">
              {s.links.map((l) => (
                <Link key={l.t} to={l.to} className="dsub__link">
                  <l.icon size={16} />
                  <span>{l.t}</span>
                  {l.meta && <em>{l.meta}</em>}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {examTopics.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2>Bis zur Klausur üben</h2>
            <Link to="/mathematik" className="link-arrow">
              Alle Kapitel <IconArrowRight size={15} />
            </Link>
          </div>
          <div className="dtopics">
            {examTopics.map((id) => {
              const st = math[id]
              const m = mastery(st)
              return (
                <Link key={id} to={`/mathematik/${id}?tab=ueben`} className={`dtopic card card--link ${m >= 1 ? 'is-done' : ''}`}>
                  <span className="dtopic__t">{CHAPTER_BY_ID[id].title}</span>
                  <div className="progress">
                    <div className="progress__bar" style={{ width: `${m * 100}%` }} />
                  </div>
                  <em>
                    {Math.min(st?.correct ?? 0, MASTERY_GOAL)}/{MASTERY_GOAL}
                  </em>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
