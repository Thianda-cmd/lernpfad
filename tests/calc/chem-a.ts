/** Konzentrationen, pH-Wert & Puffer, Titration, Gasgesetze */
import { check, expectError, group, near, resultHas, run } from '../harness'
import type { Solution } from '../../src/math/alg/step'
import { parseNum } from '../../src/math/alg/numinput'
import { T } from '../../src/math/alg/units'
import { convertConc, fromStock, STOCKS, volumeFraction } from '../../src/math/alg/concentration'
import { BUFFERS, bufferPh, bufferPrep, phConvert, STRONG, strongPh, WEAK, weakPh, type PhSolution } from '../../src/math/alg/ph'
import { parseReadings, PRIMARY, titer, titrationConc, titrationPredict, TITRATIONS } from '../../src/math/alg/titration'
import { gasChange, idealGas, molarVolume } from '../../src/math/alg/gas'

/** Einheiten der Ergebnisse → Faktor zur Grundeinheit (mol/L, g/L, L, g, mol, Pa) */
const BASE: [string, number][] = (
  [
    ['mol/L', 1],
    ['mmol/L', 1e-3],
    ['µmol/L', 1e-6],
    ['nmol/L', 1e-9],
    ['g/L', 1],
    ['mg/mL', 1],
    ['mg/L', 1e-3],
    ['µg/mL', 1e-3],
    ['µg/L', 1e-6],
    ['ng/mL', 1e-6],
    ['m³', 1000],
    ['L', 1],
    ['mL', 1e-3],
    ['µL', 1e-6],
    ['kg', 1000],
    ['g', 1],
    ['mg', 1e-3],
    ['µg', 1e-6],
    ['mol', 1],
    ['mmol', 1e-3],
    ['µmol', 1e-6],
    ['bar', 1e5],
    ['mbar', 100],
    ['hPa', 100],
    ['kPa', 1000],
    ['Pa', 1],
  ] as [string, number][]
).map(([u, f]) => [T(u), f])

