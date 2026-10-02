/**
 * Kleiner Term-Parser für Eingaben wie „3,2p + 6,2q“, „x^2-4x+4“, „37/18z“,
 * „√(4A/√3)“ oder „1,807·10^21“. Prüft Antworten durch Einsetzen zufälliger Werte.
 */

export type Node =
  | { t: 'num'; v: number; raw: string }
  | { t: 'var'; n: string }
  | { t: 'neg'; a: Node }
  | { t: 'add' | 'sub'; a: Node; b: Node }
  | { t: 'mul'; a: Node; b: Node; implicit: boolean }
  | { t: 'div'; a: Node; b: Node }
  | { t: 'pow'; a: Node; b: Node }
  | { t: 'root'; a: Node; n: number }
  | { t: 'group'; a: Node; sq?: boolean }

type Tok =
  | { k: 'num'; v: number; raw: string }
  | { k: 'id'; v: string }
  | { k: 'op'; v: string; raw?: string }
  | { k: 'fn'; v: 'sqrt' | 'cbrt' }
  | { k: 'sup'; v: number }

export class ParseError extends Error {}

const OPS: Record<string, string> = {
  '+': '+',
  '-': '-',
  '−': '-',
  '–': '-',
  '*': '*',
  '·': '*',
  '⋅': '*',
  '×': '*',
  '/': '/',
  ':': '/',
  '÷': '/',
  '^': '^',
  '(': '(',
  ')': ')',
  '[': '(',
  ']': ')',
  '{': '(',
  '}': ')',
}

const SUPS: Record<string, number> = { '²': 2, '³': 3, '⁴': 4 }

function tokenize(src: string, sci: boolean): Tok[] {
  const s = src.replace(/\s+/g, ' ').trim()
  const out: Tok[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === ' ') {
      i++
      continue
    }
    if (/[0-9]/.test(c) || ((c === ',' || c === '.') && /[0-9]/.test(s[i + 1] ?? ''))) {
      let j = i
      while (j < s.length && /[0-9]/.test(s[j])) j++
      if ((s[j] === ',' || s[j] === '.') && /[0-9]/.test(s[j + 1] ?? '')) {
        j++
        while (j < s.length && /[0-9]/.test(s[j])) j++
      }
      let raw = s.slice(i, j).replace(',', '.')
      if (sci && (s[j] === 'e' || s[j] === 'E') && /^[+\-−]?[0-9]/.test(s.slice(j + 1))) {
        let k = j + 1
        if (/[+\-−]/.test(s[k])) k++
        while (k < s.length && /[0-9]/.test(s[k])) k++
        raw += 'e' + s.slice(j + 1, k).replace('−', '-')
        j = k
      }
      out.push({ k: 'num', v: parseFloat(raw), raw })
      i = j
      continue
    }
    if (c === '√') {
      out.push({ k: 'fn', v: 'sqrt' })
      i++
      continue
    }
    if (c === '∛') {
      out.push({ k: 'fn', v: 'cbrt' })
      i++
      continue
    }
    if (SUPS[c]) {
      out.push({ k: 'sup', v: SUPS[c] })
      i++
      continue
    }
    if (c === 'π') {
      out.push({ k: 'num', v: Math.PI, raw: 'π' })
      i++
      continue
    }
    const rest = s.slice(i).toLowerCase()
    const fn = ['sqrt', 'wurzel', 'cbrt'].find((w) => rest.startsWith(w))
    if (fn) {
      out.push({ k: 'fn', v: fn === 'cbrt' ? 'cbrt' : 'sqrt' })
      i += fn.length
      continue
    }
    if (rest.startsWith('pi') && !/[a-z]/i.test(s[i + 2] ?? '')) {
      out.push({ k: 'num', v: Math.PI, raw: 'π' })
      i += 2
      continue
    }
    if (/[a-zA-ZäöüÄÖÜα-ωΔ]/.test(c)) {
      let name = c
      let j = i + 1
      if (s[j] === '_' && /[a-zA-Z0-9]/.test(s[j + 1] ?? '')) {
        j++
        const st = j
        while (j < s.length && /[a-zA-Z0-9]/.test(s[j])) j++
        name += '_' + s.slice(st, j)
      }
      out.push({ k: 'id', v: name })
      i = j
      continue
    }
    if (OPS[c]) {
      out.push({ k: 'op', v: OPS[c], raw: c })
      i++
      continue
    }
    throw new ParseError(`Unbekanntes Zeichen „${c}“`)
  }
  return out
}

