import { useEffect } from 'react'
import { BY_Z, CAT_BY_ID, ELEMENTS, block, fmtC, fmtDensity, fmtMass, fmtNum, groupLabel, phaseAt, position, shells, valence, yearLabel, type Element } from '../elements'
import { Conf } from '../format'
import Bohr from './Bohr'
import Orbitals from './Orbitals'
import { IconArrowLeft, IconArrowRight, IconClose } from '../../components/icons'

function Fact({ k, v, wide }: { k: string; v: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`pfact ${wide ? 'pfact--wide' : ''}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  )
}

function MiniMap({ z }: { z: number }) {
  return (
    <div className="minimap" aria-hidden="true">
      {ELEMENTS.map((e) => {
        const p = position(e.z)
        return <span key={e.z} className={`minimap__c c-${e.cat} ${e.z === z ? 'is-on' : ''}`} style={{ gridRow: p.row, gridColumn: p.col }} />
      })}
    </div>
  )
}

export default function Detail({ z, onClose, onNav }: { z: number; onClose: () => void; onNav: (z: number) => void }) {
  const e: Element = BY_Z[z]
  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
      if (ev.key === 'ArrowRight' && z < 118) onNav(z + 1)
      if (ev.key === 'ArrowLeft' && z > 1) onNav(z - 1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [z, onClose, onNav])

  const p = position(z)
  const val = valence(e)
  const sh = shells(e.conf)
  const state = phaseAt(e, 20)
  return (
    <div className="detail" role="dialog" aria-modal="true" aria-label={e.name}>
      <div className="detail__backdrop" onClick={onClose} />
      <aside className="detail__panel" key={z}>
        <header className="detail__head">
          <div className={`detail__tile c-${e.cat}`}>
            <span className="detail__z">{e.z}</span>
            <span className="detail__sym">{e.sym}</span>
            <span className="detail__mass">{fmtMass(e)}</span>
          </div>
          <div className="detail__title">
            <h2>{e.name}</h2>
            <p>
              {CAT_BY_ID[e.cat].short}
              {e.pred && ' · Eigenschaften vorhergesagt'}
            </p>
            {e.lat && (
              <p className="detail__lat">
                Symbol von lat. <em>{e.lat}</em>
              </p>
            )}
          </div>
          <div className="detail__nav">
            <button type="button" className="icon-btn" disabled={z <= 1} onClick={() => onNav(z - 1)} aria-label="Vorheriges Element">
              <IconArrowLeft size={17} />
            </button>
            <button type="button" className="icon-btn" disabled={z >= 118} onClick={() => onNav(z + 1)} aria-label="Nächstes Element">
              <IconArrowRight size={17} />
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
              <IconClose size={17} />
            </button>
          </div>
        </header>

        <section className="detail__atom">
          <Bohr e={e} size={220} />
          <div className="detail__shells">
            <span className="detail__label">Schalen</span>
            <strong>{sh.join(' · ')}</strong>
            <span className="detail__label">Konfiguration</span>
            <strong>
              <Conf conf={e.conf} />
            </strong>
            {e.z >= 104 && <span className="faint">berechnet</span>}
            {val !== null && (
              <>
                <span className="detail__label">Valenzelektronen</span>
                <strong>{val}</strong>
              </>
            )}
          </div>
        </section>

        <section className="detail__sec">
          <h3>Orbitale</h3>
          <Orbitals e={e} />
        </section>

        <dl className="pfacts">
          <Fact k="Ordnungszahl" v={`${e.z} (${e.z} Protonen)`} />
          <Fact k={e.radio ? 'Massenzahl (langlebigstes Isotop)' : 'Atommasse'} v={`${fmtMass(e)} u`} />
          <Fact k="Gruppe" v={groupLabel(e)} wide />
          <Fact k="Periode" v={p.period} />
          <Fact k="Block" v={`${block(e)}-Block`} />
          <Fact k="Elektronegativität" v={fmtNum(e.en)} />
          <Fact k="Oxidationszahlen" v={e.ox ?? '–'} />
          <Fact k="Bei 20 °C" v={state} />
          <Fact k="Dichte" v={fmtDensity(e)} />
          <Fact k="Schmelzpunkt" v={e.subl ? 'sublimiert' : `${fmtC(e.mp)}${e.est && e.mp ? ' (geschätzt)' : ''}`} />
          <Fact k={e.subl ? 'Sublimation' : 'Siedepunkt'} v={fmtC(e.subl ?? e.bp)} />
          <Fact k="1. Ionisierungsenergie" v={e.ie === null ? '–' : `${fmtNum(e.ie, 3)} eV`} />
          <Fact k="Van-der-Waals-Radius" v={e.rad === null ? '–' : `${e.rad} pm`} />
          <Fact k="Entdeckt" v={yearLabel(e.year)} />
        </dl>

        <section className="detail__sec">
          <h3>Stellung im Periodensystem</h3>
          <MiniMap z={z} />
        </section>
      </aside>
    </div>
  )
}
