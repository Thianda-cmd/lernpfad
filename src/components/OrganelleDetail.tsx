import type { CSSProperties } from 'react'
import { MEMBRAN_LABEL, ORGANELLES, childrenOf, type CellType, type OrganelleId } from '../data/organelles'
import { useProgress } from '../store/progress'
import { IconArrowLeft, IconCheck, IconChevronLeft, IconChevronRight } from './icons'

export function OrganelleBadges({ id }: { id: OrganelleId }) {
  const o = ORGANELLES[id]
  return (
    <div className="odetail__badges">
      <span className="chip" title={o.membranHinweis}>
        {MEMBRAN_LABEL[o.membran]}
      </span>
      <span className={`chip ${o.vorkommen.tier ? 'chip--green' : 'is-absent'}`}>
        {o.vorkommen.tier && <IconCheck size={13} />}Tierzelle
      </span>
      <span className={`chip ${o.vorkommen.pflanze ? 'chip--green' : 'is-absent'}`}>
        {o.vorkommen.pflanze && <IconCheck size={13} />}Pflanzenzelle
      </span>
    </div>
  )
}

export function OrganelleBody({ id, onNavigate }: { id: OrganelleId; onNavigate?: (id: OrganelleId) => void }) {
  const o = ORGANELLES[id]
  const kids = childrenOf(id)
  const related: OrganelleId[] = [...(o.parent ? [o.parent] : []), ...kids]
  return (
    <div className="odetail" style={{ '--c': o.farbe } as CSSProperties}>
      <div className="odetail__top">
        <span className="odetail__swatch" />
        <div>
          <h2>{o.name}</h2>
          <div className="odetail__fach">{o.fachbegriff}</div>
        </div>
      </div>
      <OrganelleBadges id={id} />
      <blockquote className="odetail__analogy">{o.analogie}</blockquote>
      <p className="odetail__lead">{o.kurz}</p>

      {related.length > 0 && onNavigate && (
        <div className="odetail__section">
          <h3>{o.parent ? 'Gehört zu' : 'Bestandteile'}</h3>
          <div className="odetail__related">
            {related.map((r) => (
              <button key={r} onClick={() => onNavigate(r)} style={{ '--c': ORGANELLES[r].farbe } as CSSProperties}>
                <span className="swatch" />
                {ORGANELLES[r].name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="odetail__section">
        <h3>Aufbau</h3>
        <ul className="bullets">
          {o.aufbau.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="odetail__section">
        <h3>Funktionen</h3>
        <ul className="bullets">
          {o.funktionen.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      {o.formel && (
        <div className="odetail__section">
          <div className="formula">
            <h3>{o.formel.titel}</h3>
            <div className="formula__eq">{o.formel.gleichung}</div>
            {o.formel.hinweis && <div className="formula__hint">{o.formel.hinweis}</div>}
          </div>
        </div>
      )}

      <div className="odetail__section">
        <h3>Steckbrief</h3>
        <dl className="facts">
          {o.steckbrief.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.wert}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="odetail__section odetail__notes">
        <div className="note note--sand">
          <strong>Merkhilfe</strong>
          <p>{o.merksatz}</p>
        </div>
        <div className="note note--green">
          <strong>Prüfungstipp</strong>
          <p>{o.pruefung}</p>
        </div>
        {o.tierVsPflanze && (
          <div className="note">
            <strong>Tier und Pflanze</strong>
            <p>{o.tierVsPflanze}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function LearnedButton({ id, compact }: { id: OrganelleId; compact?: boolean }) {
  const learned = useProgress((s) => !!s.learned[id])
  const toggle = useProgress((s) => s.toggleLearned)
  return (
    <button className={`btn ${compact ? 'btn--sm' : ''} ${learned ? 'is-learned' : ''}`} onClick={() => toggle(id)} style={{ flex: 1 }}>
      <IconCheck size={16} />
      {learned ? 'Gelernt' : 'Als gelernt markieren'}
    </button>
  )
}

export function OrganelleDetailPanel({
  id,
  cell,
  onBack,
  onNavigate,
}: {
  id: OrganelleId
  cell: CellType
  onBack: () => void
  onNavigate: (id: OrganelleId) => void
}) {
  const list = (Object.keys(ORGANELLES) as OrganelleId[]).filter((o) => ORGANELLES[o].vorkommen[cell])
  const idx = list.indexOf(id)
  const prev = list[(idx - 1 + list.length) % list.length]
  const next = list[(idx + 1) % list.length]
  return (
    <>
      <div className="panel__bar">
        <button className="btn btn--ghost btn--sm" onClick={onBack}>
          <IconArrowLeft size={16} /> Alle Bestandteile
        </button>
        <div style={{ flex: 1 }} />
        <button className="icon-btn" onClick={() => onNavigate(prev)} aria-label={`Vorheriges: ${ORGANELLES[prev].name}`} title={ORGANELLES[prev].name}>
          <IconChevronLeft size={17} />
        </button>
        <button className="icon-btn" onClick={() => onNavigate(next)} aria-label={`Nächstes: ${ORGANELLES[next].name}`} title={ORGANELLES[next].name}>
          <IconChevronRight size={17} />
        </button>
      </div>
      <div className="panel__scroll" key={id}>
        <OrganelleBody id={id} onNavigate={onNavigate} />
      </div>
      <div className="odetail__foot">
        <LearnedButton id={id} />
      </div>
    </>
  )
}