class Parser {
  i = 0
  constructor(private toks: Tok[]) {}
  peek() {
    return this.toks[this.i]
  }
  next() {
    return this.toks[this.i++]
  }
  isOp(v: string) {
    const t = this.peek()
    return t?.k === 'op' && t.v === v
  }
  parse(): Node {
    if (!this.toks.length) throw new ParseError('Leere Eingabe')
    const n = this.expr()
    if (this.i < this.toks.length) throw new ParseError('Unerwartetes Zeichen am Ende')
    return n
  }
  expr(): Node {
    let a = this.term()
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.next() as { v: string }
      const b = this.term()
      a = { t: op.v === '+' ? 'add' : 'sub', a, b }
    }
    return a
  }
  term(): Node {
    let a = this.unary()
    while (this.isOp('*') || this.isOp('/')) {
      const op = this.next() as { v: string }
      const b = this.unary()
      a = op.v === '*' ? { t: 'mul', a, b, implicit: false } : { t: 'div', a, b }
    }
    return a
  }
  unary(): Node {
    if (this.isOp('-')) {
      this.next()
      return { t: 'neg', a: this.unary() }
    }
    if (this.isOp('+')) {
      this.next()
      return this.unary()
    }
    return this.implicit()
  }
  startsAtom() {
    const t = this.peek()
    if (!t) return false
    return t.k === 'num' || t.k === 'id' || t.k === 'fn' || (t.k === 'op' && t.v === '(')
  }
  /** Implizite Multiplikation bindet stärker als „/“:  37/18z = 37/(18z) */
  implicit(): Node {
    let a = this.power()
    while (this.startsAtom()) {
      const b = this.power()
      a = { t: 'mul', a, b, implicit: true }
    }
    return a
  }
  power(): Node {
    const base = this.postfix()
    if (this.isOp('^')) {
      this.next()
      let neg = false
      if (this.isOp('-')) {
        this.next()
        neg = true
      }
      const e = this.power()
      return { t: 'pow', a: base, b: neg ? { t: 'neg', a: e } : e }
    }
    return base
  }
  postfix(): Node {
    let a = this.atom()
    while (this.peek()?.k === 'sup') {
      const t = this.next() as { v: number }
      a = { t: 'pow', a, b: { t: 'num', v: t.v, raw: String(t.v) } }
    }
    return a
  }
  atom(): Node {
    const t = this.next()
    if (!t) throw new ParseError('Term ist unvollständig')
    if (t.k === 'num') return { t: 'num', v: t.v, raw: t.raw }
    if (t.k === 'id') return { t: 'var', n: t.v }
    if (t.k === 'fn') {
      const arg = this.isOp('(') ? this.atom() : this.postfix()
      return { t: 'root', a: arg.t === 'group' ? arg.a : arg, n: t.v === 'cbrt' ? 3 : 2 }
    }
    if (t.k === 'op' && t.v === '(') {
      const inner = this.expr()
      if (!this.isOp(')')) throw new ParseError('Klammer wird nicht geschlossen')
      this.next()
      return { t: 'group', a: inner, sq: t.raw === '[' }
    }
    if (t.k === 'sup') throw new ParseError('Hochzahl ohne Basis')
    throw new ParseError(t.k === 'op' && t.v === ')' ? 'Zu viele schließende Klammern' : 'Unerwartetes Rechenzeichen')
  }
}

export function parse(src: string, opts: { sci?: boolean } = {}): Node {
  return new Parser(tokenize(src, !!opts.sci)).parse()
}

