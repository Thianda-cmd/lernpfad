/**
 * Formeln umstellen nach dem Zwiebelprinzip: Die Rechenschritte um die gesuchte Größe
 * werden von außen nach innen mit der Umkehroperation rückgängig gemacht.
 */
import { evaluate, occurrences, parse, ParseError, toTex, variables, type Node } from '../expr'
import { CalcError } from '../q'
import { solveEquation, splitRelation } from './equation'
import { varTex } from './poly'
import type { Solution, Step } from './step'

const num = (v: number): Node => ({ t: 'num', v, raw: String(v) })
const grp = (a: Node): Node => ({ t: 'group', a })
const isSum = (n: Node) => n.t === 'add' || n.t === 'sub'
const strip = (n: Node): Node => (n.t === 'group' ? strip(n.a) : n)
const isNum = (n: Node, v?: number) => n.t === 'num' && n.raw !== 'π' && (v === undefined || n.v === v)

/** Malnehmen mit hübscher Reihenfolge (Zahl zuerst) */
function mul(a: Node, b: Node): Node {
  return { t: 'mul', a, b, implicit: !isNum(b) }
}
const divN = (a: Node, b: Node): Node => ({ t: 'div', a, b })
const add = (a: Node, b: Node): Node => ({ t: 'add', a, b: b.t === 'neg' || isSum(b) ? grp(b) : b })
const sub = (a: Node, b: Node): Node => ({ t: 'sub', a, b: isSum(b) || b.t === 'neg' ? grp(b) : b })

/** kosmetische Vereinfachung ohne Wertänderung */
export function tidy(n0: Node): Node {
  const n: Node = (() => {
    switch (n0.t) {
      case 'add':
      case 'sub':
      case 'mul':
      case 'div':
      case 'pow':
        return { ...n0, a: tidy(n0.a), b: tidy(n0.b) } as Node
      case 'neg':
      case 'group':
      case 'root':
        return { ...n0, a: tidy(n0.a) } as Node
      default:
        return n0
    }
  })()
  switch (n.t) {
    case 'group': {
      const a = n.a
      return a.t === 'num' || a.t === 'var' || a.t === 'group' || a.t === 'div' || a.t === 'root' || a.t === 'pow' ? a : n
    }
    case 'neg': {
      const a = strip(n.a)
      if (a.t === 'neg') return a.a
      if (isNum(a)) return num(-(a as { v: number }).v)
      return n
    }
    case 'mul': {
      const a = strip(n.a)
      const b = strip(n.b)
      if (isNum(a, 1)) return n.b
      if (isNum(b, 1)) return n.a
      if (a.t === 'div') return tidy(divN(mul(a.a, n.b), a.b))
      if (b.t === 'div') return tidy(divN(mul(n.a, b.a), b.b))
      if (isNum(b) && !isNum(a)) return mul(n.b, n.a)
      return { ...n, implicit: !isNum(b) && !(a.t === 'num' && b.t === 'num') }
    }
    case 'div': {
      const a = strip(n.a)
      const b = strip(n.b)
      if (isNum(b, 1)) return n.a
      if (a.t === 'div') return tidy(divN(a.a, mul(a.b, n.b)))
      if (b.t === 'div') return tidy(divN(mul(n.a, b.b), b.a))
      return { t: 'div', a, b }
    }
    case 'pow': {
      const a = strip(n.a)
      if (isNum(a, 1)) return num(1)
      if (a.t === 'div' && n.b.t === 'num') return tidy({ t: 'div', a: { t: 'pow', a: a.a, b: n.b }, b: { t: 'pow', a: a.b, b: n.b } })
      return n
    }
    case 'add':
      if (n.b.t === 'neg') return sub(n.a, n.b.a)
      return n
    case 'sub':
      if (strip(n.b).t === 'neg') return add(n.a, (strip(n.b) as { a: Node }).a)
      return n
    default:
      return n
  }
}

const has = (n: Node, v: string) => (occurrences(n)[v] ?? 0) > 0

/** TeX eines Operanden in der Umformungsangabe: Summen und Produkte in Klammern */
function opArg(n: Node) {
  const s = strip(tidy(n))
  const t = toTex(s)
  if (isSum(s) || s.t === 'neg' || s.t === 'mul') return `\\left(${t}\\right)`
  return t
}

