/** Zahlen aus Eingabefeldern: „2,5“, „-3“, „1/3“, „2·10^-3“, „6,022e23“, „1 1/2“ */
import { evaluate, parse, type Node } from '../expr'
import { add, CalcError, div, isInt, mul, neg, qFromNumber, qFromRaw, qpow, sub, type Q } from '../q'

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
      return qpow(a, Number(b.n))
    }
    default:
      return null
  }
}

export interface NumIn {
  q: Q
  /** mit Komma eingegeben → Ergebnisse als Dezimalzahl */
  dec: boolean
}

/** leere Eingabe → null; ungültige → Fehler */
export function parseNum(s: string, what = 'Wert'): NumIn | null {
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
  if (e) return { q: e, dec: /[.,]|e/i.test(t) }
  const v = evaluate(node)
  if (!Number.isFinite(v)) throw new CalcError(`${what}: „${s}“ ist keine Zahl.`)
  return { q: qFromNumber(v), dec: true }
}
