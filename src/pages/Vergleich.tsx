import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import AnimalCell2D from '../cell2d/AnimalCell2D'
import PlantCell2D from '../cell2d/PlantCell2D'
import { ORGANELLES, type OrganelleId } from '../data/organelles'
import { IconAnimalCell, IconCheck, IconPlantCell } from '../components/icons'

interface Row {
  merkmal: string
  id?: OrganelleId
  tier: boolean | null
  tierText: string
  pflanze: boolean | null
  pflanzeText: string
}

const ROWS: Row[] = [
  { merkmal: 'Zellwand', id: 'zellwand', tier: false, tierText: 'fehlt', pflanze: true, pflanzeText: 'aus Cellulose' },
  { merkmal: 'Zellmembran', id: 'zellmembran', tier: true, tierText: 'vorhanden', pflanze: true, pflanzeText: 'liegt der Zellwand innen an' },
  { merkmal: 'Zellkern', id: 'zellkern', tier: true, tierText: 'meist zentral', pflanze: true, pflanzeText: 'oft an den Rand gedrückt' },
  { merkmal: 'Zentralvakuole', id: 'vakuole', tier: false, tierText: 'höchstens kleine Vakuolen', pflanze: true, pflanzeText: 'bis zu 90 % des Volumens' },
  { merkmal: 'Chloroplasten', id: 'chloroplast', tier: false, tierText: 'fehlen', pflanze: true, pflanzeText: 'in grünen Pflanzenteilen' },
  { merkmal: 'Mitochondrien', id: 'mitochondrium', tier: true, tierText: 'vorhanden', pflanze: true, pflanzeText: 'vorhanden' },
  { merkmal: 'Zentriolen', id: 'zentrosom', tier: true, tierText: 'im Zentrosom', pflanze: false, pflanzeText: 'fehlen (höhere Pflanzen)' },
  { merkmal: 'Lysosomen', id: 'lysosom', tier: true, tierText: 'vorhanden', pflanze: false, pflanzeText: 'Aufgabe übernimmt die Vakuole' },
  { merkmal: 'Plasmodesmen', id: 'plasmodesmen', tier: false, tierText: 'fehlen (dafür Gap Junctions)', pflanze: true, pflanzeText: 'verbinden Nachbarzellen' },
  { merkmal: 'Golgi-Apparat', id: 'golgi', tier: true, tierText: 'meist ein zusammenhängender', pflanze: true, pflanzeText: 'viele einzelne Dictyosomen' },
  { merkmal: 'ER, Ribosomen, Peroxisomen', id: 'raues-er', tier: true, tierText: 'vorhanden', pflanze: true, pflanzeText: 'vorhanden' },
  { merkmal: 'Cytoskelett', id: 'cytoskelett', tier: true, tierText: 'mit Intermediärfilamenten', pflanze: true, pflanzeText: 'ohne typische Intermediärfilamente' },
  { merkmal: 'Form', tier: null, tierText: 'variabel, oft rundlich', pflanze: null, pflanzeText: 'meist eckig und formstabil' },
  { merkmal: 'Speicherkohlenhydrat', tier: null, tierText: 'Glykogen', pflanze: null, pflanzeText: 'Stärke' },
  { merkmal: 'Ernährung', tier: null, tierText: 'heterotroph', pflanze: null, pflanzeText: 'autotroph (Photosynthese)' },
  { merkmal: 'Zellteilung (Cytokinese)', tier: null, tierText: 'Einschnürung (Teilungsfurche)', pflanze: null, pflanzeText: 'Bildung einer Zellplatte' },
]

const ONLY_TIER: OrganelleId[] = ['zentrosom', 'lysosom']
const ONLY_PFLANZE: OrganelleId[] = ['zellwand', 'vakuole', 'chloroplast', 'plasmodesmen']
const BOTH: OrganelleId[] = ['zellkern', 'zellmembran', 'cytoplasma', 'mitochondrium', 'raues-er', 'glattes-er', 'ribosomen', 'golgi', 'peroxisom', 'vesikel', 'cytoskelett']

function Mark({ v }: { v: boolean | null }) {
  if (v === null) return <span className="cmp-mark cmp-mark--info" aria-hidden="true" />
  return v ? (
    <span className="cmp-mark cmp-mark--yes" aria-label="ja">
      <IconCheck size={14} />
    </span>
  ) : (
    <span className="cmp-mark cmp-mark--no" aria-label="nein">
      –
    </span>
  )
}

function Pill({ id }: { id: OrganelleId }) {
  return (
    <Link to={`/biologie/zellbiologie/lexikon?o=${id}`} className="venn-pill" style={{ '--c': ORGANELLES[id].farbe } as CSSProperties}>
      <span className="swatch" />
      {ORGANELLES[id].name}
    </Link>
  )
}

export default function Vergleich() {
  const [diff, setDiff] = useState(true)
  const tierMarkers = diff ? Object.fromEntries(ONLY_TIER.map((i) => [i, 'target' as const])) : undefined
  const pflMarkers = diff ? Object.fromEntries(ONLY_PFLANZE.map((i) => [i, 'target' as const])) : undefined
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tierzelle und Pflanzenzelle</h1>
          <p>Gemeinsame Organellen und die prüfungsrelevanten Unterschiede.</p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={diff} onChange={(e) => setDiff(e.target.checked)} />
          <span className="switch__track" />
          Nur Unterschiede hervorheben
        </label>
      </header>

      <div className="grid grid--2">
        <div className="card cmp-art">
          <div className="cmp-art__title">
            <IconAnimalCell size={17} /> Tierzelle
          </div>
          <AnimalCell2D compact markers={tierMarkers} className={diff ? 'has-targets' : ''} />
        </div>
        <div className="card cmp-art">
          <div className="cmp-art__title">
            <IconPlantCell size={17} /> Pflanzenzelle
          </div>
          <PlantCell2D compact markers={pflMarkers} className={diff ? 'has-targets' : ''} />
        </div>
      </div>

      <section className="section">
        <div className="section__head">
          <h2>Gemeinsamkeiten und Unterschiede</h2>
        </div>
        <div className="venn">
          <div className="venn__col">
            <h3>Nur Tierzelle</h3>
            <div className="venn__pills">
              {ONLY_TIER.map((i) => (
                <Pill key={i} id={i} />
              ))}
            </div>
          </div>
          <div className="venn__col venn__col--both">
            <h3>In beiden</h3>
            <div className="venn__pills">
              {BOTH.map((i) => (
                <Pill key={i} id={i} />
              ))}
            </div>
          </div>
          <div className="venn__col">
            <h3>Nur Pflanzenzelle</h3>
            <div className="venn__pills">
              {ONLY_PFLANZE.map((i) => (
                <Pill key={i} id={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Merkmal</th>
                <th>Tierzelle</th>
                <th>Pflanzenzelle</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.merkmal} className={r.tier !== r.pflanze ? 'is-diff' : ''}>
                  <td>
                    {r.id ? (
                      <Link to={`/biologie/zellbiologie/lexikon?o=${r.id}`} className="cmp-name" style={{ '--c': ORGANELLES[r.id].farbe } as CSSProperties}>
                        <span className="swatch" />
                        {r.merkmal}
                      </Link>
                    ) : (
                      <span className="cmp-name">{r.merkmal}</span>
                    )}
                  </td>
                  <td>
                    <div className="cmp-cell">
                      <Mark v={r.tier} />
                      {r.tierText}
                    </div>
                  </td>
                  <td>
                    <div className="cmp-cell">
                      <Mark v={r.pflanze} />
                      {r.pflanzeText}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
