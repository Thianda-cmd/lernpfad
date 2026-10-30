/** DNA/RNA/Protein, PCR-Ansatz, Statistik, Logarithmen, Dreisatz */
import { check, expectError, fail, group, near, resultHas, run as runH } from '../harness'
import type { Solution } from '../../src/math/alg/step'
import { parseNum } from '../../src/math/alg/numinput'
import { a260Conc, cleanSeq, ligation, ngPmol, precipitation, primerTm, proteinA280, purity, revComp } from '../../src/math/alg/nucleic'
import { mastermix, PCR_COMPONENTS, primerStock, type CompIn, type Reserve } from '../../src/math/alg/pcr'
import { describe, outlierTest, regression, t95 } from '../../src/math/alg/stats'
import { expEquation, growth, logCalc, powCalc } from '../../src/math/alg/logs'
import { percentBasic, percentChange, ruleOfThree } from '../../src/math/alg/percent'

const N = (s: string) => parseNum(s)
/** Logarithmen dürfen riesige Zahlen bekommen */
const NB = (s: string) => parseNum(s, 'Wert', 4000)

/** alle Zahlen nach „=“ bzw. „≈“ in einem TeX-Text (3{,}25 · 1\,000 · 1{,}5 \cdot 10^{-3}) */
function nums(tex: string): number[] {
  const out: number[] = []
  const re = /(=|\\approx|\\pm)\s*(-?)\s*(\d+(?:\\,\d{3})*(?:\{,\}\d+)?)(\s*\\cdot\s*10\^\{(-?\d+)\})?/g
  for (const m of tex.matchAll(re)) {
    const v = parseFloat(m[3].replace(/\\,/g, '').replace('{,}', '.')) * (m[5] ? 10 ** Number(m[5]) : 1)
    out.push(m[2] ? -v : v)
  }
  return out
}
/** alle berechneten Lösungen – am Ende auf verschluckte Backslashes prüfen („;\widehat“ statt „\;\widehat“) */
const ALL: [string, Solution][] = []
function run<T extends Solution | null>(where: string, f: () => T): T | null {
  const s = runH(where, f)
  if (s) ALL.push([where, s])
  return s
}

/** k-te Zahl im Ergebnis (oder in extra[i]) */
const R = (s: Solution | null, k = 0) => (s ? (nums(s.result)[k] ?? NaN) : NaN)
const X = (s: Solution | null, i: number, k = 0) => (s?.extra?.[i] ? (nums(s.extra[i])[k] ?? NaN) : NaN)

