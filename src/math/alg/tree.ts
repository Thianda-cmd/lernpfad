/**
 * Arbeitsbaum für Schritt-für-Schritt-Umformungen.
 * Bereits ausgerechnete Teile sind flache Monom-Summen („terms“), alles andere behält die Gestalt der Eingabe,
 * damit jede Zeile des Lösungswegs so aussieht, wie man sie von Hand schreiben würde.
 */
import { parse, ParseError, type Node } from '../expr'
import { add, bgcd, CalcError, div, isInt, isZero, mul, neg, ONE, q, qFromRaw, qpow, sign, toInt, type Fmt, type Q } from '../q'
import { evalTerms, isConst, sumTex, termAbsTex, termDiv, termMul, termTex, type Mono, type Term } from './poly'

export type W =
  | { t: 'terms'; ts: Term[] }
  | { t: 'sum'; it: Item[] }
  | { t: 'prod'; f: W[] }
  | { t: 'pow'; b: W; k: number }
  | { t: 'grp'; w: W; sq?: boolean }
  | { t: 'div'; a: W; b: W }

export interface Item {
  s: 1 | -1
  w: W
}

export const terms = (ts: Term[]): W => ({ t: 'terms', ts })
export const grp = (w: W, sq?: boolean): W => ({ t: 'grp', w, sq })

/** einzelnes Monom (auch in Klammern wie „(−2)“) */
export function single(w: W): Term | null {
  if (w.t === 'terms' && w.ts.length === 1) return w.ts[0]
  if (w.t === 'grp' && w.w.t === 'terms' && w.w.ts.length === 1) return w.w.ts[0]
  return null
}

/** fertige Summe (ohne/mit Klammer) */
export function flatTerms(w: W): Term[] | null {
  if (w.t === 'terms') return w.ts
  if (w.t === 'grp' && w.w.t === 'terms') return w.w.ts
  return null
}

/* ---------------------------- Eingabe → Baum ---------------------------- */

export interface ConvOpts {
  /** Hinweis, welcher Rechner für Wurzeln & Co. zuständig ist */
  rootHint?: string
}

export interface Parsed {
  w: W
  /** Eingabe enthielt Kommazahlen → Ergebnisse als Dezimalzahl zeigen */
  dec: boolean
  vars: string[]
}

function constValue(n: Node): Q | null {
  switch (n.t) {
    case 'num':
      return n.raw === 'π' ? null : qFromRaw(n.raw)
    case 'neg': {
      const v = constValue(n.a)
      return v && neg(v)
    }
    case 'group':
      return constValue(n.a)
    case 'add':
    case 'sub':
    case 'mul':
    case 'div': {
      const a = constValue(n.a)
      const b = constValue(n.b)
      if (!a || !b) return null
      return n.t === 'add' ? add(a, b) : n.t === 'sub' ? add(a, neg(b)) : n.t === 'mul' ? mul(a, b) : div(a, b)
    }
    default:
      return null
  }
}

function hasDecimal(n: Node): boolean {
  switch (n.t) {
    case 'num':
      return /[.e]/i.test(n.raw)
    case 'var':
      return false
    case 'neg':
    case 'group':
    case 'root':
      return hasDecimal(n.a)
    default:
      return hasDecimal(n.a) || hasDecimal(n.b)
  }
}

function collectVars(n: Node, out: Set<string>) {
  switch (n.t) {
    case 'num':
      if (n.raw === 'π') out.add('π')
      break
    case 'var':
      out.add(n.n)
      break
    case 'neg':
    case 'group':
    case 'root':
      collectVars(n.a, out)
      break
    default:
      collectVars(n.a, out)
      collectVars(n.b, out)
  }
}

const isMonoLeaf = (w: W) => w.t === 'terms' && w.ts.length === 1

function sumItems(w: W, s: 1 | -1): Item[] {
  if (w.t === 'sum') return w.it.map((i) => ({ s: (i.s * s) as 1 | -1, w: i.w }))
  return [{ s, w }]
}

