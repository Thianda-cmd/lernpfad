import { countTerms, equivalent, evaluate, hasGroup, hasRoot, occurrences, parse, tryParse, variables, type Node } from './expr'
import { fmt, gcd } from './num'
import type { Answer } from './types'

export interface CheckResult {
  ok: boolean
  /** Hinweis bei richtigen, aber noch nicht fertigen Antworten oder bei Eingabefehlern */
  msg?: string
  /** Eingabe war nicht lesbar – nicht als Fehlversuch werten */
  invalid?: boolean
}

export type UserInput = { text: string[]; none?: boolean; rel?: string; choice?: number }

function readNumber(src: string): { v?: number; node?: Node; err?: string } {
  const s = src.trim()
  if (!s) return { err: 'Bitte eine Zahl eingeben.' }
  const r = tryParse(s, { sci: true })
  if (!r.node) return { err: r.error }
  if (variables(r.node).size) return { err: 'Hier ist eine Zahl gefragt – ohne Variablen.' }
  const v = evaluate(r.node)
  if (!Number.isFinite(v)) return { err: 'Das ergibt keine gültige Zahl.' }
  return { v, node: r.node }
}

function close(a: number, b: number, tol?: number, rel?: number) {
  const t = Math.max(tol ?? 0, (rel ?? 1e-9) * Math.abs(b), 1e-9)
  return Math.abs(a - b) <= t
}

/** Nicht gekürzter Bruch in der Eingabe? */
function unreduced(n: Node): [number, number] | null {
  const strip = (x: Node): Node => (x.t === 'group' ? strip(x.a) : x)
  let node = strip(n)
  if (node.t === 'neg') node = strip(node.a)
  if (node.t !== 'div') return null
  const a = strip(node.a)
  const b = strip(node.b)
  if (a.t !== 'num' || b.t !== 'num') return null
  if (!Number.isInteger(a.v) || !Number.isInteger(b.v)) return null
  return gcd(a.v, b.v) > 1 ? [a.v, b.v] : null
}

/** Zahlen im Term, ohne Hochzahlen */
function coefficients(n: Node, out: number[] = []): number[] {
  switch (n.t) {
    case 'num':
      out.push(n.v)
      break
    case 'var':
      break
    case 'pow':
      coefficients(n.a, out)
      break
    case 'neg':
    case 'group':
    case 'root':
      coefficients(n.a, out)
      break
    default:
      coefficients(n.a, out)
      coefficients(n.b, out)
  }
  return out
}

/** Faktoren eines Produkts auf oberster Ebene (Vorzeichen wird ignoriert) */
function factorsOf(n: Node): Node[] {
  if (n.t === 'neg') return factorsOf(n.a)
  if (n.t === 'mul') return [...factorsOf(n.a), ...factorsOf(n.b)]
  return [n]
}

