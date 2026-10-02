/**
 * Smoke-Test für alle Rechner (npm run test:calc):
 *  – jede Eingabe liefert ein Ergebnis oder einen verständlichen Fehler (CalcError), nie einen Absturz,
 *  – jede Formel im Lösungsweg lässt sich mit KaTeX setzen,
 *  – Ergebnisse werden nachgerechnet (exakt mit Brüchen bzw. numerisch).
 */
import katex from 'katex'
import { solveEquation, splitRelation } from '../src/math/alg/equation'
import { factorInput } from '../src/math/alg/factor'
import { fractionInput } from '../src/math/alg/fractions'
import { solveLgs, type LgsMethod } from '../src/math/alg/lgs'
import { analyzeLine, lineFromPointSlope, lineThroughPoints, twoLines } from '../src/math/alg/lines'
import { parseNum } from '../src/math/alg/numinput'
import { massFraction, percentBasic, percentChange } from '../src/math/alg/percent'
import { evalTerms } from '../src/math/alg/poly'
import { powerInput, sciInput } from '../src/math/alg/powers'
import { rearrange } from '../src/math/alg/rearrange'
import { simplifyInput } from '../src/math/alg/simplify'
import type { Solution } from '../src/math/alg/step'
import { amount, composition, dilution, mixCross, mixResult, molarMass, solution } from '../src/math/alg/stoich'
import { parseW, wEval, wVars } from '../src/math/alg/tree'
import { evaluate, parse } from '../src/math/expr'
import { CalcError, eq, q, qFromNumber, toNum, type Q } from '../src/math/q'
import { detect } from '../src/math/quick'

// KaTeX meldet für „€“ fehlende Schriftmetriken – im Browser wird das Zeichen trotzdem gesetzt
const warn = console.warn
console.warn = (...a: unknown[]) => {
  if (!String(a[0]).includes('No character metrics')) warn(...a)
}

let failed = 0
let checked = 0
let texCount = 0

function fail(where: string, msg: string) {
  failed++
  console.log(`✗ ${where}: ${msg}`)
}

function tex(where: string, src: string) {
  texCount++
  try {
    katex.renderToString(src, { throwOnError: true, strict: 'ignore', displayMode: true })
  } catch (e) {
    fail(where, `KaTeX: ${(e as Error).message.slice(0, 160)}\n    ${src.slice(0, 220)}`)
  }
}

function rich(where: string, text?: string) {
  if (!text) return
  for (const m of text.matchAll(/\$([^$]+)\$/g)) tex(where, m[1])
}

function checkSolution(where: string, s: Solution | null | undefined) {
  if (!s) return fail(where, 'kein Ergebnis')
  checked++
  if (!s.result?.trim()) fail(where, 'leeres Ergebnis')
  tex(where + ' [Ergebnis]', s.result)
  s.extra?.forEach((x) => tex(where + ' [extra]', x))
  rich(where + ' [Hinweis]', s.remark)
  s.steps.forEach((st, i) => {
    // Zwischenüberschriften sind reiner Text (Großbuchstaben) – dort darf kein TeX stehen
    if (st.head && /[$\\]/.test(st.head)) fail(`${where} [Überschrift ${i + 1}]`, `TeX in Überschrift: ${st.head}`)
    tex(`${where} [Schritt ${i + 1}]`, st.tex)
    if (st.op) tex(`${where} [Umformung ${i + 1}]`, st.op)
    rich(`${where} [Erklärung ${i + 1}]`, st.note)
  })
}

function run<T extends Solution | null>(where: string, f: () => T): T | null {
  try {
    const r = f()
    checkSolution(where, r)
    return r
  } catch (e) {
    fail(where, e instanceof CalcError ? `unerwarteter Rechenfehler: ${e.message}` : `Absturz: ${(e as Error).stack?.split('\n').slice(0, 3).join(' | ')}`)
    return null
  }
}

/** ungültige Eingaben müssen einen CalcError liefern */
function expectError(where: string, f: () => unknown) {
  checked++
  try {
    f()
    fail(where, 'Fehler erwartet, aber Ergebnis geliefert')
  } catch (e) {
    if (!(e instanceof CalcError)) fail(where, `kein CalcError: ${(e as Error).message}`)
  }
}

