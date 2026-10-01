import { Link } from 'react-router-dom'
import { SUBJECT_BY_ID, type SubjectId } from '../data/subjects'
import { IconArrowRight, IconBiology, IconChemistry, IconMath } from '../components/icons'

const ICONS = { biologie: IconBiology, chemie: IconChemistry, mathematik: IconMath }

export default function SubjectPage({ id }: { id: SubjectId }) {
  const s = SUBJECT_BY_ID[id]
  const Icon = ICONS[id]
  const ready = s.module.filter((m) => m.status === 'verfuegbar' && m.pfad)
  const planned = s.module.filter((m) => m.status !== 'verfuegbar')
  return (
    <div className="page">
      <header className="page-head subject-head">
        <div className="subject-head__main">
          <span className="subject-head__icon">
            <Icon size={22} />
          </span>
          <div>
            <h1>{s.name}</h1>
            <p>{s.beschreibung}</p>
          </div>
        </div>
      </header>

      <div className="grid grid--3">
        {ready.map((m) => (
          <Link key={m.id} to={m.pfad!} className="module card card--link">
            <h3>{m.titel}</h3>
            <p>{m.beschreibung}</p>
            <span className="link-arrow module__cta">
              Öffnen <IconArrowRight size={15} />
            </span>
          </Link>
        ))}
      </div>

      {planned.length > 0 && (
        <p className="planned">
          <span>Geplant</span>
          {planned.map((m) => m.titel).join(' · ')}
        </p>
      )}
    </div>
  )
}
