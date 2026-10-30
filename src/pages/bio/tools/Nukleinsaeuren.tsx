import { parseNum } from '../../../math/alg/numinput'
import { a260Conc, ligation, NA_MASS_U, NA_MOL_U, ngPmol, PER_UNIT, PREC_ALCOHOLS, precipitation, primerTm, proteinA280, purity, type AmountGiven, type NaKind, type PrecAlcohol, type PrecSalt, type ProteinMode, type PurityKind, type Strand } from '../../../math/alg/nucleic'
import { unitNames } from '../../../math/alg/units'
import { CalcPage, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import type { CalcTool } from '../../../math/tools'

type Mode = 'konz' | 'reinheit' | 'pmol' | 'ligation' | 'primer' | 'protein' | 'faellung'

const RULES: Record<Mode, [string, string][]> = {
  konz: [
    ['c = A_{260} \\cdot f \\cdot F', 'Konzentration (Schichtdicke 1 cm)'],
    ['f_{\\text{dsDNA}} = 50\\,\\tfrac{\\mu\\text{g}}{\\text{mL}}', 'A260 = 1 bei doppelsträngiger DNA'],
    ['f_{\\text{RNA}} = 40,\\quad f_{\\text{ssDNA}} = 33', 'RNA, einzelsträngige DNA und Oligos (µg/mL)'],
    ['1\\,\\tfrac{\\mu\\text{g}}{\\text{mL}} = 1\\,\\tfrac{\\text{ng}}{\\mu\\text{L}}', 'gleicher Zahlenwert'],
    ['m = c \\cdot V', 'Ausbeute (Gesamtmenge)'],
  ],
  reinheit: [
    ['\\frac{A_{260}}{A_{280}} \\approx 1{,}8', 'reine DNA (reine RNA: etwa 2,0)'],
    ['\\frac{A_{260}}{A_{280}} < 1{,}7', 'Protein- oder Phenolreste'],
    ['\\frac{A_{260}}{A_{230}} \\approx 2{,}0 \\dots 2{,}2', 'rein – niedriger: Salze, Kohlenhydrate, Phenol'],
  ],
  pmol: [
    ['M = L \\cdot 650\\,\\tfrac{\\text{g}}{\\text{mol}}', 'dsDNA, pro Basenpaar (manchmal 660)'],
    ['M = L \\cdot 330\\,\\tfrac{\\text{g}}{\\text{mol}}', 'ssDNA und Oligos pro Nukleotid (RNA: 340)'],
    ['n = \\frac{m}{M}', 'Stoffmenge'],
    ['N = n \\cdot N_A', 'Kopienzahl'],
    ['N_A = 6{,}022 \\cdot 10^{23}\\,\\text{mol}^{-1}', 'Avogadro-Konstante'],
  ],
  ligation: [
    ['m_I = m_V \\cdot \\frac{L_I}{L_V} \\cdot \\frac{n_I}{n_V}', 'Insertmasse für ein molares Verhältnis'],
    ['n_I : n_V = 3 : 1', 'üblicher Standard (1 : 1 bis 5 : 1)'],
    ['V = \\frac{m}{c}', 'Pipettiervolumen'],
  ],
  primer: [
    ['T_m = 2 \\cdot (A + T) + 4 \\cdot (G + C)', 'Wallace-Regel (kurze Oligos)'],
    ['T_m = 64{,}9 + 41 \\cdot \\frac{G + C - 16{,}4}{N}', 'GC-Formel (ab 14 nt)'],
    ['\\text{GC} = \\frac{G + C}{N} \\cdot 100\\,\\%', 'GC-Gehalt (Ziel 40–60 %)'],
    ['T_a \\approx T_m - 5\\,^{\\circ}\\text{C}', 'Annealing-Temperatur (Startwert)'],
  ],
  protein: [
    ['c = \\frac{A_{280}}{\\varepsilon \\cdot d}', 'Lambert-Beer mit molarem ε'],
    ['\\beta = c \\cdot M', 'Massenkonzentration'],
    ['\\beta = \\frac{A_{280}}{a \\cdot d}', 'mit A280 einer Lösung von 1 mg/mL'],
    ['a = \\frac{\\varepsilon}{M}', 'BSA: a ≈ 0,66 · IgG: a ≈ 1,37'],
  ],
  faellung: [
    ['V_{\\text{NaAc}} = \\tfrac{1}{10} \\cdot V_{\\text{Probe}}', '3 M Natriumacetat (pH 5,2) → etwa 0,3 mol/L'],
    ['V_{\\mathrm{NH_4Ac}} = \\tfrac{1}{2} \\cdot V_{\\text{Probe}}', '7,5 M Ammoniumacetat → 2,5 mol/L'],
    ['V_{\\text{EtOH}} = 2{,}5 \\cdot (V_{\\text{Probe}} + V_{\\text{Salz}})', 'eiskaltes Ethanol (100 %)'],
    ['V_{\\text{Iso}} = 0{,}7 \\cdot (V_{\\text{Probe}} + V_{\\text{Salz}})', 'Isopropanol (Raumtemperatur)'],
    ['c_1 \\cdot V_1 = c_2 \\cdot V_2', 'Salzkonzentration nach der Zugabe'],
  ],
}

const EX_FAELL: Record<string, { label: string; V: string; vu: string; salt: PrecSalt; alc: PrecAlcohol; k: string }> = {
  std: { label: '200 µL DNA · Natriumacetat', V: '200', vu: 'µL', salt: 'naac', alc: 'ethanol', k: '' },
  ammon: { label: 'nach Markierung · Ammoniumacetat', V: '100', vu: 'µL', salt: 'nh4ac', alc: 'ethanol', k: '' },
  rna: { label: 'RNA · 3-faches Ethanol', V: '100', vu: 'µL', salt: 'naac', alc: 'ethanol', k: '3' },
  iso: { label: '0,5 mL · Isopropanol', V: '0,5', vu: 'mL', salt: 'naac', alc: 'isopropanol', k: '' },
}

const KINDS: [NaKind | 'eigen', string][] = [
  ['dsdna', 'dsDNA · 50'],
  ['ssdna', 'ssDNA · 33'],
  ['rna', 'RNA · 40'],
  ['oligo', 'Oligo · 33'],
  ['eigen', 'eigener Faktor'],
]

const EX_KONZ: Record<string, { label: string; A: string; typ: NaKind; F: string; d: string; du: string; V: string; vu: string }> = {
  ds50: { label: 'dsDNA 1 : 50', A: '0,25', typ: 'dsdna', F: '50', d: '1', du: 'cm', V: '100', vu: 'µL' },
  rna: { label: 'RNA 1 : 20', A: '0,42', typ: 'rna', F: '20', d: '1', du: 'cm', V: '50', vu: 'µL' },
  mini: { label: 'Plasmid-Miniprep', A: '0,12', typ: 'dsdna', F: '50', d: '1', du: 'cm', V: '50', vu: 'µL' },
  oligo: { label: 'Oligo 1 : 100', A: '0,5', typ: 'oligo', F: '100', d: '1', du: 'cm', V: '', vu: 'µL' },
  mikro: { label: 'Mikrovolumen (1 mm)', A: '0,8', typ: 'dsdna', F: '', d: '1', du: 'mm', V: '30', vu: 'µL' },
}

const EX_REIN: Record<string, { label: string; a260: string; a280: string; a230: string; typ: PurityKind }> = {
  rein: { label: 'reine DNA', a260: '0,550', a280: '0,300', a230: '0,260', typ: 'dna' },
  protein: { label: 'Proteinreste', a260: '0,500', a280: '0,340', a230: '0,240', typ: 'dna' },
  salz: { label: 'Guanidin-Reste (Säulen-Kit)', a260: '0,600', a280: '0,330', a230: '0,500', typ: 'dna' },
  rna: { label: 'RNA-Präparation', a260: '0,800', a280: '0,395', a230: '0,370', typ: 'rna' },
  rnaindna: { label: 'RNA in der DNA', a260: '0,420', a280: '0,200', a230: '0,195', typ: 'dna' },
}

const EX_PMOL: Record<string, { label: string; strand: Strand; L: string; given: AmountGiven; val: string; unit: string }> = {
  kb: { label: '1 µg · 1000 bp', strand: 'ds', L: '1000', given: 'm', val: '1', unit: 'µg' },
  plasmid: { label: 'Plasmid 3000 bp', strand: 'ds', L: '3000', given: 'm', val: '1', unit: 'µg' },
  pcr: { label: 'PCR-Produkt 500 bp, 100 ng', strand: 'ds', L: '500', given: 'm', val: '100', unit: 'ng' },
  primer: { label: 'Primer 20 nt: 10 pmol', strand: 'ss', L: '20', given: 'n', val: '10', unit: 'pmol' },
  kopien: { label: '10⁶ Kopien (200 bp)', strand: 'ds', L: '200', given: 'N', val: '10^6', unit: '' },
  lambda: { label: 'λ-DNA (48 502 bp)', strand: 'ds', L: '48502', given: 'm', val: '1', unit: 'µg' },
}

const EX_LIG: Record<string, { label: string; mV: string; LV: string; LI: string; rI: string; rV: string; cI: string; cV: string }> = {
  std: { label: 'Standard 3 : 1', mV: '50', LV: '3000', LI: '1000', rI: '3', rV: '1', cI: '', cV: '' },
  puc: { label: 'pUC19 + 750 bp, 1 : 1', mV: '100', LV: '2686', LI: '750', rI: '1', rV: '1', cI: '', cV: '' },
  klein: { label: 'kleines Insert 5 : 1', mV: '50', LV: '5400', LI: '300', rI: '5', rV: '1', cI: '', cV: '' },
  vol: { label: 'mit Pipettiervolumen', mV: '50', LV: '3000', LI: '1000', rI: '3', rV: '1', cI: '25', cV: '50' },
}

const EX_PRIMER: Record<string, { label: string; seq: string }> = {
  t7: { label: 'T7-Promotor', seq: 'TAATACGACTCACTATAGGG' },
  m13f: { label: 'M13 forward (−20)', seq: 'GTAAAACGACGGCCAGT' },
  m13r: { label: 'M13 reverse', seq: 'CAGGAAACAGCTATGAC' },
  kurz: { label: 'kurzes Oligo (12 nt)', seq: 'ACGTACGTACGT' },
}

const EX_PROT: Record<string, { label: string; pm: ProteinMode; A: string; eps: string; M: string; a: string; F: string }> = {
  bsa: { label: 'BSA molar (ε, M)', pm: 'molar', A: '0,33', eps: '43824', M: '66430', a: '0,66', F: '' },
  bsa66: { label: 'BSA: 1 mg/mL ≙ 0,66', pm: 'masse', A: '0,33', eps: '43824', M: '66430', a: '0,66', F: '' },
  igg: { label: 'IgG: 1 mg/mL ≙ 1,37', pm: 'masse', A: '0,685', eps: '', M: '', a: '1,37', F: '' },
  verd: { label: 'BSA 1 : 10 verdünnt', pm: 'masse', A: '0,462', eps: '43824', M: '66430', a: '0,66', F: '10' },
}

const opts = <T extends string>(rec: Record<string, { label: string }>) => Object.entries(rec).map(([k, e]) => [k, e.label] as [T, string])

export default function Nukleinsaeuren({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'konz')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'konz') as Mode
  // Konzentration
  const [A, setA] = useParam('A', '0,25')
  const [typ, setTyp] = useParam('typ', 'dsdna')
  const [fac, setFac] = useParam('f', '')
  const [F, setF] = useParam('F', '50')
  const [d, setD] = useParam('d', '1')
  const [du, setDu] = useParam('du', 'cm')
  const [V, setV] = useParam('V', '100')
  const [vu, setVu] = useParam('vu', 'µL')
  // Reinheit
  const [r260, setR260] = useParam('r260', '0,550')
  const [r280, setR280] = useParam('r280', '0,300')
  const [r230, setR230] = useParam('r230', '0,260')
  const [rtyp, setRtyp] = useParam('rtyp', 'dna')
  // ng ↔ pmol
  const [strand, setStrand] = useParam('strang', 'ds')
  const [L, setL] = useParam('L', '1000')
  const [given, setGiven] = useParam('gegeben', 'm')
  const [val, setVal] = useParam('wert', '1')
  const [wu, setWu] = useParam('wu', 'µg')
  const [Mb, setMb] = useParam('Mb', '')
  // Ligation
  const [mV, setMV] = useParam('mV', '50')
  const [LV, setLV] = useParam('LV', '3000')
  const [LI, setLI] = useParam('LI', '1000')
  const [rI, setRI] = useParam('rI', '3')
  const [rV, setRV] = useParam('rV', '1')
  const [cI, setCI] = useParam('cI', '')
  const [cV, setCV] = useParam('cV', '')
  // Primer
  const [seq, setSeq] = useParam('seq', 'TAATACGACTCACTATAGGG')
  // Protein
  const [pa, setPa] = useParam('pa', '0,33')
  const [pm, setPm] = useParam('pm', 'molar')
  const [eps, setEps] = useParam('eps', '43824')
  const [M, setM] = useParam('M', '66430')
  const [ma, setMa] = useParam('a', '0,66')
  const [pF, setPF] = useParam('pF', '')
  const [pd, setPd] = useParam('pd', '1')
  const [pdu, setPdu] = useParam('pdu', 'cm')
  // Fällung
  const [fV, setFV] = useParam('fV', '200')
  const [fvu, setFvu] = useParam('fvu', 'µL')
  const [salz, setSalz] = useParam('salz', 'naac')
  const [alk, setAlk] = useParam('alkohol', 'ethanol')
  const [fk, setFk] = useParam('fk', '')

  const kind = (KINDS.some(([k]) => k === typ) ? typ : 'dsdna') as NaKind | 'eigen'
  const st = (['ds', 'ss', 'rna'].includes(strand) ? strand : 'ds') as Strand
  const gv = (['m', 'n', 'N'].includes(given) ? given : 'm') as AmountGiven
  const units = gv === 'm' ? unitNames(NA_MASS_U) : gv === 'n' ? unitNames(NA_MOL_U) : []
  const wuOk = units.includes(wu) ? wu : gv === 'm' ? 'µg' : gv === 'n' ? 'pmol' : ''
  const pmode = (pm === 'masse' ? 'masse' : 'molar') as ProteinMode
  const salt = (salz === 'nh4ac' ? 'nh4ac' : 'naac') as PrecSalt
  const alcohol = (alk === 'isopropanol' ? 'isopropanol' : 'ethanol') as PrecAlcohol

  const { res, err } = useSolve(() => {
    switch (m) {
      case 'konz':
        return a260Conc({ A: parseNum(A, 'A₂₆₀'), kind, factor: parseNum(fac, 'Faktor'), F: parseNum(F, 'Verdünnungsfaktor'), d: parseNum(d, 'Schichtdicke'), du, V: parseNum(V, 'Volumen'), vu })
      case 'reinheit':
        return purity({ a260: parseNum(r260, 'A₂₆₀'), a280: parseNum(r280, 'A₂₈₀'), a230: parseNum(r230, 'A₂₃₀'), kind: rtyp === 'rna' ? 'rna' : 'dna' })
      case 'pmol':
        return ngPmol({ strand: st, L: parseNum(L, 'Länge'), given: gv, value: parseNum(val, 'Wert'), unit: wuOk, Mb: parseNum(Mb, 'Molare Masse pro Baustein') })
      case 'ligation':
        return ligation({ mV: parseNum(mV, 'Vektormasse'), LV: parseNum(LV, 'Vektorlänge'), LI: parseNum(LI, 'Insertlänge'), rI: parseNum(rI, 'Verhältnis Insert'), rV: parseNum(rV, 'Verhältnis Vektor'), cI: parseNum(cI, 'Konzentration Insert'), cV: parseNum(cV, 'Konzentration Vektor') })
      case 'primer':
        return primerTm(seq)
      case 'protein':
        return proteinA280({ A: parseNum(pa, 'A₂₈₀'), mode: pmode, eps: parseNum(eps, 'ε'), M: parseNum(M, 'Molare Masse'), a: parseNum(ma, 'Massen-Extinktionskoeffizient'), F: parseNum(pF, 'Verdünnungsfaktor'), d: parseNum(pd, 'Schichtdicke'), du: pdu })
      case 'faellung':
        return precipitation({ V: parseNum(fV, 'Volumen'), vu: fvu, salt, alcohol, k: parseNum(fk, 'Volumenfaktor') })
    }
  }, [m, A, kind, fac, F, d, du, V, vu, r260, r280, r230, rtyp, st, L, gv, val, wuOk, Mb, mV, LV, LI, rI, rV, cI, cV, seq, pa, pmode, eps, M, ma, pF, pd, pdu, fV, fvu, salt, alcohol, fk])

  return (
    <CalcPage
      eyebrow="Biologie · Laborrechner"
      title={tool.title}
      intro="Rechnen in der Molekularbiologie: DNA- und RNA-Konzentration aus der Absorption bei 260 nm, Reinheit, Umrechnung zwischen ng, pmol und Kopienzahl, Ligationsansatz, Schmelztemperatur von Primern, Proteinkonzentration aus A280 und die Alkoholfällung mit Natrium- oder Ammoniumacetat – jeweils mit vollständigem Rechenweg."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['konz', 'Konzentration (A260)'],
            ['reinheit', 'Reinheit'],
            ['pmol', 'ng ↔ pmol'],
            ['ligation', 'Ligation'],
            ['primer', 'Primer'],
            ['protein', 'Protein (A280)'],
            ['faellung', 'Fällung (Acetat)'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'konz' && (
            <>
              <span className="calc__label">Art der Nukleinsäure · Faktor f</span>
              <Seg value={kind} onChange={setTyp} options={KINDS} label="Art der Nukleinsäure" />
              <div className="calc__fields">
                <NumField label="Absorption A₂₆₀" sub="gemessen" value={A} onChange={setA} />
                <NumField label="Verdünnungsfaktor F" sub="z. B. 50 bei 1 : 50" value={F} onChange={setF} placeholder="1" />
                <NumField label="Schichtdicke d" sub="meist 1 cm" value={d} onChange={setD} unit={du === 'mm' ? 'mm' : 'cm'} units={['cm', 'mm']} onUnit={setDu} placeholder="1" />
                {kind === 'eigen' && <NumField label="Faktor f" sub="A₂₆₀ = 1 entspricht …" value={fac} onChange={setFac} unit="µg/mL" />}
                <NumField label="Probenvolumen V" sub="optional, für die Ausbeute" value={V} onChange={setV} unit={vu === 'mL' ? 'mL' : 'µL'} units={['µL', 'mL']} onUnit={setVu} />
              </div>
              <Examples
                items={opts(EX_KONZ)}
                onPick={(k) => {
                  const e = EX_KONZ[k]
                  setA(e.A)
                  setTyp(e.typ)
                  setF(e.F)
                  setD(e.d)
                  setDu(e.du)
                  setV(e.V)
                  setVu(e.vu)
                }}
              />
            </>
          )}
          {m === 'reinheit' && (
            <>
              <div className="calc__row">
                <span className="calc__label">Probe</span>
                <Seg
                  value={rtyp === 'rna' ? 'rna' : 'dna'}
                  onChange={setRtyp}
                  options={[
                    ['dna', 'DNA'],
                    ['rna', 'RNA'],
                  ]}
                  label="Art der Probe"
                />
              </div>
              <div className="calc__fields">
                <NumField label="A₂₆₀" sub="Nukleinsäure" value={r260} onChange={setR260} />
                <NumField label="A₂₈₀" sub="Protein" value={r280} onChange={setR280} />
                <NumField label="A₂₃₀" sub="optional: Salze, Phenol" value={r230} onChange={setR230} />
              </div>
              <Examples
                items={opts(EX_REIN)}
                onPick={(k) => {
                  const e = EX_REIN[k]
                  setR260(e.a260)
                  setR280(e.a280)
                  setR230(e.a230)
                  setRtyp(e.typ)
                }}
              />
            </>
          )}
          {m === 'pmol' && (
            <>
              <Seg
                value={st}
                onChange={(v) => {
                  setStrand(v)
                  setMb('')
                }}
                options={[
                  ['ds', 'dsDNA (bp)'],
                  ['ss', 'ssDNA / Oligo (nt)'],
                  ['rna', 'RNA (nt)'],
                ]}
                label="Art der Nukleinsäure"
              />
              <div className="calc__row">
                <span className="calc__label">Gegeben ist</span>
                <Seg
                  value={gv}
                  onChange={(v) => {
                    setGiven(v)
                    setWu(v === 'm' ? 'µg' : v === 'n' ? 'pmol' : '')
                    setVal(v === 'N' ? '10^6' : v === 'n' ? '1' : '1')
                  }}
                  options={[
                    ['m', 'Masse'],
                    ['n', 'Stoffmenge'],
                    ['N', 'Kopienzahl'],
                  ]}
                  label="Gegeben"
                />
              </div>
              <div className="calc__fields">
                <NumField label="Länge L" value={L} onChange={setL} unit={PER_UNIT[st].u} />
                <NumField label={gv === 'm' ? 'Masse m' : gv === 'n' ? 'Stoffmenge n' : 'Kopienzahl N'} sub={gv === 'N' ? 'z. B. 10^6' : undefined} value={val} onChange={setVal} unit={wuOk || undefined} units={units.length ? units : undefined} onUnit={setWu} />
                <NumField label={`M pro ${PER_UNIT[st].u}`} sub={`leer = ${PER_UNIT[st].M} g/mol`} value={Mb} onChange={setMb} unit="g/mol" placeholder={String(PER_UNIT[st].M)} />
              </div>
              <Examples
                items={opts(EX_PMOL)}
                onPick={(k) => {
                  const e = EX_PMOL[k]
                  setStrand(e.strand)
                  setL(e.L)
                  setGiven(e.given)
                  setVal(e.val)
                  setWu(e.unit)
                  setMb('')
                }}
              />
            </>
          )}
          {m === 'ligation' && (
            <>
              <div className="calc__fields">
                <NumField label="Vektor m_V" sub="eingesetzte Masse" value={mV} onChange={setMV} unit="ng" />
                <NumField label="Länge Vektor L_V" value={LV} onChange={setLV} unit="bp" />
                <NumField label="Länge Insert L_I" value={LI} onChange={setLI} unit="bp" />
              </div>
              <span className="calc__label">Molares Verhältnis Insert : Vektor</span>
              <div className="calc__fields">
                <NumField label="Insert" value={rI} onChange={setRI} placeholder="3" />
                <NumField label="Vektor" value={rV} onChange={setRV} placeholder="1" />
              </div>
              <span className="calc__label">Optional: Konzentrationen für die Pipettiervolumina</span>
              <div className="calc__fields">
                <NumField label="c Insert" value={cI} onChange={setCI} unit="ng/µL" />
                <NumField label="c Vektor" value={cV} onChange={setCV} unit="ng/µL" />
              </div>
              <Examples
                items={opts(EX_LIG)}
                onPick={(k) => {
                  const e = EX_LIG[k]
                  setMV(e.mV)
                  setLV(e.LV)
                  setLI(e.LI)
                  setRI(e.rI)
                  setRV(e.rV)
                  setCI(e.cI)
                  setCV(e.cV)
                }}
              />
            </>
          )}
          {m === 'primer' && (
            <>
              <label className="nf">
                <span className="nf__label">
                  Sequenz 5′ → 3′<small>nur A, C, G, T – Leerzeichen sind erlaubt</small>
                </span>
                <span className="nf__row">
                  <input className="nf__input nf__input--formula" value={seq} onChange={(e) => setSeq(e.target.value)} spellCheck={false} autoComplete="off" autoCapitalize="characters" placeholder="TAATACGACTCACTATAGGG" />
                </span>
              </label>
              <Examples items={opts(EX_PRIMER)} onPick={(k) => setSeq(EX_PRIMER[k].seq)} current={Object.keys(EX_PRIMER).find((k) => EX_PRIMER[k].seq === seq)} />
            </>
          )}
          {m === 'protein' && (
            <>
              <Seg
                value={pmode}
                onChange={setPm}
                options={[
                  ['molar', 'molarer ε und M'],
                  ['masse', 'A₂₈₀ bei 1 mg/mL'],
                ]}
                label="Extinktionskoeffizient"
              />
              <div className="calc__fields">
                <NumField label="Absorption A₂₈₀" sub="gemessen" value={pa} onChange={setPa} />
                {pmode === 'molar' ? (
                  <>
                    <NumField label="ε" sub="molarer Extinktionskoeffizient" value={eps} onChange={setEps} unit="L/(mol·cm)" />
                    <NumField label="Molare Masse M" sub="optional, für mg/mL" value={M} onChange={setM} unit="g/mol" />
                  </>
                ) : (
                  <NumField label="a" sub="A₂₈₀ einer Lösung mit 1 mg/mL" value={ma} onChange={setMa} unit="mL/(mg·cm)" />
                )}
                <NumField label="Verdünnungsfaktor F" sub="optional" value={pF} onChange={setPF} placeholder="1" />
                <NumField label="Schichtdicke d" value={pd} onChange={setPd} unit={pdu === 'mm' ? 'mm' : 'cm'} units={['cm', 'mm']} onUnit={setPdu} placeholder="1" />
              </div>
              <Examples
                items={opts(EX_PROT)}
                onPick={(k) => {
                  const e = EX_PROT[k]
                  setPm(e.pm)
                  setPa(e.A)
                  setEps(e.eps)
                  setM(e.M)
                  setMa(e.a)
                  setPF(e.F)
                  setPd('1')
                  setPdu('cm')
                }}
              />
            </>
          )}
          {m === 'faellung' && (
            <>
              <div className="calc__row">
                <span className="calc__label">Salz</span>
                <Seg
                  value={salt}
                  onChange={setSalz}
                  options={[
                    ['naac', 'Natriumacetat 3 M'],
                    ['nh4ac', 'Ammoniumacetat 7,5 M'],
                  ]}
                  label="Salz"
                />
              </div>
              <div className="calc__row">
                <span className="calc__label">Alkohol</span>
                <Seg
                  value={alcohol}
                  onChange={(v) => {
                    setAlk(v)
                    setFk('')
                  }}
                  options={[
                    ['ethanol', 'Ethanol'],
                    ['isopropanol', 'Isopropanol'],
                  ]}
                  label="Alkohol"
                />
              </div>
              <div className="calc__fields">
                <NumField label="Volumen der Probe" sub="DNA- oder RNA-Lösung" value={fV} onChange={setFV} unit={fvu === 'mL' ? 'mL' : 'µL'} units={['µL', 'mL']} onUnit={setFvu} />
                <NumField label="Volumenfaktor Alkohol" sub={`leer = ${alcohol === 'isopropanol' ? '0,7' : '2,5'}`} value={fk} onChange={setFk} placeholder={alcohol === 'isopropanol' ? '0,7' : '2,5'} unit="× V" />
              </div>
              <Examples
                items={opts(EX_FAELL)}
                onPick={(k) => {
                  const e = EX_FAELL[k]
                  setFV(e.V)
                  setFvu(e.vu)
                  setSalz(e.salt)
                  setAlk(e.alc)
                  setFk(e.k)
                }}
              />
              <p className="calc__hint">
                Der Alkohol wird auf Probe plus Salz bezogen (Faktor {alcohol === 'isopropanol' ? 'üblich 0,7–1' : 'üblich 2–2,5, bei RNA 3'}; Standard: {PREC_ALCOHOLS[alcohol].name}).
              </p>
            </>
          )}
          <p className="calc__hint">Kommazahlen mit Komma oder Punkt; Zehnerpotenzen wie 10^6 oder 2·10^-3 gehen auch.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage die Messwerte ein – der Lösungsweg erscheint hier." />
    </CalcPage>
  )
}
