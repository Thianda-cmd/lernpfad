import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CHAPTERS, CHAPTER_BY_ID, GROUPS, KLAUSUREN, SHEETS, MASTERY_GOAL, daysUntil, fmtDate, relDays } from '../../math/meta'
import { CONTENT } from '../../math/content'
import Blocks from '../../math/ui/Blocks'
import Practice from '../../math/ui/Practice'
import { Rich, Tex } from '../../math/tex'
import { useProgress } from '../../store/progress'
import { IconArrowLeft, IconArrowRight, IconCheck } from '../../components/icons'
import NotFound from '../NotFound'
import '../../styles/math.css'

type Tab = 'verstehen' | 'ueben'

function Toc({ ids }: { ids: { id: string; title: string }[] }) {
  const [active, setActive] = useState(ids[0]?.id)
  useEffect(() => {
    const els = ids.map((s) => document.getElementById(`sec-${s.id}`)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id.slice(4))
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])
  return (
    <nav className="toc" aria-label="Inhalt">
      <div className="toc__title">Inhalt</div>
      {ids.map((s, i) => (
        <a
          key={s.id}
          href={`#sec-${s.id}`}
          className={`toc__link ${active === s.id ? 'is-active' : ''}`}
          onClick={(e) => {
            e.preventDefault()
            document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          <span className="toc__n">{i + 1}</span>
          {s.title}
        </a>
      ))}
    </nav>
  )
}

export default function MathChapter() {
  const { kapitel = '' } = useParams()
  const meta = CHAPTER_BY_ID[kapitel]
  const content = CONTENT[kapitel]
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'ueben' ? 'ueben' : 'verstehen'
  const read = useProgress((s) => !!s.mathRead[kapitel])
  const setRead = useProgress((s) => s.setMathRead)
  const stat = useProgress((s) => s.math[kapitel])
  const setLastVisit = useProgress((s) => s.setLastVisit)

  useEffect(() => {
    if (meta) setLastVisit({ path: `/mathematik/${meta.id}`, title: meta.title })
  }, [meta, setLastVisit])

  if (!meta || !content) return <NotFound />

  const group = GROUPS.find((g) => g.id === meta.group)!
  const exam = KLAUSUREN.find((k) => k.topics.includes(meta.id) && daysUntil(k.date) >= 0)
  const idx = CHAPTERS.findIndex((c) => c.id === meta.id)
  const prev = CHAPTERS[idx - 1]
  const next = CHAPTERS[idx + 1]
  const sheets = SHEETS.filter((s) => s.chapters.includes(meta.id))
  const setTab = (t: Tab) => {
    setParams(t === 'ueben' ? { tab: 'ueben' } : {}, { replace: true })
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="page math mchap">
      <header className="mchap__head">
        <p className="eyebrow">
          {group.title}
          {exam && (
            <>
              {' '}
              · {exam.title} {relDays(daysUntil(exam.date))} ({fmtDate(exam.date, { day: 'numeric', month: 'long' })})
            </>
          )}
        </p>
        <h1 className="title">{meta.title}</h1>
        <p className="mchap__intro">
          <Rich text={content.intro} />
        </p>
        <div className="mchap__bar">
          <div className="seg" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'verstehen'} className={`seg__btn ${tab === 'verstehen' ? 'is-active' : ''}`} onClick={() => setTab('verstehen')}>
              Verstehen
            </button>
            <button type="button" role="tab" aria-selected={tab === 'ueben'} className={`seg__btn ${tab === 'ueben' ? 'is-active' : ''}`} onClick={() => setTab('ueben')}>
              Üben
            </button>
          </div>
          <div className="mchap__stat">
            <div className="progress" style={{ width: 120 }}>
              <div className="progress__bar" style={{ width: `${Math.min(1, (stat?.correct ?? 0) / MASTERY_GOAL) * 100}%` }} />
            </div>
            <span>{stat ? `${Math.min(stat.correct, MASTERY_GOAL)} / ${MASTERY_GOAL} richtig` : `Ziel: ${MASTERY_GOAL} richtige Aufgaben`}</span>
          </div>
        </div>
      </header>

      {tab === 'verstehen' ? (
        <div className="mchap__layout">
          <aside className="mchap__aside">
            <Toc ids={content.sections} />
            {sheets.length > 0 && (
              <div className="toc toc--sheets">
                <div className="toc__title">Deine Blätter</div>
                {sheets.map((s) => (
                  <Link key={s.id} to={`/mathematik/blatt/${s.id}`} className="toc__link">
                    {s.title}
                  </Link>
                ))}
              </div>
            )}
          </aside>
          <article className="lesson">
            <section className="glance card">
              <div className="glance__title">Auf einen Blick</div>
              <div className="glance__grid">
                {content.formulas.map((f, i) => (
                  <div key={i} className="glance__item">
                    <Tex d>{f.tex}</Tex>
                    {f.t && <span className="glance__t">{f.t}</span>}
                  </div>
                ))}
              </div>
            </section>
            {content.sections.map((s, i) => (
              <section key={s.id} id={`sec-${s.id}`} className="lesson__sec">
                <h2 className="lesson__h">
                  <span className="lesson__n">{i + 1}</span>
                  {s.title}
                </h2>
                <Blocks blocks={s.blocks} />
              </section>
            ))}
            <footer className="lesson__end card">
              <div>
                <strong>Üben</strong>
                <p>{MASTERY_GOAL} richtige Aufgaben – dann gilt das Kapitel als sicher.</p>
              </div>
              <div className="lesson__end-actions">
                <button type="button" className={`btn ${read ? 'btn--ghost' : ''}`} onClick={() => setRead(meta.id, !read)}>
                  {read ? (
                    <>
                      <IconCheck size={16} /> Verstanden
                    </>
                  ) : (
                    'Als verstanden markieren'
                  )}
                </button>
                <button type="button" className="btn btn--primary" onClick={() => setTab('ueben')}>
                  Jetzt üben <IconArrowRight size={16} />
                </button>
              </div>
            </footer>
            <nav className="lesson__nav">
              {prev ? (
                <Link to={`/mathematik/${prev.id}`} className="lesson__navlink">
                  <IconArrowLeft size={16} />
                  <span>
                    <small>Vorheriges Kapitel</small>
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link to={`/mathematik/${next.id}`} className="lesson__navlink lesson__navlink--next">
                  <span>
                    <small>Nächstes Kapitel</small>
                    {next.title}
                  </span>
                  <IconArrowRight size={16} />
                </Link>
              )}
            </nav>
          </article>
        </div>
      ) : (
        <div className="mchap__practice">
          <Practice key={meta.id} chapterId={meta.id} gens={content.gens} />
          <p className="practice__help">
            Eingabe: <code>3,5</code> · <code>53/120</code> · <code>x^2</code> · <code>√(…)</code> · <code>A_R</code> · <code>1,8·10^21</code>
          </p>
        </div>
      )}
    </div>
  )
}