export function check(ans: Answer, input: UserInput): CheckResult {
  switch (ans.kind) {
    case 'num': {
      const r = readNumber(input.text[0] ?? '')
      if (r.err) return { ok: false, invalid: true, msg: r.err }
      const ok = close(r.v!, ans.value, ans.tol, ans.rel)
      if (!ok && ans.fraction && Math.abs(r.v! - ans.value) <= 0.006 * Math.max(1, Math.abs(ans.value)))
        return { ok: false, invalid: true, msg: 'Fast – das ist ein gerundeter Wert. Gib das exakte Ergebnis als Bruch an, z. B. 53/120.' }
      if (ok && (ans.fraction || ans.reduced) && r.node) {
        const u = unreduced(r.node)
        if (u) {
          const g = gcd(u[0], u[1])
          if (ans.reduced) return { ok: false, invalid: true, msg: `Der Wert stimmt – aber du kannst noch mit ${g} kürzen.` }
          return { ok: true, msg: `Richtig – kürze noch mit ${g}: ${u[0] / g}/${u[1] / g}` }
        }
      }
      if (ok && ans.sciForm) {
        const m = /^\s*([+\-−]?\d+(?:[.,]\d+)?)\s*(?:[·*×x]\s*10\s*\^|e)/i.exec(input.text[0] ?? '')
        if (!m) return { ok: false, invalid: true, msg: 'Der Wert stimmt – schreibe ihn als a · 10^n, z. B. 3,4·10^-4.' }
        const a = Math.abs(parseFloat(m[1].replace(',', '.').replace('−', '-')))
        if (a < 1 || a >= 10) return { ok: false, invalid: true, msg: 'Der Wert stimmt – die Zahl vor 10^n muss zwischen 1 und 10 liegen.' }
      }
      return { ok }
    }
    case 'nums': {
      if (ans.allowNone && input.none) return { ok: ans.values.length === 0 }
      const vals: number[] = []
      for (let i = 0; i < ans.labels.length; i++) {
        const t = (input.text[i] ?? '').trim()
        if (!t) {
          if (ans.ordered) return { ok: false, invalid: true, msg: `Bitte ${ans.labels[i]} eingeben.` }
          continue
        }
        const r = readNumber(t)
        if (r.err) return { ok: false, invalid: true, msg: `${ans.labels[i]}: ${r.err}` }
        vals.push(r.v!)
      }
      if (ans.ordered) return { ok: ans.values.every((v, i) => close(vals[i], v, ans.tol, ans.rel)) }
      if (!vals.length) return { ok: false, invalid: true, msg: ans.allowNone ? 'Lösungen eingeben oder „keine Lösung“ wählen.' : 'Bitte Lösungen eingeben.' }
      if (ans.values.length === 0) return { ok: false }
      const want = [...new Set(ans.values.map((v) => Math.round(v * 1e6) / 1e6))]
      const got = [...new Set(vals.map((v) => Math.round(v * 1e6) / 1e6))]
      const allHit = want.every((w) => got.some((g) => close(g, w, ans.tol, ans.rel)))
      const noExtra = got.every((g) => want.some((w) => close(g, w, ans.tol, ans.rel)))
      return { ok: allHit && noExtra, msg: !allHit && noExtra ? 'Eine Lösung fehlt noch.' : undefined }
    }
    case 'expr': {
      const src = (input.text[0] ?? '').trim()
      if (!src) return { ok: false, invalid: true, msg: 'Bitte einen Term eingeben.' }
      const r = tryParse(src)
      if (!r.node) return { ok: false, invalid: true, msg: r.error }
      const unknown = [...variables(r.node)].filter((v) => !ans.vars.includes(v))
      if (unknown.length) return { ok: false, invalid: true, msg: `Unbekannte Variable: ${unknown.join(', ')}` }
      const target = parse(ans.value)
      const eq = equivalent(r.node, target, ans.vars, { ranges: ans.ranges })
      if (!eq) return { ok: false }
      if (ans.noGroups && hasGroup(r.node)) return { ok: false, invalid: true, msg: 'Der Wert stimmt – aber löse die Klammern noch vollständig auf.' }
      if (ans.maxTerms !== undefined && countTerms(r.node) > ans.maxTerms)
        return { ok: false, invalid: true, msg: 'Der Wert stimmt – fasse gleichartige Terme noch zusammen.' }
      if (ans.singleUse) {
        const occ = occurrences(r.node)
        if (Object.values(occ).some((n) => n > 1)) return { ok: false, invalid: true, msg: 'Der Wert stimmt – fasse die Potenzen noch zusammen.' }
      }
      if (ans.noRoot && hasRoot(r.node)) return { ok: false, invalid: true, msg: 'Der Wert stimmt – schreibe das Ergebnis als Potenz (ohne Wurzelzeichen).' }
      if (ans.reduced) {
        const ns = coefficients(r.node).filter((v) => Number.isInteger(v) && v > 1)
        if (ns.length >= 2 && ns.reduce((a, b) => gcd(a, b)) > 1) return { ok: false, invalid: true, msg: 'Der Wert stimmt – kürze noch vollständig.' }
      }
      return { ok: true }
    }
    case 'factor': {
      const src = (input.text[0] ?? '').trim()
      if (!src) return { ok: false, invalid: true, msg: 'Bitte die ausgeklammerte Form eingeben.' }
      const r = tryParse(src)
      if (!r.node) return { ok: false, invalid: true, msg: r.error }
      const unknown = [...variables(r.node)].filter((v) => !ans.vars.includes(v))
      if (unknown.length) return { ok: false, invalid: true, msg: `Unbekannte Variable: ${unknown.join(', ')}` }
      if (!equivalent(r.node, parse(ans.value), ans.vars)) return { ok: false }
      const fs = factorsOf(r.node)
      const groups = fs.filter((x) => x.t === 'group')
      if (!groups.length) return { ok: false, invalid: true, msg: 'Der Wert stimmt – aber es ist noch nichts ausgeklammert. Form: Faktor · (…)' }
      const rest = fs.filter((x) => x.t !== 'group')
      const prod: Node = rest.length ? rest.reduce((a, b) => ({ t: 'mul', a, b, implicit: false })) : { t: 'num', v: 1, raw: '1' }
      const want = parse(ans.factor)
      const minus: Node = { t: 'neg', a: want }
      if (!equivalent(prod, want, ans.vars) && !equivalent(prod, minus, ans.vars))
        return { ok: false, invalid: true, msg: 'Richtig umgeformt – es lässt sich aber noch mehr ausklammern (größter gemeinsamer Faktor).' }
      return { ok: true }
    }
    case 'ineq': {
      if (!input.rel) return { ok: false, invalid: true, msg: 'Bitte das Relationszeichen wählen.' }
      const src = (input.text[0] ?? '').trim()
      if (!src) return { ok: false, invalid: true, msg: 'Bitte die Grenze eingeben.' }
      const r = tryParse(src)
      if (!r.node) return { ok: false, invalid: true, msg: r.error }
      const unknown = [...variables(r.node)].filter((v) => !ans.vars.includes(v))
      if (unknown.length) return { ok: false, invalid: true, msg: `Unbekannte Variable: ${unknown.join(', ')}` }
      const eq = ans.vars.length ? equivalent(r.node, parse(ans.value), ans.vars) : close(evaluate(r.node), evaluate(parse(ans.value)))
      if (eq && input.rel !== ans.rel) return { ok: false, msg: 'Die Grenze stimmt, aber das Relationszeichen nicht – wurde durch eine negative Zahl geteilt?' }
      return { ok: eq }
    }
    case 'choice':
      return { ok: input.choice === ans.correct }
  }
}

/** Kurzform der richtigen Antwort als Text (für Übersichten). */
export function answerText(ans: Answer): string {
  switch (ans.kind) {
    case 'num':
      return `${ans.label ? ans.label + ' ' : ''}${fmt(ans.value)}${ans.unit ? ' ' + ans.unit : ''}`
    case 'nums':
      return ans.values.length ? ans.labels.map((l, i) => `${l} = ${fmt(ans.values[i] ?? ans.values[0])}`).join(', ') : 'keine Lösung'
    case 'expr':
    case 'factor':
      return ans.value
    case 'ineq':
      return `${ans.variable} ${ans.rel} ${ans.value}`
    case 'choice':
      return ans.options[ans.correct]
  }
}
