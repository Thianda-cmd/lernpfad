import katex from 'katex'
import { mulberry32 } from '../src/lib/random'
import { check } from '../src/math/check'
import { KLAMMER_GENS } from '../src/math/gen/klammern'
import { AUSMULT_GENS } from '../src/math/gen/ausmultiplizieren'
import { GLEICHUNG_GENS } from '../src/math/gen/gleichungen'
import { TEXT_GENS } from '../src/math/gen/textaufgaben'
import { BRUCH_GENS } from '../src/math/gen/brueche'
import { POTENZ_GENS } from '../src/math/gen/potenzen'
import { FORMEL_GENS } from '../src/math/gen/formeln'
import { PROZENT_GENS } from '../src/math/gen/prozent'
import { STOFF_GENS } from '../src/math/gen/stoffmenge'
import { LGS_GENS } from '../src/math/gen/lgs'
import { LGSTEXT_GENS } from '../src/math/gen/lgstext'
import { PQ_GENS } from '../src/math/gen/pq'
import { GERADEN_GENS } from '../src/math/gen/geraden'
import type { Answer, Level, Problem } from '../src/math/types'

const ALL = [...KLAMMER_GENS, ...AUSMULT_GENS, ...GLEICHUNG_GENS, ...TEXT_GENS, ...BRUCH_GENS, ...POTENZ_GENS, ...FORMEL_GENS, ...PROZENT_GENS, ...STOFF_GENS, ...LGS_GENS, ...LGSTEXT_GENS, ...PQ_GENS, ...GERADEN_GENS]

function selfInput(a: Answer) {
  switch (a.kind) {
    case 'expr':
    case 'factor':
      return { text: [a.value] }
    case 'num': {
      if (!a.sciForm) return { text: [String(a.value)] }
      const e = Math.floor(Math.log10(Math.abs(a.value)))
      return { text: [`${+(a.value / 10 ** e).toPrecision(10)}*10^(${e})`] }
    }
    case 'nums':
      return a.values.length ? { text: a.values.map(String) } : { text: [], none: true }
    case 'ineq':
      return { text: [a.value], rel: a.rel }
    case 'choice':
      return { text: [], choice: a.correct }
  }
}

function texOk(s: string, where: string, errs: string[]) {
  try {
    katex.renderToString(s, { throwOnError: true, strict: 'ignore' })
  } catch (e) {
    errs.push(`${where}: ${(e as Error).message.slice(0, 140)}  ::  ${s.slice(0, 160)}`)
  }
}

function richOk(s: string, where: string, errs: string[]) {
  const re = /\$([^$]+)\$/g
  let m
  while ((m = re.exec(s))) texOk(m[1], where, errs)
}

let total = 0
const errs: string[] = []
for (const g of ALL) {
  for (const level of [1, 2, 3] as Level[]) {
    for (let i = 0; i < 150; i++) {
      const rng = mulberry32(i * 7919 + level * 131 + g.id.length)
      let p: Problem
      try {
        p = g.gen(rng, level)
      } catch (e) {
        errs.push(`${g.id} L${level} #${i}: THROW ${(e as Error).message}`)
        continue
      }
      total++
      const r = check(p.answer, selfInput(p.answer))
      if (!r.ok) errs.push(`${g.id} L${level} #${i}: self-check failed (${r.msg ?? ''}) ${JSON.stringify(p.answer).slice(0, 200)}`)
      if (p.answer.kind === 'num' && !Number.isFinite(p.answer.value)) errs.push(`${g.id}: NaN answer`)
      if (p.answer.kind === 'nums' && p.answer.values.some((v) => !Number.isFinite(v))) errs.push(`${g.id}: NaN answers`)
      if (p.tex) texOk(p.tex, `${g.id} tex`, errs)
      richOk(p.prompt, `${g.id} prompt`, errs)
      if (p.hint) richOk(p.hint, `${g.id} hint`, errs)
      for (const s of p.steps) {
        texOk(s.tex, `${g.id} step`, errs)
        if (s.op) texOk(s.op, `${g.id} op`, errs)
        if (s.note) richOk(s.note, `${g.id} note`, errs)
        if (/NaN|undefined|Infinity/.test(s.tex + (s.note ?? '') + (s.op ?? ''))) errs.push(`${g.id} L${level}: bad token in step ${s.tex}`)
      }
      if (/NaN|undefined|Infinity/.test(p.prompt + (p.tex ?? ''))) errs.push(`${g.id} L${level}: bad token in prompt ${p.prompt} ${p.tex}`)
    }
  }
}
const uniq = [...new Set(errs)]
console.log(`Aufgaben: ${total}, Fehler: ${errs.length} (${uniq.length} verschiedene)`)
const byKey = new Map<string, string[]>()
for (const e of uniq) { const k = e.split(':')[0] + ' | ' + e.split(':').slice(1).join(':').replace(/#\d+/g, '').slice(0, 60); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k)!.push(e) }
for (const [k, v] of byKey) console.log(v.length + 'x  ' + v[0].slice(0, 400))

// Gezielte Prüfungen für Ausklammern, Zehnerpotenzen und Kürzen
const fa: Answer = { kind: 'factor', value: '6*a*(2*x-3*y+1)', factor: '6*a', vars: ['a', 'x', 'y'] }
const sci: Answer = { kind: 'num', value: 3.4e-4, rel: 1e-9, sciForm: true }
const red: Answer = { kind: 'num', value: 2 / 3, reduced: true, rel: 1e-9 }
const cases: [Answer, string, 'ok' | 'invalid' | 'wrong'][] = [
  [fa, '6a(2x - 3y + 1)', 'ok'],
  [fa, '-6a(-2x + 3y - 1)', 'ok'],
  [fa, '(2x-3y+1)·6a', 'ok'],
  [fa, '3a(4x - 6y + 2)', 'invalid'],
  [fa, '6(2ax - 3ay + a)', 'invalid'],
  [fa, '12ax - 18ay + 6a', 'invalid'],
  [fa, '6a(2x - 3y)', 'wrong'],
  [sci, '3,4·10^-4', 'ok'],
  [sci, '3.4e-4', 'ok'],
  [sci, '0,00034', 'invalid'],
  [sci, '34·10^-5', 'invalid'],
  [red, '2/3', 'ok'],
  [red, '4/6', 'invalid'],
  [red, '3/4', 'wrong'],
]
for (const [a, txt, want] of cases) {
  const r = check(a, { text: [txt] })
  const got = r.ok ? 'ok' : r.invalid ? 'invalid' : 'wrong'
  if (got !== want) console.log(`CHECK FEHLER: "${txt}" → ${got}, erwartet ${want} (${r.msg ?? ''})`)
}
console.log(`Gezielte Prüfungen: ${cases.length}`)