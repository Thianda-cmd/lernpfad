/**
 * Ausklammern (größter gemeinsamer Faktor) und Faktorisieren mit den binomischen Formeln – rückwärts.
 */
import { bgcd, blcm, CalcError, div, isOne, neg, q, qRoot, sign, type Fmt } from '../q'
import { primeFactors } from '../num'
import { combine, isConst, monoKey, sortTerms, sumTex, termAbsTex, termDiv, termEq, termMul, termNeg, termTex, varTex, vars, type Term } from './poly'
import { simplifySteps } from './simplify'
import type { Solution, Step } from './step'
import { parseW } from './tree'

const absB = (a: bigint) => (a < 0n ? -a : a)

/** größter gemeinsamer Faktor eines Polynoms (Zahl und Variablen) */
export function commonFactor(ts: Term[]): Term {
  const nums = ts.map((t) => absB(t.c.n))
  const dens = ts.map((t) => t.c.d)
  const g = nums.reduce((a, b) => bgcd(a, b), 0n) || 1n
  const l = dens.reduce((a, b) => blcm(a, b), 1n)
  const m: Record<string, number> = {}
  const vs = vars(ts[0].m).filter((v) => ts.every((t) => (t.m[v] ?? 0) > 0))
  for (const v of vs) m[v] = Math.min(...ts.map((t) => t.m[v]))
  // führendes Minus mit ausklammern
  const c = q(sign(ts[0].c) < 0 ? -g : g, l)
  return { c, m }
}

/** Primfaktorzerlegung als TeX */
function pfTex(n: bigint): string {
  const x = Number(absB(n))
  if (!Number.isSafeInteger(x) || x < 2) return String(absB(n))
  const pf = primeFactors(x)
  return pf.length > 1 ? `${x} = ${pf.join(' \\cdot ')}` : `${x}`
}

/** Ist t ein Quadrat? Dann Wurzel-Term */
function sqrtTerm(t: Term): Term | null {
  if (sign(t.c) <= 0) return null
  const r = qRoot(t.c, 2)
  if (!r) return null
  const m: Record<string, number> = {}
  for (const [v, e] of Object.entries(t.m)) {
    if (e % 2) return null
    m[v] = e / 2
  }
  return { c: r, m }
}

interface Binom {
  steps: Step[]
  tex: string
}

/** a² ± 2ab + b²  bzw.  a² − b²  erkennen */
function binomBack(ts0: Term[], f: Fmt): Binom | null {
  const ts = sortTerms(ts0)
  if (ts.length === 2) {
    const [p, r] = ts
    const pos = sign(p.c) > 0 ? p : sign(r.c) > 0 ? r : null
    const negT = pos === p ? r : p
    if (!pos || sign(negT.c) >= 0) return null
    const a = sqrtTerm(pos)
    const b = sqrtTerm(termNeg(negT))
    if (!a || !b) return null
    const A = termTex(a, true, f)
    const B = termTex(b, true, f)
    return {
      tex: `\\left(${A} + ${B}\\right)\\left(${A} - ${B}\\right)`,
      steps: [
        { tex: `${termAbsTex(pos, f)} = \\left(${A}\\right)^2, \\quad ${termAbsTex(termNeg(negT), f)} = \\left(${B}\\right)^2`, note: 'Zwei Quadrate mit Minus dazwischen: $a^2 - b^2$.', head: 'Binomische Formel rückwärts' },
        { tex: `= \\left(${A} + ${B}\\right)\\left(${A} - ${B}\\right)`, note: '3. binomische Formel rückwärts: $a^2 - b^2 = (a+b)(a-b)$.' },
      ],
    }
  }
  if (ts.length === 3) {
    const sq = ts.map(sqrtTerm)
    for (const [i, j, k] of [
      [0, 2, 1],
      [0, 1, 2],
      [1, 2, 0],
    ]) {
      const a = sq[i]
      const b = sq[j]
      if (!a || !b) continue
      const mid = ts[k]
      const twoAB = termMul({ c: q(2), m: {} }, termMul(a, b))
      const plus = termEq(mid, twoAB)
      const minus = termEq(mid, termNeg(twoAB))
      if (!plus && !minus) continue
      const A = termTex(a, true, f)
      const B = termTex(b, true, f)
      return {
        tex: `\\left(${A} ${plus ? '+' : '-'} ${B}\\right)^2`,
        steps: [
          { tex: `${termAbsTex(ts[i], f)} = \\left(${A}\\right)^2, \\quad ${termAbsTex(ts[j], f)} = \\left(${B}\\right)^2`, note: 'Zwei Quadrate gefunden – passt das Mittelglied?', head: 'Binomische Formel rückwärts' },
          { tex: `2 \\cdot ${A} \\cdot ${B} = ${termAbsTex(twoAB, f)}\\ \\checkmark`, note: `Das Mittelglied ist $${plus ? '+' : '-'}2ab$ → ${plus ? '1.' : '2.'} binomische Formel rückwärts.` },
          { tex: `= \\left(${A} ${plus ? '+' : '-'} ${B}\\right)^2` },
        ],
      }
    }
  }
  return null
}