export function tryParse(src: string, opts: { sci?: boolean } = {}): { node?: Node; error?: string } {
  try {
    return { node: parse(src, opts) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Eingabe nicht lesbar' }
  }
}

export function evaluate(n: Node, env: Record<string, number> = {}): number {
  switch (n.t) {
    case 'num':
      return n.v
    case 'var': {
      const v = env[n.n]
      return v === undefined ? NaN : v
    }
    case 'neg':
      return -evaluate(n.a, env)
    case 'group':
      return evaluate(n.a, env)
    case 'add':
      return evaluate(n.a, env) + evaluate(n.b, env)
    case 'sub':
      return evaluate(n.a, env) - evaluate(n.b, env)
    case 'mul':
      return evaluate(n.a, env) * evaluate(n.b, env)
    case 'div':
      return evaluate(n.a, env) / evaluate(n.b, env)
    case 'pow':
      return Math.pow(evaluate(n.a, env), evaluate(n.b, env))
    case 'root': {
      const x = evaluate(n.a, env)
      if (n.n === 3) return Math.cbrt(x)
      return x < 0 ? NaN : Math.sqrt(x)
    }
  }
}

export function variables(n: Node, out = new Set<string>()): Set<string> {
  switch (n.t) {
    case 'var':
      out.add(n.n)
      break
    case 'num':
      break
    case 'neg':
    case 'group':
    case 'root':
      variables(n.a, out)
      break
    default:
      variables(n.a, out)
      variables(n.b, out)
  }
  return out
}

/** Wie oft kommt jede Variable im Term vor? */
export function occurrences(n: Node, out: Record<string, number> = {}): Record<string, number> {
  switch (n.t) {
    case 'var':
      out[n.n] = (out[n.n] ?? 0) + 1
      break
    case 'num':
      break
    case 'neg':
    case 'group':
    case 'root':
      occurrences(n.a, out)
      break
    default:
      occurrences(n.a, out)
      occurrences(n.b, out)
  }
  return out
}

/** Anzahl der Summanden auf oberster Ebene. */
export function countTerms(n: Node): number {
  if (n.t === 'add' || n.t === 'sub') return countTerms(n.a) + countTerms(n.b)
  if (n.t === 'group') return countTerms(n.a)
  return 1
}

export function hasGroup(n: Node): boolean {
  switch (n.t) {
    case 'group':
      return true
    case 'num':
    case 'var':
      return false
    case 'neg':
    case 'root':
      return hasGroup(n.a)
    case 'pow':
      // Klammern im Exponenten (x^(1/2)) zählen nicht als „Klammer im Term“
      return hasGroup(n.a)
    default:
      return hasGroup(n.a) || hasGroup(n.b)
  }
}

export function hasRoot(n: Node): boolean {
  switch (n.t) {
    case 'root':
      return true
    case 'num':
    case 'var':
      return false
    case 'neg':
    case 'group':
      return hasRoot(n.a)
    default:
      return hasRoot(n.a) || hasRoot(n.b)
  }
}

/* ---------------------------- TeX-Ausgabe ---------------------------- */

function numTex(n: { v: number; raw: string }) {
  if (n.raw === 'π') return '\\pi '
  if (/e/i.test(n.raw)) {
    const [m, e] = n.raw.split(/e/i)
    return `${m.replace('.', '{,}')} \\cdot 10^{${parseInt(e, 10)}}`
  }
  return n.raw.replace('.', '{,}')
}

function varTex(name: string) {
  const [b, s] = name.split('_')
  const base = b === 'Δ' ? '\\Delta ' : b
  return s ? `${base}_{${s}}` : base
}

function needsParensInProduct(n: Node) {
  return n.t === 'add' || n.t === 'sub'
}

export function toTex(n: Node): string {
  switch (n.t) {
    case 'num':
      return numTex(n)
    case 'var':
      return varTex(n.n)
    case 'group':
      return n.sq ? `\\left[${toTex(n.a)}\\right]` : `\\left(${toTex(n.a)}\\right)`
    case 'neg': {
      const inner = n.a.t === 'add' || n.a.t === 'sub' ? `\\left(${toTex(n.a)}\\right)` : toTex(n.a)
      return `-${inner}`
    }
    case 'add':
      return `${toTex(n.a)} + ${toTex(n.b)}`
    case 'sub': {
      const b = n.b.t === 'neg' ? `\\left(${toTex(n.b)}\\right)` : toTex(n.b)
      return `${toTex(n.a)} - ${b}`
    }
    case 'mul': {
      const a = needsParensInProduct(n.a) ? `\\left(${toTex(n.a)}\\right)` : toTex(n.a)
      const b = needsParensInProduct(n.b) || n.b.t === 'neg' ? `\\left(${toTex(n.b)}\\right)` : toTex(n.b)
      const numNext = n.b.t === 'num' || (n.b.t === 'pow' && n.b.a.t === 'num')
      return n.implicit && !numNext ? `${a}${b}` : `${a} \\cdot ${b}`
    }
    case 'div': {
      const strip = (x: Node) => (x.t === 'group' ? x.a : x)
      return `\\frac{${toTex(strip(n.a))}}{${toTex(strip(n.b))}}`
    }
    case 'pow': {
      const simple = n.a.t === 'num' || n.a.t === 'var' || n.a.t === 'group'
      const base = simple ? toTex(n.a) : `\\left(${toTex(n.a)}\\right)`
      const e = n.b.t === 'group' ? n.b.a : n.b
      return `${base}^{${toTex(e)}}`
    }
    case 'root':
      return n.n === 3 ? `\\sqrt[3]{${toTex(n.a)}}` : `\\sqrt{${toTex(n.a)}}`
  }
}

/* ---------------------------- Vergleich ---------------------------- */

function rngFrom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Sind zwei Terme gleichwertig? Beide werden an mehreren zufälligen Stellen
 * (positive Werte, damit Wurzeln definiert sind) ausgewertet.
 */
export function equivalent(a: Node, b: Node, vars: string[], opts: { tol?: number; ranges?: Record<string, [number, number]> } = {}) {
  const tol = opts.tol ?? 1e-7
  const rnd = rngFrom(20261008)
  let valid = 0
  for (let k = 0; k < 14 && valid < 7; k++) {
    const env: Record<string, number> = {}
    for (const v of vars) {
      const r = opts.ranges?.[v]
      env[v] = r ? r[0] + rnd() * (r[1] - r[0]) : 0.55 + rnd() * 2.1 + (k % 3) * 0.37
    }
    const x = evaluate(a, env)
    const y = evaluate(b, env)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    valid++
    if (Math.abs(x - y) > tol * Math.max(1, Math.abs(x), Math.abs(y))) return false
  }
  return valid >= 3
}