const rnd = (() => {
  let s = 12345
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
})()
const randQ = (): Q => {
  const n = Math.floor(rnd() * 19) - 9 || 2
  const d = Math.floor(rnd() * 4) + 1
  return q(n, d)
}

/* ------------------------------ Terme ------------------------------ */

const TERME = [
  '3x - (2x - 5) + 4(x + 2)',
  '4u + [11v - (4u + 3w)] - [21u + (66u - 14w)]',
  '(4a - 3b)(a + 5b) - (2a + b)^2',
  '(x+4)(x+5)',
  '(2a+3)^2',
  '(x-3)(x+3)',
  '5 - 2(x - 3)',
  '3y(8x - 6y + 4z) - (3x + 4y - 5z)*6x - 2x(7x - 5y)',
  '3,2p + 6,2q - (1,5p - 0,7q)',
  '3a/4 + 7a/6',
  '(4x + 6)/2',
  '3x*2y',
  '2x(3 - (x + 1))',
  '(x + 1)^3',
  '-(a - b) + (-3)',
  '(2 - x)^2',
  '3x^3 - [24x^2 + 5x - (6x + 4x^2)] - [2x^2 - (6x + 4x^3) - 12x]',
  '(a - b)^2 - (a + b)^2',
  '2(3x - 4) - 3(2x + 1)',
]
for (const src of TERME) {
  const r = run(`Terme „${src}“`, () => simplifyInput(src))
  if (!r) continue
  const p = parseW(src)
  const vars = [...wVars(p.w)]
  for (let k = 0; k < 4; k++) {
    const env: Record<string, Q> = {}
    for (const v of vars) env[v] = randQ()
    const a = wEval(p.w, env)
    const b = evalTerms(r.terms, env)
    if (!eq(a, b)) {
      fail(`Terme „${src}“`, `Ergebnis ${r.result} stimmt nicht (Eingabe ${toNum(a)}, Ergebnis ${toNum(b)})`)
      break
    }
  }
}
for (const src of ['6x^2 + 9x', '-6x^2 + 9x', '4a^2 - 9b^2', 'x^2 + 6x + 9', '25 - 10y + y^2', '12ab - 18a^2b', '3x + 3y + 3']) run(`Ausklammern „${src}“`, () => factorInput(src))
expectError('Terme: Klammer offen', () => simplifyInput('3(x + 2'))
expectError('Terme: leer', () => simplifyInput('  '))

/* ------------------------------ Gleichungen ------------------------------ */