/** Vorzeichen eines führenden negativen Faktors in das Summanden-Vorzeichen ziehen */
function normItem(it: Item): Item {
  const w = it.w
  if (w.t === 'terms' && w.ts.length === 1 && sign(w.ts[0].c) < 0 && it.s < 0) return { s: 1, w: terms([{ c: neg(w.ts[0].c), m: w.ts[0].m }]) }
  if (w.t === 'prod' && w.f[0].t === 'terms' && w.f[0].ts.length === 1 && sign(w.f[0].ts[0].c) < 0) {
    const f0 = w.f[0].ts[0]
    const rest = w.f.slice(1)
    const head = { c: neg(f0.c), m: f0.m }
    const f = isOneCoef(head) && isConst(head) ? rest : [terms([head]), ...rest]
    return { s: (it.s * -1) as 1 | -1, w: f.length === 1 ? f[0] : { t: 'prod', f } }
  }
  return it
}

export function mkSum(items: Item[]): W {
  const out: Item[] = []
  for (const raw of items) {
    for (const i0 of sumItems(raw.w, raw.s)) {
      let i = normItem(i0)
      if (i.w.t === 'terms' && i.s < 0) {
        if (i.w.ts.length !== 1) i = { s: -1, w: grp(i.w) }
        else i = { s: 1, w: terms([{ c: neg(i.w.ts[0].c), m: i.w.ts[0].m }]) }
      }
      const last = out[out.length - 1]
      if (last && last.s > 0 && last.w.t === 'terms' && i.s > 0 && i.w.t === 'terms') last.w = terms([...last.w.ts, ...i.w.ts])
      else out.push({ ...i })
    }
  }
  if (!out.length) return terms([])
  if (out.length === 1 && out[0].s > 0) return out[0].w
  return { t: 'sum', it: out }
}

export function fromAst(n: Node, opts: ConvOpts = {}): W {
  const hint = opts.rootHint ?? ''
  switch (n.t) {
    case 'num':
      if (n.raw === 'π') return terms([{ c: ONE, m: { π: 1 } }])
      return terms([{ c: qFromRaw(n.raw), m: {} }])
    case 'var':
      return terms([{ c: ONE, m: { [n.n]: 1 } }])
    case 'group': {
      const inner = fromAst(n.a, opts)
      return grp(inner, n.sq)
    }
    case 'neg': {
      const a = fromAst(n.a, opts)
      if (a.t === 'terms' && a.ts.length === 1) return terms([{ c: neg(a.ts[0].c), m: a.ts[0].m }])
      return mkSum([{ s: -1, w: a }])
    }
    case 'add':
    case 'sub':
      return mkSum([
        { s: 1, w: fromAst(n.a, opts) },
        { s: n.t === 'add' ? 1 : -1, w: fromAst(n.b, opts) },
      ])
    case 'mul': {
      const a = fromAst(n.a, opts)
      const b = fromAst(n.b, opts)
      const fa = a.t === 'prod' ? a.f : [a]
      const fb = b.t === 'prod' ? b.f : [b]
      const last = fa[fa.length - 1]
      const first = fb[0]
      // „3x“, „2ab“, „2·x“: reine Schreibweise, sofort zu einem Monom
      if (isMonoLeaf(last) && isMonoLeaf(first)) {
        const x = (last as { ts: Term[] }).ts[0]
        const y = (first as { ts: Term[] }).ts[0]
        const notation = n.implicit ? !(isConst(x) && isConst(y)) : (isConst(x) && !isConst(y) && isOneCoef(y)) || (isConst(y) && !isConst(x) && isOneCoef(x))
        if (notation) {
          const merged = terms([termMul(x, y)])
          const f = [...fa.slice(0, -1), merged, ...fb.slice(1)]
          return f.length === 1 ? f[0] : { t: 'prod', f }
        }
      }
      return { t: 'prod', f: [...fa, ...fb] }
    }
    case 'div': {
      const a = fromAst(n.a, opts)
      const b = fromAst(n.b, opts)
      const ta = single(a)
      const tb = single(b)
      // 3/4, x/3, 7a/6, 2/(3z) sind schon fertige Monome – solange sich nichts kürzen lässt
      if (
        ta &&
        tb &&
        isInt(ta.c) &&
        isInt(tb.c) &&
        sign(tb.c) > 0 &&
        bgcd(ta.c.n, tb.c.n) === 1n &&
        !Object.keys(ta.m).some((k) => k in tb.m) &&
        !(tb.c.n === 1n && isConst(tb))
      )
        return terms([termDiv(ta, tb)])
      return { t: 'div', a, b }
    }
    case 'pow': {
      const k = constValue(n.b)
      if (!k) throw new CalcError(`Die Hochzahl muss eine Zahl sein.${hint}`)
      if (!isInt(k)) throw new CalcError(`Hochzahlen als Bruch gehören zu den Wurzeln.${hint}`)
      const e = toInt(k)
      const base = fromAst(n.a, opts)
      const tb = base.t === 'terms' && base.ts.length === 1 ? base.ts[0] : null
      // x², a³ (Variable ohne Zahl davor) sind Schreibweise
      if (tb && !isConst(tb) && isOneCoef(tb) && Object.keys(tb.m).length === 1 && e > 0) {
        return terms([{ c: tb.c, m: Object.fromEntries(Object.entries(tb.m).map(([v, x]) => [v, x * e])) }])
      }
      if (e < 0 && !(tb || single(base))) throw new CalcError(`Negative Hochzahlen bei Klammern kann dieser Rechner nicht.${hint}`)
      return { t: 'pow', b: base, k: e }
    }
    case 'root':
      throw new CalcError(`Wurzeln kann dieser Rechner nicht vereinfachen.${hint}`)
  }
}

