import type { ReactNode } from 'react'
import { parseNum } from '../../../math/alg/numinput'
import { mastermix, PCR_COMPONENTS, PRIMER_MOL_U, primerStock, type CompDef, type MixOut, type Reserve } from '../../../math/alg/pcr'
import { unitNames } from '../../../math/alg/units'
import { CalcPage, DataTable, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'
import '../../../styles/molbio.css'

type Mode = 'mastermix' | 'primer'

const RULES: Record<Mode, [string, string][]> = {
  mastermix: [
    ['c_1 \\cdot V_1 = c_2 \\cdot V_2', 'gilt für jede Komponente'],
    ['V = \\frac{c_{\\text{End}} \\cdot V_R}{c_{\\text{Stamm}}}', 'Volumen pro Ansatz'],
    ['n_{\\text{MM}} = n + 1', 'Ansätze im Mastermix (oder n · 1,1)'],
    ['V_{\\text{Wasser}} = V_R - \\sum V_i - V_{\\text{Template}}', 'mit Wasser auffüllen'],
    ['10\\times \\to 1\\times', 'Puffer 1 : 10 verdünnen'],
  ],
  primer: [
    ['V = \\frac{n}{c}', 'Volumen für die Stammlösung'],
    ['1\\,\\mu\\text{M} = 1\\,\\tfrac{\\text{pmol}}{\\mu\\text{L}}', 'praktische Umrechnung'],
    ['V\\,[\\mu\\text{L}] = n\\,[\\text{nmol}] \\cdot 10', 'Faustregel für 100 µM'],
    ['c_1 \\cdot V_1 = c_2 \\cdot V_2', 'Arbeitslösung verdünnen'],
  ],
}

type CompVals = Record<string, [string, string]>

const EX_MIX: Record<string, { label: string; n: string; res: Reserve; V: string; tpl: string; comps?: CompVals }> = {
  std: { label: '8 Proben, 50 µL', n: '8', res: 'eins', V: '50', tpl: '2' },
  platte: { label: '96er-Platte, 25 µL, +10 %', n: '96', res: 'zehn', V: '25', tpl: '2' },
  kolonie: { label: 'Kolonie-PCR, 20 µL, Mg im Puffer', n: '12', res: 'eins', V: '20', tpl: '0', comps: { mg: ['25', '0'] } },
  hifi: { label: 'Primer 0,5 µM, 2 mM Mg', n: '6', res: 'eins', V: '50', tpl: '1', comps: { fw: ['10', '0,5'], rev: ['10', '0,5'], mg: ['25', '2'] } },
}

const EX_PRIMER: Record<string, { label: string; n: string; nu: string; cS: string; cW: string; VW: string }> = {
  std: { label: '25,3 nmol → 100 µM', n: '25,3', nu: 'nmol', cS: '100', cW: '10', VW: '100' },
  gross: { label: '38,7 nmol, 200 µL Arbeitslösung', n: '38,7', nu: 'nmol', cS: '100', cW: '10', VW: '200' },
  klein: { label: '12,5 nmol → 50 µM', n: '12,5', nu: 'nmol', cS: '50', cW: '5', VW: '100' },
  pmol: { label: '500 pmol', n: '500', nu: 'pmol', cS: '100', cW: '', VW: '' },
}

const unitLabel = (u: string) => (u === '×' ? '×' : u)
const cell = (t: string): ReactNode => <Tex>{t}</Tex>

/** Stamm- und Endkonzentration einer Komponente in der Adresse */
function useComp(def: CompDef) {
  const [stock, setStock] = useParam(`${def.key}S`, def.stock)
  const [end, setEnd] = useParam(`${def.key}E`, def.end)
  return { def, stock, setStock, end, setEnd }
}

function CompRow({ c }: { c: ReturnType<typeof useComp> }) {
  const u = unitLabel(c.def.unit)
  return (
    <div className="molbio-comps__row">
      <span className="molbio-comps__name">
        {c.def.name}
        {c.def.key === 'mg' && <small>0 = schon im Puffer</small>}
        {c.def.key === 'pol' && <small>0,025 U/µL ≙ 1,25 U/50 µL</small>}
      </span>
      <label className="nf">
        <span className="molbio-sr">{c.def.name}: Stammkonzentration</span>
        <span className="nf__row">
          <input className="nf__input" value={c.stock} onChange={(e) => c.setStock(e.target.value)} inputMode="decimal" spellCheck={false} autoComplete="off" placeholder="–" />
          <span className="nf__u">{u}</span>
        </span>
      </label>
      <label className="nf">
        <span className="molbio-sr">{c.def.name}: Endkonzentration</span>
        <span className="nf__row">
          <input className="nf__input" value={c.end} onChange={(e) => c.setEnd(e.target.value)} inputMode="decimal" spellCheck={false} autoComplete="off" placeholder="0" />
          <span className="nf__u">{u}</span>
        </span>
      </label>
    </div>
  )
}

export default function Pcr({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'mastermix')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'mastermix') as Mode
  // Mastermix
  const [n, setN] = useParam('n', '8')
  const [res_, setRes] = useParam('reserve', 'eins')
  const [V, setV] = useParam('V', '50')
  const [tpl, setTpl] = useParam('tpl', '2')
  const comps = [useComp(PCR_COMPONENTS[0]), useComp(PCR_COMPONENTS[1]), useComp(PCR_COMPONENTS[2]), useComp(PCR_COMPONENTS[3]), useComp(PCR_COMPONENTS[4]), useComp(PCR_COMPONENTS[5])]
  // Primer lösen
  const [pn, setPn] = useParam('pn', '25,3')
  const [pnu, setPnu] = useParam('pnu', 'nmol')
  const [pcS, setPcS] = useParam('pcS', '100')
  const [pcW, setPcW] = useParam('pcW', '10')
  const [pVW, setPVW] = useParam('pVW', '100')

  const reserve = (['eins', 'zehn', 'keine'].includes(res_) ? res_ : 'eins') as Reserve
  const compVals = comps.map((c) => c.stock + '|' + c.end).join(';')
  const { res, err } = useSolve(() => {
    if (m === 'primer') return primerStock({ n: parseNum(pn, 'Stoffmenge'), nu: pnu, cS: parseNum(pcS, 'Stammkonzentration'), cW: parseNum(pcW, 'Konzentration der Arbeitslösung'), VW: parseNum(pVW, 'Volumen der Arbeitslösung') })
    return mastermix({
      n: parseNum(n, 'Anzahl der Proben'),
      reserve,
      V: parseNum(V, 'Reaktionsvolumen'),
      template: parseNum(tpl, 'Template-Volumen'),
      comps: comps.map((c) => ({ name: c.def.name, tex: c.def.tex, unit: c.def.unit, note: c.def.note, stock: parseNum(c.stock, `${c.def.name} (Stamm)`), end: parseNum(c.end, `${c.def.name} (Ende)`) })),
    })
  }, [m, n, reserve, V, tpl, compVals, pn, pnu, pcS, pcW, pVW])
  const mix = m === 'mastermix' && res && 'rows' in res ? (res as MixOut) : null

  const pickMix = (k: string) => {
    const e = EX_MIX[k]
    setN(e.n)
    setRes(e.res)
    setV(e.V)
    setTpl(e.tpl)
    for (const c of comps) {
      const o = e.comps?.[c.def.key]
      c.setStock(o ? o[0] : c.def.stock)
      c.setEnd(o ? o[1] : c.def.end)
    }
  }

  return (
    <CalcPage
      eyebrow="Biologie · Laborrechner"
      title={tool.title}
      intro="PCR-Ansatz pipettieren: Für jede Komponente das Volumen aus Stamm- und Endkonzentration, dazu Wasser bis zum Reaktionsvolumen – als Mastermix für alle Proben mit Pipettierschema. Außerdem: lyophilisierte Primer lösen und verdünnen."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['mastermix', 'Mastermix'],
            ['primer', 'Primer lösen'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'mastermix' && (
            <>
              <div className="calc__fields">
                <NumField label="Anzahl Proben n" sub="mit Kontrollen" value={n} onChange={setN} />
                <NumField label="Reaktionsvolumen V_R" sub="pro Ansatz" value={V} onChange={setV} unit="µL" />
                <NumField label="Template" sub="pro Ansatz, nicht im Mix" value={tpl} onChange={setTpl} unit="µL" placeholder="0" />
              </div>
              <div className="calc__row">
                <span className="calc__label">Reserve</span>
                <Seg
                  value={reserve}
                  onChange={setRes}
                  options={[
                    ['eins', '+ 1 Ansatz'],
                    ['zehn', '+ 10 %'],
                    ['keine', 'keine'],
                  ]}
                  label="Reserve"
                />
              </div>
              <div className="molbio-comps" role="group" aria-label="Komponenten">
                <div className="molbio-comps__row molbio-comps__head">
                  <span>Komponente</span>
                  <span>Stamm</span>
                  <span>Ende</span>
                </div>
                {comps.map((c) => (
                  <CompRow key={c.def.key} c={c} />
                ))}
              </div>
              <Examples items={Object.entries(EX_MIX).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickMix} />
              <p className="calc__hint">Endkonzentration 0 lässt eine Komponente weg. Wasser wird automatisch auf das Reaktionsvolumen aufgefüllt.</p>
            </>
          )}
          {m === 'primer' && (
            <>
              <div className="calc__fields">
                <NumField label="Stoffmenge n" sub="laut Datenblatt" value={pn} onChange={setPn} unit={pnu} units={unitNames(PRIMER_MOL_U)} onUnit={setPnu} />
                <NumField label="Stammlösung c" sub="meist 100 µM" value={pcS} onChange={setPcS} unit="µM" />
              </div>
              <span className="calc__label">Optional: Arbeitslösung</span>
              <div className="calc__fields">
                <NumField label="Konzentration" sub="z. B. 10 µM" value={pcW} onChange={setPcW} unit="µM" />
                <NumField label="Volumen" value={pVW} onChange={setPVW} unit="µL" />
              </div>
              <Examples
                items={Object.entries(EX_PRIMER).map(([k, e]) => [k, e.label] as [string, string])}
                onPick={(k) => {
                  const e = EX_PRIMER[k]
                  setPn(e.n)
                  setPnu(e.nu)
                  setPcS(e.cS)
                  setPcW(e.cW)
                  setPVW(e.VW)
                }}
              />
              <p className="calc__hint">Kommazahlen mit Komma oder Punkt.</p>
            </>
          )}
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage den Ansatz ein – Pipettierschema und Lösungsweg erscheinen hier.">
        {mix && (
          <div className="calc__insert">
            <DataTable
              caption={`Pipettierschema · Mastermix für ${mix.factor.d === 1n ? String(mix.factor.n) : (Number(mix.factor.n) / Number(mix.factor.d)).toString().replace('.', ',')} Ansätze`}
              head={['Komponente', 'Stamm', 'Ende', cell('\\text{pro Ansatz in }\\mu\\text{L}'), cell('\\text{Mastermix in }\\mu\\text{L}')]}
              rows={mix.rows.map((r) => [r.name, cell(r.stock), cell(r.end), cell(r.per), cell(r.total)])}
              foot={[mix.foot.name, '', '', cell(mix.foot.per), cell(mix.foot.total)]}
            />
          </div>
        )}
      </SolutionCard>
    </CalcPage>
  )
}
