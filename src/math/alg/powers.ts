/**
 * Potenzen & Wurzeln: Potenzgesetze, Wurzeln als Potenzen, teilweise Wurzelziehen –
 * und Zehnerpotenzen (wissenschaftliche Schreibweise).
 */
import { parse, ParseError, type Node } from '../expr'
import {
  add,
  approxTex,
  bgcd,
  blcm,
  CalcError,
  div,
  isInt,
  isOne,
  isZero,
  mul,
  neg,
  ONE,
  primeFactorsBig,
  q,
  qabs,
  qFromRaw,
  qpow,
  qTex,
  sign,
  sub,
  toNum,
  ZERO,
  decStr,
  type Q,
} from '../q'
import { varOrder, varTex } from './poly'
import type { Solution, Step } from './step'

type Base = { v: string } | { n: bigint }
interface Fac {
  b: Base
  e: Q
  /** Hochzahlen, die beim Auflösen malgenommen wurden: (a²)³ → [2, 3] */
  chain?: Q[]
}

const isVarB = (b: Base): b is { v: string } => 'v' in b
const bkey = (b: Base) => (isVarB(b) ? `v:${b.v}` : `n:${b.n}`)

function pparse(src: string): Node {
  try {
    return parse(src)
  } catch (e) {
    if (e instanceof ParseError) throw new CalcError(e.message + '.')
    throw e
  }
}

/** konstanter Exponent (auch 3/2, −1, 1/3) */
function constQ(n: Node): Q {
  switch (n.t) {
    case 'num':
      if (n.raw === 'π') throw new CalcError('π als Hochzahl geht hier nicht.')
      return qFromRaw(n.raw)
    case 'neg':
      return neg(constQ(n.a))
    case 'group':
      return constQ(n.a)
    case 'add':
      return add(constQ(n.a), constQ(n.b))
    case 'sub':
      return sub(constQ(n.a), constQ(n.b))
    case 'mul':
      return mul(constQ(n.a), constQ(n.b))
    case 'div':
      return div(constQ(n.a), constQ(n.b))
    case 'pow': {
      const b = constQ(n.a)
      const e = constQ(n.b)
      if (!isInt(e)) throw new CalcError('In der Hochzahl bitte nur einfache Zahlen und Brüche.')
      return qpow(b, Number(e.n))
    }
    default:
      throw new CalcError('Die Hochzahl muss eine Zahl sein (z. B. 3, −2 oder 1/2).')
  }
}

const SUM_MSG = 'Potenzgesetze gelten für Produkte und Quotienten. Summen bitte mit dem Rechner „Terme vereinfachen“ bearbeiten.'

/* ---------------------------- TeX ---------------------------- */

function eTex(e: Q) {
  return qTex(e)
}

function baseTex(b: Base) {
  return isVarB(b) ? varTex(b.v) : `${b.n}`
}

function facTex(f: Fac, showOne = false, showChain = false) {
  const bt = baseTex(f.b)
  const wrap = isVarB(f.b) && f.b.v.includes('_') ? `{${bt}}` : bt
  const ch = (f.chain ?? []).filter((x) => !isOne(x))
  if (showChain && ch.length > 1) return `${wrap}^{${ch.map((x) => (sign(x) < 0 ? `\\left(${eTex(x)}\\right)` : eTex(x))).join(' \\cdot ')}}`
  if (isOne(f.e) && !showOne) return bt
  return `${wrap}^{${eTex(f.e)}}`
}

