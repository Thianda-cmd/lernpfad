import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { Tex } from '../math/tex'
import { IconArrowRight } from './icons'
import '../styles/calc.css'

export interface ToolCard {
  path: string
  title: string
  short: string
  sig?: string
  icon: ComponentType<{ size?: number }>
}

/** Kacheln für Rechner und Werkzeuge (Fachseiten, Mathe-Übersicht) */
export default function ToolGrid({ items }: { items: ToolCard[] }) {
  return (
    <div className="calcgrid">
      {items.map((t) => (
        <Link key={t.path} to={t.path} className="calctile card card--link">
          <span className="calctile__top">
            <span className="calctile__icon">
              <t.icon size={18} />
            </span>
            {t.sig && (
              <span className="calctile__sig" aria-hidden="true">
                <Tex>{t.sig}</Tex>
              </span>
            )}
          </span>
          <h3>{t.title}</h3>
          <p>{t.short}</p>
          <span className="link-arrow calctile__cta">
            Öffnen <IconArrowRight size={15} />
          </span>
        </Link>
      ))}
    </div>
  )
}
