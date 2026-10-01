import { Link } from 'react-router-dom'
import { useProgress } from '../../store/progress'
import { CHAPTERS, GROUPS, KLAUSUREN, MOCKS, SHEETS, daysUntil, fmtDate, nextKlausur, relDays, CHAPTER_BY_ID, GRADE_NAMES, mastery } from '../../math/meta'
import { examCount, examPoints } from '../../math/content/exams'
import { Tex } from '../../math/tex'
import { IconArrowRight, IconCheck } from '../../components/icons'
import '../../styles/math.css'

export default function MathHome() {
  const math = useProgress((s) => s.math)
  const read = useProgress((s) => s.mathRead)
  const sheetDone = useProgress((s) => s.sheetDone)
  const exams = useProgress((s) => s.examHistory)
  const next = nextKlausur()

  return (
    <div className="page math">
      <header className="page-head">
        <div>
          <p className="eyebrow">Fächer · Mathematik</p>
          <h1>Mathematik</h1>
          <p>Kapitel, Übungsblätter und Probeklausuren aus deinen Unterlagen.</p>
        </div>
        <Link to="/mathematik/formelsammlung" className="btn">
          Formelsammlung
        </Link>
      </header>

      <section className="klausuren" aria-label="Klausurtermine">
        {KLAUSUREN.map((k) => {
          const d = daysUntil(k.date)
          const isNext = next?.id === k.id
          const past = d < 0
          return (
            <div key={k.id} className={`kl card ${isNext ? 'is-next' : ''} ${past ? 'is-past' : ''}`}>
              <div className="kl__top">
                <span className="kl__date">{fmtDate(k.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                {k.minutes && <span className="kl__min">{k.minutes} min</span>}
              </div>
              <div className="kl__count">
                <strong>{past ? '–' : d}</strong>
                <span>{past ? 'vorbei' : d === 1 ? 'Tag' : 'Tage'}</span>
              </div>
              <div className="kl__title">{k.title}</div>
              <div className="kl__sub">{k.sub}</div>
              {k.topics.length > 0 && (
                <div className="kl__topics">
                  {k.topics.map((t) => (
                    <Link key={t} to={`/mathematik/${t}`} className="kl__topic">
                      {CHAPTER_BY_ID[t]?.title}
                    </Link>
                  ))}
                </div>
              )}
              {k.derived && <p className="kl__note">Themen aus deiner Mitschrift abgeleitet.</p>}
              {!k.topics.length && <p className="kl__note">Themen folgen, sobald ihr sie bekommt.</p>}
              {k.mock && (
                <Link to={`/mathematik/probeklausur/${k.mock}`} className="link-arrow kl__cta">
                  Probeklausur <IconArrowRight size={16} />
                </Link>
              )}
            </div>
          )
        })}
      </section>

      {GROUPS.map((gr) => {
        const chs = CHAPTERS.filter((c) => c.group === gr.id)
        const done = chs.filter((c) => mastery(math[c.id]) >= 1).length
        const exam = gr.exam ? KLAUSUREN.find((k) => k.id === gr.exam) : undefined
        return (
          <section key={gr.id} className="section">
            <div className="section__head">
              <div>
                <h2>{gr.title}</h2>
                <p className="section__sub">
                  {gr.sub}
                  {exam && ` · Klausur ${relDays(daysUntil(exam.date))}`}
                </p>
              </div>
              <span className="faint">
                {done} / {chs.length} sicher
              </span>
            </div>
            <div className="grid grid--auto chgrid">
              {chs.map((c) => {
                const st = math[c.id]
                const m = mastery(st)
                return (
                  <Link key={c.id} to={`/mathematik/${c.id}`} className="ch card card--link">
                    <div className="ch__sig" aria-hidden="true">
                      <Tex>{c.sig}</Tex>
                    </div>
                    <div className="ch__body">
                      <h3>{c.title}</h3>
                      <p>{c.short}</p>
                    </div>
                    <div className="ch__foot">
                      <div className="progress">
                        <div className="progress__bar" style={{ width: `${m * 100}%` }} />
                      </div>
                      <span className="ch__meta">
                        {read[c.id] && (
                          <span className="ch__read" title="als verstanden markiert">
                            <IconCheck size={13} />
                          </span>
                        )}
                        {st ? `${st.correct} richtig` : 'neu'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}

      <section className="section" id="blaetter">
        <div className="section__head">
          <h2>Deine Übungsblätter</h2>
          <span className="faint">interaktiv, mit Lösungsweg</span>
        </div>
        <div className="rows card">
          {SHEETS.map((s) => {
            const solved = Object.keys(sheetDone).filter((k) => k.startsWith(s.id + ':')).length
            return (
              <Link key={s.id} to={`/mathematik/blatt/${s.id}`} className="row">
                <span className="row__icon row__icon--num">{Math.round((solved / s.count) * 100)}%</span>
                <span className="row__text">
                  <strong>{s.title}</strong>
                  <span>
                    {s.source} · {solved} von {s.count} gelöst
                  </span>
                </span>
                <IconArrowRight size={16} className="row__arrow" />
              </Link>
            )
          })}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Probeklausuren</h2>
          <span className="faint">jedes Mal neue Aufgaben</span>
        </div>
        <div className="grid grid--3 mockgrid">
          {MOCKS.map((m) => {
            const hist = exams.filter((e) => e.id === m.id)
            const last = hist[hist.length - 1]
            const best = hist.length ? Math.min(...hist.map((h) => h.grade)) : null
            return (
              <Link key={m.id} to={`/mathematik/probeklausur/${m.id}`} className="mock card card--link">
                <div className="mock__top">
                  <span className="chip">{m.minutes} min</span>
                  <span className="chip">
                    {examCount(m.id)} Aufgaben · {examPoints(m.id)} P.
                  </span>
                </div>
                <h3>{m.title}</h3>
                <p>{m.sub}</p>
                <div className="mock__foot">
                  {last ? (
                    <span>
                      Zuletzt: Note {last.grade} ({GRADE_NAMES[last.grade]}) · beste {best}
                    </span>
                  ) : (
                    <span>Noch nicht geschrieben</span>
                  )}
                  <IconArrowRight size={16} />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