const GLEICHUNGEN: [string, string?][] = [
  ['2x + 3 = 16 - (2x - 3)'],
  ['15 - (3x - 2) < 19 - (2x + 4)'],
  ['3x + 5 = 3x + 7'],
  ['2(x + 1) = 2x + 2'],
  ['(x + 3)^2 = (x - 1)^2 + 8'],
  ['x/3 + x/4 = 7'],
  ['2x^2 - 8x + 6 = 0'],
  ['x^2 + 4x + 5 = 0'],
  ['x^2 - 2x - 1 = 0'],
  ['x^2 - 4x + 4 = 0'],
  ['3x^2 = 27'],
  ['x^2 - 5x = 0'],
  ['x^3 - 4x = 0'],
  ['a*x + b = c', 'x'],
  ['3x + 4a - 3b = x + 2a + 5b', 'x'],
  ['2/x + 1 = 3'],
  ['0,5x + 1,2 = 3,7'],
  ['-2x ≥ 6'],
  ['x = 5'],
  ['4(x-2) - 2(x+1) = 3x - 1'],
  ['x^2 - 2x - 3', undefined],
]
for (const [src, v] of GLEICHUNGEN) {
  const r = run(`Gleichung „${src}“`, () => solveEquation(src, { variable: v, allowNoRel: !/[=<>≤≥]/.test(src) }))
  if (!r || !r.numeric || r.rel !== '=') continue
  const { L, R } = splitRelation(src, true)
  const Lw = parseW(L).w
  const Rw = parseW(R || '0').w
  for (const x of r.roots) {
    const env = { [r.variable]: qFromNumber(x) }
    const d = toNum(wEval(Lw, env)) - toNum(wEval(Rw, env))
    if (Math.abs(d) > 1e-6 * (1 + Math.abs(x))) fail(`Gleichung „${src}“`, `Lösung ${x} erfüllt die Gleichung nicht (Differenz ${d})`)
  }
}
// erwartete Lösungsmengen
const ROOTS: [string, number[]][] = [
  ['2x + 3 = 16 - (2x - 3)', [4]],
  ['2x^2 - 8x + 6 = 0', [1, 3]],
  ['x^2 + 4x + 5 = 0', []],
  ['3x^2 = 27', [-3, 3]],
  ['x^3 - 4x = 0', [-2, 0, 2]],
  ['2/x + 1 = 3', [1]],
]
for (const [src, want] of ROOTS) {
  checked++
  try {
    const got = [...solveEquation(src).roots].sort((a, b) => a - b)
    if (got.length !== want.length || got.some((x, i) => Math.abs(x - want[i]) > 1e-9)) fail(`Lösungsmenge „${src}“`, `erwartet ${want.join(', ') || '–'}, erhalten ${got.join(', ') || '–'}`)
  } catch (e) {
    fail(`Lösungsmenge „${src}“`, (e as Error).message)
  }
}
expectError('Gleichung: zwei Gleichheitszeichen', () => solveEquation('x = 2 = 3'))
expectError('Gleichung: Division durch null', () => solveEquation('x/0 = 2'))

/* ------------------------------ Gleichungssysteme ------------------------------ */

const LGS: [string, string, 'eine' | 'keine' | 'unendlich'][] = [
  ['2x + 3y = 12', '4x - y = 10', 'eine'],
  ['6x - 5y + 25 = 2', '3x + 2y = 12', 'eine'],
  ['x + 15y = 55', 'x + 25y = 85', 'eine'],
  ['2x + 4y = 6', 'x + 2y = 3', 'unendlich'],
  ['2x + 4y = 6', 'x + 2y = 5', 'keine'],
  ['y = 2x - 1', 'y = -x + 5', 'eine'],
  ['3a + 2b = 1', 'a - b = 2', 'eine'],
  ['0,5x + y = 2', 'x - 0,5y = 1,5', 'eine'],
]
for (const [a, b, kind] of LGS) {
  for (const m of ['addition', 'einsetzung', 'gleichsetzung'] as LgsMethod[]) {
    const where = `LGS ${m} „${a} | ${b}“`
    const r = run(where, () => solveLgs(a, b, m))
    if (!r) continue
    if (r.kind !== kind) fail(where, `erwartet ${kind}, erhalten ${r.kind}`)
    if (r.kind !== 'eine' || !r.sol) continue
    const env = { [r.vars[0]]: r.sol[0], [r.vars[1]]: r.sol[1] }
    for (const e of [a, b]) {
      const { L, R } = splitRelation(e)
      if (!eq(wEval(parseW(L).w, env), wEval(parseW(R).w, env))) fail(where, `Lösung erfüllt „${e}“ nicht`)
    }
  }
}

/* ------------------------------ Brüche, Potenzen ------------------------------ */

for (const src of [
  '3/4 + 7/6 - 1/12',
  '1/75 + 1/23',
  '(2/3 + 1/4) : 5/6',
  '3/4 : 5/6',
  '(1/2)/(1/3 - 1/4)',
  '84/126',
  '6/8 + 1/4',
  '2 1/2 + 1 3/4',
  '0,5 + 1/3',
  '0,25 + 1,5',
  '3 : 4',
  '2 - (1/2 - 3/4)',
  '(3/4)^2',
  '-(1/2 + 1/3)',
  '4 · 3/8',
  '3a/4 + 7a/6',
  '2/(3z) - 1/(4z) + 5/(6z)',
  '3a/(4b) * 2b/(9a)',
  'x/y + 2/x',
])
  run(`Brüche „${src}“`, () => fractionInput(src))