const isOneCoef = (t: Term) => t.c.n === 1n && t.c.d === 1n

export function parseW(src: string, opts: ConvOpts = {}): Parsed {
  let node: Node
  try {
    node = parse(src)
  } catch (e) {
    if (e instanceof ParseError) throw new CalcError(e.message + '.')
    throw e
  }
  const s = new Set<string>()
  collectVars(node, s)
  return { w: fromAst(node, opts), dec: hasDecimal(node), vars: [...s] }
}

/* ---------------------------- Baum → TeX ---------------------------- */

export function strip(w: W): W {
  return w.t === 'grp' ? w.w : w
}

function powBaseTex(b: W, f: Fmt): string {
  const t = single(b)
  if (b.t === 'terms' && t) {
    const isVar = isOneCoef(t) && Object.keys(t.m).length === 1 && Object.values(t.m)[0] === 1
    const isPosInt = isConst(t) && isInt(t.c) && sign(t.c) >= 0
    if (isVar || isPosInt) return termAbsTex(t, f)
    return `\\left(${termTex(t, true, f)}\\right)`
  }
  if (b.t === 'grp') return wTex(b, f)
  return `\\left(${wTex(b, f)}\\right)`
}

function factorStr(w: W, f: Fmt, first: boolean): string {
  if (w.t === 'terms') {
    if (w.ts.length === 1) {
      const t = w.ts[0]
      if (sign(t.c) < 0 && !first) return `\\left(${termTex(t, true, f)}\\right)`
      return termTex(t, true, f)
    }
    return `\\left(${sumTex(w.ts, f)}\\right)`
  }
  if (w.t === 'sum') return `\\left(${wTex(w, f)}\\right)`
  return wTex(w, f)
}

const isNumLike = (w: W) => {
  const t = single(w)
  return !!t && w.t === 'terms'
}

export function wTex(w: W, f: Fmt = {}): string {
  switch (w.t) {
    case 'terms':
      return sumTex(w.ts, f)
    case 'grp':
      return w.sq ? `\\left[${wTex(w.w, f)}\\right]` : `\\left(${wTex(w.w, f)}\\right)`
    case 'sum':
      return w.it
        .map((it, i) => {
          if (it.w.t === 'terms' && it.s > 0) return sumTex(it.w.ts, f, i === 0)
          const body = it.w.t === 'sum' ? `\\left(${wTex(it.w, f)}\\right)` : wTex(it.w, f)
          if (i === 0) return (it.s < 0 ? '-' : '') + body
          return (it.s < 0 ? ' - ' : ' + ') + body
        })
        .join('')
    case 'prod': {
      let out = ''
      w.f.forEach((x, i) => {
        const s = factorStr(x, f, i === 0)
        if (i === 0) {
          out = s
          return
        }
        const prev = w.f[i - 1]
        // 2(x + 1), 3x(…), (a + b)(c + d) ohne Malpunkt
        const implicit = (x.t === 'grp' || (x.t === 'pow' && x.b.t === 'grp')) && (isNumLike(prev) || prev.t === 'grp' || prev.t === 'pow')
        out += implicit ? s : ` \\cdot ${s}`
      })
      return out
    }
    case 'pow':
      return `${powBaseTex(w.b, f)}^{${w.k}}`
    case 'div':
      return `\\frac{${wTex(strip(w.a), f)}}{${wTex(strip(w.b), f)}}`
  }
}

