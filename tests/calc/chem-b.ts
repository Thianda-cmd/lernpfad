/** Reaktionsgleichungen, Photometrie, Stoffmenge (Erweiterungen), Einheiten */
import { check, count, expectError, fail, group, near, resultHas, run, tex } from '../harness'
import type { Solution } from '../../src/math/alg/step'
import { parseNum } from '../../src/math/alg/numinput'
import { balanced, balanceEquation, looksLikeReaction, parseReaction, reactionAmounts, reactionYield } from '../../src/math/alg/reaction'
import { calibration, lambertBeer, transExt } from '../../src/math/alg/photometry'
import { convertAll, convertUnits, QTYS } from '../../src/math/alg/convert'
import { amount, atomsOf, composition, matchElements, mixCross, mixResult, molarFromMass, molarMass } from '../../src/math/alg/stoich'
import { CONC_U, MASS_U, MCONC_U, MOL_U, T, VOL_U } from '../../src/math/alg/units'
import { toNum } from '../../src/math/q'
import { detect } from '../../src/math/quick'

const N = (s: string) => parseNum(s, 'Wert')

/** Zahl am Anfang eines TeX-Strings: „4{,}397“, „250\,000“, „1{,}055 \cdot 10^{-22}“, „10^{9}“ */
function texNumAt(r0: string): number {
  const r = r0.trim()
  const p = /^(-?)10\^\{(-?\d+)\}/.exec(r)
  if (p) return (p[1] ? -1 : 1) * 10 ** Number(p[2])
  const num = /^-?(?:\d|\\,(?=\d)|\{,\}(?=\d))+/.exec(r)
  if (num) {
    let v = parseFloat(num[0].replace(/\\,/g, '').replace('{,}', '.'))
    const e = /^\s*\\cdot\s*10\^\{(-?\d+)\}/.exec(r.slice(num[0].length))
    if (e) v *= 10 ** Number(e[1])
    return v
  }
  const e = /^(-?)10\^\{(-?\d+)\}/.exec(r)
  return e ? (e[1] ? -1 : 1) * 10 ** Number(e[2]) : NaN
}

/** Zahl nach dem letzten „=“ bzw. „\approx“ */
function lastNum(t: string): number {
  const a = t.lastIndexOf('\\approx')
  const b = t.lastIndexOf('=')
  if (a < 0 && b < 0) return NaN
  return a > b ? texNumAt(t.slice(a + 7)) : texNumAt(t.slice(b + 1))
}

/** Einheiten-TeX → Faktor zur Grundeinheit (g, mol, L, mol/L, g/L) */
const UF = new Map<string, number>()
for (const list of [MASS_U, MOL_U, VOL_U, CONC_U, MCONC_U]) for (const u of list) if (!UF.has(T(u.u))) UF.set(T(u.u), toNum(u.f))

/** Wert hinter „label =“ bzw. „label \approx“ in Ergebnis/Zusatzzeilen, in der Grundeinheit (raw: Zahl wie angezeigt) */
function valOf(sol: Solution | null, label: string, raw = false): number {
  if (!sol) return NaN
  for (const s of [sol.result, ...(sol.extra ?? [])]) {
    let i = -1
    for (let k = s.indexOf(label); k >= 0; k = s.indexOf(label, k + 1)) {
      const before = k === 0 ? ' ' : s[k - 1]
      if (/[\s,(]/.test(before) || k === 0) {
        if (/^\s*(=|\\approx)/.test(s.slice(k + label.length))) {
          i = k
          break
        }
      }
    }
    if (i < 0) continue
    const r = s.slice(i + label.length).replace(/^\s*(=|\\approx)\s*/, '')
    const v = texNumAt(r)
    if (raw) return v
    const m = /^-?(?:\d|\\,(?=\d)|\{,\}(?=\d))+(?:\s*\\cdot\s*10\^\{-?\d+\})?|^-?10\^\{-?\d+\}/.exec(r)
    const after = m ? r.slice(m[0].length) : ''
    const um = /^\\,(?:\\mu)?\\text\{[^}]*\}(?:\^\{\d\})?/.exec(after)
    return v * (um ? (UF.get(um[0]) ?? 1) : 1)
  }
  return NaN
}

/** Zahl in einem Lösungsschritt, der `needle` enthält (letzte Zahl der Zeile) */
function stepNum(sol: Solution | null, needle: string): number {
  const st = sol?.steps.find((s) => s.tex.includes(needle))
  return st ? lastNum(st.tex) : NaN
}

/** Steuerzeichen im TeX verraten vergessene doppelte Backslashes („\frac“ → Seitenvorschub + „rac“) */
function runC<R extends Solution | null>(where: string, f: () => R): R | null {
  const r = run(where, f)
  if (r) {
    const texts = [r.result, ...(r.extra ?? []), r.remark ?? '', ...r.steps.flatMap((st) => [st.tex, st.note ?? '', st.op ?? '', st.head ?? ''])]
    check(`${where}: keine Steuerzeichen`, !texts.some((t) => /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(t)))
  }
  return r
}

