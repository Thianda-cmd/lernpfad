import { Link } from 'react-router-dom'
import { IconBiology } from '../components/icons'

export default function NotFound() {
  return (
    <div className="page">
      <div className="empty" style={{ marginTop: 40 }}>
        <IconBiology size={34} />
        <h3>Seite nicht gefunden</h3>
        <p>Diese Adresse gibt es nicht.</p>
        <Link to="/" className="btn btn--primary" style={{ marginTop: 18 }}>
          Zur Übersicht
        </Link>
      </div>
    </div>
  )
}