/** Knoten mit umgeschriebenen Wurzeln als TeX */
function nodeTex(n: Node, top = true): string {
  switch (n.t) {
    case 'num':
      return n.raw === 'π' ? '\\pi' : n.raw.replace('.', '{,}')
    case 'var':
      return varTex(n.n)
    case 'group':
      return `\\left(${nodeTex(n.a)}\\right)`
    case 'neg':
      return `-${nodeTex(n.a, false)}`
    case 'mul': {
      const a = nodeTex(n.a, false)
      const b = nodeTex(n.b, false)
      const bNum = n.b.t === 'num' || (n.b.t === 'pow' && n.b.a.t === 'num')
      return n.implicit && !bNum ? `${a}${b}` : `${a} \\cdot ${b}`
    }
    case 'div': {
      const strip = (x: Node) => (x.t === 'group' ? x.a : x)
      return `\\frac{${nodeTex(strip(n.a))}}{${nodeTex(strip(n.b))}}`
    }
    case 'pow': {
      const base = n.a.t === 'num' || n.a.t === 'var' || n.a.t === 'group' ? nodeTex(n.a, false) : `\\left(${nodeTex(n.a)}\\right)`
      const e = n.b.t === 'group' ? n.b.a : n.b
      let et: string
      try {
        et = qTex(constQ(e))
      } catch {
        et = nodeTex(e)
      }
      return `${base}^{${et}}`
    }
    case 'root':
      return n.n === 3 ? `\\sqrt[3]{${nodeTex(n.a)}}` : `\\sqrt{${nodeTex(n.a)}}`
    case 'add':
    case 'sub':
      void top
      throw new CalcError(SUM_MSG)
  }
}

/** Wurzeln als Potenzen umschreiben (√[n]{a^m} = a^{m/n}) */
function rootsToPow(n: Node): { node: Node; did: boolean } {
  let did = false
  const rec = (x: Node): Node => {
    switch (x.t) {
      case 'root': {
        did = true
        const inner = rec(x.a)
        const inv: Node = { t: 'num', v: 1 / x.n, raw: `1/${x.n}` }
        const frac = (num: Q): Node => {
          const r = div(num, q(x.n))
          return r.d === 1n ? { t: 'num', v: Number(r.n), raw: r.n.toString() } : { t: 'div', a: { t: 'num', v: Number(r.n), raw: r.n.toString() }, b: { t: 'num', v: Number(r.d), raw: r.d.toString() } }
        }
        if (inner.t === 'pow' && (inner.a.t === 'var' || inner.a.t === 'num')) {
          try {
            const m = constQ(inner.b)
            return { t: 'pow', a: inner.a, b: { t: 'group', a: frac(m) } }
          } catch {
            /* fällt unten durch */
          }
        }
        if (inner.t === 'var' || inner.t === 'num') return { t: 'pow', a: inner, b: { t: 'group', a: frac(ONE) } }
        void inv
        return { t: 'pow', a: { t: 'group', a: inner }, b: { t: 'group', a: frac(ONE) } }
      }
      case 'group':
      case 'neg':
        return { ...x, a: rec(x.a) }
      case 'mul':
      case 'div':
      case 'pow':
        return { ...x, a: rec(x.a), b: rec(x.b) } as Node
      default:
        return x
    }
  }
  const node = rec(n)
  return { node, did }
}

/* ---------------------------- Faktoren sammeln ---------------------------- */

interface Flat {
  facs: { f: Fac; den: boolean }[]
  sign: 1 | -1
  /** Potenz von Klammer / Potenz kam vor */
  powOfPow: boolean
}

function flatten(n: Node, e: Q, out: Flat, depthPow = 0, chain: Q[] = []) {
  switch (n.t) {
    case 'num': {
      if (n.raw === 'π') {
        out.facs.push({ f: { b: { v: 'π' }, e, chain }, den: sign(e) < 0 })
        return
      }
      const v = qFromRaw(n.raw)
      if (isZero(v)) {
        if (sign(e) <= 0) throw new CalcError('0 hoch 0 oder 0 hoch eine negative Zahl ist nicht definiert.')
        out.facs.push({ f: { b: { n: 0n }, e }, den: false })
        return
      }
      if (v.n !== 1n || v.d !== 1n) {
        if (v.n !== 1n) out.facs.push({ f: { b: { n: v.n }, e, chain }, den: sign(e) < 0 })
        if (v.d !== 1n) out.facs.push({ f: { b: { n: v.d }, e: neg(e), chain }, den: sign(e) > 0 })
      }
      return
    }
    case 'var':
      out.facs.push({ f: { b: { v: n.n }, e, chain }, den: sign(e) < 0 })
      return
    case 'group':
      flatten(n.a, e, out, depthPow, chain)
      return
    case 'neg': {
      if (!isInt(e)) throw new CalcError('Aus einer negativen Zahl kann man keine (gerade) Wurzel ziehen.')
      if (e.n % 2n !== 0n) out.sign = (out.sign * -1) as 1 | -1
      flatten(n.a, e, out, depthPow, chain)
      return
    }
    case 'mul':
      flatten(n.a, e, out, depthPow, chain)
      flatten(n.b, e, out, depthPow, chain)
      return
    case 'div':
      flatten(n.a, e, out, depthPow, chain)
      flatten(n.b, neg(e), out, depthPow, chain)
      return
    case 'pow': {
      const k = constQ(n.b)
      if (depthPow > 0 || n.a.t === 'group' || n.a.t === 'pow') out.powOfPow = true
      // Kette: innere Hochzahl zuerst, z. B. (a²)³ → a^{2·3}
      flatten(n.a, mul(e, k), out, depthPow + 1, [k, ...chain])
      return
    }
    case 'root':
      out.powOfPow = true
      flatten(n.a, div(e, q(n.n)), out, depthPow + 1, [q(1, n.n), ...chain])
      return
    case 'add':
    case 'sub':
      throw new CalcError(SUM_MSG)
  }
}

