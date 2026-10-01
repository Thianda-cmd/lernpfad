import katex from 'katex'
import { check } from '../src/math/check'
import { CONTENT } from '../src/math/content'
import { SHEET_TASKS } from '../src/math/content/sheets'
import { buildExam } from '../src/math/content/exams'
import type { Answer, Problem } from '../src/math/types'
import type { Block } from '../src/math/content/types'

const errs: string[] = []
const tex = (s: string, w: string) => {
  try {
    katex.renderToString(s, { throwOnError: true, strict: 'ignore' })
  } catch (e) {
    errs.push(`${w}: ${(e as Error).message.slice(0, 120)} :: ${s.slice(0, 120)}`)
  }
}
const rich = (s: string, w: string) => {
  const re = /\$([^$]+)\$/g
  let m
  while ((m = re.exec(s))) tex(m[1], w)
  if ((s.match(/\$/g) ?? []).length % 2) errs.push(`${w}: ungerade Anzahl $ :: ${s.slice(0, 100)}`)
}
function self(a: Answer) {
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
function prob(p: Problem, w: string) {
  rich(p.prompt, w + ' prompt')
  if (p.tex) tex(p.tex, w + ' tex')
  if (p.hint) rich(p.hint, w + ' hint')
  if (p.sheetNote) rich(p.sheetNote, w + ' sheetNote')
  p.steps.forEach((s, i) => {
    tex(s.tex, `${w} step${i}`)
    if (s.op) tex(s.op, `${w} op${i}`)
    if (s.note) rich(s.note, `${w} note${i}`)
    if (/NaN|undefined|Infinity/.test(s.tex + (s.note ?? ''))) errs.push(`${w}: bad token ${s.tex}`)
  })
  const r = check(p.answer, self(p.answer))
  if (!r.ok) errs.push(`${w}: self-check ${r.msg ?? ''}`)
}
function block(b: Block, w: string) {
  switch (b.k) {
    case 'p':
    case 'merk':
      return rich(b.t, w)
    case 'rules':
      return b.items.forEach((it) => (tex(it.tex, w), it.t && rich(it.t, w)))
    case 'example':
      tex(b.task, w + ' task')
      if (b.prompt) rich(b.prompt, w)
      return b.steps.forEach((s) => (tex(s.tex, w), s.op && tex(s.op, w), s.note && rich(s.note, w)))
    case 'mistake':
      tex(b.wrong, w)
      tex(b.right, w)
      return rich(b.why, w)
    case 'table':
      return [...b.head, ...b.rows.flat()].forEach((c) => rich(c, w))
    case 'try':
      return prob(b.p, w + ' try')
  }
}

for (const c of Object.values(CONTENT)) {
  rich(c.intro, c.id + ' intro')
  c.formulas.forEach((f) => (tex(f.tex, c.id + ' formula'), rich(f.t, c.id)))
  c.sections.forEach((s) => s.blocks.forEach((b, i) => block(b, `${c.id}/${s.id}#${i}`)))
}

for (const [id, tasks] of Object.entries(SHEET_TASKS)) tasks.forEach((t) => prob(t.p, `blatt ${id} ${t.nr}`))

// Erwartete Ergebnisse (von Hand nachgerechnet)
const EXPECT: [string, string, (a: Answer) => boolean][] = [
  ['klammern', '1', (a) => a.kind === 'expr' && a.value.replace(/\s/g, '') === '-67*r+50'],
  ['klammern', '2', (a) => a.kind === 'expr' && a.value === '10*a^2+6*a'],
  ['klammern', '3', (a) => a.kind === 'expr' && a.value === '3.2*p+6.2*q'],
  ['klammern', '4', (a) => a.kind === 'expr' && a.value === '112*a+50*b+17*c'],
  ['klammern', '5', (a) => a.kind === 'expr' && a.value === '-87*u+11*v+11*w'],
  ['klammern', '6', (a) => a.kind === 'expr' && a.value === '7*x^3-22*x^2+19*x'],
  ['klammern', '7', (a) => a.kind === 'expr' && a.value === '3*y'],
  ['klammern', '8', (a) => a.kind === 'num' && a.value === 2],
  ['klammern', '9', (a) => a.kind === 'num' && a.value === 16],
  ['gleichungen', '1', (a) => a.kind === 'num' && a.value === 4],
  ['gleichungen', '2', (a) => a.kind === 'ineq' && a.rel === '>' && a.value === '2'],
  ['gleichungen', '3', (a) => a.kind === 'num' && a.value === 1],
  ['gleichungen', '4', (a) => a.kind === 'ineq' && a.rel === '<' && a.value === '4'],
  ['gleichungen', '5', (a) => a.kind === 'ineq' && a.rel === '<'],
  ['gleichungen', '6', (a) => a.kind === 'ineq' && a.rel === '>'],
  ['gleichungen', '7', (a) => a.kind === 'expr' && a.value === '1*a+1*b'],
  ['brueche', '1', (a) => a.kind === 'num' && Math.abs(a.value - 53 / 120) < 1e-12],
  ['brueche', '2', (a) => a.kind === 'num' && Math.abs(a.value - 1) < 1e-12],
  ['brueche', '4', (a) => a.kind === 'num' && a.value === 6],
  ['brueche', '5', (a) => a.kind === 'num' && Math.abs(a.value - 12 / 5) < 1e-12],
  ['brueche', '6', (a) => a.kind === 'num' && Math.abs(a.value - 9 / 4) < 1e-12],
  ['brueche', '9', (a) => a.kind === 'expr' && a.value === '1'],
  ['wurzeln', '4', (a) => a.kind === 'num' && Math.abs(a.value - 2.7257) < 1e-3],
  ['stoffmenge', '1', (a) => a.kind === 'num' && Math.abs(a.value - 0.557) < 0.002],
  ['stoffmenge', '2', (a) => a.kind === 'num' && Math.abs(a.value - 60.7) < 0.2],
  ['stoffmenge', '3', (a) => a.kind === 'num' && Math.abs(a.value - 4.377) < 0.01],
  ['stoffmenge', '4', (a) => a.kind === 'num' && Math.abs(a.value - 306.66) < 0.5],
  ['stoffmenge', '5', (a) => a.kind === 'num' && Math.abs(a.value / 1.807e21 - 1) < 0.005],
  ['stoffmenge', '6', (a) => a.kind === 'num' && Math.abs(a.value / 1.298e20 - 1) < 0.005],
  ['stoffmenge', '8', (a) => a.kind === 'num' && Math.abs(a.value - 12.489) < 0.02],
  ['stoffmenge', '9', (a) => a.kind === 'num' && Math.abs(a.value - 126.9) < 0.1],
  ['stoffmenge', '11', (a) => a.kind === 'num' && Math.abs(a.value / 1.0553e-22 - 1) < 0.005],
  ['stoffmenge', '12', (a) => a.kind === 'num' && Math.abs(a.value / 8.975e-23 - 1) < 0.005],
  ['stoffmenge', '13', (a) => a.kind === 'num' && Math.abs(a.value - 0.361) < 0.002],
  ['stoffmenge', '14', (a) => a.kind === 'num' && Math.abs(a.value - 3.79) < 0.02],
  ['stoffmenge', '15', (a) => a.kind === 'num' && Math.abs(a.value - 0.3398) < 0.002],
  ['stoffmenge', '16', (a) => a.kind === 'num' && Math.abs(a.value / 2.514e23 - 1) < 0.005],
  ['stoffmenge', '17', (a) => a.kind === 'num' && Math.abs(a.value - 6.843) < 0.01],
  ['stoffmenge', '18', (a) => a.kind === 'num' && Math.abs(a.value / 4.064e20 - 1) < 0.005],
]
for (const [s, nr, f] of EXPECT) {
  const t = SHEET_TASKS[s].find((x) => x.nr === nr)
  if (!t) errs.push(`fehlt: ${s} ${nr}`)
  else if (!f(t.p.answer)) errs.push(`FALSCHES ERGEBNIS ${s} ${nr}: ${JSON.stringify(t.p.answer).slice(0, 160)}`)
}
// Stichprobe Menschen-Eingaben
const human: [string, string, string[]][] = [
  ['klammern', '3', ['3,2p + 6,2q', '6,2q+3,2p']],
  ['klammern', '5', ['−87u + 11v + 11w']],
  ['brueche', '1', ['53/120', '159/360']],
  ['wurzeln', '3', ['a^(13/6)']],
  ['wurzeln', '2', ['x^(-5/4)', 'x^-(5/4)']],
  ['gleichungen', '7', ['a+b', 'b + a']],
  ['stoffmenge', '5', ['1,807·10^21', '1.807e21', '1,807*10^21']],
]
for (const [s, nr, inputs] of human) {
  const t = SHEET_TASKS[s].find((x) => x.nr === nr)!
  for (const i of inputs) {
    const r = check(t.p.answer, { text: [i] })
    if (!r.ok) errs.push(`Eingabe abgelehnt ${s} ${nr}: „${i}“ → ${r.msg ?? 'falsch'}`)
  }
}
const wrong: [string, string, string][] = [
  ['klammern', '3', '3,2p + 6q'],
  ['klammern', '3', '(4p + 2,7q) - (3,2p - 7,1q) - (-2,4p + 3,6q)'],
  ['wurzeln', '2', 'x^(5/4)'],
]
for (const [s, nr, i] of wrong) {
  const t = SHEET_TASKS[s].find((x) => x.nr === nr)!
  if (check(t.p.answer, { text: [i] }).ok) errs.push(`Falsche Eingabe akzeptiert ${s} ${nr}: ${i}`)
}

for (const id of ['lf1t', 'mfh', 'stoff']) for (let s = 1; s < 40; s++) buildExam(id, s * 131).forEach((t, i) => prob(t.p, `exam ${id} #${i}`))

console.log(`Fehler: ${errs.length}`)
console.log([...new Set(errs)].slice(0, 60).join('\n'))