expectError('Brüche: durch null', () => fractionInput('3/0 + 1'))

for (const src of [
  'a^3 * a^5',
  'x^7 / x^2',
  '(a^2)^3',
  '6x^4y^2/(2xy^2)',
  'sqrt(a^3)*cbrt(a^2)',
  '∛(64a^3b^9)',
  '1/√(x^3)',
  '27a^9/(3a^3)^3',
  '√72',
  '2^3 * 2^4',
  'x^-2 * x^5',
  '(2x^3)^2 * 3x',
  'a^(1/2) * a^(1/3)',
  '5^0 · x^3',
])
  run(`Potenzen „${src}“`, () => powerInput(src))
for (const src of ['3,2 · 10^4 * 2 · 10^-7', '4500000', '0,00032', '6 · 10^8 / (3 · 10^2)', '1,8e21'])
  run(`Zehnerpotenzen „${src}“`, () => sciInput(src))

/* ------------------------------ Formeln umstellen ------------------------------ */

const FORMELN: [string, string][] = [
  ['A_R = e*f/2', 'f'],
  ['A = s^2/4 * √3', 's'],
  ['f = 1/√(L*C*T)', 'C'],
  ['c = n/V', 'V'],
  ['n = m/M', 'm'],
  ['c_1*V_1 = c_2*V_2', 'V_2'],
  ['p*V = n*R*T', 'T'],
  ['A = π*r^2', 'r'],
  ['Q = c*m*(T_2 - T_1)', 'T_2'],
  ['A = (a + c)/2 * h', 'h'],
  ['A = (a + c)/2 * h', 'a'],
  ['U = 2(a + b)', 'a'],
  ['w = m_S/m_L * 100', 'm_S'],
  ['K = K_0*(1 + p/100)', 'p'],
  ['T = a - x', 'x'],
  ['1/R = 1/R_1 + 1/R_2', 'R_1'],
]
for (const [src, target] of FORMELN) {
  const where = `Umstellen „${src}“ nach ${target}`
  const r = run(where, () => rearrange(src, target))
  if (!r?.expr) continue
  const { L, R } = splitRelation(src)
  const Ln = parse(L)
  const Rn = parse(R)
  for (let k = 0; k < 3; k++) {
    const env: Record<string, number> = {}
    for (const v of r.vars) if (v !== target) env[v] = 1 + Math.round(rnd() * 40) / 10
    const val = evaluate(r.expr, env)
    if (!Number.isFinite(val)) continue
    env[target] = val
    const d = evaluate(Ln, env) - evaluate(Rn, env)
    if (Math.abs(d) > 1e-6 * (1 + Math.abs(evaluate(Ln, env)))) {
      fail(where, `umgestellte Formel stimmt nicht (Differenz ${d})`)
      break
    }
  }
}

/* ------------------------------ Prozent, Geraden ------------------------------ */

const N = (s: string) => parseNum(s)
const P = (x: string, y: string) => ({ x: N(x)!.q, y: N(y)!.q })
run('Prozentwert', () => percentBasic(N('240'), null, N('15'), 'Proben'))
run('Prozentsatz', () => percentBasic(N('80'), N('12'), null))
run('Grundwert', () => percentBasic(null, N('36'), N('12'), 'Stück'))
run('Aufschlag', () => percentChange('neu', true, N('349'), N('19'), '€'))
run('Rabatt rückwärts', () => percentChange('alt', false, N('255'), N('15'), '€'))
run('Änderung in %', () => percentChange('satz', true, N('80'), N('92')))
run('Massenanteil w', () => massFraction(null, N('12'), N('188'), null))
run('Massenanteil ansetzen', () => massFraction(N('5'), null, null, N('250')))
run('Gerade durch zwei Punkte', () => lineThroughPoints(P('1', '2'), P('3', '8'), {}))
run('Gerade aus Punkt und Steigung', () => lineFromPointSlope(P('-2', '1'), N('1/2')!.q, {}))
run('Gerade analysieren', () => analyzeLine('2x + 3y = 6', P('3', '0')))
run('Zwei Geraden: Schnittpunkt', () => twoLines('y = 2x - 1', 'y = -0,5x + 4'))
run('Zwei Geraden: parallel', () => twoLines('y = 2x - 1', '4x - 2y = 6'))
run('Zwei Geraden: senkrecht', () => twoLines('y = 2x + 1', 'y = -0,5x + 3'))
expectError('Gerade: gleiche Punkte', () => lineThroughPoints(P('1', '2'), P('1', '2'), {}))