/** Faktorliste als Bruch: Zähler oben, Nenner (negative Hochzahlen) unten */
function fracOfFacs(list: { f: Fac; den: boolean }[], sgn: number, chain = false): string {
  const top = list.filter((x) => !x.den).map((x) => facTex(x.f, false, chain))
  const bot = list.filter((x) => x.den).map((x) => facTex({ b: x.f.b, e: neg(x.f.e), chain: x.f.chain }, false, chain))
  const join = (xs: string[]) => joinFactors(xs)
  const s = sgn < 0 ? '-' : ''
  if (!bot.length) return s + (join(top) || '1')
  return `${s}\\frac{${join(top) || '1'}}{${join(bot)}}`
}

/** Faktoren hintereinander: vor einer Zahl ein Malpunkt (6 · 2^½), sonst direkt (6a, 6√2) */
function joinFactors(xs: string[]) {
  return xs.map((x, i) => (i === 0 ? x : /^[0-9]/.test(x) ? ` \\cdot ${x}` : x.startsWith('\\') ? ` ${x}` : x)).join('')
}

/* ---------------------------- Zahlen mit Bruch-Hochzahl ---------------------------- */

/** n^e mit Bruch-Hochzahl: ganze Anteile herausziehen. Ergebnis: Faktor (rational) und Rest-Faktoren */
function numPow(nb: bigint, e: Q): { coef: Q; rest: Fac[]; note: string } {
  const pf = new Map<bigint, number>()
  for (const p of primeFactorsBig(nb)) pf.set(p, (pf.get(p) ?? 0) + 1)
  let coef = ONE
  const rest: Fac[] = []
  const parts: string[] = []
  pf.forEach((k, p) => {
    const ex = mul(q(k), e)
    // ganzzahliger Anteil (Richtung 0) und Rest
    const whole = ex.n / ex.d
    const fracPart = sub(ex, q(whole))
    if (whole !== 0n) coef = mul(coef, qpow(q(p), Number(whole)))
    if (!isZero(fracPart)) rest.push({ b: { n: p }, e: fracPart })
    parts.push(`${p}^{${k === 1 ? '' : `${k} \\cdot `}${qTex(e).replace(/^-/, '(-') + (sign(e) < 0 ? ')' : '')}} = ${p}^{${qTex(ex)}}`)
  })
  const fac = [...pf.entries()].map(([p, k]) => (k === 1 ? `${p}` : `${p}^{${k}}`)).join(' \\cdot ')
  const note = `$${nb} = ${fac}$, also ${parts.map((x) => `$${x}$`).join(', ')}.`
  return { coef, rest, note }
}

/* ---------------------------- Ergebnis-Schreibweisen ---------------------------- */