/* ---------------------------- Auswerten ---------------------------- */

export function wEval(w: W, env: Record<string, Q>): Q {
  switch (w.t) {
    case 'terms':
      return evalTerms(w.ts, env)
    case 'grp':
      return wEval(w.w, env)
    case 'sum':
      return w.it.reduce((s, it) => {
        const v = wEval(it.w, env)
        return add(s, it.s < 0 ? neg(v) : v)
      }, q(0))
    case 'prod':
      return w.f.reduce((p, x) => mul(p, wEval(x, env)), ONE)
    case 'pow':
      return qpow(wEval(w.b, env), w.k)
    case 'div':
      return div(wEval(w.a, env), wEval(w.b, env))
  }
}

/** Variablen im Baum */
export function wVars(w: W, out = new Set<string>()): Set<string> {
  switch (w.t) {
    case 'terms':
      w.ts.forEach((t) => Object.keys(t.m).forEach((k) => out.add(k)))
      break
    case 'grp':
      wVars(w.w, out)
      break
    case 'sum':
      w.it.forEach((i) => wVars(i.w, out))
      break
    case 'prod':
      w.f.forEach((x) => wVars(x, out))
      break
    case 'pow':
      wVars(w.b, out)
      break
    case 'div':
      wVars(w.a, out)
      wVars(w.b, out)
  }
  return out
}

/** Variable durch eine Zahl ersetzen (für die Probe): Monome werden zu Produkten „2 · 3“ */
export function substitute(w: W, env: Record<string, Q>): W {
  const sub = (t: Term): W => {
    const vs = Object.keys(t.m).filter((k) => env[k])
    if (!vs.length) return terms([t])
    const negCoef = sign(t.c) < 0
    const cAbs = negCoef ? neg(t.c) : t.c
    // Zähler- und Nennerfaktoren getrennt (für 2/x → 2/1)
    const top: W[] = []
    const bot: W[] = []
    const restTop: Mono = {}
    const restBot: Mono = {}
    for (const [k, e] of Object.entries(t.m)) if (!env[k]) (e > 0 ? restTop : restBot)[k] = Math.abs(e)
    const numTop: Term = { c: q(cAbs.n), m: restTop }
    const numBot: Term = { c: q(cAbs.d), m: restBot }
    if (!(isOneCoef(numTop) && isConst(numTop)) || !vs.some((v) => t.m[v] > 0)) top.push(terms([numTop]))
    if (!(isOneCoef(numBot) && isConst(numBot))) bot.push(terms([numBot]))
    for (const v of vs) {
      const val = terms([{ c: env[v], m: {} }])
      const e = t.m[v]
      const wrap = sign(env[v]) < 0 || !isInt(env[v])
      const node: W = Math.abs(e) === 1 ? (wrap ? grp(val) : val) : { t: 'pow', b: wrap ? grp(val) : val, k: Math.abs(e) }
      ;(e > 0 ? top : bot).push(node)
    }
    const prodOf = (fs: W[]): W => (fs.length === 0 ? terms([{ c: ONE, m: {} }]) : fs.length === 1 ? fs[0] : { t: 'prod', f: fs })
    const p: W = bot.length ? { t: 'div', a: prodOf(top), b: prodOf(bot) } : prodOf(top)
    return negCoef ? mkSum([{ s: -1, w: p }]) : p
  }
  switch (w.t) {
    case 'terms': {
      if (w.ts.every((t) => !Object.keys(t.m).some((k) => env[k]))) return w
      return mkSum(w.ts.map((t) => ({ s: 1 as const, w: sub(t) })))
    }
    case 'grp':
      return grp(substitute(w.w, env), w.sq)
    case 'sum':
      return { t: 'sum', it: w.it.map((i) => ({ s: i.s, w: substitute(i.w, env) })) }
    case 'prod':
      return { t: 'prod', f: w.f.map((x) => substitute(x, env)) }
    case 'pow':
      return { t: 'pow', b: substitute(w.b, env), k: w.k }
    case 'div':
      return { t: 'div', a: substitute(w.a, env), b: substitute(w.b, env) }
  }
}

export { termDiv, isZero }