group('chem-b', () => {
  /* ------------------------------ Reaktionsgleichungen ausgleichen ------------------------------ */

  const BAL: [string, number[]][] = [
    ['Fe + O2 -> Fe2O3', [4, 3, 2]],
    ['C3H8 + O2 -> CO2 + H2O', [1, 5, 3, 4]],
    ['CH3COOH + NaOH -> CH3COONa + H2O', [1, 1, 1, 1]],
    ['CaCO3 + CH3COOH -> Ca(CH3COO)2 + H2O + CO2', [1, 2, 1, 1, 1]],
    ['CH3COOH + O2 -> CO2 + H2O', [1, 2, 2, 2]],
    ['CH3COOH + C2H5OH -> CH3COOC2H5 + H2O', [1, 1, 1, 1]],
    ['CH3COOH + OH^- -> CH3COO^- + H2O', [1, 1, 1, 1]],
    ['Al + HCl -> AlCl3 + H2', [2, 6, 2, 3]],
    ['KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O', [2, 16, 2, 2, 5, 8]],
    ['Cu + HNO3 -> Cu(NO3)2 + NO + H2O', [3, 8, 3, 2, 4]],
    ['MnO4^- + Fe^2+ + H^+ -> Mn^2+ + Fe^3+ + H2O', [1, 5, 8, 1, 5, 4]],
    ['MnO4^- + H^+ + e^- -> Mn^2+ + H2O', [1, 8, 5, 1, 4]],
    ['Cr2O7^2- + H^+ + Fe^2+ -> Cr^3+ + Fe^3+ + H2O', [1, 14, 6, 2, 6, 7]],
    ['C6H12O6 + O2 -> CO2 + H2O', [1, 6, 6, 6]],
    ['K4[Fe(CN)6] + KMnO4 + H2SO4 -> KHSO4 + Fe2(SO4)3 + MnSO4 + HNO3 + CO2 + H2O', [10, 122, 299, 162, 5, 122, 60, 60, 188]],
    ['Fe³⁺ + e⁻ → Fe²⁺', [1, 1, 1]],
    ['2 H2 + O2 = 2 H2O', [2, 1, 2]],
    ['CuSO4·5H2O -> CuSO4 + H2O', [1, 1, 5]],
    ['Na+ + Cl- -> NaCl', [1, 1, 1]],
    ['CO2(g) + H2O(l) <=> H2CO3(aq)', [1, 1, 1]],
    ['Ag^+ + Cu -> Ag + Cu^2+', [2, 1, 2, 1]],
    ['NH4^+ + OH^- -> NH3 + H2O', [1, 1, 1, 1]],
    ['Fe2O3 + CO -> Fe + CO2', [1, 3, 2, 3]],
    ['Pb(NO3)2 + KI -> PbI2 + KNO3', [1, 2, 1, 2]],
    ['NaHCO3 -> Na2CO3 + H2O + CO2', [2, 1, 1, 1]],
    ['H2O2 -> H2O + O2', [2, 2, 1]],
    ['P4 + O2 -> P4O10', [1, 5, 1]],
    ['Ba^2+ + SO4^{2-} -> BaSO4↓', [1, 1, 1]],
    ['C2H5OH + O2 → CO2 + H2O', [1, 3, 2, 3]],
  ]
  for (const [eq, want] of BAL) {
    const sol = runC(`Ausgleichen „${eq}“`, () => balanceEquation(eq))
    count()
    try {
      const { r, coef } = balanced(eq)
      const got = coef.map(Number)
      if (got.join(',') !== want.join(',')) fail(`Ausgleichen „${eq}“`, `erwartet ${want.join(' : ')}, erhalten ${got.join(' : ')}`)
      // unabhängige Probe: Atome und Ladung links = rechts
      const tally = (side: 'L' | 'R') => {
        const t = new Map<string, number>()
        r.all.forEach((s, j) => {
          if (s.side !== side) return
          s.atoms.forEach((k, el) => t.set(el, (t.get(el) ?? 0) + k * got[j]))
          t.set('±', (t.get('±') ?? 0) + s.charge * got[j])
        })
        return t
      }
      const L = tally('L')
      const R = tally('R')
      for (const k of new Set([...L.keys(), ...R.keys()])) if ((L.get(k) ?? 0) !== (R.get(k) ?? 0)) fail(`Probe „${eq}“`, `${k}: links ${L.get(k)}, rechts ${R.get(k)}`)
    } catch (e) {
      fail(`Ausgleichen „${eq}“`, (e as Error).message)
    }
    if (sol) check(`Ausgleichen „${eq}“: Probe-Tabelle`, sol.steps.some((s) => s.head === 'Probe' && s.tex.includes('\\checkmark')))
  }
  {
    const s = runC('Eingetippte Koeffizienten', () => balanceEquation('2 H2 + O2 = 2 H2O'))
    check('Eingetippte Koeffizienten werden erwähnt', !!s?.steps[0].note?.includes('Deine Koeffizienten'))
    const e = runC('Gleichgewichtspfeil', () => balanceEquation('CO2(g) + H2O(l) <=> H2CO3(aq)'))
    check('Gleichgewichtspfeil im Ergebnis', !!e?.result.includes('\\rightleftharpoons'))
    const k = runC('Kombinieren nötig', () => balanceEquation('Cu + HNO3 -> Cu(NO3)2 + NO + H2O'))
    check('Kupfer + Salpetersäure: Gleichungen kombinieren', !!k?.steps.some((s) => s.head === 'Gleichungen kombinieren'))
    const g = runC('Ganze Zahlen per Hauptnenner', () => balanceEquation('Fe + O2 -> Fe2O3'))
    check('Fe + O₂: mit 2 malnehmen', !!g?.steps.some((s) => s.tex.includes('\\cdot 2')))
    const ion = parseReaction('MnO4^- + H^+ + e^- -> Mn^2+ + H2O')
    check('Ladungen erkannt', ion.all.map((s) => s.charge).join(',') === '-1,1,-1,2,0' && ion.hasElectrons)
    check('Formel-Label mit tiefgestellten Ziffern', parseReaction('Ca(CH3COO)2 -> CaO')?.left[0].label === 'Ca(CH₃COO)₂')
  }
  const BAD = [
    'Fe + O2 -> FeO + Fe2O3',
    'C + O2 -> CO + CO2',
    'H2 + O2 -> H2O + O3',
    'Fe + O2',
    'Fe -> Cu',
    'Fe3+ + e- -> Fe2+',
    'NO3- + H+ -> HNO3',
    'H2O -> H2O',
    'Na + Cl2 -> NaCl + Cl2',
    'NaOH + NaOH -> Na2O + H2O',
    'Xy + O2 -> XyO',
    'NaCl + H2O -> NaOH',
    'Fe^2+ -> Fe^3+',
    '',
    'H2 + -> H2O',
    'H2 + O2 -> H2O -> H2O2',
    'h2 + o2 -> h2o',
    '-> H2O',
  ]
  for (const eq of BAD) expectError(`Ausgleichen ungültig „${eq}“`, () => balanceEquation(eq))

  /* ------------------------------ Schnellrechner ------------------------------ */

  const QUICK: [string, string][] = [
    ['Fe + O2 -> Fe2O3', '/chemie/reaktionen?gl='],
    ['MnO4^- + Fe^2+ + H^+ → Mn^2+ + Fe^3+ + H2O', '/chemie/reaktionen?gl='],
    ['CH3COOH + NaOH => CH3COONa + H2O', '/chemie/reaktionen?gl='],
    ['2x + 3 = 7', '/mathematik/gleichungen'],
    ['H2SO4', '/chemie/molmasse'],
    ['x^2 - 4x + 3 = 0', '/mathematik/pq-formel'],
  ]
  for (const [src, path] of QUICK) {
    count()
    const hit = detect(src)
    if (!hit) {
      fail(`Schnellrechner „${src}“`, 'nichts erkannt')
      continue
    }
    if (!hit.to.startsWith(path)) fail(`Schnellrechner „${src}“`, `erwartet ${path}, erhalten ${hit.to}`)
    runC(`Schnellrechner „${src}“`, () => hit.run())
  }
  check('Schnellrechner: „x -> 2“ ist keine Reaktion', !looksLikeReaction('x -> 2'))
  check('Schnellrechner: „a + b -> c“ ist keine Reaktion', !looksLikeReaction('a + b -> c'))
  check('Schnellrechner: Gleichung mit „=“ bleibt Mathematik', !detect('A + B = C')?.to.startsWith('/chemie/reaktionen'))

  /* ------------------------------ Massen berechnen ------------------------------ */

  {
    const s = runC('Kalk brennen: CO₂ aus 10 g CaCO₃', () => reactionAmounts({ equation: 'CaCO3 -> CaO + CO2', given: 0, kind: 'm', value: N('10'), unit: 'g', wanted: 2 }))
    near('m(CO₂) aus 10 g CaCO₃', valOf(s, 'm(\\mathrm{CO_{2}})'), 4.397043)
    near('m(CaO) aus 10 g CaCO₃', valOf(s, 'm(\\mathrm{CaO})'), 5.602957)
    near('V(CO₂) bei 0 °C', valOf(s, 'V(\\mathrm{CO_{2}})'), 2.239385)
    near('n(CO₂)', valOf(s, 'n(\\mathrm{CO_{2}})'), 0.09991008)
    check('Massenerhaltung geprüft', !!s?.steps.some((x) => x.head === 'Probe' && x.tex.includes('\\checkmark')))
    check('Tabelle aller Stoffe', s?.rows.length === 3 && s.rows[0].given)
  }
  {
    const s = runC('Zink + Salzsäure: H₂ bei 20 °C', () => reactionAmounts({ equation: 'Zn + HCl -> ZnCl2 + H2', given: 0, kind: 'm', value: N('6,54'), unit: 'g', wanted: 3, vm: '24,0' }))
    near('m(H₂)', valOf(s, 'm(\\mathrm{H_{2}})'), 0.2020618)
    near('V(H₂) bei 24,0 L/mol', valOf(s, 'V(\\mathrm{H_{2}})'), 2.400734)
    near('m(HCl) verbraucht', toNum(s!.rows[1].m!), 7.294231)
  }
  {
    const s = runC('Katalase: O₂ aus 3,4 g H₂O₂', () => reactionAmounts({ equation: 'H2O2 -> H2O + O2', given: 0, kind: 'm', value: N('3,4'), unit: 'g', wanted: 2, vm: '24,0' }))
    near('m(O₂)', valOf(s, 'm(\\mathrm{O_{2}})'), 1.599059)
    near('V(O₂)', valOf(s, 'V(\\mathrm{O_{2}})'), 1.199295)
  }
  {
    const s = runC('Natron + Essig (Acetat)', () => reactionAmounts({ equation: 'CH3COOH + NaHCO3 -> CH3COONa + H2O + CO2', given: 1, kind: 'm', value: N('8,4'), unit: 'g', wanted: 4, vm: '24,0' }))
    near('m(CO₂) aus 8,4 g Natron', valOf(s, 'm(\\mathrm{CO_{2}})'), 4.400476)
    near('V(CO₂) aus 8,4 g Natron', valOf(s, 'V(\\mathrm{CO_{2}})'), 2.399714)
    near('m(Natriumacetat)', valOf(s, 'm(\\mathrm{CH_{3}COONa})'), 8.203023)
  }
  {
    const s = runC('Stoffmenge gegeben: 2 mol N₂', () => reactionAmounts({ equation: 'N2 + H2 -> NH3', given: 0, kind: 'n', value: N('2'), unit: 'mol', wanted: 2 }))
    near('m(NH₃) aus 2 mol N₂', valOf(s, 'm(\\mathrm{NH_{3}})'), 68.16)
    const v = runC('Gasvolumen gegeben: 1 L CH₄', () => reactionAmounts({ equation: 'CH4 + O2 -> CO2 + H2O', given: 0, kind: 'V', value: N('1'), unit: 'L', wanted: 2 }))
    near('m(CO₂) aus 1 L Methan', valOf(v, 'm(\\mathrm{CO_{2}})'), 1.963505)
    near('V(O₂) für 1 L Methan', toNum(v!.rows[1].V!), 2)
    const ml = runC('Gasvolumen in mL', () => reactionAmounts({ equation: 'CH4 + O2 -> CO2 + H2O', given: 0, kind: 'V', value: N('1000'), unit: 'mL', wanted: 2 }))
    near('1000 mL = 1 L Methan', valOf(ml, 'm(\\mathrm{CO_{2}})'), 1.963505)
    const kg = runC('Masse in kg', () => reactionAmounts({ equation: 'N2 + H2 -> NH3', given: 2, kind: 'm', value: N('1'), unit: 'kg', wanted: 1 }))
    near('H₂ für 1 kg NH₃', valOf(kg, 'm(\\mathrm{H_{2}})'), (1000 / 17.04) * 1.5 * 2.02)
  }
  expectError('Massen: kein Wert', () => reactionAmounts({ equation: 'CaCO3 -> CaO + CO2', given: 0, kind: 'm', value: null, unit: 'g' }))
  expectError('Massen: Wert 0', () => reactionAmounts({ equation: 'CaCO3 -> CaO + CO2', given: 0, kind: 'm', value: N('0'), unit: 'g' }))
  expectError('Massen: negativer Wert', () => reactionAmounts({ equation: 'CaCO3 -> CaO + CO2', given: 0, kind: 'm', value: N('-3'), unit: 'g' }))
  expectError('Massen: Stoff fehlt', () => reactionAmounts({ equation: 'CaCO3 -> CaO + CO2', given: 7, kind: 'm', value: N('1'), unit: 'g' }))
  expectError('Massen: Elektronen mit Masse', () => reactionAmounts({ equation: 'Fe^3+ + e^- -> Fe^2+', given: 1, kind: 'm', value: N('1'), unit: 'g' }))
  expectError('Massen: Gleichung geht nicht auf', () => reactionAmounts({ equation: 'Fe -> Cu', given: 0, kind: 'm', value: N('1'), unit: 'g' }))

  /* ------------------------------ Ausbeute & Unterschuss ------------------------------ */

  {
    const s = runC('Eisen + Schwefel', () => reactionYield({ equation: 'Fe + S -> FeS', masses: [N('10'), N('5')], units: ['g', 'g'], product: 0, actual: N('12'), actualUnit: 'g' }))
    near('FeS theoretisch', valOf(s, 'm_{\\text{theor.}}(\\mathrm{FeS})'), 13.71023)
    near('Ausbeute FeS', valOf(s, '\\eta'), 87.52588, 2e-3)
    check('Schwefel im Unterschuss', !!s?.extra?.some((x) => x.includes('Unterschuss: } \\mathrm{S}')))
    check('Eisen im Überschuss (Tabelle)', s?.rows[0].role === 'excess' && s.rows[1].role === 'limit')
    near('Rest Eisen in g', toNum(s!.rows[0].left) * 55.85, 1.289769)
  }
  {
    const s = runC('Ethylacetat (Ester)', () => reactionYield({ equation: 'CH3COOH + C2H5OH -> CH3COOC2H5 + H2O', masses: [N('12'), N('11,5')], units: ['g', 'g'], product: 0, actual: N('11'), actualUnit: 'g' }))
    near('Ester theoretisch', valOf(s, 'm_{\\text{theor.}}(\\mathrm{CH_{3}COOC_{2}H_{5}})'), 17.60639)
    near('Ausbeute Ester', valOf(s, '\\eta'), 62.4773, 2e-3)
  }
  {
    const s = runC('Ammoniak-Synthese', () => reactionYield({ equation: 'N2 + H2 -> NH3', masses: [N('28'), N('5')], units: ['g', 'g'], product: 0, actual: N('20'), actualUnit: 'g' }))
    near('NH₃ theoretisch', valOf(s, 'm_{\\text{theor.}}(\\mathrm{NH_{3}})'), 28.11881)
    near('Ausbeute NH₃', valOf(s, '\\eta'), 71.12676, 2e-3)
    check('H₂ im Unterschuss', s?.rows[1].role === 'limit')
  }
  {
    const s = runC('Nur ein Edukt angegeben', () => reactionYield({ equation: 'Mg + O2 -> MgO', masses: [N('2,43'), null], units: ['g', 'g'], product: 0, actual: null, actualUnit: 'g' }))
    near('MgO aus 2,43 g Mg', valOf(s, 'm_{\\text{theor.}}(\\mathrm{MgO})'), 4.029342)
    const b = runC('Magnesium + Sauerstoff', () => reactionYield({ equation: 'Mg + O2 -> MgO', masses: [N('2430'), N('1000')], units: ['mg', 'mg'], product: 0, actual: N('2,2'), actualUnit: 'g' }))
    near('MgO mit O₂ im Unterschuss (mg-Eingabe)', valOf(b, 'm_{\\text{theor.}}(\\mathrm{MgO})'), 2.519375)
    near('Ausbeute MgO', valOf(b, '\\eta'), 87.32324, 2e-3)
    const over = runC('Ausbeute über 100 %', () => reactionYield({ equation: 'Fe + S -> FeS', masses: [N('10'), N('5')], units: ['g', 'g'], product: 0, actual: N('15'), actualUnit: 'g' }))
    check('Hinweis bei über 100 %', !!over?.remark?.includes('feucht'))
  }
  expectError('Ausbeute: keine Masse', () => reactionYield({ equation: 'Fe + S -> FeS', masses: [null, null], units: ['g', 'g'], product: 0, actual: null, actualUnit: 'g' }))
  expectError('Ausbeute: Masse 0', () => reactionYield({ equation: 'Fe + S -> FeS', masses: [N('0'), N('5')], units: ['g', 'g'], product: 0, actual: null, actualUnit: 'g' }))
  expectError('Ausbeute: Produkt fehlt', () => reactionYield({ equation: 'Fe + S -> FeS', masses: [N('10'), N('5')], units: ['g', 'g'], product: 3, actual: null, actualUnit: 'g' }))
  expectError('Ausbeute: erhaltene Masse negativ', () => reactionYield({ equation: 'Fe + S -> FeS', masses: [N('10'), N('5')], units: ['g', 'g'], product: 0, actual: N('-1'), actualUnit: 'g' }))

  /* ------------------------------ Stoffmenge: Arbeitsblatt „M, m, n, m%, N“ ------------------------------ */

  near('Atommasse Mg (Schulwert)', toNum(molarMass('Mg').M), 24.31, 1e-9)
  near('Atommasse Fe (Schulwert)', toNum(molarMass('Fe').M), 55.85, 1e-9)
  near('M(H₂O) bleibt 18,02', toNum(molarMass('H2O').M), 18.02, 1e-9)
  near('M(MgSO₄)', toNum(molarMass('MgSO4').M), 120.37, 1e-9)
  near('M(Natriumacetat-Trihydrat)', toNum(molarMass('CH3COONa·3H2O').M), 136.1, 1e-9)
  check('Einzelnes Element ohne doppelte Gleichung', molarMass('Cu').step.tex === 'M(\\mathrm{Cu}) = 63{,}55\\,\\text{g/mol}')
  {
    const a1 = runC('Aufgabe 1: 130 g BaSO₄', () => amount({ formula: 'BaSO4', given: 'm', value: N('130'), unit: 'g' }))
    near('Aufgabe 1: n(BaSO₄)', valOf(a1, 'n'), 0.557008)
    const a2 = runC('Aufgabe 2: 0,37 mmol Ca(NO₃)₂', () => amount({ formula: 'Ca(NO3)2', given: 'n', value: N('0,37'), unit: 'mmol' }))
    near('Aufgabe 2: m(Ca(NO₃)₂)', valOf(a2, 'm'), 0.060717)
    resultHas('Aufgabe 2 in mg', a2, '60,717', 'mg')
    const a3 = runC('Aufgabe 3: 750 mg Ba(OH)₂', () => amount({ formula: 'Ba(OH)2', given: 'm', value: N('750'), unit: 'mg' }))
    near('Aufgabe 3: n(Ba(OH)₂)', valOf(a3, 'n'), 0.004377006)
    const a4 = runC('Aufgabe 4: 2,3 mol AlCl₃', () => amount({ formula: 'AlCl3', given: 'n', value: N('2,3'), unit: 'mol' }))
    near('Aufgabe 4: m(AlCl₃)', valOf(a4, 'm'), 306.659)
    const a5 = runC('Aufgabe 5: 3 mmol MgSO₄', () => amount({ formula: 'MgSO4', given: 'n', value: N('3'), unit: 'mmol' }))
    near('Aufgabe 5: N', valOf(a5, 'N'), 1.8066e21)
    near('Aufgabe 13: m(MgSO₄)', valOf(a5, 'm'), 0.36111)
    const a6 = runC('Aufgabe 6: 21 mg ZnS', () => amount({ formula: 'ZnS', given: 'm', value: N('21'), unit: 'mg' }))
    near('Aufgabe 6: N', valOf(a6, 'N'), 1.297845e20)
    const a8 = runC('Aufgabe 8: 1,25 kg CaCO₃', () => amount({ formula: 'CaCO3', given: 'm', value: N('1,25'), unit: 'kg' }))
    near('Aufgabe 8: n(CaCO₃)', valOf(a8, 'n'), 12.48876)
    const a11 = runC('Aufgabe 11: ein Kupfer-Atom', () => amount({ formula: 'Cu', given: 'N', value: N('1'), unit: '' }))
    near('Aufgabe 11: m(Cu-Atom)', valOf(a11, 'm'), 1.055297e-22)
    resultHas('Aufgabe 11 in g mit Zehnerpotenz', a11, '10^{-22}', '\\text{g}')
    const a12 = runC('Aufgabe 12: drei Wassermoleküle', () => amount({ formula: 'H2O', given: 'N', value: N('3'), unit: '' }))
    near('Aufgabe 12: m(3 H₂O)', valOf(a12, 'm'), 8.977084e-23)
    near('Aufgabe 12: n in mol (nicht pmol)', valOf(a12, 'n'), 3 / 6.022e23)
    const a14 = runC('Aufgabe 14: 750 µg As₂O₃', () => amount({ formula: 'As2O3', given: 'm', value: N('750'), unit: 'µg' }))
    near('Aufgabe 14: n(As₂O₃)', valOf(a14, 'n'), 3.790942e-6)
    resultHas('Aufgabe 14 in µmol', a14, '3,791', '\\mu\\text{mol}')
    // Lösungsblatt: 0,51 mg – richtig ist 0,3398 mg
    const a15 = runC('Aufgabe 15: 2 µmol AgNO₃', () => amount({ formula: 'AgNO3', given: 'n', value: N('2'), unit: 'µmol' }))
    near('Aufgabe 15: m(AgNO₃) (Lösungsblatt falsch)', valOf(a15, 'm'), 0.00033976)
    // Lösungsblatt: 6,823 µg – richtig ist 6,843 µg
    const a17 = runC('Aufgabe 17: 20 nmol Al₂(SO₄)₃', () => amount({ formula: 'Al2(SO4)3', given: 'n', value: N('20'), unit: 'nmol' }))
    near('Aufgabe 17: m(Al₂(SO₄)₃) (Lösungsblatt falsch)', valOf(a17, 'm'), 6.8428e-6)
    resultHas('Aufgabe 17 in µg', a17, '6,8428', '\\mu\\text{g}')
    const pm = runC('Stoffmenge in pmol', () => amount({ formula: 'NaCl', given: 'n', value: N('250'), unit: 'pmol' }))
    near('250 pmol NaCl', valOf(pm, 'm'), 250e-12 * 58.44)
    const ng = runC('Masse in ng', () => amount({ formula: 'C6H12O6', given: 'm', value: N('90'), unit: 'ng' }))
    near('90 ng Glucose', valOf(ng, 'n'), 90e-9 / 180.18)
  }
  {
    const comp: [string, [string, number, number][]][] = [
      ['Na2SO4', [['Na', 32.37116, 28.57143], ['S', 22.57111, 14.28571], ['O', 45.05773, 57.14286]]],
      ['Na2CO3', [['Na', 43.38145, 33.33333], ['C', 11.33126, 16.66667], ['O', 45.28729, 50]]],
      ['Ca3(PO4)2', [['Ca', 38.76459, 23.07692], ['P', 19.96905, 15.38462], ['O', 41.26636, 61.53846]]],
    ]
    for (const [f, parts] of comp) {
      const s = runC(`Aufgabe 7: ${f}`, () => composition(f))
      for (const [el, w, at] of parts) {
        near(`Aufgabe 7 ${f}: Massen-% ${el}`, stepNum(s, `w(\\mathrm{${el}})`), w)
        near(`Aufgabe 7 ${f}: Atom-% ${el}`, stepNum(s, `\\mathrm{${el}}\\colon`), at)
      }
    }
  }
  {
    const a9 = runC('Aufgabe 9: 31,725 g ≙ 250 mmol', () => molarFromMass(N('31,725'), 'g', N('250'), 'mmol'))
    near('Aufgabe 9: M', valOf(a9, 'M'), 126.9)
    check('Aufgabe 9: Iod erkannt', !!a9?.extra?.[0]?.includes('Iod'))
    const a10 = runC('Aufgabe 10: 25,07 mg ≙ 125 µmol', () => molarFromMass(N('25,07'), 'mg', N('125'), 'µmol'))
    near('Aufgabe 10: M', valOf(a10, 'M'), 200.56)
    check('Aufgabe 10: Quecksilber erkannt', !!a10?.extra?.[0]?.includes('Quecksilber'))
    const v = runC('Verbindung statt Element', () => molarFromMass(N('4,1'), 'g', N('50'), 'mmol'))
    near('Natriumacetat: M = 82 g/mol', valOf(v, 'M'), 82)
    check('Kein Element passt', !v?.extra?.length && !!v?.remark?.includes('Verbindung'))
    check('Elementsuche ±0,5 %: Iod vor Tellur', matchElements(126.9).map((x) => x.sym).join(',') === 'I')
    check('Elementsuche nächstes zuerst', matchElements(55.9)[0]?.sym === 'Fe')
  }
  expectError('M gesucht: Masse fehlt', () => molarFromMass(null, 'g', N('1'), 'mol'))
  expectError('M gesucht: n = 0', () => molarFromMass(N('5'), 'g', N('0'), 'mol'))
  {
    // Lösungsblatt 16: 2,514·10²³ ✓
    const a16 = runC('Aufgabe 16: Fe-Atome in 30 g FeO', () => atomsOf({ formula: 'FeO', element: 'Fe', given: 'm', value: N('30'), unit: 'g' }))
    near('Aufgabe 16: N(Fe)', valOf(a16, 'N(\\mathrm{Fe})'), 2.514405e23)
    // Lösungsblatt 18: 4,0638·10²³ – richtig ist 4,063·10²⁰ (25 mg, nicht 25 g)
    const a18 = runC('Aufgabe 18: O-Atome in 25 mg Ca(OH)₂', () => atomsOf({ formula: 'Ca(OH)2', element: 'O', given: 'm', value: N('25'), unit: 'mg' }))
    near('Aufgabe 18: N(O) (Lösungsblatt falsch)', valOf(a18, 'N(\\mathrm{O})'), 4.063428e20)
    const h = runC('H-Atome in 1 mol H₂O', () => atomsOf({ formula: 'H2O', element: 'h', given: 'n', value: N('1'), unit: 'mol' }))
    near('2 mol H-Atome', valOf(h, 'N(\\mathrm{H})'), 2 * 6.022e23)
    const ac = runC('C-Atome in Natriumacetat', () => atomsOf({ formula: 'CH3COONa', element: 'C', given: 'm', value: N('1'), unit: 'g' }))
    near('C-Atome in 1 g CH₃COONa', valOf(ac, 'N(\\mathrm{C})'), (2 / 82.04) * 6.022e23)
    const nn = runC('Formeleinheiten gegeben', () => atomsOf({ formula: 'Al2(SO4)3', element: 'O', given: 'N', value: N('1000'), unit: '' }))
    near('O-Atome in 1000 Al₂(SO₄)₃', valOf(nn, 'N(\\mathrm{O})'), 12000)
  }
  expectError('Atome: Element nicht in der Formel', () => atomsOf({ formula: 'H2O', element: 'Fe', given: 'm', value: N('1'), unit: 'g' }))
  expectError('Atome: kein Elementsymbol', () => atomsOf({ formula: 'H2O', element: 'Xx', given: 'm', value: N('1'), unit: 'g' }))
  expectError('Atome: keine Formel', () => atomsOf({ formula: ' ', element: 'H', given: 'm', value: N('1'), unit: 'g' }))
  expectError('Atome: Wert 0', () => atomsOf({ formula: 'H2O', element: 'H', given: 'm', value: N('0'), unit: 'g' }))

  /* ------------------------------ Photometrie: Lambert-Beer ------------------------------ */

  {
    const s = runC('NADH: c aus E', () => lambertBeer({ E: N('0,311'), eps: N('6220'), c: null, cu: 'µmol/L', d: N('1'), du: 'cm' }))
    near('c(NADH)', valOf(s, 'c'), 5e-5)
    resultHas('c(NADH) in µmol/L', s, '50', '\\mu\\text{mol/L}')
    const d0 = runC('Schichtdicke fehlt → 1 cm', () => lambertBeer({ E: N('0,311'), eps: N('6220'), c: null, cu: 'mol/L', d: null, du: 'cm' }))
    near('c bei angenommenem d = 1 cm', valOf(d0, 'c'), 5e-5)
    check('Hinweis auf Standardküvette', !!d0?.steps[0].note?.includes('1\\,\\text{cm}'))
    const f = runC('Farbstoff 1 : 10 mit M', () => lambertBeer({ E: N('0,45'), eps: N('15000'), c: null, cu: 'µmol/L', d: N('1'), du: 'cm', F: N('10'), M: N('300') }))
    near('c(Probe) nach Verdünnung', valOf(f, 'c_{\\text{Probe}}'), 3e-4)
    near('c(Messlösung)', valOf(f, 'c_{\\text{Messlösung}}'), 3e-5)
    near('β = c · M', valOf(f, '\\beta'), 0.09)
    const e = runC('ε bestimmen', () => lambertBeer({ E: N('0,622'), eps: null, c: N('0,1'), cu: 'mmol/L', d: N('1'), du: 'cm' }))
    near('ε', valOf(e, '\\varepsilon'), 6220)
    const ee = runC('E gesucht (d in mm)', () => lambertBeer({ E: null, eps: N('6220'), c: N('80'), cu: 'µmol/L', d: N('10'), du: 'mm' }))
    near('E', valOf(ee, 'E'), 0.4976)
    const dd = runC('d gesucht', () => lambertBeer({ E: N('0,5'), eps: N('15000'), c: N('20'), cu: 'µmol/L', d: null, du: 'cm' }))
    near('d', valOf(dd, 'd'), 1.666667)
    const hi = runC('E zu hoch', () => lambertBeer({ E: N('1,8'), eps: N('6220'), c: null, cu: 'µmol/L', d: N('1'), du: 'cm' }))
    check('Hinweis: verdünnen', !!hi?.remark?.includes('verdünnen'))
  }
  expectError('Lambert-Beer: alle vier gegeben', () => lambertBeer({ E: N('0,3'), eps: N('6220'), c: N('50'), cu: 'µmol/L', d: N('1'), du: 'cm' }))
  expectError('Lambert-Beer: zwei fehlen', () => lambertBeer({ E: N('0,3'), eps: null, c: null, cu: 'µmol/L', d: N('1'), du: 'cm' }))
  expectError('Lambert-Beer: E = 0', () => lambertBeer({ E: N('0'), eps: N('6220'), c: null, cu: 'µmol/L', d: N('1'), du: 'cm' }))
  expectError('Lambert-Beer: negatives ε', () => lambertBeer({ E: N('0,3'), eps: N('-5'), c: null, cu: 'µmol/L', d: N('1'), du: 'cm' }))
  expectError('Lambert-Beer: Verdünnungsfaktor < 1', () => lambertBeer({ E: N('0,3'), eps: N('6220'), c: null, cu: 'µmol/L', d: N('1'), du: 'cm', F: N('0,5') }))

  /* ------------------------------ Photometrie: Transmission ↔ Extinktion ------------------------------ */

  {
    const t45 = runC('T = 45 %', () => transExt({ given: 'T', T: N('45'), tu: '%', I: null, I0: null, E: null }))
    near('E aus T = 45 %', valOf(t45, 'E'), 0.3467875)
    near('E = 2 − lg 45 (andere Rechnung)', stepNum(t45, '2 - \\lg'), 0.3467875)
    const t10 = runC('T = 10 %', () => transExt({ given: 'T', T: N('10'), tu: '%', I: null, I0: null, E: null }))
    near('E aus T = 10 %', valOf(t10, 'E'), 1)
    const ta = runC('T als Anteil', () => transExt({ given: 'T', T: N('0,8'), tu: 'Anteil', I: null, I0: null, E: null }))
    near('E aus T = 0,8', valOf(ta, 'E'), 0.09691001)
    check('Hinweis: E < 0,1 ungenau', !!ta?.remark?.includes('klein'))
    const ti = runC('I und I₀', () => transExt({ given: 'I', T: null, tu: '%', I: N('250'), I0: N('1000'), E: null }))
    near('E aus I/I₀', valOf(ti, 'E'), 0.60206)
    near('T aus I/I₀ in %', valOf(ti, 'T'), 25)
    const te = runC('T aus E', () => transExt({ given: 'E', T: null, tu: '%', I: null, I0: null, E: N('0,35') }))
    near('T aus E = 0,35', valOf(te, 'T'), 44.66836)
    const t0 = runC('E = 0', () => transExt({ given: 'E', T: null, tu: '%', I: null, I0: null, E: N('0') }))
    near('T bei E = 0', valOf(t0, 'T'), 100)
  }
  expectError('T = 0 %', () => transExt({ given: 'T', T: N('0'), tu: '%', I: null, I0: null, E: null }))
  expectError('T = 120 %', () => transExt({ given: 'T', T: N('120'), tu: '%', I: null, I0: null, E: null }))
  expectError('T = 1,5 als Anteil', () => transExt({ given: 'T', T: N('1,5'), tu: 'Anteil', I: null, I0: null, E: null }))
  expectError('I > I₀', () => transExt({ given: 'I', T: null, tu: '%', I: N('1200'), I0: N('1000'), E: null }))
  expectError('E negativ', () => transExt({ given: 'E', T: null, tu: '%', I: null, I0: null, E: N('-0,2') }))
  expectError('T fehlt', () => transExt({ given: 'T', T: null, tu: '%', I: null, I0: null, E: null }))

  /* ------------------------------ Photometrie: Kalibriergerade ------------------------------ */

  const STD = '0; 0,002\n2; 0,084\n4; 0,165\n6; 0,249\n8; 0,331\n10; 0,410'
  {
    const s = runC('Kalibriergerade mit Probe', () => calibration({ pairs: STD, samples: '0,205; 0,210; 0,207', origin: false, F: null, unit: 'mg/L' }))
    near('Steigung', s?.fit.m ?? NaN, 0.04092857)
    near('Achsenabschnitt', s?.fit.b ?? NaN, 0.002190476)
    near('R²', s?.fit.r2 ?? NaN, 0.9999448, 1e-7)
    near('Mittelwert Probe', s?.sample?.E ?? NaN, 0.2073333)
    near('c(Probe)', valOf(s, 'c', true), 5.012216)
    check('Probe im Kalibrierbereich', s?.outside === false)
    const f = runC('Kalibriergerade, Probe 1 : 5', () => calibration({ pairs: STD, samples: '0,205 0,210 0,207', origin: false, F: N('5'), unit: 'mg/L' }))
    near('c(Probe) mit F = 5', valOf(f, 'c_{\\text{Probe}}', true), 25.06108)
    near('c(Messlösung)', valOf(f, 'c_{\\text{Messlösung}}', true), 5.012216)
    const o = runC('Durch den Nullpunkt, Extrapolation', () => calibration({ pairs: STD, samples: '0,512', origin: true, F: null, unit: 'µg/mL' }))
    near('Steigung durch 0', o?.fit.m ?? NaN, 0.04122727)
    near('R² durch 0', o?.fit.r2 ?? NaN, 0.9998667, 1e-6)
    near('c extrapoliert', valOf(o, 'c', true), 12.41896)
    check('Extrapolation erkannt', o?.outside === true && !!o.remark?.includes('Extrapolation'))
    const p = runC('Protein durch den Nullpunkt', () => calibration({ pairs: '0; 0,000\n2; 0,105\n4; 0,208\n6; 0,315\n8; 0,411\n10; 0,518', samples: '0,290', origin: true, F: null, unit: 'g/L' }))
    near('Protein: c', valOf(p, 'c', true), 5.596491)
    const no = runC('Nur die Gerade', () => calibration({ pairs: STD, samples: '', origin: false, F: null, unit: 'mg/L' }))
    check('ohne Probe: Ergebnis ist die Gerade', !!no && no.sample === null && no.result.startsWith('E ='))
    const w = runC('Einheit mit TeX-Zeichen wird bereinigt', () => calibration({ pairs: STD, samples: '0,2', origin: false, F: null, unit: 'mg/L\\frac{$' }))
    check('Einheit bereinigt', w?.unit === 'mg/Lfrac')
    const bad = runC('schlechte Gerade', () => calibration({ pairs: '0; 0,01\n2; 0,30\n4; 0,12\n6; 0,40', samples: '0,2', origin: false, F: null, unit: '' }))
    check('Hinweis bei R² < 0,99', !!bad?.remark?.includes('0,99'))
  }
  expectError('Kalibrierung: ein Standard', () => calibration({ pairs: '1; 0,1', samples: '', origin: false, F: null, unit: '' }))
  expectError('Kalibrierung: gleiche Konzentrationen', () => calibration({ pairs: '1; 0,1\n1; 0,2', samples: '', origin: false, F: null, unit: '' }))
  expectError('Kalibrierung: drei Zahlen in einer Zeile', () => calibration({ pairs: '1; 0,1; 5\n2; 0,2', samples: '', origin: false, F: null, unit: '' }))
  expectError('Kalibrierung: Probe unter dem Achsenabschnitt', () => calibration({ pairs: STD, samples: '0', origin: false, F: null, unit: '' }))
  expectError('Kalibrierung: negative Extinktion', () => calibration({ pairs: STD, samples: '-0,1', origin: false, F: null, unit: '' }))
  expectError('Kalibrierung: Text statt Zahl', () => calibration({ pairs: STD, samples: 'abc', origin: false, F: null, unit: '' }))
  expectError('Kalibrierung: Steigung 0', () => calibration({ pairs: '1; 0,2\n2; 0,2\n3; 0,2', samples: '', origin: false, F: null, unit: '' }))

  /* ------------------------------ Einheiten umrechnen ------------------------------ */

  const CONV: [Parameters<typeof convertUnits>[0], string, string, string, number][] = [
    ['volumen', '250', 'mL', 'L', 0.25],
    ['volumen', '1', 'cm³', 'mL', 1],
    ['volumen', '1', 'dm³', 'L', 1],
    ['volumen', '2', 'm³', 'L', 2000],
    ['volumen', '0,5', 'dL', 'µL', 50000],
    ['volumen', '3', 'mm³', 'nL', 3000],
    ['masse', '5', 'mg', 'µg', 5000],
    ['masse', '0,0025', 'g', 'kg', 2.5e-6],
    ['masse', '1500', 'ng', 'µg', 1.5],
    ['stoffmenge', '0,25', 'mmol', 'µmol', 250],
    ['stoffmenge', '2', 'pmol', 'fmol', 2000],
    ['konz', '0,5', 'mM', 'µmol/L', 500],
    ['konz', '0,1', 'M', 'mM', 100],
    ['konz', '2', 'mol/m³', 'mmol/L', 2],
    ['mkonz', '2,5', 'mg/mL', 'µg/µL', 2.5],
    ['mkonz', '90', 'mg/dL', 'g/L', 0.9],
    ['mkonz', '50', 'ng/µL', 'µg/mL', 50],
    ['mkonz', '1', 'g/mL', 'ng/mL', 1e9],
    ['laenge', '0,45', 'mm', 'µm', 450],
    ['laenge', '600', 'nm', 'µm', 0.6],
    ['flaeche', '1', 'mm²', 'µm²', 1e6],
    ['flaeche', '0,0025', 'mm²', 'µm²', 2500],
    ['flaeche', '2', 'cm²', 'm²', 2e-4],
    ['druck', '1013', 'hPa', 'bar', 1.013],
    ['druck', '760', 'mmHg', 'hPa', 1013.25],
    ['druck', '2', 'atm', 'kPa', 202.65],
    ['druck', '1', 'mbar', 'Pa', 100],
    ['zeit', '2,5', 'h', 'min', 150],
    ['zeit', '90', 's', 'h', 0.025],
    ['zeit', '1', 'd', 's', 86400],
    ['zeit', '1/3', 'h', 's', 1200],
    ['temperatur', '37', '°C', 'K', 310.15],
    ['temperatur', '300', 'K', '°F', 80.33],
    ['temperatur', '98,6', '°F', '°C', 37],
    ['temperatur', '-40', '°F', 'K', 233.15],
    ['temperatur', '0', 'K', '°C', -273.15],
    ['temperatur', '25', '°C', '°C', 25],
  ]
  for (const [qty, v, a, b, want] of CONV) {
    const s = runC(`Einheiten ${v} ${a} → ${b}`, () => convertUnits(qty, N(v), a, b))
    near(`Einheiten ${v} ${a} → ${b}`, s ? lastNum(s.result) : NaN, want, 1e-6)
  }
  {
    const s = runC('Zehnerpotenz im Rechenweg', () => convertUnits('volumen', N('250'), 'mL', 'L'))
    check('1 mL = 10⁻³ L im Rechenweg', !!s?.steps.some((x) => x.tex.includes('1\\,\\text{mL} = 10^{-3}\\,\\text{L}')))
    check('250 · 10⁻³ L im Rechenweg', !!s?.steps.some((x) => x.tex.includes('250 \\cdot 10^{-3}\\,\\text{L}')))
    const f = runC('Fläche: Quadrat der Längeneinheit', () => convertUnits('flaeche', N('1'), 'cm²', 'm²'))
    check('(10⁻² m)² im Rechenweg', !!f?.steps.some((x) => x.tex.includes('(10^{-2}\\,\\text{m})^{2}')))
    const all = convertAll('volumen', N('250'), 'mL')
    check('Alle Einheiten: Anzahl', all.length === QTYS.find((q) => q.id === 'volumen')!.units.length)
    near('Alle Einheiten: µL', texNumAt(all.find((x) => x.u === 'µL')?.tex ?? ''), 250000)
    near('Alle Einheiten: Temperatur in °F', texNumAt(convertAll('temperatur', N('100'), '°C').find((x) => x.u === '°F')?.tex ?? ''), 212)
    for (const q of QTYS) for (const u of q.units) tex(`Einheit ${u.u}`, `1${T(u.u)}`)
    for (const q of QTYS) for (const u of q.units) runC(`Einheitenkette ${q.id}: 1 ${u.u} → ${q.units[0].u}`, () => convertUnits(q.id, N('1'), u.u, q.units[0].u))
  }
  expectError('Einheiten: negative Masse', () => convertUnits('masse', N('-5'), 'g', 'mg'))
  expectError('Einheiten: unter dem absoluten Nullpunkt (°C)', () => convertUnits('temperatur', N('-300'), '°C', 'K'))
  expectError('Einheiten: negative Kelvin', () => convertUnits('temperatur', N('-1'), 'K', '°C'))
  expectError('Einheiten: unbekannte Einheit', () => convertUnits('masse', N('1'), 'xyz', 'g'))
  expectError('Einheiten: Einheit einer anderen Größe', () => convertUnits('masse', N('1'), 'mL', 'g'))
  expectError('Einheiten: leerer Wert', () => convertUnits('volumen', null, 'mL', 'L'))

  /* Prüfung (Verifier): Mischungskreuz und Mischungsgleichung */
  {
    // Zahlen im Erklärtext stehen in $…$ – sonst erscheinen {,}, \frac oder \, sichtbar im Fließtext
    const texOutside = (t?: string) => /\\|\{,\}|\^\{|_\{/.test((t ?? '').replace(/\$[^$]*\$/g, ''))
    const clean = (s: Solution | null) => !!s && ![s.remark, ...s.steps.map((x) => x.note)].some(texOutside)
    const k = runC('Mischungskreuz 96 % und 2/3 %', () => mixCross(N('96'), N('2/3'), N('70'), N('500'), 'g'))
    check('Mischungskreuz: kein TeX außerhalb von $…$', clean(k))
    near('Mischungskreuz: m₁ (70 % aus 96 % und 2/3 %)', valOf(k, 'm_1'), (500 * (70 - 2 / 3)) / (96 - 2 / 3), 1e-3)
    check('Mischungskreuz 12,5 %: kein TeX im Text', clean(runC('Mischungskreuz 12,5 %', () => mixCross(N('12,5'), N('0'), N('5'), null))))
    expectError('Mischungskreuz: über 100 %', () => mixCross(N('150'), N('10'), N('50'), null))
    expectError('Mischungskreuz: negativer Anteil', () => mixCross(N('40'), N('-10'), N('20'), null))
    expectError('Mischungskreuz: Gesamtmasse 0', () => mixCross(N('40'), N('10'), N('25'), N('0')))
    near('Mischungsgleichung: 100 g 20 % + 300 g 4 %', valOf(runC('Mischungsgleichung', () => mixResult(N('100'), N('20'), N('300'), N('4'), 'w')), 'w_M'), 8)
    expectError('Mischungsgleichung: negative Masse', () => mixResult(N('-100'), N('20'), N('300'), N('4'), 'w'))
    expectError('Mischungsgleichung: w über 100 %', () => mixResult(N('100'), N('120'), N('300'), N('4'), 'w'))
    expectError('Mischtemperatur: unter dem absoluten Nullpunkt', () => mixResult(N('1'), N('-300'), N('1'), N('20'), 'T', 'kg'))
    // durch den Nullpunkt mit lauter gleichen Extinktionen: R² wäre 0/0 (früher „R² = –“ im Ergebnis)
    expectError('Kalibrierung durch 0: alle E gleich', () => calibration({ pairs: '1; 0,1\n2; 0,1\n3; 0,1', samples: '', origin: true, F: null, unit: 'mg/L' }))
    expectError('Kalibrierung: alle E gleich', () => calibration({ pairs: '1; 0,1\n2; 0,1\n3; 0,1', samples: '', origin: false, F: null, unit: 'mg/L' }))
  }
})