function rootForm(f: Fac): string | null {
  if (isInt(f.e)) return null
  const e = f.e
  const m = qabs(e)
  const nRoot = m.d
  const whole = m.n / m.d
  const r = m.n % m.d
  const bt = baseTex(f.b)
  const rad = `\\sqrt${nRoot === 2n ? '' : `[${nRoot}]`}{${r === 1n ? bt : `${bt}^{${r}}`}}`
  const pre = whole === 0n ? '' : whole === 1n ? bt : `${bt}^{${whole}}`
  const body = pre ? `${pre}${rad}` : rad
  return sign(e) < 0 ? `\\frac{1}{${body}}` : body
}

/* ---------------------------- Hauptfunktion ---------------------------- */

export function powerInput(src: string): Solution {
  const node0 = pparse(src)
  const steps: Step[] = [{ tex: nodeTex(node0) }]
  // 1. Wurzeln umschreiben
  const { node, did } = rootsToPow(node0)
  if (did) steps.push({ tex: '= ' + nodeTex(node), note: 'Wurzeln als Potenzen schreiben: $\\sqrt[n]{a^m} = a^{\\frac{m}{n}}$ (die Quadratwurzel ist $\\sqrt[2]{\\;}$).', head: 'Umschreiben' })
  // 2. Klammern mit Hochzahlen auflösen
  const flat: Flat = { facs: [], sign: 1, powOfPow: false }
  flatten(node, ONE, flat)
  if (!flat.facs.length) throw new CalcError('Bitte einen Term mit Potenzen eingeben, z. B. a^3 · a^5.')
  const same = (a: string, b: string) => a.replace(/\s/g, '') === b.replace(/\s/g, '')
  const push = (st: Step) => {
    if (!same(st.tex, steps[steps.length - 1].tex)) steps.push(st)
  }
  if (flat.powOfPow) {
    const withChain = '= ' + fracOfFacs(flat.facs, flat.sign, true)
    const computed = '= ' + fracOfFacs(flat.facs, flat.sign)
    push({
      tex: withChain,
      note: 'Klammern auflösen: $(a \\cdot b)^n = a^n \\cdot b^n$, $\\left(\\frac{a}{b}\\right)^n = \\frac{a^n}{b^n}$ und Potenz einer Potenz: $(a^m)^n = a^{m \\cdot n}$.',
      head: 'Klammern mit Hochzahlen',
    })
    push({ tex: computed, note: 'Hochzahlen malnehmen.' })
  }
  // 3. gleiche Basen zusammenfassen
  const groups = new Map<string, { b: Base; es: Q[] }>()
  for (const { f } of flat.facs) {
    const k = bkey(f.b)
    if (!groups.has(k)) groups.set(k, { b: f.b, es: [] })
    groups.get(k)!.es.push(f.e)
  }
  // Zahlen mit ganzen Hochzahlen sofort als Koeffizient
  let coef = ONE
  const numParts: { top: string[]; bot: string[] } = { top: [], bot: [] }
  const numFacs: Fac[] = []
  const varGroups: { b: { v: string }; es: Q[] }[] = []
  for (const g of groups.values()) {
    if (isVarB(g.b)) varGroups.push(g as { b: { v: string }; es: Q[] })
    else {
      const e = g.es.reduce(add, ZERO)
      if (g.b.n === 0n) {
        coef = ZERO
        continue
      }
      if (isInt(e)) {
        coef = mul(coef, qpow(q(g.b.n), Number(e.n)))
        if (g.es.length > 1) numParts.top.push(`${g.b.n}^{${g.es.map((x, i) => (i === 0 ? qTex(x) : sign(x) < 0 ? ` - ${qTex(qabs(x))}` : ` + ${qTex(x)}`)).join('')}}`)
        else
          for (const x of g.es) {
            const t = isOne(qabs(x)) ? `${g.b.n}` : `${g.b.n}^{${qTex(qabs(x))}}`
            ;(sign(x) < 0 ? numParts.bot : numParts.top).push(t)
          }
      } else numFacs.push({ b: g.b, e })
    }
  }
  varGroups.sort((a, b) => varOrder(a.b.v, b.b.v))
  const multi = varGroups.some((g) => g.es.length > 1) || [...groups.values()].some((g) => !isVarB(g.b) && g.es.length > 1)
  const coefDisp = (() => {
    const t = numParts.top.length ? joinFactors(numParts.top) : ''
    const b = numParts.bot.length ? joinFactors(numParts.bot) : ''
    if (!t && !b) return ''
    if (!b) return t
    return `\\frac{${t || '1'}}{${b}}`
  })()
  const expSumTex = (es: Q[]) => es.map((x, i) => (i === 0 ? qTex(x) : sign(x) < 0 ? ` - ${qTex(qabs(x))}` : ` + ${qTex(x)}`)).join('')
  if (multi || numParts.top.length + numParts.bot.length > 1 || numParts.bot.length) {
    const parts = [
      ...(coefDisp ? [coefDisp] : []),
      ...numFacs.map((f) => facTex(f)),
      ...varGroups.map((g) => (g.es.length > 1 ? `${baseTex(g.b)}^{${expSumTex(g.es)}}` : facTex({ b: g.b, e: g.es[0] }))),
    ]
    push({
      tex: '= ' + (flat.sign < 0 ? '-' : '') + parts.join(' \\cdot '),
      note: 'Gleiche Basen zusammenfassen: beim Malnehmen die Hochzahlen **addieren** ($a^m \\cdot a^n = a^{m+n}$), beim Teilen **subtrahieren** ($\\frac{a^m}{a^n} = a^{m-n}$). Zahlen extra.',
      head: 'Gleiche Basen',
    })
    // Hochzahlen mit Brüchen gleichnamig machen
    const fracGroups = varGroups.filter((g) => g.es.length > 1 && g.es.some((x) => !isInt(x)) && new Set(g.es.map((x) => x.d.toString())).size > 1)
    if (fracGroups.length) {
      const hnOf = (es: Q[]) => es.reduce((l, x) => blcm(l, x.d), 1n)
      const parts2 = [
        ...(coefDisp ? [coefDisp] : []),
        ...numFacs.map((f) => facTex(f)),
        ...varGroups.map((g) => {
          if (!fracGroups.includes(g)) return g.es.length > 1 ? `${baseTex(g.b)}^{${expSumTex(g.es)}}` : facTex({ b: g.b, e: g.es[0] })
          const hn = hnOf(g.es)
          const s = g.es.map((x, i) => {
            const t = `\\frac{${(x.n < 0n ? -x.n : x.n) * (hn / x.d)}}{${hn}}`
            return i === 0 ? (sign(x) < 0 ? '-' : '') + t : sign(x) < 0 ? ` - ${t}` : ` + ${t}`
          })
          return `${baseTex(g.b)}^{${s.join('')}}`
        }),
      ]
      push({ tex: '= ' + (flat.sign < 0 ? '-' : '') + parts2.join(' \\cdot '), note: 'Brüche in den Hochzahlen gleichnamig machen (Hauptnenner).' })
    }
  }
  const vfacs: Fac[] = varGroups.map((g) => ({ b: g.b, e: g.es.reduce(add, ZERO) }))
  const coefSigned = flat.sign < 0 ? neg(coef) : coef
  const rest = () => [...numFacs, ...vfacs]
  const showAll = (c: Q, fs: Fac[], keepZero = true) => {
    const vs = fs.filter((f) => keepZero || !isZero(f.e))
    const ft = vs.map((f) => facTex(f, false))
    const cAbs = qabs(c)
    const cTex = isOne(cAbs) && ft.length ? '' : qTex(cAbs)
    const s = sign(c) < 0 ? '-' : ''
    if (!ft.length) return s + qTex(cAbs)
    const sep = cTex && (cTex.startsWith('\\frac') || /^[0-9]/.test(ft[0])) ? ' \\cdot ' : ''
    return s + cTex + sep + joinFactors(ft)
  }
  push({ tex: '= ' + showAll(coefSigned, rest()), note: 'Hochzahlen und Zahlen ausrechnen' + (coefDisp.includes('frac') ? ' (Zahlen kürzen).' : '.'), head: 'Ausrechnen' })
  // 4. Zahlen mit Bruch-Hochzahl (Wurzeln aus Zahlen)
  let c2 = coefSigned
  let nf: Fac[] = []
  const notes: string[] = []
  for (const f of numFacs) {
    const r = numPow((f.b as { n: bigint }).n, f.e)
    c2 = mul(c2, r.coef)
    nf.push(...r.rest)
    notes.push(r.note)
  }
  // gleiche Primzahlen zusammenfassen
  const m = new Map<string, Fac>()
  for (const f of nf) {
    const k = bkey(f.b)
    m.set(k, m.has(k) ? { b: f.b, e: add(m.get(k)!.e, f.e) } : f)
  }
  nf = [...m.values()].filter((f) => !isZero(f.e))
  if (numFacs.length) push({ tex: '= ' + showAll(c2, [...nf, ...vfacs]), note: `Zahl in Primfaktoren zerlegen und ganze Hochzahlen herausziehen: ${notes.join(' ')}` })
  // 5. Hoch 0 und Hoch 1
  const zero = vfacs.filter((f) => isZero(f.e))
  const finalF = [...nf, ...vfacs.filter((f) => !isZero(f.e))]
  if (zero.length) push({ tex: '= ' + showAll(c2, finalF), note: `Hoch 0 ergibt 1: ${zero.map((f) => `$${baseTex(f.b)}^0 = 1$`).join(', ')}.` })
  const result = showAll(c2, finalF)
  steps[steps.length - 1].final = true
  // andere Schreibweisen
  const extra: string[] = []
  const negs = finalF.filter((f) => sign(f.e) < 0)
  const fracs = finalF.filter((f) => !isInt(f.e))
  if (negs.length || fracs.length) {
    const topF = finalF.filter((f) => sign(f.e) > 0)
    const botF = negs.map((f) => ({ b: f.b, e: neg(f.e) }))
    const rt = (f: Fac) => rootForm(f) ?? facTex(f)
    const topT = joinFactors(topF.map(rt))
    const cAbs = qabs(c2)
    const numT = (isOne(cAbs) || cAbs.n === 1n ? (topT ? '' : '1') : `${cAbs.n}`) + (topT ? (cAbs.n !== 1n && /^[0-9]/.test(topT) ? ' \\cdot ' : '') + topT : '')
    const denT = (cAbs.d !== 1n ? `${cAbs.d}` : '') + (botF.length ? (cAbs.d !== 1n ? ' ' : '') + joinFactors(botF.map(rt)) : '')
    const alt = (sign(c2) < 0 ? '-' : '') + (denT ? `\\frac{${numT || '1'}}{${denT}}` : numT)
    if (alt !== result) {
      if (did && fracs.length) {
        // Eingabe mit Wurzeln: Ergebnis auch als Wurzel
        steps.push({ tex: `= ${alt}`, note: 'Zurück in Wurzelschreibweise: $a^{\\frac{m}{n}} = \\sqrt[n]{a^m}$, ganze Anteile vor die Wurzel.', final: true })
        steps[steps.length - 2].final = false
        extra.push(`= ${result} \\;\\text{(Potenzschreibweise)}`)
        return { result: alt, steps, extra: [...extra, ...approxExtra(c2, finalF)] }
      }
      extra.push(`= ${alt}` + (fracs.length ? ' \\;\\text{(als Wurzel)}' : ' \\;\\text{(ohne negative Hochzahl)}'))
    }
  }
  extra.push(...approxExtra(c2, finalF))
  return { result, steps, extra }
}