/* ------------------------------ Chemie ------------------------------ */

for (const f of ['H2O', 'H2SO4', 'Ca3(PO4)2', 'CuSO4·5H2O', 'C6H12O6', 'KMnO4', 'NaCl']) {
  checked++
  try {
    const m = molarMass(f)
    tex(`Molare Masse ${f}`, m.step.tex)
  } catch (e) {
    fail(`Molare Masse ${f}`, (e as Error).message)
  }
}
{
  checked++
  const m = toNum(molarMass('H2O').M)
  if (Math.abs(m - 18.02) > 0.02) fail('Molare Masse H2O', `erwartet ≈ 18,02 g/mol, erhalten ${m}`)
}
run('Stoffmenge m → n', () => amount({ formula: 'H2SO4', given: 'm', value: N('10'), unit: 'g' }))
run('Stoffmenge n → m', () => amount({ formula: 'Ca3(PO4)2', given: 'n', value: N('25'), unit: 'mmol' }))
run('Teilchenzahl', () => amount({ formula: 'H2O', given: 'N', value: N('6,022·10^21'), unit: '' }))
run('Zusammensetzung', () => composition('C6H12O6'))
run('Lösung ansetzen', () => solution({ formula: 'NaCl', c: N('0,5'), cu: 'mol/L', V: N('250'), vu: 'mL', m: null, mu: 'g' }))
run('Konzentration', () => solution({ formula: 'NaOH', c: null, cu: 'mol/L', V: N('500'), vu: 'mL', m: N('2'), mu: 'g' }))
run('Verdünnen', () => dilution(N('2'), N('50'), N('0,5'), null, 'mol/L', 'mL'))
run('Mischungskreuz', () => mixCross(N('40'), N('10'), N('25'), N('600'), 'g'))
run('Mischungskreuz mit Wasser', () => mixCross(N('36'), N('0'), N('10'), null))
run('Mischtemperatur', () => mixResult(N('2'), N('80'), N('3'), N('20'), 'T', 'kg'))
expectError('Mischungskreuz: Ziel außerhalb', () => mixCross(N('40'), N('10'), N('50'), null))

/* ------------------------------ Schnellrechner ------------------------------ */

const QUICK: [string, string][] = [
  ['2x + 3 = 7', '/mathematik/gleichungen'],
  ['x^2 - 4x + 3 = 0', '/mathematik/pq-formel'],
  ['(2a + 3)^2', '/mathematik/terme'],
  ['3/4 + 5/6', '/mathematik/brueche'],
  ['c = n/V', '/mathematik/formeln'],
  ['H2SO4', '/chemie/molmasse'],
  ['2x + 3y = 12; 4x - y = 10', '/mathematik/lgs'],
  ['√72', '/mathematik/potenzen'],
  ['3 · 10^4 · 2 · 10^-2', '/mathematik/potenzen'],
]
for (const [src, path] of QUICK) {
  checked++
  const hit = detect(src)
  if (!hit) {
    fail(`Schnellrechner „${src}“`, 'nichts erkannt')
    continue
  }
  if (!hit.to.startsWith(path)) fail(`Schnellrechner „${src}“`, `erwartet ${path}, erhalten ${hit.to}`)
  run(`Schnellrechner „${src}“`, () => hit.run())
}

console.log(`\n${checked} Prüfungen, ${texCount} Formeln mit KaTeX gesetzt.`)
if (failed) {
  console.log(`${failed} Fehler.`)
  process.exit(1)
}
console.log('Alles in Ordnung.')