function signedArg(sign: '+' | '-', n: Node) {
  const s = strip(n)
  if (s.t === 'neg') return `${sign === '+' ? '-' : '+'}${opArg(s.a)}`
  return `${sign}${isSum(s) ? `\\left(${toTex(s)}\\right)` : toTex(s)}`
}

export interface Rearranged extends Solution {
  vars: string[]
  target: string
  /** isolierte Seite (für „Werte einsetzen“) */
  expr?: Node
}

function pparse(s: string): Node {
  try {
    return parse(s)
  } catch (e) {
    if (e instanceof ParseError) throw new CalcError(e.message + '.')
    throw e
  }
}

export function formulaVars(src: string): string[] {
  const { L, R } = splitRelation(src)
  const a = pparse(L)
  const b = pparse(R)
  return [...new Set([...variables(b), ...variables(a)])].filter((v) => v !== 'π')
}

export function rearrange(src: string, target0?: string): Rearranged {
  const { L, R, rel } = splitRelation(src)
  if (rel !== '=') throw new CalcError('Zum Umstellen brauche ich eine Formel mit Gleichheitszeichen.')
  const Ln = pparse(L)
  const Rn = pparse(R)
  const vars = [...new Set([...variables(Rn), ...variables(Ln)])].filter((v) => v !== 'π')
  if (!vars.length) throw new CalcError('In der Formel kommt keine Variable vor.')
  const target = target0 && vars.includes(target0) ? target0 : vars[0]
  const tv = varTex(target)
  const occ = (occurrences(Ln)[target] ?? 0) + (occurrences(Rn)[target] ?? 0)
  if (occ > 1) {
    // mehrfach: als Gleichung mit Parametern lösen (x ausklammern)
    try {
      const r = solveEquation(src, { variable: target })
      return { ...r, vars, target, remark: `$${tv}$ kommt mehrmals vor – darum erst ausmultiplizieren, alle Terme mit $${tv}$ auf eine Seite bringen und $${tv}$ ausklammern.` }
    } catch (e) {
      throw new CalcError(`$${tv}$ kommt mehrmals vor und lässt sich hier nicht ausklammern. ${(e as Error).message}`)
    }
  }
  const steps: Step[] = []
  const leftHas = has(Ln, target)
  let S = Ln
  let O = Rn
  if (!leftHas) {
    S = Rn
    O = Ln
  }
  // Ausrichtung: die Seite mit der gesuchten Größe bleibt, wo sie ist
  let sLeft = leftHas
  const side = (n: Node) => toTex(strip(tidy(n)))
  const line = () => (sLeft ? `${side(S)} = ${side(O)}` : `${side(O)} = ${side(S)}`)
  steps.push({ tex: line() })
  const setOp = (op: string, note?: string) => {
    const last = steps[steps.length - 1]
    last.op = op
    if (note) last.note = note
  }
  for (let guard = 0; guard < 40; guard++) {
    S = strip(S)
    if (S.t === 'var' && S.n === target) break
    let note: string | undefined
    switch (S.t) {
      case 'add': {
        const [keep, move] = has(S.a, target) ? [S.a, S.b] : [S.b, S.a]
        setOp(`| ${signedArg('-', move)}`, guard === 0 ? `Zwiebelprinzip: Die äußerste Schicht um $${tv}$ ist „$+\\;${toTex(strip(move))}$“ – also subtrahieren.` : undefined)
        O = sub(O, move)
        S = keep
        break
      }
      case 'sub': {
        if (has(S.a, target)) {
          setOp(`| ${signedArg('+', S.b)}`)
          O = add(O, S.b)
          S = S.a
        } else {
          // gesuchte Größe wird abgezogen: auf die andere Seite holen
          setOp(`| ${signedArg('+', S.b)}`, `$${tv}$ steckt im abgezogenen Teil – diesen Teil auf die andere Seite holen, damit er positiv wird.`)
          const newS = add(O, S.b)
          O = S.a
          S = newS
          sLeft = !sLeft
        }
        break
      }
      case 'mul': {
        const aHas = has(S.a, target)
        const other = aHas ? S.b : S.a
        const keep = aHas ? S.a : S.b
        const o = strip(other)
        if (o.t === 'div' && !has(o, target)) {
          // Bruch als Faktor: erst mit dem Nenner malnehmen, dann durch den Zähler teilen
          setOp(`| \\cdot ${opArg(o.b)}`, 'Bruch auflösen: mit dem Nenner malnehmen.')
          O = mul(O, o.b)
          S = isNum(o.a, 1) ? keep : aHas ? mul(keep, o.a) : mul(o.a, keep)
        } else {
          setOp(`| :${opArg(other)}`, note ?? `$${tv}$ ist mit $${toTex(tidy(o))}$ malgenommen – also durch $${toTex(tidy(o))}$ teilen.`)
          O = divN(O, other)
          S = keep
        }
        break
      }
      case 'div': {
        if (has(S.a, target)) {
          setOp(`| \\cdot ${opArg(S.b)}`, 'Bruch auflösen: mit dem Nenner malnehmen.')
          O = mul(O, S.b)
          S = S.a
        } else {
          setOp(`| \\cdot ${opArg(S.b)}`, `$${tv}$ steht im Nenner – zuerst mit dem Nenner malnehmen.`)
          const newS = mul(O, S.b)
          O = S.a
          S = newS
          sLeft = !sLeft
        }
        break
      }
      case 'neg':
        setOp('| \\cdot (-1)')
        O = { t: 'neg', a: isSum(O) ? grp(O) : O }
        S = S.a
        break
      case 'pow': {
        if (has(S.b, target)) throw new CalcError('Die gesuchte Größe steht im Exponenten – dafür braucht man Logarithmen.')
        const k = evaluate(S.b)
        if (k === 2) {
          setOp('| \\sqrt{\\;}', 'Quadrat → Wurzel ziehen (bei Längen, Massen usw. zählt nur die positive Lösung).')
          O = { t: 'root', a: O, n: 2 }
        } else if (k === 3) {
          setOp('| \\sqrt[3]{\\;}', 'Hoch 3 → dritte Wurzel ziehen.')
          O = { t: 'root', a: O, n: 3 }
        } else if (k === 0.5) {
          setOp('| (\\;)^2', 'Hoch ½ ist eine Wurzel → quadrieren.')
          O = { t: 'pow', a: isSum(O) ? grp(O) : O, b: num(2) }
        } else {
          setOp(`| (\\;)^{\\frac{1}{${toTex(strip(S.b))}}}`, 'Hochzahl rückgängig machen: hoch dem Kehrwert.')
          O = { t: 'pow', a: grp(O), b: { t: 'div', a: num(1), b: strip(S.b) } }
        }
        S = S.a
        break
      }
      case 'root':
        setOp(S.n === 3 ? '| (\\;)^3' : '| (\\;)^2', S.n === 3 ? 'Dritte Wurzel → hoch 3 nehmen.' : 'Wurzel → beide Seiten quadrieren.')
        O = { t: 'pow', a: strip(O).t === 'num' || strip(O).t === 'var' ? O : grp(O), b: num(S.n) }
        S = S.a
        break
      default:
        throw new CalcError('Diese Formel kann ich nicht umstellen.')
    }
    steps.push({ tex: line() })
  }
  const res = strip(tidy(O))
  if (!sLeft) steps.push({ tex: `${tv} = ${toTex(res)}`, note: 'Seiten tauschen – fertig.' })
  steps[steps.length - 1].final = true
  return { result: `${tv} = ${toTex(res)}`, steps, vars, target, expr: res }
}

/** Werte einsetzen: TeX mit Zahlen und Ergebnis */
export function substituteNode(n: Node, env: Record<string, number>): Node {
  switch (n.t) {
    case 'var':
      return env[n.n] !== undefined ? (env[n.n] < 0 ? { t: 'group', a: num(env[n.n]) } : num(env[n.n])) : n
    case 'num':
      return n
    case 'neg':
    case 'group':
    case 'root':
      return { ...n, a: substituteNode(n.a, env) } as Node
    case 'mul':
      return { ...n, a: substituteNode(n.a, env), b: substituteNode(n.b, env), implicit: false }
    default:
      return { ...n, a: substituteNode(n.a, env), b: substituteNode(n.b, env) } as Node
  }
}

export { toTex, evaluate }