function approxExtra(c: Q, fs: Fac[]): string[] {
  if (fs.some((f) => isVarB(f.b)) || !fs.length) return []
  const v = toNum(c) * fs.reduce((p, f) => p * Math.pow(Number((f.b as { n: bigint }).n), toNum(f.e)), 1)
  return [`\\approx ${approxTex(v, 6)}`]
}

/* ---------------------------- Zehnerpotenzen ---------------------------- */

interface Sci {
  m: Q
  e: number
}

const TEN = q(10)

function normSci(x: Q): Sci {
  if (isZero(x)) return { m: ZERO, e: 0 }
  let e = Math.floor(Math.log10(Math.abs(toNum(x))))
  let m = div(x, qpow(TEN, e))
  // Rundungsfehler im Logarithmus ausgleichen
  if (qabs(m).n >= 10n * qabs(m).d) {
    e++
    m = div(m, TEN)
  }
  if (qabs(m).n < qabs(m).d) {
    e--
    m = mul(m, TEN)
  }
  return { m, e }
}

const decT = (x: Q) => {
  const s = decStr(x)
  const [i, f] = s.replace('-', '').split('.')
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,')
  return (s.startsWith('-') ? '-' : '') + g + (f ? `{,}${f}` : '')
}
const sciT = (s: Sci) => `${decT(s.m)} \\cdot 10^{${s.e}}`

