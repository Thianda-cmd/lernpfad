import type { CSSProperties } from 'react'
import { CELL_GROUPS, MEMBRAN_LABEL, ORGANELLES, type CellType, type OrganelleId } from '../data/organelles'
import { useProgress } from '../store/progress'
import { OrganelleDetailPanel } from './OrganelleDetail'
import { IconCheck } from './icons'

export function OrganellePanel({
  cell,
  selected,
  hovered,
  onSelect,
  onHover,
  onBack,
}: {
  cell: CellType
  selected: OrganelleId | null
  hovered: OrganelleId | null
  onSelect: (id: OrganelleId) => void
  onHover: (id: OrganelleId | null) => void
  onBack: () => void
}) {
  const learned = useProgress((s) => s.learned)
  if (selected) {
    return (
      <aside className="panel" aria-label="Organell-Details">
        <OrganelleDetailPanel id={selected} cell={cell} onBack={onBack} onNavigate={onSelect} />
      </aside>
    )
  }
  const groups = CELL_GROUPS[cell]
  const total = groups.reduce((n, g) => n + g.ids.length, 0)
  const done = groups.reduce((n, g) => n + g.ids.filter((i) => learned[i]).length, 0)
  return (
    <aside className="panel" aria-label="Bestandteile der Zelle">
      <div className="panel__head">
        <div className="panel__title">
          <h2>Bestandteile</h2>
          <span>
            {done} / {total} gelernt
          </span>
        </div>
        <div className="progress">
          <div className="progress__bar" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>
      <div className="panel__scroll">
        {groups.map((g) => (
          <div className="legend-group" key={g.titel}>
            <div className="legend-group__title">{g.titel}</div>
            {g.ids.map((id) => {
              const o = ORGANELLES[id]
              return (
                <button
                  key={id}
                  className={`legend-item ${o.parent ? 'is-child' : ''} ${hovered === id ? 'is-hovered' : ''}`}
                  style={{ '--c': o.farbe } as CSSProperties}
                  onClick={() => onSelect(id)}
                  onMouseEnter={() => onHover(id)}
                  onMouseLeave={() => onHover(null)}
                >
                  <span className="swatch" />
                  <span className="legend-item__name">{o.name}</span>
                  <span className="legend-item__meta">{MEMBRAN_LABEL[o.membran]}</span>
                  <span className="legend-item__check">{learned[id] && <IconCheck size={15} />}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}
