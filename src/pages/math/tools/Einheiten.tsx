import { useMemo } from 'react'
import { convertAll, convertUnits, PREFIXES, QTY_BY_ID, QTY_RULES, type QtyId } from '../../../math/alg/convert'
import { parseNum } from '../../../math/alg/numinput'
import { T } from '../../../math/alg/units'
import { CalcPage, DataTable, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'

const TABS: [QtyId, string][] = [
  ['masse', 'Masse'],
  ['volumen', 'Volumen'],
  ['stoffmenge', 'Stoffmenge'],
  ['konz', 'Konzentration c'],
  ['mkonz', 'Massenkonz. β'],
  ['laenge', 'Länge'],
  ['flaeche', 'Fläche'],
  ['druck', 'Druck'],
  ['zeit', 'Zeit'],
  ['temperatur', 'Temperatur'],
]

/** Beispiele je Größe: Wert, von, nach */
const EX: Record<QtyId, [string, string, string][]> = {
  masse: [
    ['250', 'mg', 'g'],
    ['0,5', 'kg', 'mg'],
    ['3,2', 'µg', 'ng'],
    ['1500', 'ng', 'µg'],
  ],
  volumen: [
    ['250', 'mL', 'L'],
    ['20', 'µL', 'mL'],
    ['1', 'cm³', 'mL'],
    ['2', 'm³', 'L'],
    ['0,5', 'dL', 'mL'],
  ],
  stoffmenge: [
    ['0,25', 'mmol', 'µmol'],
    ['1500', 'nmol', 'µmol'],
    ['2', 'pmol', 'fmol'],
  ],
  konz: [
    ['0,5', 'mmol/L', 'µmol/L'],
    ['0,1', 'M', 'mM'],
    ['250', 'nM', 'µmol/L'],
    ['2', 'mol/m³', 'mmol/L'],
  ],
  mkonz: [
    ['2,5', 'mg/mL', 'µg/µL'],
    ['90', 'mg/dL', 'g/L'],
    ['50', 'ng/µL', 'µg/mL'],
    ['0,9', 'g/L', 'mg/mL'],
  ],
  laenge: [
    ['0,45', 'mm', 'µm'],
    ['600', 'nm', 'µm'],
    ['12', 'µm', 'mm'],
  ],
  flaeche: [
    ['1', 'mm²', 'µm²'],
    ['0,0025', 'mm²', 'µm²'],
    ['2', 'cm²', 'mm²'],
  ],
  druck: [
    ['1013', 'hPa', 'bar'],
    ['2', 'bar', 'kPa'],
    ['1', 'atm', 'hPa'],
    ['760', 'mmHg', 'hPa'],
  ],
  zeit: [
    ['2,5', 'h', 'min'],
    ['90', 's', 'min'],
    ['1', 'd', 'h'],
  ],
  temperatur: [
    ['37', '°C', 'K'],
    ['293,15', 'K', '°C'],
    ['100', '°C', '°F'],
    ['98,6', '°F', '°C'],
  ],
}

export default function Einheiten({ tool }: { tool: CalcTool }) {
  const [g, setG] = useParam('groesse', 'volumen')
  const qid = (g in QTY_BY_ID ? g : 'volumen') as QtyId
  const qty = QTY_BY_ID[qid]
  const [wert, setWert] = useParam('wert', qty.ex[0])
  const [von, setVon] = useParam('von', qty.ex[1])
  const [nach, setNach] = useParam('nach', qty.ex[2])
  const names = useMemo(() => qty.units.map((u) => u.u), [qty])
  const from = names.includes(von) ? von : qty.ex[1]
  const to = names.includes(nach) ? nach : qty.ex[2]
  const { res, err } = useSolve(() => (wert.trim() ? convertUnits(qid, parseNum(wert, 'Wert'), from, to) : null), [qid, wert, from, to])
  const all = useMemo(() => {
    try {
      return convertAll(qid, parseNum(wert, 'Wert'), from)
    } catch {
      return []
    }
  }, [qid, wert, from])
  const rules = qid === 'temperatur' ? QTY_RULES.temperatur : [...PREFIXES, ...QTY_RULES[qid]]
  const pickQty = (v: QtyId) => {
    const q = QTY_BY_ID[v]
    setG(v)
    setWert(q.ex[0])
    setVon(q.ex[1])
    setNach(q.ex[2])
  }
  const key = (e: [string, string, string]) => e.join('|')
  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro="Einheiten sicher umrechnen – mit Zehnerpotenzen im Rechenweg: erst die Umrechnungszahl, dann einsetzen. Für Masse, Volumen, Stoffmenge, Konzentrationen, Länge, Fläche, Druck, Zeit und Temperatur."
      path={tool.path}
      actions={<Seg value={qid} onChange={pickQty} options={TABS} label="Größe" />}
    >
      <div className="calc__grid">
        <section className="calc__in card">
          <span className="calc__label">{qty.name}</span>
          <div className="calc__fields">
            <NumField label="Wert" sub="von" value={wert} onChange={setWert} unit={from} units={names} onUnit={setVon} />
            <label className="nf">
              <span className="nf__label">umrechnen in</span>
              <span className="nf__row">
                <select className="nf__input" value={to} onChange={(e) => setNach(e.target.value)} aria-label="Zieleinheit">
                  {names.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </span>
            </label>
          </div>
          <div className="calc__row">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setVon(to)
                setNach(from)
              }}
            >
              ⇄ Einheiten tauschen
            </button>
          </div>
          <Examples
            items={EX[qid].map((e) => [key(e), `${e[0]} ${e[1]} → ${e[2]}`] as [string, string])}
            onPick={(v) => {
              const [w, a, b] = v.split('|')
              setWert(w)
              setVon(a)
              setNach(b)
            }}
            current={key([wert, from, to])}
          />
          <p className="calc__hint">Kommazahlen mit Komma oder Punkt, Zehnerpotenzen wie 2,5·10^-3 gehen auch.</p>
        </section>
        <Rules title={qid === 'temperatur' ? 'Formeln' : 'Vorsätze & Regeln'} items={rules} />
      </div>
      <SolutionCard sol={res} err={err} empty="Gib einen Wert ein.">
        {res && all.length > 0 && (
          <div className="calc__insert">
            <DataTable
              caption={`${wert} ${from} in allen Einheiten`}
              head={['Einheit', 'Wert']}
              rows={all.map((r) => [<Tex key="u">{`\\text{in}${T(r.u)}`}</Tex>, <Tex key="v">{r.tex}</Tex>])}
            />
          </div>
        )}
      </SolutionCard>
    </CalcPage>
  )
}