function sciParse(src: string): Node {
  try {
    return parse(src.replace(/×/g, '·'), { sci: true })
  } catch (e) {
    if (e instanceof ParseError) throw new CalcError(e.message + '.')
    throw e
  }
}

/** Faktoren a · 10^k (mal/geteilt) einsammeln */
function sciFactors(n: Node, inv: boolean, out: { m: Q[]; mi: boolean[]; ex: number[]; exInv: boolean[] }) {
  switch (n.t) {
    case 'group':
      sciFactors(n.a, inv, out)
      return
    case 'mul':
      sciFactors(n.a, inv, out)
      sciFactors(n.b, inv, out)
      return
    case 'div':
      sciFactors(n.a, inv, out)
      sciFactors(n.b, !inv, out)
      return
    case 'pow': {
      if (n.a.t === 'num' && n.a.raw === '10') {
        const k = constQ(n.b)
        if (!isInt(k)) throw new CalcError('Bitte ganzzahlige Zehnerpotenzen verwenden.')
        out.ex.push(Number(k.n))
        out.exInv.push(inv)
        return
      }
      const v = constQ(n)
      out.m.push(v)
      out.mi.push(inv)
      return
    }
    case 'num': {
      const v = qFromRaw(n.raw)
      // 1.8e21 aus der Eingabe
      if (/e/i.test(n.raw)) {
        const [mm, ee] = n.raw.toLowerCase().split('e')
        out.m.push(qFromRaw(mm))
        out.mi.push(inv)
        out.ex.push(parseInt(ee, 10))
        out.exInv.push(inv)
        return
      }
      out.m.push(v)
      out.mi.push(inv)
      return
    }
    case 'neg':
      out.m.push(q(-1))
      out.mi.push(false)
      sciFactors(n.a, inv, out)
      return
    default:
      throw new CalcError('Bitte nur Zahlen und Zehnerpotenzen malnehmen oder teilen, z. B. (3·10^4)·(2·10^-7).')
  }
}