group('molbio-math', () => {
  /* ------------------------------ A260 ------------------------------ */
  {
    const s = run('A260 dsDNA 1:50 + Ausbeute', () => a260Conc({ A: N('0,25'), kind: 'dsdna', F: N('50'), d: N('1'), du: 'cm', V: N('100'), vu: 'µL' }))
    near('A260 dsDNA c', R(s), 625)
    near('A260 dsDNA Ausbeute µg', X(s, 1), 62.5)
    resultHas('A260 dsDNA ng/µL', s, '625', 'ng')
    const r = run('A260 RNA 1:20', () => a260Conc({ A: N('0,42'), kind: 'rna', F: N('20'), V: N('50'), vu: 'µL' }))
    near('A260 RNA c', R(r), 336)
    near('A260 RNA Ausbeute µg', X(r, 1), 16.8)
    near('A260 Oligo 1:100', R(run('A260 Oligo', () => a260Conc({ A: N('0,5'), kind: 'oligo', F: N('100') }))), 1650)
    near('A260 ssDNA unverdünnt', R(run('A260 ssDNA', () => a260Conc({ A: N('0,6'), kind: 'ssdna' }))), 19.8)
    near('A260 d = 1 mm', R(run('A260 1 mm', () => a260Conc({ A: N('0,8'), kind: 'dsdna', d: N('1'), du: 'mm' }))), 400)
    near('A260 eigener Faktor', R(run('A260 eigen', () => a260Conc({ A: N('0,3'), kind: 'eigen', factor: N('45') }))), 13.5)
    near('A260 Volumen in mL', X(run('A260 mL', () => a260Conc({ A: N('0,2'), kind: 'dsdna', F: N('10'), V: N('0,5'), vu: 'mL' })), 1), 50)
    expectError('A260 leer', () => a260Conc({ A: null, kind: 'dsdna' }))
    expectError('A260 = 0', () => a260Conc({ A: N('0'), kind: 'dsdna' }))
    expectError('A260 negativ', () => a260Conc({ A: N('-0,2'), kind: 'rna' }))
    expectError('A260 F < 1', () => a260Conc({ A: N('0,2'), kind: 'rna', F: N('0,5') }))
    expectError('A260 d = 0', () => a260Conc({ A: N('0,2'), kind: 'rna', d: N('0') }))
    expectError('A260 eigener Faktor fehlt', () => a260Conc({ A: N('0,2'), kind: 'eigen', factor: null }))
    expectError('A260 Volumen 0', () => a260Conc({ A: N('0,2'), kind: 'rna', V: N('0') }))
  }

  /* ------------------------------ Reinheit ------------------------------ */
  {
    const s = run('Reinheit DNA rein', () => purity({ a260: N('0,550'), a280: N('0,300'), a230: N('0,260'), kind: 'dna' }))
    near('Reinheit 260/280', R(s, 0), 1.83, 1e-9)
    near('Reinheit 260/230', R(s, 1), 2.12, 1e-9)
    resultHas('Reinheit DNA rein (Text)', s, 'DNA (260/280): rein', 'DNA (260/230): rein')
    const p = run('Reinheit Protein', () => purity({ a260: N('0,500'), a280: N('0,340'), kind: 'dna' }))
    near('Reinheit Protein 260/280', R(p), 1.47, 1e-9)
    resultHas('Reinheit Protein verunreinigt', p, 'Protein oder Phenol')
    const g = run('Reinheit Guanidin', () => purity({ a260: N('0,600'), a280: N('0,330'), a230: N('0,500'), kind: 'dna' }))
    near('Reinheit Guanidin 260/230', R(g, 1), 1.2, 1e-9)
    resultHas('Reinheit Guanidin erkannt', g, '(260/230): verunreinigt')
    const rna = run('Reinheit RNA', () => purity({ a260: N('0,800'), a280: N('0,395'), a230: N('0,370'), kind: 'rna' }))
    near('Reinheit RNA 260/280', R(rna), 2.03, 1e-9)
    resultHas('Reinheit RNA rein', rna, 'RNA (260/280): rein')
    resultHas('Reinheit DNA mit RNA', run('Reinheit RNA in DNA', () => purity({ a260: N('0,420'), a280: N('0,200'), kind: 'dna' })), 'RNA in der Probe')
    // Grenzfall: 0,6798/0,4 = 1,6995 wird als 1,70 angezeigt – dann muss auch die Bewertung „rein“ lauten
    resultHas('Reinheit Grenzfall 1,70 gerundet', run('Reinheit Grenzfall', () => purity({ a260: N('0,6798'), a280: N('0,4'), kind: 'dna' })), '1,70', 'DNA (260/280): rein')
    expectError('Reinheit A280 = 0', () => purity({ a260: N('0,5'), a280: N('0'), kind: 'dna' }))
    expectError('Reinheit A260 fehlt', () => purity({ a260: null, a280: N('0,3'), kind: 'dna' }))
    expectError('Reinheit A230 negativ', () => purity({ a260: N('0,5'), a280: N('0,3'), a230: N('-1'), kind: 'dna' }))
  }

  /* ------------------------------ ng ↔ pmol ------------------------------ */
  {
    const s = run('pmol 1 µg 1000 bp', () => ngPmol({ strand: 'ds', L: N('1000'), given: 'm', value: N('1'), unit: 'µg' }))
    near('pmol 1 µg 1000 bp: n', R(s, 0), 1.5385)
    near('pmol 1 µg 1000 bp: Kopien', R(s, 1), 9.265e11)
    near('pmol Plasmid 3000 bp', R(run('pmol 3000 bp', () => ngPmol({ strand: 'ds', L: N('3000'), given: 'm', value: N('1'), unit: 'µg' }))), 0.5128)
    const p = run('Primer 10 pmol → ng', () => ngPmol({ strand: 'ss', L: N('20'), given: 'n', value: N('10'), unit: 'pmol' }))
    near('Primer 10 pmol → 66 ng', R(p, 0), 66)
    resultHas('Primer 66 ng exakt', p, 'm = 66')
    const c = run('10⁶ Kopien 200 bp', () => ngPmol({ strand: 'ds', L: N('200'), given: 'N', value: N('10^6'), unit: '' }))
    near('10⁶ Kopien: Masse pg', R(c, 0), 0.21588)
    near('10⁶ Kopien: amol', R(c, 1), 1.6606)
    const l = run('Lambda-DNA', () => ngPmol({ strand: 'ds', L: N('48502'), given: 'm', value: N('1'), unit: 'µg' }))
    near('Lambda fmol', R(l, 0), 31.72)
    near('Lambda Kopien', R(l, 1), 1.910e10)
    near('RNA 340 g/mol', R(run('RNA 1500 nt', () => ngPmol({ strand: 'rna', L: N('1500'), given: 'm', value: N('2'), unit: 'µg' }))), 3.9216)
    near('dsDNA mit 660 g/mol', R(run('660 g/mol', () => ngPmol({ strand: 'ds', L: N('1000'), given: 'm', value: N('1'), unit: 'µg', Mb: N('660') }))), 1.5152)
    expectError('pmol Länge fehlt', () => ngPmol({ strand: 'ds', L: null, given: 'm', value: N('1'), unit: 'µg' }))
    expectError('pmol Masse 0', () => ngPmol({ strand: 'ds', L: N('1000'), given: 'm', value: N('0'), unit: 'µg' }))
    expectError('pmol Länge negativ', () => ngPmol({ strand: 'ss', L: N('-20'), given: 'n', value: N('1'), unit: 'pmol' }))
  }

  /* ------------------------------ Ligation ------------------------------ */
  {
    const s = run('Ligation 3:1', () => ligation({ mV: N('50'), LV: N('3000'), LI: N('1000'), rI: N('3'), rV: N('1'), cI: N('25'), cV: N('50') }))
    near('Ligation 3:1 Insertmasse', R(s), 50)
    near('Ligation V Insert', X(s, 0, 0), 2)
    near('Ligation V Vektor', X(s, 0, 1), 1)
    near('Ligation n Vektor fmol', X(s, 1, 0), 25.641)
    near('Ligation n Insert fmol', X(s, 1, 1), 76.923)
    near('Ligation pUC19 1:1', R(run('Ligation pUC19', () => ligation({ mV: N('100'), LV: N('2686'), LI: N('750'), rI: N('1'), rV: N('1') }))), 27.92)
    near('Ligation ohne Verhältnis → Standard 3:1', R(run('Ligation Standardverhältnis', () => ligation({ mV: N('50'), LV: N('5400'), LI: N('300') }))), 8.3333)
    near('Ligation 5:1', R(run('Ligation 5:1', () => ligation({ mV: N('50'), LV: N('5400'), LI: N('300'), rI: N('5'), rV: N('1') }))), 13.889)
    expectError('Ligation Vektor fehlt', () => ligation({ mV: null, LV: N('3000'), LI: N('1000') }))
    expectError('Ligation Länge 0', () => ligation({ mV: N('50'), LV: N('0'), LI: N('1000') }))
    expectError('Ligation Verhältnis 0', () => ligation({ mV: N('50'), LV: N('3000'), LI: N('1000'), rI: N('0') }))
  }

  /* ------------------------------ Primer ------------------------------ */
  {
    const t7 = run('Primer T7', () => primerTm('TAATACGACTCACTATAGGG'))
    near('T7 Tm (GC-Formel)', R(t7), 47.7, 1e-9)
    near('T7 GC-Gehalt', X(t7, 0), 40)
    near('T7 Tm Wallace', X(t7, 1), 56)
    near('T7 Molmasse', X(t7, 2), 6125.07, 1e-6)
    const m13 = run('Primer M13 fwd', () => primerTm('GTAAAACGACGGCCAGT'))
    near('M13 Tm', R(m13), 47.1, 1e-9)
    near('M13 Wallace', X(m13, 1), 52)
    const short = run('Primer 12 nt', () => primerTm('ACGTACGTACGT'))
    near('12 nt Wallace als Hauptwert', R(short), 36)
    resultHas('12 nt Wallace', short, 'Wallace')
    near('Primer mit 5′/3′, Kleinbuchstaben, Leerzeichen', R(run('Primer bereinigt', () => primerTm("5'-taa tac gac tca cta tag gg-3'"))), 47.7, 1e-9)
    check('Primer zählt Basen', (() => { const c = cleanSeq('GTAAAACGACGGCCAGT'); return c.N === 17 && c.A === 6 && c.C === 4 && c.G === 5 && c.T === 2 })())
    check('revers-komplementär', revComp('AACGTT') === 'AACGTT' && revComp('ATGC') === 'GCAT')
    expectError('Primer mit U', () => primerTm('ACGUACGUACGU'))
    expectError('Primer mit N', () => primerTm('ACGTNACGTACG'))
    expectError('Primer zu kurz', () => primerTm('ACGT'))
    expectError('Primer leer', () => primerTm('  '))
  }

  /* ------------------------------ Protein A280 ------------------------------ */
  {
    const b = run('BSA molar', () => proteinA280({ A: N('0,33'), mode: 'molar', eps: N('43824'), M: N('66430') }))
    near('BSA molar mg/mL', R(b), 0.50023)
    near('BSA molar µmol/L', X(b, 0), 7.5301)
    near('BSA Massenkoeffizient', X(b, 1), 0.6597)
    near('BSA 0,66', R(run('BSA Masse', () => proteinA280({ A: N('0,33'), mode: 'masse', a: N('0,66') }))), 0.5)
    near('IgG 1,37', R(run('IgG', () => proteinA280({ A: N('0,685'), mode: 'masse', a: N('1,37') }))), 0.5)
    near('BSA 1:10 verdünnt', R(run('BSA verdünnt', () => proteinA280({ A: N('0,462'), mode: 'masse', a: N('0,66'), F: N('10') }))), 7)
    near('Protein ohne M → µmol/L', R(run('Protein molar ohne M', () => proteinA280({ A: N('0,5'), mode: 'molar', eps: N('50000') }))), 10)
    expectError('Protein ε fehlt', () => proteinA280({ A: N('0,5'), mode: 'molar', eps: null }))
    expectError('Protein a fehlt', () => proteinA280({ A: N('0,5'), mode: 'masse', a: null }))
    expectError('Protein A = 0', () => proteinA280({ A: N('0'), mode: 'masse', a: N('0,66') }))
  }

  /* ------------------------------ Fällung mit Acetat ------------------------------ */
  {
    const s = run('Fällung Natriumacetat 200 µL', () => precipitation({ V: N('200'), vu: 'µL', salt: 'naac', alcohol: 'ethanol' }))
    near('Fällung NaAc Salzvolumen', R(s, 0), 20, 0)
    near('Fällung NaAc Ethanol', R(s, 1), 550, 0)
    near('Fällung NaAc c(Na+)', X(s, 0, 0), 0.2727, 1e-4)
    near('Fällung NaAc Ethanolanteil', X(s, 0, 1), 71.43, 1e-4)
    near('Fällung NaAc Gesamtvolumen', X(s, 1), 770, 0)
    const a = run('Fällung Ammoniumacetat', () => precipitation({ V: N('100'), salt: 'nh4ac', alcohol: 'ethanol' }))
    near('Fällung NH4Ac Salz', R(a, 0), 50, 0)
    near('Fällung NH4Ac Ethanol', R(a, 1), 375, 0)
    near('Fällung NH4Ac c = 2,5 mol/L', X(a, 0, 0), 2.5, 0)
    const i = run('Fällung Isopropanol 0,5 mL', () => precipitation({ V: N('0,5'), vu: 'mL', salt: 'naac', alcohol: 'isopropanol' }))
    near('Fällung Isopropanol Salz', R(i, 0), 50, 0)
    near('Fällung Isopropanol Volumen', R(i, 1), 385, 0)
    near('Fällung Isopropanol Anteil', X(i, 0, 1), 41.18, 1e-4)
    near('Fällung RNA 3-fach', R(run('Fällung RNA', () => precipitation({ V: N('100'), salt: 'naac', alcohol: 'ethanol', k: N('3') })), 1), 330, 0)
    check('Fällung großer Ansatz: Hinweis 2-mL-Gefäß', (run('Fällung 600 µL', () => precipitation({ V: N('600'), salt: 'naac', alcohol: 'ethanol' }))?.remark ?? '').includes('2-mL'))
    expectError('Fällung Volumen fehlt', () => precipitation({ V: null, salt: 'naac', alcohol: 'ethanol' }))
    expectError('Fällung Volumen 0', () => precipitation({ V: N('0'), salt: 'naac', alcohol: 'ethanol' }))
    expectError('Fällung Faktor 0', () => precipitation({ V: N('100'), salt: 'naac', alcohol: 'ethanol', k: N('0') }))
    expectError('Fällung Faktor riesig', () => precipitation({ V: N('100'), salt: 'naac', alcohol: 'ethanol', k: N('25') }))
  }

  /* ------------------------------ PCR Mastermix ------------------------------ */
  const comps = (over: Partial<Record<string, [string, string]>> = {}): CompIn[] =>
    PCR_COMPONENTS.map((c) => {
      const [s, e] = over[c.key] ?? [c.stock, c.end]
      return { name: c.name, tex: c.tex, unit: c.unit, stock: N(s), end: N(e), note: c.note }
    })
  const mm = (n: string, reserve: Reserve, V: string, tpl: string, over = {}) => mastermix({ n: N(n), reserve, V: N(V), template: N(tpl), comps: comps(over) })
  {
    const s = run('Mastermix 8 Proben 50 µL', () => mm('8', 'eins', '50', '2'))
    near('Mastermix 8+1 gesamt', R(s), 432)
    near('Mastermix je Gefäß', X(s, 0), 48)
    near('Mastermix Wasser gesamt', X(s, 1), 312.75)
    check('Mastermix Faktor 9', !!s && Number(s.factor.n) === 9)
    check('Mastermix Tabelle', !!s && s.rows.length === 8 && s.rows[0].per === '5' && s.rows[0].total === '45' && s.rows[5].per === '0{,}25' && s.rows[5].total === '2{,}25' && s.rows[6].per === '34{,}75')
    const p = run('Mastermix 96er +10 %', () => mm('96', 'zehn', '25', '2'))
    near('Mastermix 96er gesamt', R(p), 2428.8)
    near('Mastermix 96er Wasser', X(p, 1), 1729.2)
    check('Mastermix 96er Puffer', !!p && p.rows[0].total === '264')
    const k = run('Kolonie-PCR ohne Mg', () => mm('12', 'eins', '20', '0', { mg: ['25', '0'] }))
    near('Kolonie-PCR gesamt', R(k), 260)
    check('Kolonie-PCR Mg entfällt', !!k && k.rows[4].per === '\\text{–}' && k.rows[6].per === '15{,}9')
    near('Mastermix ohne Reserve', R(run('Mastermix ohne Reserve', () => mm('4', 'keine', '50', '5'))), 180)
    expectError('Mastermix n = 0', () => mm('0', 'eins', '50', '2'))
    expectError('Mastermix n = 2,5', () => mm('2,5', 'eins', '50', '2'))
    expectError('Mastermix V fehlt', () => mastermix({ n: N('8'), reserve: 'eins', V: null, template: N('2'), comps: comps() }))
    expectError('Mastermix Ende > Stamm', () => mm('8', 'eins', '50', '2', { fw: ['10', '20'] }))
    expectError('Mastermix passt nicht', () => mm('8', 'eins', '10', '8'))
    expectError('Mastermix Stamm fehlt', () => mm('8', 'eins', '50', '2', { dntp: ['', '0,2'] }))
    expectError('Mastermix Template zu groß', () => mm('8', 'eins', '20', '20'))
  }

  /* ------------------------------ Primer lösen ------------------------------ */
  {
    const s = run('Primer lösen 25,3 nmol', () => primerStock({ n: N('25,3'), nu: 'nmol', cS: N('100'), cW: N('10'), VW: N('100') }))
    near('Primer 25,3 nmol → 253 µL', R(s), 253)
    near('Primer Arbeitslösung Stamm', X(s, 1, 0), 10)
    near('Primer Arbeitslösung Wasser', X(s, 1, 1), 90)
    const t = run('Primer lösen 38,7 nmol', () => primerStock({ n: N('38,7'), nu: 'nmol', cS: N('100'), cW: N('10'), VW: N('200') }))
    near('Primer 38,7 nmol', R(t), 387)
    near('Primer 38,7 nmol Stamm 20 µL', X(t, 1, 0), 20)
    near('Primer 500 pmol', R(run('Primer pmol', () => primerStock({ n: N('500'), nu: 'pmol', cS: N('100') }))), 5)
    near('Primer 50 µM', R(run('Primer 50 µM', () => primerStock({ n: N('12,5'), nu: 'nmol', cS: N('50') }))), 250)
    expectError('Primer n fehlt', () => primerStock({ n: null, nu: 'nmol', cS: N('100') }))
    expectError('Primer c = 0', () => primerStock({ n: N('20'), nu: 'nmol', cS: N('0') }))
    expectError('Primer Arbeitslösung zu konzentriert', () => primerStock({ n: N('20'), nu: 'nmol', cS: N('100'), cW: N('100'), VW: N('50') }))
    expectError('Primer Arbeitslösung ohne Volumen', () => primerStock({ n: N('20'), nu: 'nmol', cS: N('100'), cW: N('10'), VW: null }))
  }

  /* ------------------------------ Statistik: Kenngrößen ------------------------------ */
  {
    const s = run('Kenngrößen Pipette', () => describe('0,998 1,002 0,995 1,001 0,999 1,003 0,997 1,000 0,996 1,004'))
    near('Pipette Mittelwert', s?.mean ?? NaN, 0.9995, 1e-12)
    near('Pipette s', s?.sd ?? NaN, 0.0030277)
    near('Pipette Median', X(s, 0, 0), 0.9995)
    near('Pipette Spannweite', X(s, 0, 1), 0.009)
    near('Pipette VK %', X(s, 1), 0.3029)
    near('Pipette Δ (t = 2,262)', X(s, 2, 1), 0.0021657)
    check('Pipette Abweichungstabelle', !!s && s.rows.length === 10 && s.rows[0][2] === '-0{,}0015')
    const h = run('Kenngrößen Hb', () => describe('14,2; 14,5; 14,1; 14,4; 14,3'))
    near('Hb s', h?.sd ?? NaN, 0.158114)
    near('Hb VK', X(h, 1), 1.1057)
    near('Hb Δ (t = 2,776)', X(h, 2, 1), 0.19629)
    const z = run('Kenngrößen Zellzahl', () => describe('52\n47\n55\n50'))
    near('Zellzahl Mittelwert', z?.mean ?? NaN, 51)
    near('Zellzahl s', z?.sd ?? NaN, 3.3665)
    near('Zellzahl Median (gerade Anzahl)', X(z, 0, 0), 51)
    near('t-Tabelle f = 9', t95(9).t, 2.262, 0)
    near('t-Tabelle f = 30', t95(30).t, 2.042, 0)
    near('t interpoliert f = 34', t95(34).t, 2.0322, 2e-4)
    near('t interpoliert f = 200', t95(200).t, 1.9719, 2e-4)
    near('t f = 120', t95(120).t, 1.98, 0)
    const big = run('Kenngrößen n = 35', () => describe(Array.from({ length: 35 }, (_, i) => (10 + (i % 7) / 10).toFixed(1).replace('.', ',')).join(' ')))
    check('n = 35 ohne TeX-Tabelle', !!big && !big.steps.some((st) => st.tex.includes('\\begin{array}')))
    expectError('Kenngrößen leer', () => describe('  '))
    expectError('Kenngrößen ein Wert', () => describe('5'))
    expectError('Kenngrößen Text', () => describe('1,2; abc'))
  }

  /* ------------------------------ Statistik: Ausreißer ------------------------------ */
  {
    const g = run('Grubbs Glucose', () => outlierTest('98 101 99 100 102 97 115', 'grubbs'))
    check('Grubbs: 115 ist Ausreißer', !!g && g.outlier && g.values[g.suspect] === 115)
    near('Grubbs G', X(g, 0, 0), 2.1772, 1e-4)
    near('Grubbs G_krit n = 7', X(g, 0, 1), 2.02, 0)
    const n = run('Grubbs ohne Ausreißer', () => outlierTest('5,2 5,4 5,3 5,5 5,3 5,6', 'grubbs'))
    check('Grubbs: kein Ausreißer', !!n && !n.outlier)
    near('Grubbs G kein Ausreißer', X(n, 0, 0), 1.472, 1e-3)
    const d = run('Dixon Titration', () => outlierTest('12,45 12,48 12,46 12,61 12,47', 'dixon'))
    check('Dixon: 12,61 ist Ausreißer', !!d && d.outlier && d.values[d.suspect] === 12.61)
    near('Dixon Q', X(d, 0, 0), 0.8125, 0)
    near('Dixon Q_krit n = 5', X(d, 0, 1), 0.71, 0)
    const d2 = run('Dixon kein Ausreißer', () => outlierTest('10,1 10,3 10,2 10,4 10,6', 'dixon'))
    check('Dixon: kein Ausreißer', !!d2 && !d2.outlier)
    near('Dixon Q = 0,4', X(d2, 0, 0), 0.4, 0)
    const d3 = run('Dixon unten, n = 3', () => outlierTest('8,9 10,0 10,1', 'dixon'))
    check('Dixon n = 3: 8,9 verdächtig, aber kein Ausreißer', !!d3 && !d3.outlier && d3.values[d3.suspect] === 8.9)
    expectError('Dixon n = 11', () => outlierTest('1 2 3 4 5 6 7 8 9 10 30', 'dixon'))
    expectError('Grubbs n = 31', () => outlierTest(Array.from({ length: 31 }, (_, i) => String(i)).join(' '), 'grubbs'))
    expectError('Ausreißer alle gleich', () => outlierTest('5 5 5 5', 'grubbs'))
    expectError('Ausreißer zu wenige', () => outlierTest('5 6', 'dixon'))
  }

  /* ------------------------------ Statistik: Regression ------------------------------ */
  {
    const s = run('Regression Bradford', () => regression('0; 0,002\n5; 0,118\n10; 0,231\n15; 0,352\n20; 0,463\n25; 0,577'))
    near('Bradford m', s?.fit.m ?? NaN, 0.0230343)
    near('Bradford b', s?.fit.b ?? NaN, 0.00257143)
    near('Bradford R²', X(s, 0, 1), 0.99991, 1e-5)
    near('Bradford s_y', X(s, 1), 0.0023176)
    const e = run('Regression exakt', () => regression('1 3\n2 5\n3 7\n4 9'))
    resultHas('Regression exakt y = 2x + 1', e, 'y = 2 \\cdot x + 1')
    near('Regression exakt r', X(e, 0, 0), 1, 0)
    const ng = run('Regression fallend', () => regression('1;10\n2;8\n3;6,5\n4;4\n5;2'))
    near('Regression fallend m', ng?.fit.m ?? NaN, -2)
    near('Regression fallend r', X(ng, 0, 0), -0.9975, 1e-4)
    const h = run('Regression waagerecht', () => regression('1;5\n2;5\n3;5'))
    resultHas('Regression waagerecht', h, 'nicht definiert', 'y = 5')
    check('Regression waagerecht ohne „0 + 5“', !!h && !h.result.includes('0 +'))
    expectError('Regression zwei Paare', () => regression('1;2\n2;3'))
    expectError('Regression gleiche x', () => regression('2;1\n2;3\n2;5'))
    expectError('Regression drei Zahlen in einer Zeile', () => regression('1;2;3\n2;3\n3;4'))
    expectError('Regression leer', () => regression(''))
  }

  /* ------------------------------ Logarithmen ------------------------------ */
  {
    const a = run('lg 1000', () => logCalc({ base: '10', x: N('1000') }))
    resultHas('lg 1000 = 3 exakt', a, '= 3')
    near('lg 2500', R(run('lg 2500', () => logCalc({ base: '10', x: N('2500') }))), 3.3979, 1e-9)
    near('ln 2', R(run('ln 2', () => logCalc({ base: 'e', x: N('2') }))), 0.6931, 1e-9)
    resultHas('log2 64 = 6', run('log2 64', () => logCalc({ base: '2', x: N('64') })), '= 6')
    near('log3 50', R(run('log3 50', () => logCalc({ base: 'b', b: N('3'), x: N('50') }))), 3.5609, 1e-9)
    resultHas('log4 8 = 3/2', run('log4 8', () => logCalc({ base: 'b', b: N('4'), x: N('8') })), '\\frac{3}{2}')
    resultHas('lg 0,001 = −3', run('lg 0,001', () => logCalc({ base: '10', x: N('0,001') })), '= -3')
    resultHas('log½ 8 = −3', run('log½ 8', () => logCalc({ base: 'b', b: N('1/2'), x: N('8') })), '= -3')
    near('lg 0,05', R(run('lg 0,05', () => logCalc({ base: '10', x: N('0,05') }))), -1.301, 1e-9)
    resultHas('ln 1 = 0', run('ln 1', () => logCalc({ base: 'e', x: N('1') })), '= 0')
    expectError('log x = 0', () => logCalc({ base: '10', x: N('0') }))
    expectError('log x negativ', () => logCalc({ base: 'e', x: N('-5') }))
    expectError('log Basis 1', () => logCalc({ base: 'b', b: N('1'), x: N('5') }))
    expectError('log Basis 0', () => logCalc({ base: 'b', b: N('0'), x: N('5') }))
    expectError('log Basis fehlt', () => logCalc({ base: 'b', b: null, x: N('5') }))
    // Delogarithmieren
    const ks = run('Ks Essigsäure 10^-4,76', () => powCalc({ base: '10', y: N('-4,76') }))
    near('Ks Essigsäure', R(ks), 1.738e-5)
    resultHas('10^3 = 1000', run('10^3', () => powCalc({ base: '10', y: N('3') })), '= 1000')
    resultHas('10^-3 = 0,001', run('10^-3', () => powCalc({ base: '10', y: N('-3') })), '= 0,001')
    near('e^0,5', R(run('e^0,5', () => powCalc({ base: 'e', y: N('0,5') }))), 1.6487)
    resultHas('4^1,5 = 8', run('4^1,5', () => powCalc({ base: 'b', b: N('4'), y: N('1,5') })), '= 8')
    near('10^2,5', R(run('10^2,5', () => powCalc({ base: '10', y: N('2,5') }))), 316.2)
    // sehr große Zahlen (jenseits von 10^308) – exakt bzw. über die Stellenzahl
    resultHas('lg 1e400 = 400', run('lg 1e400', () => logCalc({ base: '10', x: NB('1e400') })), '= 400')
    near('lg 2e400', R(run('lg 2e400', () => logCalc({ base: '10', x: NB('2e400') }))), 400.301, 1e-6)
    near('ln 1e400', R(run('ln 1e400', () => logCalc({ base: 'e', x: NB('1e400') }))), 921.034, 1e-6)
    resultHas('10^500', run('10^500', () => powCalc({ base: '10', y: N('500') })), '10^{500}')
    resultHas('10^x = 1e400', run('10^x = 1e400', () => expEquation({ b: N('10'), c: NB('1e400') })), 'x = 400')
    near('2^x = 3e400', R(run('2^x = 3e400', () => expEquation({ b: N('2'), c: NB('3e400') }))), 1330.3562, 1e-6)
    expectError('Delogarithmieren leer', () => powCalc({ base: '10', y: null }))
    expectError('Delogarithmieren zu groß', () => powCalc({ base: 'e', y: N('800') }))
  }

  /* ------------------------------ Exponentialgleichungen ------------------------------ */
  {
    near('2^x = 50', R(run('2^x = 50', () => expEquation({ b: N('2'), c: N('50') }))), 5.6439, 1e-9)
    resultHas('3·2^x + 4 = 100 → 5', run('3·2^x + 4 = 100', () => expEquation({ a: N('3'), b: N('2'), c: N('100'), d: N('4') })), 'x = 5')
    near('1,05^x = 2', R(run('1,05^x = 2', () => expEquation({ b: N('1,05'), c: N('2') }))), 14.2067, 1e-9)
    near('0,5^x = 0,1', R(run('0,5^x = 0,1', () => expEquation({ b: N('0,5'), c: N('0,1') }))), 3.3219, 1e-9)
    resultHas('5·3^x = 405 → 4', run('5·3^x = 405', () => expEquation({ a: N('5'), b: N('3'), c: N('405') })), 'x = 4')
    resultHas('2^x = 0,125 → −3', run('2^x = 0,125', () => expEquation({ b: N('2'), c: N('0,125') })), 'x = -3')
    resultHas('−2·3^x + 10 = 4 → 1', run('−2·3^x + 10 = 4', () => expEquation({ a: N('-2'), b: N('3'), c: N('4'), d: N('10') })), 'x = 1')
    expectError('2^x = −4', () => expEquation({ b: N('2'), c: N('-4') }))
    expectError('3·2^x + 10 = 4', () => expEquation({ a: N('3'), b: N('2'), c: N('4'), d: N('10') }))
    expectError('Basis 1 (keine Lösung)', () => expEquation({ b: N('1'), c: N('5') }))
    expectError('Basis 1 (alle x)', () => expEquation({ b: N('1'), c: N('1') }))
    expectError('Basis 0', () => expEquation({ b: N('0'), c: N('5') }))
    expectError('a = 0', () => expEquation({ a: N('0'), b: N('2'), c: N('5') }))
  }

  /* ------------------------------ Wachstum und Zerfall ------------------------------ */
  {
    const g = (o: Partial<Parameters<typeof growth>[0]>) => growth({ kind: 'verdopplung', N: null, N0: null, t: null, tu: 'h', T: null, Tu: 'min', ...o })
    const s = run('E. coli 3 h', () => g({ N0: N('1000'), t: N('3'), T: N('20') }))
    near('E. coli N', R(s), 512000)
    resultHas('E. coli exakt', s, '512')
    check('E. coli: in die kleinere Einheit umgerechnet (3 h = 180 min)', !!s && s.steps.some((st) => st.tex === 't = 3\\,\\text{h} = 180\\,\\text{min}'))
    const th = run('Zeit bis 10⁹ in h', () => g({ N0: N('1000'), N: N('10^9'), tu: 'h', T: N('20'), Tu: 'min' }))
    near('Zeit bis 10⁹ in h (Ergebnis)', R(th), 6.644)
    near('Zeit bis 10⁹ in h (auch in min)', X(th, 0), 398.6)
    resultHas('Halbwertszeit 48 h → 1 d', run('Halbwertszeit in d', () => growth({ kind: 'halbwert', N: N('20'), N0: N('80'), t: N('48'), tu: 'h', T: null, Tu: 'd' })), '= 1 \\text{d}')
    const p = run('32P nach 30 d', () => growth({ kind: 'halbwert', N: null, N0: N('100'), t: N('30'), tu: 'd', T: N('14,3'), Tu: 'd', unit: '%' }))
    near('32P Rest', R(p), 23.36)
    const t = run('Zeit bis 10⁹ Zellen', () => g({ N0: N('1000'), N: N('10^9'), tu: 'min', T: N('20') }))
    near('Zeit bis 10⁹ (min)', R(t), 398.63)
    near('Zeit bis 10⁹ (h)', X(t, 0), 6.644)
    resultHas('Generationszeit exakt 30 min', run('Generationszeit', () => g({ N0: N('10000'), N: N('80000'), t: N('90'), tu: 'min', Tu: 'min' })), '= 30')
    resultHas('Zerfall t = 3 Halbwertszeiten', run('Zerfall t', () => growth({ kind: 'halbwert', N: N('12,5'), N0: N('100'), t: null, tu: 'd', T: N('8'), Tu: 'd' })), '= 24')
    resultHas('N₀ zurückrechnen', run('N0', () => g({ N: N('512000'), t: N('3'), T: N('20') })), '= 1000')
    resultHas('Halbwertszeit aus Messung', run('Halbwertszeit', () => growth({ kind: 'halbwert', N: N('20'), N0: N('80'), t: N('10'), tu: 'h', T: null, Tu: 'h' })), '= 5')
    near('Halbwertszeit in Jahren (a)', R(run('C14', () => growth({ kind: 'halbwert', N: null, N0: N('100'), t: N('11460'), tu: 'a', T: N('5730'), Tu: 'a', unit: '%' }))), 25)
    expectError('Wachstum zwei Größen fehlen', () => g({ N0: N('1000'), t: N('3') }))
    expectError('Wachstum N < N₀', () => g({ N0: N('1000'), N: N('500'), T: N('20') }))
    expectError('Zerfall N > N₀', () => growth({ kind: 'halbwert', N: N('200'), N0: N('100'), t: null, tu: 'd', T: N('8'), Tu: 'd' }))
    expectError('Wachstum T = 0', () => g({ N0: N('1000'), t: N('3'), T: N('0') }))
    expectError('Wachstum N = N₀, T gesucht', () => g({ N0: N('1000'), N: N('1000'), t: N('3') }))
  }

  /* ------------------------------ Dreisatz ------------------------------ */
  {
    const p = run('Dreisatz proportional', () => ruleOfThree('prop', N('250'), N('3'), N('400'), 'mL', 'g'))
    near('Dreisatz 400 mL → 4,8 g', R(p), 4.8, 0)
    resultHas('Dreisatz Einheit g', p, '4,8 \\text{g}')
    near('Dreisatz Preis', R(run('Dreisatz Preis', () => ruleOfThree('prop', N('5'), N('32,50'), N('8'), 'Packungen', '€'))), 52, 0)
    const ap = run('Dreisatz antiproportional', () => ruleOfThree('anti', N('4'), N('6'), N('3'), 'Personen', 'h'))
    near('Dreisatz anti Personen', R(ap), 8, 0)
    check('Dreisatz „1 Person“ (Einzahl)', !!ap && ap.steps[1].tex.startsWith('1\\,\\text{Person} '))
    near('Dreisatz anti Vorrat', R(run('Dreisatz Vorrat', () => ruleOfThree('anti', N('40'), N('15'), N('50'), 'mL/Tag', 'Tage'))), 12, 0)
    near('Dreisatz gerundet', R(run('Dreisatz 3/7', () => ruleOfThree('prop', N('7'), N('3'), N('5')))), 15 / 7, 1e-3)
    check('Dreisatz Schluss auf die Einheit', !!p && p.steps.some((s) => s.head === 'Schluss auf die Einheit' && s.tex.startsWith('1\\,\\text{mL}')))
    expectError('Dreisatz a₂ fehlt', () => ruleOfThree('prop', N('250'), N('3'), null))
    expectError('Dreisatz 0', () => ruleOfThree('anti', N('0'), N('3'), N('4')))
    expectError('Dreisatz negativ', () => ruleOfThree('prop', N('5'), N('-3'), N('4')))
    check('Dreisatz TeX-Abstand', !!p && p.steps[0].tex.includes('\\;\\widehat{=}\\;'))
  }

  /* ------------------------------ Prüfung (Verifier) ------------------------------ */
  {
    // Zahlen im Erklärtext müssen in $…$ stehen – sonst erscheinen {,}, \frac oder \, sichtbar im Fließtext
    const texOutside = (t?: string) => /\\|\{,\}|\^\{|_\{/.test((t ?? '').replace(/\$[^$]*\$/g, ''))
    const clean = (s: Solution | null) => !!s && ![s.remark, ...s.steps.map((x) => x.note)].some(texOutside)
    const p = run('Primer: Arbeitslösung 15 µM', () => primerStock({ n: N('25,3'), nu: 'nmol', cS: N('100'), cW: N('15'), VW: N('200') }))
    check('Primer 1 : 6,667: kein TeX außerhalb von $…$', clean(p))
    near('Primer: Stammlösung für 15 µM', X(p, 1), 30)
    const g = run('Prozent mit Bruch 1/3 %', () => percentBasic(N('1200'), null, N('1/3'), '€'))
    check('Prozent 1/3 %: kein TeX außerhalb von $…$', clean(g))
    near('Prozent: 1/3 % von 1200', R(g), 4)
    check('Prozent 2,5 %: kein TeX außerhalb von $…$', clean(run('Prozent 2,5 %', () => percentBasic(N('80'), N('2,5'), null))))
    // freie Einheit mit TeX-Sonderzeichen: „%“ ist in TeX ein Kommentarzeichen, „_“ ein Index
    run('Prozent: Einheit „%“', () => percentBasic(N('200'), null, N('15'), '%'))
    run('Prozent: Einheit „a_b“', () => percentChange('neu', true, N('200'), N('15'), 'a_b'))
    // früher „x ≈ 0 · 10^{1e+30}“ bzw. „Faktor 2^{14 000} ≈ –“
    expectError('Delogarithmieren: 10^(10^30)', () => powCalc({ base: '10', y: N('1e30') }))
    near('Delogarithmieren: 10^300 geht noch', R(run('Delogarithmieren 10^300', () => powCalc({ base: '10', y: N('300') }))), 1e300, 1e-6)
    expectError('Wachstum: 14 000 Verdopplungen', () => growth({ kind: 'verdopplung', N: null, N0: N('100'), t: N('14000'), tu: 'h', T: N('1'), Tu: 'h' }))
    expectError('Zerfall: 5000 Halbwertszeiten', () => growth({ kind: 'halbwert', N: null, N0: N('100'), t: N('5000'), tu: 'a', T: N('1'), Tu: 'a' }))
  }

  /* ------------------------------ TeX-Hygiene ------------------------------ */
  {
    // Ein einfacher Backslash vor ; , ! oder Buchstaben im Quelltext wird still verschluckt –
    // dann stünde z. B. „;\widehat{=};“ statt „\;\widehat{=}\;“ in der Formel.
    const bad = /(^|[^\\]);\\(widehat|to|Rightarrow|quad|dots)/
    let n = 0
    for (const [where, s] of ALL) {
      const texs = [s.result, ...(s.extra ?? []), ...s.steps.map((st) => st.tex), ...s.steps.map((st) => st.note ?? ''), s.remark ?? '']
      const hit = texs.find((t) => bad.test(t) || /[\f\v\b]/.test(t))
      if (hit) {
        n++
        fail(`${where} [TeX-Hygiene]`, `verschluckter Backslash: ${hit.slice(0, 120)}`)
      }
    }
    check(`TeX-Hygiene über ${ALL.length} Lösungen`, n === 0)
  }
})