export function factorInput(src: string): Solution {
  const p = parseW(src, { rootHint: ' Dafür gibt es den Rechner „Potenzen & Wurzeln“.' })
  const f: Fmt = { dec: p.dec }
  // erst vereinfachen, falls nötig
  const simp = simplifySteps(p.w, f)
  const steps: Step[] = []
  if (simp.steps.length > 1) {
    simp.steps.forEach((s, i) => steps.push(i === 0 ? { ...s, head: 'Erst vereinfachen' } : s))
  }
  const ts = simp.result
  if (ts.length < 2) throw new CalcError('Zum Ausklammern braucht man mindestens zwei Summanden.')
  const F = commonFactor(ts)
  const inner = sortTerms(combine(ts.map((t) => termDiv(t, F))))
  const start = sumTex(ts, f)
  const trivial = isOne(F.c) && isConst(F)
  let resultTex = start
  if (!trivial) {
    const coefs = ts.map((t) => t.c)
    const allInt = coefs.every((c) => c.d === 1n)
    const g = absB(F.c.n)
    const note1 = allInt
      ? `Größte Zahl, die alle Zahlen teilt: ${ts.map((t) => `$${pfTex(t.c.n)}$`).join(', ')} → $\\text{ggT} = ${g}$.`
      : `Die Brüche haben den Hauptnenner $${F.c.d}$ – er kommt mit vor die Klammer.`
    const vs = Object.keys(F.m)
    const note2 = vs.length
      ? ` In **jedem** Summanden steckt ${vs.map((v) => `$${F.m[v] === 1 ? varTex(v) : `${varTex(v)}^{${F.m[v]}}`}$`).join(' und ')} (jeweils die kleinste Hochzahl).`
      : ''
    const note3 = sign(F.c) < 0 ? ' Der erste Summand ist negativ – das Minus kommt mit vor die Klammer.' : ''
    const fTex = termTex(F, true, f)
    steps.push({ tex: start, head: 'Gemeinsamen Faktor suchen' })
    steps.push({ tex: `\\text{Faktor: } ${fTex}`, note: (note1 + note2 + note3).trim() })
    // Jeder Summand (mit Vorzeichen) durch den Faktor – so sieht man auch, wie sich ein Minus herauskürzt
    const parts = ts
      .map((t, i) => {
        if (sign(F.c) > 0) {
          const s = sign(t.c) < 0 ? (i === 0 ? '-' : ' - ') : i === 0 ? '' : ' + '
          return `${s}\\frac{${termAbsTex(t, f)}}{${fTex}}`
        }
        return `${i === 0 ? '' : ' + '}\\frac{${termTex(t, true, f)}}{${fTex}}`
      })
      .join('')
    const fPar = sign(F.c) < 0 ? `\\left(${fTex}\\right)` : fTex
    steps.push({ tex: `= ${fPar} \\cdot \\left(${parts}\\right)`, note: 'Jeden Summanden durch den Faktor teilen.' })
    resultTex = `${fTex}\\left(${sumTex(inner, f)}\\right)`
    steps.push({ tex: `= ${resultTex}`, note: 'Probe: Ausmultiplizieren ergibt wieder den Ausgangsterm.' })
  }
  const b = binomBack(inner, f)
  if (b) {
    steps.push(...b.steps)
    resultTex = trivial ? b.tex : `${termTex(F, true, f)}${b.tex.startsWith('\\left(') ? '' : ' \\cdot '}${b.tex}`
    if (!trivial) steps.push({ tex: `= ${resultTex}`, note: 'Zusammen mit dem ausgeklammerten Faktor.' })
  }
  if (trivial && !b) {
    steps.push({ tex: start, note: 'Die Summanden haben keinen gemeinsamen Faktor, und keine binomische Formel passt – der Term lässt sich nicht weiter faktorisieren.' })
  }
  const last = steps[steps.length - 1]
  if (last) last.final = true
  return { result: resultTex, steps }
}

export { monoKey, div, neg }