export function sciInput(src: string): Solution {
  const node = sciParse(src)
  const out = { m: [] as Q[], mi: [] as boolean[], ex: [] as number[], exInv: [] as boolean[] }
  sciFactors(node, false, out)
  const steps: Step[] = []
  const inputTex = (() => {
    try {
      return nodeTex(node).replace(/(\d)e(-?\d+)/gi, '$1 \\cdot 10^{$2}')
    } catch {
      return src
    }
  })()
  steps.push({ tex: inputTex })
  // einzelne Zahl umwandeln
  const single = out.m.length <= 1 && out.ex.length <= 1 && !out.mi.some(Boolean) && !out.exInv.some(Boolean)
  if (single) {
    const m0 = out.m[0] ?? ONE
    const e0 = out.ex[0] ?? 0
    const value = mul(m0, qpow(TEN, e0))
    const s = normSci(value)
    if (isZero(value)) throw new CalcError('0 hat keine wissenschaftliche Schreibweise.')
    if (out.ex.length === 0) {
      const dir = s.e > 0 ? 'links' : 'rechts'
      steps.push({
        tex: `= ${sciT(s)}`,
        note: s.e === 0 ? 'Die Zahl liegt schon zwischen 1 und 10: $10^0 = 1$.' : `Komma um ${Math.abs(s.e)} Stelle${Math.abs(s.e) === 1 ? '' : 'n'} nach ${dir} verschieben, bis genau eine Ziffer (nicht 0) davor steht. Nach ${dir} verschoben → Hochzahl ${s.e > 0 ? 'positiv' : 'negativ'}.`,
        head: 'Wissenschaftliche Schreibweise',
        final: true,
      })
      return { result: sciT(s), steps, extra: [`= ${decT(value)}`] }
    }
    // Zahl mit Zehnerpotenz → normieren und als Dezimalzahl
    if (!(qabs(m0).n >= qabs(m0).d && qabs(m0).n < 10n * qabs(m0).d)) {
      const ms = normSci(m0)
      steps.push({ tex: `= ${sciT(ms)} \\cdot 10^{${e0}}`, note: `Die Zahl vor der Zehnerpotenz muss zwischen 1 und 10 liegen: $${decT(m0)} = ${sciT(ms)}$.`, head: 'Normieren' })
      steps.push({ tex: `= ${decT(ms.m)} \\cdot 10^{${ms.e} ${e0 < 0 ? '-' : '+'} ${Math.abs(e0)}} = ${sciT(s)}`, note: 'Zehnerpotenzen malnehmen: Hochzahlen addieren.' })
    }
    steps.push({
      tex: `= ${decT(value)}`,
      note: e0 === 0 ? undefined : `Als Dezimalzahl: Komma um ${Math.abs(s.e)} Stelle${Math.abs(s.e) === 1 ? '' : 'n'} nach ${s.e > 0 ? 'rechts' : 'links'} verschieben.`,
      head: 'Als Dezimalzahl',
      final: true,
    })
    return { result: sciT(s), steps, extra: [`= ${decT(value)}`] }
  }
  // Rechnen: Zahlen und Zehnerpotenzen getrennt
  const mTex = out.m.map((x, i) => (i === 0 ? (out.mi[i] ? `1 : ${decT(x)}` : decT(x)) : `${out.mi[i] ? ':' : '\\cdot'} ${sign(x) < 0 ? `(${decT(x)})` : decT(x)}`)).join(' ')
  const eTexs = out.ex.map((k, i) => (i === 0 ? (out.exInv[i] ? `1 : 10^{${k}}` : `10^{${k}}`) : `${out.exInv[i] ? ':' : '\\cdot'} 10^{${k}}`)).join(' ')
  steps.push({ tex: `= \\left(${mTex || '1'}\\right) \\cdot \\left(${eTexs || '1'}\\right)`, note: 'Zahlen und Zehnerpotenzen getrennt zusammenfassen (Reihenfolge beim Malnehmen ist egal).', head: 'Sortieren' })
  let mm = ONE
  out.m.forEach((x, i) => (mm = out.mi[i] ? div(mm, x) : mul(mm, x)))
  let ee = 0
  const eParts = out.ex.map((k, i) => {
    ee += out.exInv[i] ? -k : k
    return i === 0 ? (out.exInv[i] ? `-${k < 0 ? `(${k})` : k}` : `${k}`) : `${out.exInv[i] ? '-' : '+'} ${k < 0 ? `(${k})` : k}`
  })
  steps.push({ tex: `= ${decT(mm)} \\cdot 10^{${eParts.join(' ') || '0'}}`, note: 'Zehnerpotenzen: beim Malnehmen Hochzahlen addieren, beim Teilen subtrahieren.', head: 'Ausrechnen' })
  if (out.ex.length > 1 || out.exInv.some(Boolean)) steps.push({ tex: `= ${decT(mm)} \\cdot 10^{${ee}}` })
  const value = mul(mm, qpow(TEN, ee))
  const s = normSci(value)
  if (!isZero(value) && s.e !== ee) {
    const ms = normSci(mm)
    steps.push({ tex: `= ${sciT(ms)} \\cdot 10^{${ee}}`, note: `Die Zahl vor der Zehnerpotenz muss zwischen 1 und 10 liegen: $${decT(mm)} = ${sciT(ms)}$.`, head: 'Normieren' })
    steps.push({ tex: `= ${sciT(s)}`, note: 'Hochzahlen addieren.' })
  }
  steps[steps.length - 1].final = true
  const extra = Math.abs(s.e) <= 9 ? [`= ${decT(value)}`] : undefined
  return { result: isZero(value) ? '0' : sciT(s), steps, extra }
}

export { bgcd }