/** Zahl hinter „key =“ bzw. „key ≈“ aus Ergebnis und Zusatzzeilen – in Grundeinheit umgerechnet */
function pick(s: Solution | null, key: string): number {
  if (!s) return NaN
  const text = [s.result, ...(s.extra ?? [])].join(' ;; ')
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:^|[^A-Za-z\\\\])${esc}\\s*(?:=|\\\\approx)\\s*(-?\\d+(?:\\\\,\\d{3})*(?:\\{,\\}\\d+)?)((?:\\s*\\\\cdot\\s*10\\^\\{-?\\d+\\})?)`)
  const m = re.exec(text)
  if (!m) return NaN
  let v = parseFloat(m[1].replace(/\\,/g, '').replace('{,}', '.'))
  const e = /10\^\{(-?\d+)\}/.exec(m[2])
  if (e) v *= 10 ** parseInt(e[1], 10)
  const rest = text.slice(m.index + m[0].length)
  const hit = BASE.find(([t]) => rest.startsWith(t))
  return hit ? v * hit[1] : v
}

group('chem-a', () => {
  const N = (s: string) => parseNum(s)
  /** rechnen + KaTeX prüfen + markierte Ergebniszeile verlangen */
  const R = <S extends Solution>(where: string, f: () => S): S | null => {
    const s = run(where, f)
    if (!s) return s
    check(`${where} [Ergebniszeile]`, s.steps.some((x) => x.final), 'keine Zeile mit final: true')
    const texts = [s.remark ?? '', ...s.steps.map((x) => x.note ?? '')]
    const odd = texts.find((x) => (x.match(/\$/g) ?? []).length % 2 === 1)
    check(`${where} [$-Paare]`, odd === undefined, `ungerade Zahl von $ in: ${odd?.slice(0, 120)}`)
    const all = [s.result, ...(s.extra ?? []), ...texts, ...s.steps.map((x) => `${x.tex} ${x.head ?? ''}`)].join(' ')
    const junk = /\b(?:NaN|Infinity|undefined)\b|\[object/.exec(all)
    check(`${where} [keine Rechenreste]`, !junk, `„${junk?.[0]}“ in der Ausgabe`)
    return s
  }
  const has = (where: string, s: Solution | null, text: string) => check(where, !!s && [s.remark ?? '', ...s.steps.map((x) => `${x.head ?? ''} ${x.note ?? ''}`)].join(' ').includes(text), `„${text}“ fehlt`)
  const ph = (where: string, s: PhSolution | null, want: number, tol = 0.005) => near(where, s?.pH ?? NaN, want, 0, tol)

  /* ============================ Konzentrationen ============================ */

  // Salzsäure 37 %, ρ = 1,19 g/mL → c = 0,37 · 1190 / 36,46 = 12,08 mol/L
  let s: Solution | null = R('Konz. w → c (HCl 37 %)', () => convertConc({ known: 'w', value: N('37'), unit: '%', formula: 'HCl', rho: N('1,19'), rhoUnit: 'g/mL' }))
  near('Konz. HCl 37 %: c', pick(s, 'c'), 12.07625)
  near('Konz. HCl 37 %: β', pick(s, '\\beta'), 440.3)
  resultHas('Konz. HCl 37 %: Anzeige', s, '12,08', 'mol/L')
  // NaCl 0,5 mol/L, ρ = 1,02 → β = 29,22 g/L, w = 2,865 %
  s = R('Konz. c → β, w (NaCl)', () => convertConc({ known: 'c', value: N('0,5'), unit: 'mol/L', formula: 'NaCl', rho: N('1,02'), rhoUnit: 'g/mL' }))
  near('Konz. NaCl: β', pick(s, '\\beta'), 29.22)
  near('Konz. NaCl: w', pick(s, 'w'), 2.864706)
  // Nitrat 50 mg/L (Trinkwasser-Grenzwert) → 0,8063 mmol/L, 50 ppm
  s = R('Konz. β → c, ppm (Nitrat)', () => convertConc({ known: 'beta', value: N('50'), unit: 'mg/L', formula: 'NO3', rho: N('1'), rhoUnit: 'g/mL' }))
  near('Konz. Nitrat: c', pick(s, 'c'), 0.0008063216)
  near('Konz. Nitrat: w in %', pick(s, 'w'), 0.005)
  resultHas('Konz. Nitrat: ppm', s, '50', 'ppm')
  // ohne Dichte: nur β, Hinweis auf ρ
  s = R('Konz. c → β ohne Dichte (NaOH)', () => convertConc({ known: 'c', value: N('100'), unit: 'mmol/L', formula: 'NaOH' }))
  near('Konz. NaOH 100 mmol/L: β', pick(s, '\\beta'), 4.0)
  has('Konz. ohne Dichte: Hinweis', s, 'Dichte')
  // molare Masse direkt: Schwefelsäure 96 %, ρ 1,84 → 18,01 mol/L
  s = R('Konz. w → c mit M direkt', () => convertConc({ known: 'w', value: N('96'), unit: '%', M: N('98,08'), rho: N('1,84'), rhoUnit: 'g/cm³' }))
  near('Konz. H2SO4 96 %: c', pick(s, 'c'), 18.00979)
  // physiologische Kochsalzlösung 9 g/L, ρ = 1,005 g/mL
  s = R('Konz. β → c, w (Kochsalzlösung)', () => convertConc({ known: 'beta', value: N('9'), unit: 'g/L', formula: 'NaCl', rho: N('1,005') }))
  near('Konz. Kochsalz: c', pick(s, 'c'), 0.1540041)
  near('Konz. Kochsalz: w', pick(s, 'w'), 0.8955224)
  // w in g/kg und ρ in g/cm³: 50 g/kg NaOH, ρ = 1,054 → β = 52,7 g/L, c = 1,318 mol/L
  s = R('Konz. w in g/kg → c', () => convertConc({ known: 'w', value: N('50'), unit: 'g/kg', formula: 'NaOH', rho: N('1,054'), rhoUnit: 'g/cm³' }))
  near('Konz. NaOH 50 g/kg: β', pick(s, '\\beta'), 52.7)
  near('Konz. NaOH 50 g/kg: c', pick(s, 'c'), 1.3175)
  expectError('Konz.: w über 100 %', () => convertConc({ known: 'w', value: N('120'), unit: '%', formula: 'HCl', rho: N('1,2') }))
  expectError('Konz.: w ohne Dichte', () => convertConc({ known: 'w', value: N('37'), unit: '%', formula: 'HCl' }))
  expectError('Konz.: c ohne Stoff', () => convertConc({ known: 'c', value: N('1'), unit: 'mol/L' }))
  expectError('Konz.: negativer Wert', () => convertConc({ known: 'c', value: N('-1'), unit: 'mol/L', formula: 'NaCl' }))
  expectError('Konz.: leerer Wert', () => convertConc({ known: 'c', value: N(''), unit: 'mol/L', formula: 'NaCl' }))
  expectError('Konz.: w wäre über 100 %', () => convertConc({ known: 'c', value: N('20'), unit: 'mol/L', formula: 'NaCl', rho: N('1') }))
  expectError('Konz.: β ohne M und ρ', () => convertConc({ known: 'beta', value: N('5'), unit: 'g/L' }))
  expectError('Konz.: unbekannte Formel', () => convertConc({ known: 'c', value: N('1'), unit: 'mol/L', formula: 'Xy2' }))
  expectError('Konz.: Dichte 0', () => convertConc({ known: 'c', value: N('1'), unit: 'mol/L', formula: 'NaCl', rho: N('0') }))

  /* ---------------- aus konzentrierter Lösung ---------------- */

  // 500 mL 1 mol/L HCl aus 37 %iger: V = 0,5 mol / 12,076 mol/L = 41,40 mL
  s = R('Stamm HCl 37 % → 1 mol/L', () => fromStock({ formula: 'HCl', w: N('37'), rho: N('1,19'), c: N('1'), cu: 'mol/L', V: N('500'), vu: 'mL', kind: 'saeure' }))
  near('Stamm HCl: V', pick(s, 'V_{\\text{Stamm}}'), 41.40359e-3)
  near('Stamm HCl: c_Stamm', pick(s, 'c_{\\text{Stamm}}'), 12.07625)
  near('Stamm HCl: m_Stamm', pick(s, 'm_{\\text{Stamm}}'), 49.27027)
  near('Stamm HCl: Wasser', pick(s, 'V_{\\text{Wasser}}'), 458.5964e-3)
  resultHas('Stamm HCl: in mL', s, '41,4', 'mL')
  has('Stamm HCl: Sicherheitsregel', s, 'Erst das Wasser, dann die Säure!')
  has('Stamm HCl: Messkolben', s, 'Messkolben')
  s = R('Stamm H2SO4 96 % → 0,5 mol/L', () => fromStock({ formula: 'H2SO4', w: N('96'), rho: N('1,84'), c: N('0,5'), cu: 'mol/L', V: N('1'), vu: 'L' }))
  near('Stamm H2SO4: V', pick(s, 'V_{\\text{Stamm}}'), 27.76268e-3)
  s = R('Stamm NH3 25 % → 2 mol/L', () => fromStock({ formula: 'NH3', w: N('25'), rho: N('0,91'), c: N('2'), cu: 'mol/L', V: N('250'), vu: 'mL' }))
  near('Stamm NH3: V', pick(s, 'V_{\\text{Stamm}}'), 37.45055e-3)
  has('Stamm NH3: Hinweis Lauge', s, 'Laugen')
  s = R('Stamm Eisessig → 0,1 mol/L', () => fromStock({ formula: 'CH3COOH', w: N('100'), rho: N('1,05'), c: N('100'), cu: 'mmol/L', V: N('1000'), vu: 'mL' }))
  near('Stamm Eisessig: V', pick(s, 'V_{\\text{Stamm}}'), 5.72e-3)
  s = R('Stamm NaOH 50 % → 1 mol/L', () => fromStock({ formula: 'NaOH', w: N('50'), rho: N('1,52'), c: N('1'), cu: 'mol/L', V: N('100'), vu: 'mL' }))
  near('Stamm NaOH: V', pick(s, 'V_{\\text{Stamm}}'), 5.263158e-3)
  s = R('Stamm HNO3 65 % → 0,1 mol/L', () => fromStock({ formula: 'HNO3', w: N('65'), rho: N('1,40'), c: N('0,1'), cu: 'mol/L', V: N('1'), vu: 'L' }))
  near('Stamm HNO3: V', pick(s, 'V_{\\text{Stamm}}'), 6.925275e-3)
  for (const st of STOCKS) R(`Stamm Vorlage ${st.name}`, () => fromStock({ formula: st.formula, w: N(st.w), rho: N(st.rho), c: N('0,5'), cu: 'mol/L', V: N('250'), vu: 'mL', kind: st.kind }))
  expectError('Stamm: Ziel konzentrierter als Stamm', () => fromStock({ formula: 'HCl', w: N('37'), rho: N('1,19'), c: N('20'), cu: 'mol/L', V: N('1'), vu: 'L' }))
  expectError('Stamm: w über 100 %', () => fromStock({ formula: 'HCl', w: N('137'), rho: N('1,19'), c: N('1'), cu: 'mol/L', V: N('1'), vu: 'L' }))
  expectError('Stamm: Volumen fehlt', () => fromStock({ formula: 'HCl', w: N('37'), rho: N('1,19'), c: N('1'), cu: 'mol/L', V: null, vu: 'L' }))
  expectError('Stamm: ohne Stoff', () => fromStock({ w: N('37'), rho: N('1,19'), c: N('1'), cu: 'mol/L', V: N('1'), vu: 'L' }))

  /* ---------------- Volumenanteil ---------------- */

  // 100 mL 70 % Ethanol aus 96 %: V = 70 · 100 / 96 = 72,92 mL
  s = R('φ: 70 % aus 96 % Ethanol', () => volumeFraction({ art: 'ansetzen', phi1: N('96'), phi2: N('70'), V: N('100'), vu: 'mL', name: 'Ethanol' }))
  near('φ 70 % aus 96 %: V', pick(s, 'V_{\\text{Stamm}}'), 72.91667e-3)
  has('φ: Volumenkontraktion', s, 'Volumenkontraktion')
  s = R('φ: 500 mL 70 % aus 96 %', () => volumeFraction({ art: 'ansetzen', phi1: N('96'), phi2: N('70'), V: N('500'), vu: 'mL' }))
  near('φ 500 mL: V', pick(s, 'V_{\\text{Stamm}}'), 364.5833e-3)
  s = R('φ aus Volumina', () => volumeFraction({ art: 'anteil', Vs: N('30'), Vg: N('250'), vu: 'mL' }))
  near('φ = 30/250', pick(s, '\\varphi'), 12)
  s = R('V_Stoff aus φ', () => volumeFraction({ art: 'anteil', phi: N('40'), Vg: N('200'), vu: 'mL' }))
  near('V_Stoff = 40 % von 200 mL', pick(s, 'V_{\\text{Stoff}}'), 80e-3)
  s = R('V_Gesamt aus φ', () => volumeFraction({ art: 'anteil', phi: N('70'), Vs: N('35'), vu: 'mL' }))
  near('V_Gesamt = 35 / 0,7', pick(s, 'V_{\\text{Gesamt}}'), 50e-3)
  expectError('φ: Ziel ≥ Stamm', () => volumeFraction({ art: 'ansetzen', phi1: N('70'), phi2: N('96'), V: N('100'), vu: 'mL' }))
  expectError('φ: drei Werte', () => volumeFraction({ art: 'anteil', phi: N('40'), Vs: N('10'), Vg: N('200'), vu: 'mL' }))
  expectError('φ: V_Stoff > V_Gesamt', () => volumeFraction({ art: 'anteil', Vs: N('300'), Vg: N('200'), vu: 'mL' }))

  /* ============================ pH-Wert ============================ */

  let p: PhSolution | null = R('pH 3,5 → c', () => phConvert({ given: 'pH', value: N('3,5') }))
  near('pH 3,5: c(H3O+)', pick(p, 'c(\\mathrm{H_3O^+})'), 3.162278e-4)
  near('pH 3,5: c(OH−)', pick(p, 'c(\\mathrm{OH^-})'), 3.162278e-11)
  resultHas('pH 3,5: pOH und sauer', p, '10,50', 'sauer')
  p = R('c(H3O+) 2,5 mmol/L → pH', () => phConvert({ given: 'h', value: N('2,5'), unit: 'mmol/L' }))
  ph('c(H3O+) 2,5 mmol/L: pH', p, 2.60206)
  resultHas('c(H3O+) 2,5 mmol/L: Anzeige', p, '2,60')
  p = R('c(OH−) 0,01 mol/L → pH', () => phConvert({ given: 'oh', value: N('0,01'), unit: 'mol/L' }))
  ph('c(OH−) 0,01: pH', p, 12)
  resultHas('c(OH−) 0,01: alkalisch', p, '12,00', 'alkalisch')
  p = R('pOH 4,2 → pH', () => phConvert({ given: 'pOH', value: N('4,2') }))
  ph('pOH 4,2: pH', p, 9.8)
  near('pOH 4,2: c(H3O+)', pick(p, 'c(\\mathrm{H_3O^+})'), 1.584893e-10)
  p = R('pH 7 neutral', () => phConvert({ given: 'pH', value: N('7') }))
  resultHas('pH 7: neutral', p, 'neutral')
  expectError('pH: 20', () => phConvert({ given: 'pH', value: N('20') }))
  expectError('pH: c = 0', () => phConvert({ given: 'h', value: N('0'), unit: 'mol/L' }))
  expectError('pH: leer', () => phConvert({ given: 'pH', value: N('') }))

  /* ---------------- starke Säuren und Basen ---------------- */

  p = R('stark: HCl 0,01 mol/L', () => strongPh({ kind: 'saeure', c: N('0,01'), cu: 'mol/L', z: N('1'), preset: 'hcl' }))
  ph('HCl 0,01: pH', p, 2)
  resultHas('HCl 0,01: Anzeige', p, '2,00')
  p = R('stark: H2SO4 0,05 mol/L', () => strongPh({ kind: 'saeure', c: N('0,05'), cu: 'mol/L', z: N('2'), preset: 'h2so4' }))
  ph('H2SO4 0,05: pH (z = 2)', p, 1)
  has('H2SO4: Hinweis 2. Stufe', p, '2. Protolysestufe')
  p = R('stark: NaOH 0,05 mol/L', () => strongPh({ kind: 'base', c: N('0,05'), cu: 'mol/L', z: N('1'), preset: 'naoh' }))
  ph('NaOH 0,05: pH', p, 12.69897)
  p = R('stark: Ca(OH)2 0,01 mol/L', () => strongPh({ kind: 'base', c: N('0,01'), cu: 'mol/L', z: N('2'), preset: 'caoh2' }))
  ph('Ca(OH)2 0,01: pH', p, 12.30103)
  p = R('stark: HCl 10⁻⁸ mol/L (Autoprotolyse)', () => strongPh({ kind: 'saeure', c: N('1e-8'), cu: 'mol/L', z: N('1'), preset: 'hcl' }))
  ph('HCl 10⁻⁸: pH exakt', p, 6.978294)
  check('HCl 10⁻⁸: sauer, nicht alkalisch', (p?.pH ?? 99) < 7)
  p = R('stark: NaOH 10⁻⁸ mol/L (Autoprotolyse)', () => strongPh({ kind: 'base', c: N('1e-8'), cu: 'mol/L', z: N('1') }))
  ph('NaOH 10⁻⁸: pH exakt', p, 7.021706)
  p = R('stark: HCl 5 mmol/L', () => strongPh({ kind: 'saeure', c: N('5'), cu: 'mmol/L', z: N('1') }))
  ph('HCl 5 mmol/L: pH', p, 2.30103)
  p = R('stark: Ca(OH)2 zu konzentriert', () => strongPh({ kind: 'base', c: N('0,05'), cu: 'mol/L', z: N('2'), preset: 'caoh2' }))
  has('Ca(OH)2: Löslichkeit', p, 'löst sich nur')
  for (const st of STRONG) R(`stark: Vorlage ${st.name}`, () => strongPh({ kind: st.kind, c: N('0,1'), cu: 'mol/L', z: N(String(st.z)), preset: st.id }))
  expectError('stark: z = 1,5', () => strongPh({ kind: 'saeure', c: N('0,1'), cu: 'mol/L', z: N('1,5') }))
  expectError('stark: z = 4', () => strongPh({ kind: 'saeure', c: N('0,1'), cu: 'mol/L', z: N('4') }))
  expectError('stark: c fehlt', () => strongPh({ kind: 'saeure', c: null, cu: 'mol/L', z: N('1') }))
  expectError('stark: c negativ', () => strongPh({ kind: 'base', c: N('-0,1'), cu: 'mol/L', z: N('1') }))

  /* ---------------- schwache Säuren und Basen ---------------- */

  // Essigsäure 0,1 mol/L: Näherung ½(4,76 + 1) = 2,88; exakt 2,883; α = 1,31 %
  p = R('schwach: Essigsäure 0,1 mol/L', () => weakPh({ kind: 'saeure', kType: 'pKs', k: N('4,76'), c: N('0,1'), cu: 'mol/L', preset: 'essig' }))
  ph('Essigsäure: pH exakt', p, 2.882863)
  near('Essigsäure: Näherung', pick(p, '\\text{Näherung: pH}'), 2.88, 0, 0.005)
  near('Essigsäure: α in %', pick(p, '\\alpha'), 1.309596, 2e-3)
  has('Essigsäure: Näherung ok', p, 'gut genug')
  // Ameisensäure 0,01 mol/L: α ≈ 12 % – Näherung zu ungenau
  p = R('schwach: Ameisensäure 0,01 mol/L', () => weakPh({ kind: 'saeure', kType: 'pKs', k: N('3,75'), c: N('0,01'), cu: 'mol/L', preset: 'ameisen' }))
  ph('Ameisensäure: pH exakt', p, 2.903936)
  near('Ameisensäure: Näherung', pick(p, '\\text{Näherung: pH}'), 2.875, 0, 0.006)
  has('Ameisensäure: Näherung zu ungenau', p, 'zu ungenau')
  // Ammoniak 0,1 mol/L, pKb 4,75 → pH 11,12
  p = R('schwach: Ammoniak 0,1 mol/L', () => weakPh({ kind: 'base', kType: 'pKb', k: N('4,75'), c: N('0,1'), cu: 'mol/L', preset: 'ammoniak' }))
  ph('Ammoniak: pH', p, 11.1221)
  // Ks direkt: 1,8 · 10⁻⁵, 0,05 mol/L
  p = R('schwach: Ks gegeben', () => weakPh({ kind: 'saeure', kType: 'Ks', k: N('1,8·10^-5'), c: N('50'), cu: 'mmol/L' }))
  ph('Ks 1,8e-5, 0,05 mol/L: pH', p, 3.026999)
  // Base, aber pKs der korrespondierenden Säure gegeben (NH4+ 9,25) → pKb 4,75
  p = R('schwach: Base mit pKs der Säure', () => weakPh({ kind: 'base', kType: 'pKs', k: N('9,25'), c: N('0,1'), cu: 'mol/L' }))
  ph('NH3 über pKs 9,25: pH', p, 11.1221)
  // Acetat als Base (Natriumacetat 0,1 mol/L, pKb 9,24) → pH 8,88
  p = R('schwach: Natriumacetat 0,1 mol/L', () => weakPh({ kind: 'base', kType: 'pKb', k: N('9,24'), c: N('0,1'), cu: 'mol/L', preset: 'acetat' }))
  ph('Acetat: pH', p, 8.879984)
  near('Acetat: Näherung', pick(p, '\\text{Näherung: pH}'), 8.88, 0, 0.005)
  // Flusssäure 1 mmol/L: α ≈ 55 %
  p = R('schwach: Flusssäure 1 mmol/L', () => weakPh({ kind: 'saeure', kType: 'pKs', k: N('3,17'), c: N('1'), cu: 'mmol/L', preset: 'fluss' }))
  ph('Flusssäure: pH exakt', p, 3.258866)
  near('Flusssäure: α in %', pick(p, '\\alpha'), 55.09776, 2e-3)
  // sehr verdünnt und sehr schwach: Wasser-Autoprotolyse zählt mit
  p = R('schwach: Ammonium 10⁻⁴ mol/L', () => weakPh({ kind: 'saeure', kType: 'pKs', k: N('9,25'), c: N('0,1'), cu: 'mmol/L', preset: 'ammonium' }))
  ph('Ammonium 10⁻⁴: pH mit Autoprotolyse', p, 6.589862)
  near('Ammonium 10⁻⁴: ohne Autoprotolyse', pick(p, '\\text{ohne Wasser-Autoprotolyse: pH}'), 6.625515, 0, 0.006)
  for (const w of WEAK) R(`schwach: Vorlage ${w.name}`, () => weakPh({ kind: w.kind, kType: w.kType, k: N(w.pK), c: N('0,1'), cu: 'mol/L', preset: w.id }))
  expectError('schwach: pKs fehlt', () => weakPh({ kind: 'saeure', kType: 'pKs', k: null, c: N('0,1'), cu: 'mol/L' }))
  expectError('schwach: Ks ≤ 0', () => weakPh({ kind: 'saeure', kType: 'Ks', k: N('0'), c: N('0,1'), cu: 'mol/L' }))
  expectError('schwach: pKs 20', () => weakPh({ kind: 'saeure', kType: 'pKs', k: N('20'), c: N('0,1'), cu: 'mol/L' }))
  expectError('schwach: c fehlt', () => weakPh({ kind: 'saeure', kType: 'pKs', k: N('4,76'), c: null, cu: 'mol/L' }))

  /* ---------------- Puffer ---------------- */

  let b = R('Puffer: Acetat 0,1/0,1', () => bufferPh({ pKs: N('4,76'), input: 'c', a: N('0,1'), b: N('0,1'), unit: 'mol/L', acid: 'CH3COOH', base: 'CH3COONa' }))
  ph('Acetatpuffer 1:1: pH = pKs', b, 4.76)
  b = R('Puffer: Acetat aus Stoffmengen', () => bufferPh({ pKs: N('4,76'), input: 'n', a: N('2'), b: N('3'), unit: 'mmol', acid: 'CH3COOH', base: 'CH3COONa' }))
  ph('Acetat 2 : 3 mmol: pH', b, 4.936091)
  b = R('Puffer: Phosphat aus Massen', () => bufferPh({ pKs: N('7,21'), input: 'm', a: N('0,60'), b: N('1,42'), unit: 'g', acid: 'NaH2PO4', base: 'Na2HPO4' }))
  ph('Phosphat 0,60 g / 1,42 g: pH', b, 7.51108)
  b = R('Puffer: Volumina + HCl-Zugabe', () =>
    bufferPh({ pKs: N('4,76'), input: 'V', a: N('50'), b: N('50'), unit: 'mL', ca: N('0,1'), cb: N('0,1'), csu: 'mol/L', acid: 'CH3COOH', base: 'CH3COONa', add: 'saeure', cAdd: N('0,1'), caddu: 'mol/L', vAdd: N('1'), vaddu: 'mL' }),
  )
  ph('Acetat + 0,1 mmol HCl: pH', b, 4.742626)
  near('Acetat + HCl: pH in Wasser', pick(b, '\\text{in Wasser statt Puffer: pH}'), 3.004321, 0, 0.006)
  near('Acetat + HCl: pH vorher', pick(b, '\\text{vor der Zugabe: pH}'), 4.76, 0, 0.006)
  b = R('Puffer: Ammonium 0,1/0,05', () => bufferPh({ pKs: N('9,25'), input: 'c', a: N('0,1'), b: N('0,05'), unit: 'mol/L', acid: 'NH4Cl', base: 'NH3' }))
  ph('Ammoniumpuffer 2:1: pH', b, 8.94897)
  b = R('Puffer: NaOH-Zugabe mit Puffervolumen', () =>
    bufferPh({ pKs: N('4,76'), input: 'c', a: N('0,1'), b: N('0,1'), unit: 'mol/L', Vp: N('100'), vpu: 'mL', add: 'base', cAdd: N('0,1'), caddu: 'mol/L', vAdd: N('5'), vaddu: 'mL' }),
  )
  ph('Acetat 100 mL + 0,5 mmol NaOH: pH', b, 4.803466)
  b = R('Puffer: außerhalb Pufferbereich', () => bufferPh({ pKs: N('4,76'), input: 'c', a: N('0,1'), b: N('0,005'), unit: 'mol/L' }))
  has('Puffer: Warnung Pufferbereich', b, 'außerhalb')
  for (const bu of BUFFERS) R(`Puffer: Vorlage ${bu.name}`, () => bufferPh({ pKs: N(bu.pKs), input: 'c', a: N('0,1'), b: N('0,1'), unit: 'mol/L', acid: bu.acid, base: bu.base }))
  expectError('Puffer: Kapazität überschritten', () => bufferPh({ pKs: N('4,76'), input: 'n', a: N('5'), b: N('5'), unit: 'mmol', add: 'saeure', cAdd: N('1'), caddu: 'mol/L', vAdd: N('20'), vaddu: 'mL' }))
  expectError('Puffer: pKs fehlt', () => bufferPh({ pKs: null, input: 'c', a: N('0,1'), b: N('0,1'), unit: 'mol/L' }))
  expectError('Puffer: Base fehlt', () => bufferPh({ pKs: N('4,76'), input: 'c', a: N('0,1'), b: null, unit: 'mol/L' }))
  expectError('Puffer: Massen ohne Formeln', () => bufferPh({ pKs: N('7,21'), input: 'm', a: N('1'), b: N('1'), unit: 'g' }))
  expectError('Puffer: Zugabe ohne Volumen', () => bufferPh({ pKs: N('4,76'), input: 'c', a: N('0,1'), b: N('0,1'), unit: 'mol/L', add: 'saeure', cAdd: N('0,1'), caddu: 'mol/L', vAdd: N('1'), vaddu: 'mL' }))

  // Puffer ansetzen: Phosphat pH 7,4, 0,1 mol/L, 1 L → 4,707 g NaH2PO4 und 8,626 g Na2HPO4
  s = R('Puffer ansetzen: Phosphat pH 7,4', () => bufferPrep({ pKs: N('7,21'), pH: N('7,4'), cTot: N('0,1'), cu: 'mol/L', V: N('1'), vu: 'L', acid: 'NaH2PO4', base: 'Na2HPO4' }))
  near('Phosphat ansetzen: m(NaH2PO4)', pick(s, 'm(\\mathrm{NaH_{2}PO_{4}})'), 4.707283)
  near('Phosphat ansetzen: m(Na2HPO4)', pick(s, 'm(\\mathrm{Na_{2}HPO_{4}})'), 8.626356)
  // Acetatpuffer pH 5,0: Essigsäure aus 1-molarer Lösung, Natriumacetat eingewogen
  s = R('Puffer ansetzen: Acetat pH 5', () => bufferPrep({ pKs: N('4,76'), pH: N('5,0'), cTot: N('0,2'), cu: 'mol/L', V: N('500'), vu: 'mL', acid: 'CH3COOH', base: 'CH3COONa', ca: N('1'), csu: 'mol/L' }))
  near('Acetat ansetzen: V(Essigsäure)', pick(s, 'V(\\mathrm{CH_{3}COOH})'), 36.52567e-3)
  near('Acetat ansetzen: m(Natriumacetat)', pick(s, 'm(\\mathrm{CH_{3}COONa})'), 5.207434)
  // nur Verhältnis: Tris pH 7,5
  s = R('Puffer ansetzen: nur Verhältnis (Tris)', () => bufferPrep({ pKs: N('8,07'), pH: N('7,5'), acid: 'C4H11NO3·HCl', base: 'C4H11NO3' }))
  near('Tris pH 7,5: Verhältnis', pick(s, '\\frac{c(\\mathrm{C_{4}H_{11}NO_{3}})}{c(\\mathrm{C_{4}H_{11}NO_{3}\\cdot HCl})}'), 0.2691535)
  has('Tris: Temperatur', s, 'Temperatur')
  // nur Konzentrationen: Ammonium pH 9,0
  s = R('Puffer ansetzen: Konzentrationen (Ammonium)', () => bufferPrep({ pKs: N('9,25'), pH: N('9'), cTot: N('0,1'), cu: 'mol/L', acid: 'NH4Cl', base: 'NH3' }))
  near('Ammonium pH 9: c(NH4Cl)', pick(s, 'c(\\mathrm{NH_{4}Cl})'), 0.0640065)
  near('Ammonium pH 9: c(NH3)', pick(s, 'c(\\mathrm{NH_{3}})'), 0.0359935)
  expectError('Puffer ansetzen: pH fehlt', () => bufferPrep({ pKs: N('4,76'), pH: null }))
  expectError('Puffer ansetzen: zu weit vom pKs', () => bufferPrep({ pKs: N('4,76'), pH: N('8') }))
  expectError('Puffer ansetzen: V ohne c', () => bufferPrep({ pKs: N('4,76'), pH: N('5'), V: N('1'), vu: 'L' }))
  expectError('Puffer ansetzen: Stammlösungen zu verdünnt', () => bufferPrep({ pKs: N('4,76'), pH: N('4,76'), cTot: N('1'), cu: 'mol/L', V: N('100'), vu: 'mL', ca: N('0,1'), cb: N('0,1'), csu: 'mol/L' }))

  /* ============================ Titration ============================ */

  check('Ablesewerte exakt', parseReadings('18,45; 18,50 18,40').length === 3)
  // HCl mit NaOH: c = 0,1 · 18,45 / 20 = 0,09225 mol/L
  let t: Solution | null = R('Titration HCl mit NaOH', () =>
    titrationConc({ cM: N('0,1'), cmu: 'mol/L', t: N('1'), readings: '18,45; 18,50; 18,40', vmu: 'mL', VP: N('20'), vpu: 'mL', nuP: N('1'), nuM: N('1'), formula: 'HCl', P: '\\mathrm{HCl}', M: '\\mathrm{NaOH}', eq: TITRATIONS[0].eq }),
  )
  near('Titration HCl: c', pick(t, 'c(\\mathrm{HCl})'), 0.09225)
  near('Titration HCl: β', pick(t, '\\beta(\\mathrm{HCl})'), 3.363435)
  near('Titration HCl: m', pick(t, 'm(\\mathrm{HCl})'), 0.0672687)
  near('Titration HCl: Mittelwert', pick(t, '\\bar{V}_M'), 18.45e-3)
  // Schwefelsäure 1 : 2 mit Titer
  t = R('Titration H2SO4 (1 : 2, Titer)', () => titrationConc({ cM: N('0,1'), cmu: 'mol/L', t: N('0,9952'), readings: '21,30; 21,25; 21,35', vmu: 'mL', VP: N('10'), vpu: 'mL', nuP: N('1'), nuM: N('2'), formula: 'H2SO4', P: '\\mathrm{H_2SO_4}', M: '\\mathrm{NaOH}' }))
  near('Titration H2SO4: c', pick(t, 'c(\\mathrm{H_2SO_4})'), 0.1059888)
  // Speiseessig: Aliquot und Gehalt → 4,985 %
  const ess = TITRATIONS.find((x) => x.id === 'essig-naoh')!
  t = R('Titration Speiseessig (Aliquot, Gehalt)', () => titrationConc({ cM: N(ess.cM), cmu: 'mol/L', readings: ess.readings, vmu: 'mL', VP: N(ess.VP), vpu: 'mL', nuP: N('1'), nuM: N('1'), formula: ess.formula, VK: N(ess.VK!), vku: 'mL', mE: N(ess.mE!), meu: 'g', P: ess.P, M: ess.M, eq: ess.eq }))
  near('Speiseessig: c (verdünnt)', pick(t, 'c(\\mathrm{CH_3COOH})'), 0.083)
  near('Speiseessig: Gehalt', pick(t, 'w'), 4.98498)
  // Eisen(II) mit Permanganat 5 : 1
  t = R('Titration Fe2+ mit KMnO4 (5 : 1)', () => titrationConc({ cM: N('0,02'), cmu: 'mol/L', readings: '17,85; 17,90', vmu: 'mL', VP: N('20'), vpu: 'mL', nuP: N('5'), nuM: N('1'), formula: 'Fe', P: '\\mathrm{Fe^{2+}}', M: '\\mathrm{MnO_4^-}' }))
  near('Fe2+: c', pick(t, 'c(\\mathrm{Fe^{2+}})'), 0.089375)
  near('Fe2+: β', pick(t, '\\beta(\\mathrm{Fe^{2+}})'), 4.991594)
  // technische Soda: 94,73 %
  const soda = TITRATIONS.find((x) => x.id === 'soda-hcl')!
  t = R('Titration Soda (Gehalt)', () => titrationConc({ cM: N(soda.cM), cmu: 'mol/L', readings: soda.readings, vmu: 'mL', VP: N(soda.VP), vpu: 'mL', nuP: N('1'), nuM: N('2'), formula: soda.formula, VK: N(soda.VK!), vku: 'mL', mE: N(soda.mE!), meu: 'g', P: soda.P, M: soda.M }))
  near('Soda: Gehalt', pick(t, 'w'), 94.72856)
  // ganze Einwaage titriert (ohne Probevolumen)
  t = R('Titration ohne Probevolumen (Einwaage)', () => titrationConc({ cM: N('0,1'), cmu: 'mol/L', readings: '37,0', vmu: 'mL', vpu: 'mL', nuP: N('1'), nuM: N('2'), formula: 'Na2CO3', mE: N('200'), meu: 'mg' }))
  near('Einwaage Soda: Gehalt', pick(t, 'w'), 98.04075)
  for (const tp of TITRATIONS)
    R(`Titration Vorlage ${tp.label}`, () =>
      titrationConc({ cM: N(tp.cM), cmu: 'mol/L', readings: tp.readings, vmu: 'mL', VP: N(tp.VP), vpu: 'mL', nuP: N(String(tp.nuP)), nuM: N(String(tp.nuM)), formula: tp.formula, VK: tp.VK ? N(tp.VK) : null, vku: 'mL', mE: tp.mE ? N(tp.mE) : null, meu: 'g', P: tp.P, M: tp.M, eq: tp.eq }),
    )
  expectError('Titration: kein Verbrauch', () => titrationConc({ cM: N('0,1'), cmu: 'mol/L', readings: '  ', vmu: 'mL', VP: N('20'), vpu: 'mL', nuP: N('1'), nuM: N('1') }))
  expectError('Titration: negativer Verbrauch', () => titrationConc({ cM: N('0,1'), cmu: 'mol/L', readings: '18,4; -2', vmu: 'mL', VP: N('20'), vpu: 'mL', nuP: N('1'), nuM: N('1') }))
  expectError('Titration: Kolben ohne Probevolumen', () => titrationConc({ cM: N('0,1'), cmu: 'mol/L', readings: '18,4', vmu: 'mL', vpu: 'mL', VK: N('100'), nuP: N('1'), nuM: N('1') }))
  expectError('Titration: Einwaage ohne M', () => titrationConc({ cM: N('0,1'), cmu: 'mol/L', readings: '18,4', vmu: 'mL', VP: N('20'), vpu: 'mL', mE: N('1'), nuP: N('1'), nuM: N('1') }))
  expectError('Titration: Kolben kleiner als Probe', () => titrationConc({ cM: N('0,1'), cmu: 'mol/L', readings: '18,4', vmu: 'mL', VP: N('20'), vpu: 'mL', VK: N('10'), nuP: N('1'), nuM: N('1') }))
  expectError('Titration: Gehalt über 100 %', () => titrationConc({ cM: N('0,1'), cmu: 'mol/L', readings: '18,4', vmu: 'mL', VP: N('20'), vpu: 'mL', formula: 'HCl', mE: N('10'), meu: 'mg', nuP: N('1'), nuM: N('1') }))
  expectError('Titration: Verhältnis fehlt', () => titrationConc({ cM: N('0,1'), cmu: 'mol/L', readings: '18,4', vmu: 'mL', VP: N('20'), vpu: 'mL', nuP: null, nuM: N('1') }))

  // Titer
  t = R('Titer mit Kaliumhydrogenphthalat', () => titer({ m: N('0,4085'), mu: 'g', M: N('204,22'), label: PRIMARY[0].tex, V: N('20,10'), vu: 'mL', cSoll: N('0,1'), cu: 'mol/L', nuU: N('1'), nuM: N('1'), titrant: '\\mathrm{NaOH}', eq: PRIMARY[0].eq }))
  near('Titer KHP', pick(t, 't'), 0.995171)
  resultHas('Titer KHP: vier Nachkommastellen', t, '0,9952')
  t = R('Titer mit Natriumcarbonat (1 : 2)', () => titer({ m: N('0,1060'), mu: 'g', M: N('105,99'), V: N('19,85'), vu: 'mL', cSoll: N('0,1'), cu: 'mol/L', nuU: N('1'), nuM: N('2') }))
  near('Titer Soda', pick(t, 't'), 1.007652)
  near('Titer Soda: c_ist', pick(t, 'c_{\\text{ist}}'), 0.1007652)
  t = R('Titer KMnO4 mit Oxalsäure (5 : 2)', () => titer({ m: N('0,1261'), mu: 'g', M: N('126,07'), V: N('20,05'), vu: 'mL', cSoll: N('0,02'), cu: 'mol/L', nuU: N('5'), nuM: N('2') }))
  near('Titer KMnO4', pick(t, 't'), 0.9977436)
  t = R('Titer mit Summenformel und mg', () => titer({ m: N('408,5'), mu: 'mg', formula: 'C8H5KO4', V: N('20,10'), vu: 'mL', cSoll: N('100'), cu: 'mmol/L', nuU: N('1'), nuM: N('1') }))
  near('Titer KHP über Formel', pick(t, 't'), 0.9951223)
  for (const pr of PRIMARY) R(`Titer Vorlage ${pr.label}`, () => titer({ m: N(pr.m), mu: 'g', M: N(pr.M), label: pr.tex, V: N(pr.V), vu: 'mL', cSoll: N(pr.cSoll), cu: 'mol/L', nuU: N(String(pr.nuU)), nuM: N(String(pr.nuM)), titrant: pr.titrant, eq: pr.eq }))
  expectError('Titer: Einwaage fehlt', () => titer({ m: null, mu: 'g', M: N('204,22'), V: N('20'), vu: 'mL', cSoll: N('0,1'), cu: 'mol/L', nuU: N('1'), nuM: N('1') }))
  expectError('Titer: Verbrauch 0', () => titer({ m: N('0,4'), mu: 'g', M: N('204,22'), V: N('0'), vu: 'mL', cSoll: N('0,1'), cu: 'mol/L', nuU: N('1'), nuM: N('1') }))
  expectError('Titer: ohne M', () => titer({ m: N('0,4'), mu: 'g', V: N('20'), vu: 'mL', cSoll: N('0,1'), cu: 'mol/L', nuU: N('1'), nuM: N('1') }))

  // Verbrauch vorhersagen
  t = R('Verbrauch: HCl 0,1 mol/L, 20 mL', () => titrationPredict({ given: 'c', cP: N('0,1'), cpu: 'mol/L', VP: N('20'), vpu: 'mL', cM: N('0,1'), cmu: 'mol/L', nuP: N('1'), nuM: N('1') }))
  near('Verbrauch HCl', pick(t, 'V_M'), 20e-3)
  t = R('Verbrauch: H2SO4 (1 : 2)', () => titrationPredict({ given: 'c', cP: N('0,05'), cpu: 'mol/L', VP: N('20'), vpu: 'mL', cM: N('0,1'), cmu: 'mol/L', nuP: N('1'), nuM: N('2') }))
  near('Verbrauch H2SO4', pick(t, 'V_M'), 20e-3)
  t = R('Verbrauch: Soda-Einwaage mit Titer', () => titrationPredict({ given: 'm', mP: N('0,2'), mpu: 'g', formula: 'Na2CO3', cM: N('0,1'), cmu: 'mol/L', t: N('1,0076'), nuP: N('1'), nuM: N('2') }))
  near('Verbrauch Soda', pick(t, 'V_M'), 37.45475e-3)
  t = R('Verbrauch: zu viel für die Bürette', () => titrationPredict({ given: 'c', cP: N('1'), cpu: 'mol/L', VP: N('50'), vpu: 'mL', cM: N('0,1'), cmu: 'mol/L', nuP: N('1'), nuM: N('1') }))
  has('Verbrauch: Bürettenhinweis', t, 'Bürette')
  expectError('Verbrauch: Maßlösung fehlt', () => titrationPredict({ given: 'c', cP: N('0,1'), cpu: 'mol/L', VP: N('20'), vpu: 'mL', cM: null, cmu: 'mol/L', nuP: N('1'), nuM: N('1') }))
  expectError('Verbrauch: Masse ohne M', () => titrationPredict({ given: 'm', mP: N('0,2'), mpu: 'g', cM: N('0,1'), cmu: 'mol/L', nuP: N('1'), nuM: N('2') }))

  /* ============================ Gasgesetze ============================ */

  // V = n R T / p = 0,05 · 8,314 · 298,15 / 101 300 m³ = 1,2235 L
  let g: Solution | null = R('Gas: V gesucht', () => idealGas({ p: N('1013'), pu: 'hPa', V: null, vu: 'L', n: N('50'), nu: 'mmol', T: N('25'), tu: '°C', formula: 'CO2' }))
  near('Gas V: Volumen', pick(g, 'V'), 1.223504)
  resultHas('Gas V: Anzeige', g, '1,224', 'L')
  // p = n R T / V: 1 mol in 22,4 L bei 0 °C → 1013,8 hPa
  g = R('Gas: p gesucht', () => idealGas({ p: null, pu: 'hPa', V: N('22,4'), vu: 'L', n: N('1'), nu: 'mol', T: N('0'), tu: '°C' }))
  near('Gas p: Druck', pick(g, 'p'), 101382.5)
  // n = p V / (R T): 1 bar, 500 mL, 20 °C → 20,51 mmol; mit CO2 0,9029 g
  g = R('Gas: n gesucht (mit Masse)', () => idealGas({ p: N('1'), pu: 'bar', V: N('500'), vu: 'mL', n: null, nu: 'mmol', T: N('20'), tu: '°C', formula: 'CO2' }))
  near('Gas n: Stoffmenge', pick(g, 'n'), 0.02051493)
  near('Gas n: Masse', pick(g, 'm'), 0.9028622)
  // T = p V / (n R): 2 bar, 10 L, 0,5 mol → 481,1 K = 208 °C
  g = R('Gas: T gesucht', () => idealGas({ p: N('2'), pu: 'bar', V: N('10'), vu: 'L', n: N('0,5'), nu: 'mol', T: null, tu: 'K' }))
  near('Gas T: Kelvin', pick(g, 'T'), 481.1162)
  near('Gas T: Celsius', pick(g, '\\vartheta'), 207.9662)
  // Masse statt Stoffmenge: 4 g O2, 3 L, 300 K → 103 925 Pa
  g = R('Gas: p aus Masse', () => idealGas({ p: null, pu: 'Pa', V: N('3'), vu: 'L', n: null, nu: 'mol', m: N('4'), mu: 'g', T: N('300'), tu: 'K', formula: 'O2' }))
  near('Gas p aus Masse', pick(g, 'p'), 103925)
  expectError('Gas: alle vier gegeben', () => idealGas({ p: N('1'), pu: 'bar', V: N('1'), vu: 'L', n: N('1'), nu: 'mol', T: N('300'), tu: 'K' }))
  expectError('Gas: zwei fehlen', () => idealGas({ p: N('1'), pu: 'bar', V: null, vu: 'L', n: null, nu: 'mol', T: N('300'), tu: 'K' }))
  expectError('Gas: n und m', () => idealGas({ p: null, pu: 'bar', V: N('1'), vu: 'L', n: N('1'), nu: 'mol', m: N('4'), mu: 'g', T: N('300'), tu: 'K', formula: 'O2' }))
  expectError('Gas: unter dem absoluten Nullpunkt', () => idealGas({ p: null, pu: 'bar', V: N('1'), vu: 'L', n: N('1'), nu: 'mol', T: N('-300'), tu: '°C' }))
  expectError('Gas: Masse ohne M', () => idealGas({ p: null, pu: 'bar', V: N('1'), vu: 'L', n: null, nu: 'mol', m: N('4'), mu: 'g', T: N('300'), tu: 'K' }))
  expectError('Gas: Druck 0', () => idealGas({ p: N('0'), pu: 'bar', V: null, vu: 'L', n: N('1'), nu: 'mol', T: N('300'), tu: 'K' }))

  // molares Volumen
  g = R('Molares Volumen: 1 L O2 (Norm)', () => molarVolume({ cond: 'norm', given: 'V', value: N('1'), unit: 'L', formula: 'O2' }))
  near('Vm Norm: n', pick(g, 'n'), 0.04461497)
  near('Vm Norm: m', pick(g, 'm'), 1.427679)
  near('Vm Norm: Dichte', pick(g, '\\rho'), 1.427679)
  g = R('Molares Volumen: 0,5 mol bei 20 °C', () => molarVolume({ cond: '20', given: 'n', value: N('0,5'), unit: 'mol' }))
  near('Vm 20 °C: V', pick(g, 'V'), 12)
  g = R('Molares Volumen: 10 g CO2 bei 25 °C', () => molarVolume({ cond: '25', given: 'm', value: N('10'), unit: 'g', formula: 'CO2' }))
  near('Vm 25 °C: V', pick(g, 'V'), 5.5601)
  g = R('Molares Volumen: eigene Bedingungen', () => molarVolume({ cond: 'frei', p: N('950'), pu: 'hPa', T: N('30'), tu: '°C', given: 'n', value: N('2'), unit: 'mol' }))
  near('Vm frei: V', pick(g, 'V'), 53.06082)
  expectError('Vm: Masse ohne Formel', () => molarVolume({ cond: 'norm', given: 'm', value: N('10'), unit: 'g' }))
  expectError('Vm: frei ohne Druck', () => molarVolume({ cond: 'frei', p: null, pu: 'hPa', T: N('20'), tu: '°C', given: 'n', value: N('1'), unit: 'mol' }))
  expectError('Vm: Wert fehlt', () => molarVolume({ cond: 'norm', given: 'V', value: null, unit: 'L' }))

  // Zustandsänderungen
  g = R('Zustand: Boyle-Mariotte', () => gasChange({ p1: N('1000'), p2: N('2500'), pu: 'hPa', V1: N('5'), V2: null, vu: 'L', T1: null, T2: null, tu: '°C' }))
  near('Boyle: V2', pick(g, 'V_2'), 2)
  has('Boyle: Sonderfall benannt', g, 'Boyle-Mariotte')
  g = R('Zustand: Gay-Lussac', () => gasChange({ p1: null, p2: null, pu: 'hPa', V1: N('2'), V2: null, vu: 'L', T1: N('20'), T2: N('80'), tu: '°C' }))
  near('Gay-Lussac: V2', pick(g, 'V_2'), 2.409347)
  has('Gay-Lussac: Kelvin erklärt', g, 'absoluten Temperatur')
  g = R('Zustand: Amontons', () => gasChange({ p1: N('2'), p2: null, pu: 'bar', V1: null, V2: null, vu: 'L', T1: N('20'), T2: N('50'), tu: '°C' }))
  near('Amontons: p2', pick(g, 'p_2'), 2.204673e5)
  has('Amontons: Sonderfall benannt', g, 'Amontons')
  g = R('Zustand: allgemein', () => gasChange({ p1: N('1013'), p2: N('2026'), pu: 'hPa', V1: N('10'), V2: null, vu: 'L', T1: N('0'), T2: N('273'), tu: '°C' }))
  near('allgemein: V2', pick(g, 'V_2'), 9.997254)
  g = R('Zustand: T2 gesucht (gleiches Volumen)', () => gasChange({ p1: N('1'), p2: N('2'), pu: 'bar', V1: N('1'), V2: N('1'), vu: 'L', T1: N('300'), T2: null, tu: 'K' }))
  near('T2 = 600 K', pick(g, 'T_2'), 600)
  near('ϑ2 = 326,85 °C', pick(g, '\\vartheta_2'), 326.85)
  has('T2: Amontons erkannt', g, 'Amontons')
  g = R('Zustand: gleiche Temperaturen erkannt', () => gasChange({ p1: N('1'), p2: N('4'), pu: 'bar', V1: N('8'), V2: null, vu: 'L', T1: N('25'), T2: N('25'), tu: '°C' }))
  near('isotherm: V2', pick(g, 'V_2'), 2)
  has('isotherm: Boyle erkannt', g, 'Boyle-Mariotte')
  expectError('Zustand: zwei Werte fehlen', () => gasChange({ p1: N('1'), p2: null, pu: 'bar', V1: N('1'), V2: null, vu: 'L', T1: N('300'), T2: N('400'), tu: 'K' }))
  expectError('Zustand: alles gegeben', () => gasChange({ p1: N('1'), p2: N('2'), pu: 'bar', V1: N('1'), V2: N('1'), vu: 'L', T1: N('300'), T2: N('600'), tu: 'K' }))
  expectError('Zustand: unter 0 K', () => gasChange({ p1: N('1'), p2: null, pu: 'bar', V1: N('1'), V2: N('1'), vu: 'L', T1: N('-300'), T2: N('20'), tu: '°C' }))
  expectError('Zustand: zwei Größen konstant', () => gasChange({ p1: null, p2: null, pu: 'bar', V1: null, V2: null, vu: 'L', T1: N('300'), T2: null, tu: 'K' }))

  /* Prüfung (Verifier): Zusatzzeilen stehen ohne Scrollleiste im Ergebnis – auf dem Handy (390 px) passen
     nur etwa 45 Zeichen, längere Zeilen wurden abgeschnitten („… 440,3 g gelösten“) */
  {
    const plainLen = (t: string) => t.replace(/\\text\{([^}]*)\}/g, '$1').replace(/\\[a-z]+|[{}\\]/g, '').replace(/\s+/g, ' ').trim().length
    for (const [w, rho] of [['37', '1,19'], ['96', '1,84']]) {
      const s = R(`Zusatzzeile w = ${w} %`, () => convertConc({ known: 'w', value: N(w), unit: '%', formula: 'H2SO4', rho: N(rho), rhoUnit: 'g/mL' }))
      const line = s?.extra?.find((x) => x.includes('Lösung')) ?? ''
      check(`Zusatzzeile w = ${w} %: kurz genug fürs Handy`, line !== '' && plainLen(line) <= 45, `${plainLen(line)} Zeichen: ${line}`)
    }
    // Dihydrogenphosphat ist ein Ampholyt: als reine Säure gerechnet pH 4,11, eine NaH₂PO₄-Lösung hat aber etwa 4,7
    const d = R('Dihydrogenphosphat 0,1 mol/L', () => weakPh({ kind: 'saeure', kType: 'pKs', k: N('7,21'), c: N('0,1'), cu: 'mol/L', preset: 'dhp' }))
    near('Dihydrogenphosphat: pH als Säure', d?.pH ?? NaN, 4.105, 2e-3)
    has('Dihydrogenphosphat: Ampholyt erklärt', d, 'Ampholyt')
  }
})
