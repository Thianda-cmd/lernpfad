import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IconCheck, IconClose, IconSearch } from '../components/icons'
import { ALL_ORGANELLE_IDS, MEMBRAN_LABEL, ORGANELLES, type MembranTyp, type OrganelleId } from '../data/organelles'
import { LearnedButton, OrganelleBody } from '../components/OrganelleDetail'
import { useProgress } from '../store/progress'

type CellFilter = 'alle' | 'tier' | 'pflanze' | 'nur-pflanze' | 'nur-tier'

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export default function Lexikon() {
  const [params, setParams] = useSearchParams()
  const open = params.get('o') as OrganelleId | null
  const [q, setQ] = useState('')
  const [cell, setCell] = useState<CellFilter>('alle')
  const [mem, setMem] = useState<MembranTyp | 'alle'>('alle')
  const learned = useProgress((s) => s.learned)
  const markViewed = useProgress((s) => s.markViewed)

  useEffect(() => {
    if (open && ORGANELLES[open]) markViewed(open)
  }, [open, markViewed])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setParams({}, { replace: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setParams])

  const list = useMemo(() => {
    const nq = normalize(q.trim())
    return ALL_ORGANELLE_IDS.filter((id) => {
      const o = ORGANELLES[id]
      if (cell === 'tier' && !o.vorkommen.tier) return false
      if (cell === 'pflanze' && !o.vorkommen.pflanze) return false
      if (cell === 'nur-tier' && !(o.vorkommen.tier && !o.vorkommen.pflanze)) return false
      if (cell === 'nur-pflanze' && !(o.vorkommen.pflanze && !o.vorkommen.tier)) return false
      if (mem !== 'alle' && o.membran !== mem) return false
      if (!nq) return true
      const hay = normalize([o.name, o.fachbegriff, o.kurz, o.analogie, ...o.funktionen, ...o.aufbau].join(' '))
      return hay.includes(nq)
    })
  }, [q, cell, mem])

  const openId = open && ORGANELLES[open] ? open : null

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Organellen-Lexikon</h1>

          <p>{ALL_ORGANELLE_IDS.length} Bestandteile – suchbar nach Name, Funktion oder Stichwort.</p>
        </div>
      </header>

      <div className="lex-filters">
        <div className="input-wrap" style={{ flex: 1, minWidth: 240 }}>
          <IconSearch size={17} />
          <input className="input" placeholder="Suchen … z. B. Proteinbiosynthese" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Lexikon durchsuchen" />
        </div>
        <div className="seg">
          {(
            [
              ['alle', 'Alle'],
              ['tier', 'Tierzelle'],
              ['pflanze', 'Pflanzenzelle'],
              ['nur-pflanze', 'Nur Pflanze'],
              ['nur-tier', 'Nur Tier'],
            ] as [CellFilter, string][]
          ).map(([k, l]) => (
            <button key={k} className={`seg__btn ${cell === k ? 'is-active' : ''}`} onClick={() => setCell(k)}>
              {l}
            </button>
          ))}
        </div>
        <select className="select" value={mem} onChange={(e) => setMem(e.target.value as MembranTyp | 'alle')} aria-label="Nach Membran filtern">
          <option value="alle">Alle Membrantypen</option>
          <option value="doppelt">Doppelmembran</option>
          <option value="einfach">Einfache Membran</option>
          <option value="keine">Ohne Membran</option>
        </select>
      </div>

      {list.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>
          <IconSearch size={28} />
          <h3>Nichts gefunden</h3>
          <p>Versuche einen anderen Suchbegriff oder setze die Filter zurück.</p>
        </div>
      ) : (
        <div className="grid grid--auto lex-grid">
          {list.map((id) => {
            const o = ORGANELLES[id]
            return (
              <button key={id} className="lex-card card card--link" style={{ '--c': o.farbe } as CSSProperties} onClick={() => setParams({ o: id })}>
                <div className="lex-card__top">
                  <span className="lex-card__swatch" />
                  {learned[id] && <span className="chip chip--green"><IconCheck size={13} />Gelernt</span>}
                </div>
                <h3>{o.name}</h3>
                <div className="lex-card__fach">{o.fachbegriff}</div>
                <p>{o.kurz}</p>
                <div className="lex-card__tags">
                  <span>{MEMBRAN_LABEL[o.membran]}</span>
                  {o.vorkommen.tier && <span>Tier</span>}
                  {o.vorkommen.pflanze && <span>Pflanze</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {openId && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label={ORGANELLES[openId].name}>
          <div className="drawer__backdrop" onClick={() => setParams({}, { replace: true })} />
          <aside className="drawer__panel">
            <div className="panel__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
              <span className="faint" style={{ fontSize: 13, fontWeight: 600 }}>
                Organellen-Lexikon
              </span>
              <button className="icon-btn" onClick={() => setParams({}, { replace: true })} aria-label="Schließen">
                <IconClose size={17} />
              </button>
            </div>
            <div className="panel__scroll" key={openId}>
              <OrganelleBody id={openId} onNavigate={(n) => setParams({ o: n }, { replace: true })} />
            </div>
            <div className="odetail__foot">
              <LearnedButton id={openId} />
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
