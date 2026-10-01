import { Link } from 'react-router-dom'
import { CHAPTERS, GROUPS } from '../../math/meta'
import { CONTENT } from '../../math/content'
import { Tex } from '../../math/tex'
import '../../styles/math.css'

export default function Formelsammlung() {
  return (
    <div className="page math fs">
      <header className="page-head">
        <div>
          <p className="eyebrow">Mathematik</p>
          <h1>Formelsammlung</h1>
        </div>
        <button type="button" className="btn" onClick={() => window.print()}>
          Drucken
        </button>
      </header>
      {GROUPS.map((g) => (
        <section key={g.id} className="fs__group">
          <h2 className="fs__gtitle">{g.title}</h2>
          <div className="fs__grid">
            {CHAPTERS.filter((c) => c.group === g.id).map((c) => (
              <article key={c.id} className="fs__card card">
                <Link to={`/mathematik/${c.id}`} className="fs__title">
                  {c.title}
                </Link>
                <dl className="fs__list">
                  {CONTENT[c.id].formulas.map((f, i) => (
                    <div key={i} className="fs__item">
                      <dt>
                        <Tex d>{f.tex}</Tex>
                      </dt>
                      {f.t && <dd>{f.t}</dd>}
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
