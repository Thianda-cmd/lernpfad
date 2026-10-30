/** Zahlen aus Eingabefeldern: „2,5“, „-3“, „1/3“, „2·10^-3“, „6,022e23“, „1 1/2“ */
import { evaluate, parse, type Node } from '../expr'
import { add, CalcError, div, isInt, mul, neg, qFromNumber, qFromRaw, qpow, sub, toNum, type Q } from '../q'

function exact(n: Node): Q | null {
  switch (n.t) {
    case 'num':
      return n.raw === 'π' ? null : qFromRaw(n.raw)
    case 'neg': {
      const a = exact(n.a)
      return a && neg(a)
    }
    case 'group':
      return exact(n.a)
    case 'add':
    case 'sub':
    case 'mul':
    case 'div': {
      const a = exact(n.a)
      const b = exact(n.b)
      if (!a || !b) return null
      return n.t === 'add' ? add(a, b) : n.t === 'sub' ? sub(a, b) : n.t === 'mul' ? mul(a, b) : div(a, b)
    }
    case 'pow': {
      const a = exact(n.a)
      const b = exact(n.b)
      if (!a || !b || !isInt(b)) return null
      // vor dem Potenzieren abschätzen, sonst rechnet (10^400)^400 ewig
      if (digits(a) * Math.abs(Number(b.n)) > 4000) throw new CalcError('Die Zahl ist zu groß.')
      return qpow(a, Number(b.n))
    }
    default:
      return null
  }
}

/** Stellen von Zähler und Nenner zusammen */
function digits(a: Q) {
  return (a.n < 0n ? -a.n : a.n).toString().length + a.d.toString().length
}

/** Zehnerpotenz von |a| (auf ±1 genau, ohne Überlauf) */
function magnitude(a: Q) {
  return (a.n < 0n ? -a.n : a.n).toString().length - a.d.toString().length
}

export interface NumIn {
  q: Q
  /** mit Komma eingegeben → Ergebnisse als Dezimalzahl */
  dec: boolean
}

/**
 * leere Eingabe → null; ungültige → Fehler.
 * maxExp: größte erlaubte Zehnerpotenz (Laborwerte: 10^±100; Logarithmen dürfen mehr).
 */
export function parseNum(s: string, what = 'Wert', maxExp = 100): NumIn | null {
  const t = s.trim().replace(/×/g, '·')
  if (!t) return null
  // gemischte Zahl „1 1/2“
  const mixed = /^(-?)(\d+)\s+(\d+)\/(\d+)$/.exec(t)
  const src = mixed ? `${mixed[1]}(${mixed[2]} + ${mixed[3]}/${mixed[4]})` : t
  let node: Node
  try {
    node = parse(src, { sci: true })
  } catch {
    throw new CalcError(`${what}: „${s}“ ist keine Zahl.`)
  }
  if (/[a-zA-Z]/.test(src.replace(/e[+-]?\d/gi, '').replace(/pi|π/gi, ''))) throw new CalcError(`${what}: Bitte nur eine Zahl eingeben.`)
  const e = exact(node)
  if (e) return { q: inRange(e, what, maxExp), dec: /[.,]|e/i.test(t) }
  const v = evaluate(node)
  if (!Number.isFinite(v)) throw new CalcError(`${what}: „${s}“ ist keine Zahl.`)
  return { q: inRange(qFromNumber(v), what, maxExp), dec: true }
}

/** Werte jenseits von 10¹⁰⁰ bzw. 10⁻¹⁰⁰ kommen im Labor nicht vor – und sprengen die Gleitkommazahlen */
function inRange(x: Q, what: string, maxExp: number): Q {
  if (x.n === 0n) return x
  const m = magnitude(x)
  if (m > maxExp) throw new CalcError(`${what}: Die Zahl ist zu groß.`)
  if (m < -maxExp) throw new CalcError(`${what}: Die Zahl ist zu klein – fast 0.`)
  return x
}

/**
 * Messreihe: „1,2; 1,5 1,4“ – Leerzeichen, Semikolon, Tab und Zeilenumbruch trennen,
 * das Komma ist Dezimalzeichen. Jede Zahl darf auch „1/3“ oder „2·10^-3“ sein.
 */
export function parseList(s: string, what = 'Messwerte'): number[] {
  const toks = s
    .split(/[;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  return toks.map((t, i) => {
    const v = parseNum(t, `${what} (Wert ${i + 1})`)
    return v ? toNumber(v) : NaN
  })
}

/** Wertepaare, eines pro Zeile: „0,1; 0,25“ oder „0,1 0,25“ (x und y) */
export function parsePairs(s: string, what = 'Wertepaare'): [number, number][] {
  const out: [number, number][] = []
  s.split(/\n+/).forEach((line, i) => {
    const t = line.trim()
    if (!t) return
    const xs = parseList(t, `${what}, Zeile ${i + 1}`)
    if (xs.length !== 2) throw new CalcError(`${what}, Zeile ${i + 1}: bitte genau zwei Zahlen (x und y), getrennt durch Semikolon oder Leerzeichen.`)
    out.push([xs[0], xs[1]])
  })
  return out
}

function toNumber(v: NumIn): number {
  return toNum(v.q)
}
