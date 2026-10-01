import type { Rng } from '../../lib/random'
import { bestUnit, COMPOUNDS, ELEMENTS, formulaTex, MASS_UNITS, molarMass, molarMassTex, MOL_UNITS, NA, parseFormula, type Compound } from '../chem'
import { fmt, round, tn, tsci } from '../num'
import type { GenInfo, Level, Problem, Step } from '../types'
import { int, pick } from './util'

const sig = (v: number, s = 4) => {
  if (v === 0) return 0
  const e = Math.floor(Math.log10(Math.abs(v)))
  return round(v, Math.max(0, s - 1 - e))
}
const tv = (v: number, s = 4) => tn(sig(v, s), 10)
const T = (u: string) => `\\,\\text{${u}}`

function mStep(c: Compound): { M: number; step: Step } {
  const counts = parseFormula(c.f)
  const M = molarMass(counts)
  return {
    M,
    step: {
      tex: `M(${formulaTex(c.f)}) = ${molarMassTex(counts)} = ${tn(M, 2)}${T('g/mol')}`,
      note: 'Molare Masse: Atommassen aus dem Periodensystem mal Anzahl der Atome, alles addieren.',
    },
  }
}

function convStep(v: number, u: string, f: number, base: string): Step | null {
  if (f === 1) return null
  return { tex: `${tv(v)}${T(u)} = ${tsci(v * f, 4)}${T(base)}`, note: `Umrechnen in ${base}: ${u === 'kg' ? '1 kg = 1000 g' : `1 ${u} = ${tsci(f)} ${base}`}.` }
}

/** n aus m:  n = m / M */
export function nAusM(c: Compound, m: number, mu: string, outUnit?: string): Problem {
  const { M, step } = mStep(c)
  const f = MASS_UNITS.find((x) => x.u === mu)!.f
  const n = (m * f) / M
  const out = (outUnit && MOL_UNITS.find((x) => x.u === outUnit)) || bestUnit(n, MOL_UNITS)
  const steps = [step]
  const cs = convStep(m, mu, f, 'g')
  if (cs) steps.push(cs)
  steps.push({ tex: `n = \\frac{m}{M} = \\frac{${tsci(m * f)}${T('g')}}{${tn(M, 2)}${T('g/mol')}} = ${tsci(n)}${T('mol')}${out.u !== 'mol' ? ` = ${tv(n / out.f)}${T(out.u)}` : ''}`, note: 'Die Einheit g kürzt sich weg, übrig bleibt mol.' })
  return {
    prompt: `Wie groß ist die Stoffmenge von ${fmt(m)} ${mu} ${c.name} ($${formulaTex(c.f)}$)? Gib das Ergebnis in ${out.u} an.`,
    answer: { kind: 'num', value: n / out.f, label: 'n =', unit: out.u, rel: 0.01 },
    steps,
    hint: '$n = \\frac{m}{M}$ – Masse in Gramm einsetzen.',
  }
}

/** m aus n:  m = n · M */
export function mAusN(c: Compound, n: number, nu: string, outUnit?: string): Problem {
  const { M, step } = mStep(c)
  const f = MOL_UNITS.find((x) => x.u === nu)!.f
  const m = n * f * M
  const out = (outUnit && MASS_UNITS.find((x) => x.u === outUnit)) || bestUnit(m, MASS_UNITS)
  const steps = [step]
  const cs = convStep(n, nu, f, 'mol')
  if (cs) steps.push(cs)
  steps.push({ tex: `m = n \\cdot M = ${tsci(n * f)}${T('mol')} \\cdot ${tn(M, 2)}${T('g/mol')} = ${tsci(m)}${T('g')}${out.u !== 'g' ? ` = ${tv(m / out.f)}${T(out.u)}` : ''}`, note: 'mol kürzt sich weg, übrig bleibt g.' })
  return {
    prompt: `Welche Masse haben ${fmt(n)} ${nu} ${c.name} ($${formulaTex(c.f)}$)? Gib das Ergebnis in ${out.u} an.`,
    answer: { kind: 'num', value: m / out.f, label: 'm =', unit: out.u, rel: 0.01 },
    steps,
    hint: '$m = n \\cdot M$',
  }
}

/** Teilchenzahl aus n oder m */
export function teilchen(c: Compound, amount: number, unit: string, fromMass: boolean): Problem {
  const steps: Step[] = []
  let n: number
  if (fromMass) {
    const { M, step } = mStep(c)
    const f = MASS_UNITS.find((x) => x.u === unit)!.f
    n = (amount * f) / M
    steps.push(step, { tex: `n = \\frac{m}{M} = \\frac{${tsci(amount * f)}${T('g')}}{${tn(M, 2)}${T('g/mol')}} = ${tsci(n)}${T('mol')}` })
  } else {
    const f = MOL_UNITS.find((x) => x.u === unit)!.f
    n = amount * f
    const cs = convStep(amount, unit, f, 'mol')
    if (cs) steps.push(cs)
  }
  const N = n * NA
  steps.push({ tex: `N = n \\cdot N_A = ${tsci(n)}${T('mol')} \\cdot 6{,}022 \\cdot 10^{23}\\,\\text{mol}^{-1} = ${tsci(N)}`, note: 'Avogadro-Konstante: 1 mol enthält $6{,}022 \\cdot 10^{23}$ Teilchen.' })
  return {
    prompt: `Wie viele Teilchen sind in ${fmt(amount)} ${unit} ${c.name} ($${formulaTex(c.f)}$) enthalten?`,
    answer: { kind: 'num', value: N, label: 'N =', rel: 0.01 },
    steps,
    hint: '$N = n \\cdot N_A$ mit $N_A = 6{,}022 \\cdot 10^{23}\\,\\text{mol}^{-1}$. Eingabe z. B. 1,8·10^21',
  }
}

/** Atome eines Elements in einer Masse der Verbindung */
export function atomeInMasse(c: Compound, el: string, m: number, mu: string): Problem {
  const counts = parseFormula(c.f)
  const k = counts.find((x) => x.el === el)!.n
  const { M, step } = mStep(c)
  const f = MASS_UNITS.find((x) => x.u === mu)!.f
  const n = (m * f) / M
  const N = n * NA * k
  return {
    prompt: `Wie viele ${ELEMENTS[el].name}atome sind in ${fmt(m)} ${mu} ${c.name} ($${formulaTex(c.f)}$) enthalten?`,
    answer: { kind: 'num', value: N, label: `N_{${el}} =`, rel: 0.01 },
    steps: [
      step,
      { tex: `n = \\frac{m}{M} = \\frac{${tsci(m * f)}${T('g')}}{${tn(M, 2)}${T('g/mol')}} = ${tsci(n)}${T('mol')}` },
      { tex: `N = n \\cdot N_A = ${tsci(n * NA)}\\ \\text{Formeleinheiten}` },
      { tex: `N_{${el}} = ${k} \\cdot ${tsci(n * NA)} = ${tsci(N)}`, note: `In jeder Formeleinheit stecken ${k} ${el}-Atom${k === 1 ? '' : 'e'}.` },
    ],
    hint: 'Erst die Formeleinheiten zählen, dann mit der Anzahl der Atome pro Formel multiplizieren.',
  }
}

/** Molare Masse aus m und n; optional Stoff bestimmen */
export function molAusMN(m: number, mu: string, n: number, nu: string, identify?: string): Problem {
  const fm = MASS_UNITS.find((x) => x.u === mu)!.f
  const fn = MOL_UNITS.find((x) => x.u === nu)!.f
  const M = (m * fm) / (n * fn)
  const steps: Step[] = [
    { tex: `M = \\frac{m}{n} = \\frac{${tsci(m * fm)}${T('g')}}{${tsci(n * fn)}${T('mol')}} = ${tv(M)}${T('g/mol')}`, note: 'Beide Größen in g bzw. mol umrechnen, dann teilen.' },
  ]
  if (identify) {
    const opts = Object.entries(ELEMENTS)
      .map(([sym, e]) => ({ sym, e, d: Math.abs(e.m - M) }))
      .sort((a, b) => a.d - b.d)
    const best = opts[0]
    steps.push({ tex: `M(\\mathrm{${best.sym}}) = ${tn(best.e.m, 2)}${T('g/mol')}`, note: `Im Periodensystem nachsehen: Das passt zu ${best.e.name}.` })
    const choices = [best, ...opts.slice(1, 4)].sort(() => 0.5 - Math.random())
    return {
      prompt: `${fmt(n)} ${nu} eines Elements haben eine Masse von ${fmt(m)} ${mu}. Um welches Element handelt es sich?`,
      answer: { kind: 'choice', options: choices.map((c) => `${c.e.name} (${c.sym})`), correct: choices.indexOf(best) },
      steps,
      hint: 'Erst $M = m/n$ berechnen, dann im Periodensystem suchen.',
    }
  }
  return {
    prompt: `${fmt(m)} ${mu} eines Stoffes entsprechen ${fmt(n)} ${nu}. Welche molare Masse hat der Stoff?`,
    answer: { kind: 'num', value: M, label: 'M =', unit: 'g/mol', rel: 0.005 },
    steps,
    hint: '$M = \\frac{m}{n}$',
  }
}

/** Masse eines einzelnen Teilchens bzw. weniger Teilchen */
export function teilchenMasse(c: Compound | { f: string; name: string }, k: number): Problem {
  const { M, step } = mStep(c)
  const m = (k * M) / NA
  return {
    prompt: `Wie viel Gramm ${k === 1 ? 'wiegt ein' : `wiegen ${k}`} ${c.name} ($${formulaTex(c.f)}$)?`,
    answer: { kind: 'num', value: m, label: 'm =', unit: 'g', rel: 0.01 },
    steps: [
      step,
      { tex: `m_{\\text{Teilchen}} = \\frac{M}{N_A} = \\frac{${tn(M, 2)}${T('g/mol')}}{6{,}022 \\cdot 10^{23}\\,\\text{mol}^{-1}} = ${tsci(M / NA)}${T('g')}`, note: 'Masse eines Teilchens: molare Masse geteilt durch die Teilchenzahl pro Mol.' },
      ...(k > 1 ? [{ tex: `${k} \\cdot ${tsci(M / NA)}${T('g')} = ${tsci(m)}${T('g')}` }] : []),
    ],
    hint: '$m = \\frac{M}{N_A}$ für ein Teilchen.',
  }
}

/** Atom-% und Massen-% aller Elemente einer Verbindung */
export function prozentVerbindung(c: Compound, mode: 'masse' | 'atom'): Problem {
  const counts = parseFormula(c.f)
  const M = molarMass(counts)
  const atoms = counts.reduce((s, x) => s + x.n, 0)
  const vals = counts.map((x) => (mode === 'masse' ? ((x.n * ELEMENTS[x.el].m) / M) * 100 : (x.n / atoms) * 100))
  const steps: Step[] =
    mode === 'masse'
      ? [
          { tex: `M(${formulaTex(c.f)}) = ${molarMassTex(counts)} = ${tn(M, 2)}${T('g/mol')}` },
          ...counts.map((x, i) => ({
            tex: `w(\\mathrm{${x.el}}) = \\frac{${x.n === 1 ? '' : x.n + ' \\cdot '}${tn(ELEMENTS[x.el].m, 2)}}{${tn(M, 2)}} \\cdot 100\\,\\% = ${tn(vals[i], 2)}\\,\\%`,
          })),
          { tex: `\\text{Probe: } ${vals.map((v) => tn(v, 2)).join(' + ')} \\approx 100\\,\\%`, note: 'Die Massenanteile müssen zusammen 100 % ergeben.' },
        ]
      : [
          { tex: `\\text{Atome pro Formel: } ${counts.map((x) => x.n).join(' + ')} = ${atoms}`, note: 'Atom-% zählt nur die Anzahl der Atome – die Masse spielt keine Rolle.' },
          ...counts.map((x, i) => ({ tex: `\\mathrm{${x.el}}: \\frac{${x.n}}{${atoms}} \\cdot 100\\,\\% = ${tn(vals[i], 2)}\\,\\%` })),
        ]
  return {
    prompt: `Berechne die ${mode === 'masse' ? 'Massenprozente' : 'Atomprozente'} aller Elemente in ${c.name} ($${formulaTex(c.f)}$).`,
    answer: { kind: 'nums', values: vals, labels: counts.map((x) => x.el), ordered: true, tol: 0.06, units: counts.map(() => '%') },
    steps,
    hint: mode === 'masse' ? 'Massenanteil = Masse des Elements in der Formel / molare Masse · 100 %' : 'Atom-% = Anzahl der Atome des Elements / Gesamtzahl der Atome · 100 %',
  }
}

/** Lösung ansetzen: m = c · V · M */
export function loesungAnsetzen(c: Compound, conc: number, V: number): Problem {
  const { M, step } = mStep(c)
  const Vl = V / 1000
  const n = conc * Vl
  const m = n * M
  return {
    prompt: `Du sollst ${fmt(V)} mL ${c.name}-Lösung ($${formulaTex(c.f)}$) mit $c = ${tn(conc, 3)}\\,\\text{mol/L}$ ansetzen. Wie viel Gramm musst du einwiegen?`,
    answer: { kind: 'num', value: m, label: 'm =', unit: 'g', rel: 0.01 },
    steps: [
      step,
      { tex: `V = ${fmt(V)}${T('mL')} = ${tn(Vl, 4)}${T('L')}`, note: 'Volumen in Liter umrechnen.' },
      { tex: `n = c \\cdot V = ${tn(conc, 3)}${T('mol/L')} \\cdot ${tn(Vl, 4)}${T('L')} = ${tv(n)}${T('mol')}`, note: 'So viel Stoff muss in die Lösung.' },
      { tex: `m = n \\cdot M = ${tv(n)}${T('mol')} \\cdot ${tn(M, 2)}${T('g/mol')} = ${tv(m)}${T('g')}`, note: 'Einwiegen, im Messkolben lösen und bis zur Marke auffüllen.' },
    ],
    hint: '$m = c \\cdot V \\cdot M$ – Volumen in Liter.',
  }
}

/** Stoffmengenkonzentration: c = n / V mit n = m / M */
export function konzentration(c: Compound, m: number, V: number): Problem {
  const { M, step } = mStep(c)
  const n = m / M
  const Vl = V / 1000
  const conc = n / Vl
  return {
    prompt: `${fmt(m)} g ${c.name} ($${formulaTex(c.f)}$) werden gelöst und im Messkolben auf ${fmt(V)} mL aufgefüllt. Berechne die Konzentration $c$.`,
    answer: { kind: 'num', value: conc, label: 'c =', unit: 'mol/L', rel: 0.01 },
    steps: [
      step,
      { tex: `n = \\frac{m}{M} = \\frac{${tn(m, 3)}${T('g')}}{${tn(M, 2)}${T('g/mol')}} = ${tv(n)}${T('mol')}` },
      { tex: `c = \\frac{n}{V} = \\frac{${tv(n)}${T('mol')}}{${tn(Vl, 4)}${T('L')}} = ${tv(conc)}${T('mol/L')}`, note: 'Volumen in Liter einsetzen.' },
    ],
    hint: 'Erst $n = m/M$, dann $c = n/V$ mit $V$ in Liter.',
  }
}

const SOLUBLE = ['NaCl', 'NaOH', 'KCl', 'KNO3', 'CuSO4', 'KMnO4', 'C6H12O6', 'AgNO3', 'MgSO4', 'Na2SO4', 'Na2CO3', 'MgCl2'].map((f) => COMPOUNDS.find((c) => c.f === f)!)

function loesungGen(rng: Rng, level: Level): Problem {
  const c = pick(rng, SOLUBLE)
  const conc = pick(rng, level === 1 ? [0.1, 0.5, 1, 2] : [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2])
  const V = pick(rng, level === 1 ? [100, 250, 500, 1000] : [50, 100, 200, 250, 500, 1000])
  if (level === 1 || rng() < 0.5) return loesungAnsetzen(c, conc, V)
  const m = round(conc * (V / 1000) * molarMass(parseFormula(c.f)), 2)
  return konzentration(c, m, V)
}

/* ---------------------------- Zufallsaufgaben ---------------------------- */

function amount(rng: Rng) {
  const mant = pick(rng, [1.25, 2, 2.3, 3, 4.5, 7.5, 12, 15, 21, 25, 30, 37, 50, 75, 130, 250, 750])
  return mant
}

function gen(rng: Rng, level: Level): Problem {
  const c = pick(rng, COMPOUNDS)
  const kind = level === 1 ? int(rng, 0, 1) : level === 2 ? int(rng, 0, 4) : int(rng, 2, 7)
  switch (kind) {
    case 0:
      return nAusM(c, amount(rng), pick(rng, ['g', 'mg', 'kg', 'µg']))
    case 1:
      return mAusN(c, amount(rng) / pick(rng, [1, 10, 100]), pick(rng, ['mol', 'mmol', 'µmol']))
    case 2:
      return teilchen(c, amount(rng), pick(rng, ['mmol', 'mol', 'µmol']), false)
    case 3:
      return teilchen(c, amount(rng), pick(rng, ['mg', 'g']), true)
    case 4: {
      const M = molarMass(parseFormula(c.f))
      const n = pick(rng, [50, 125, 200, 250, 400, 500])
      return molAusMN(round((n / 1000) * M, 3), 'g', n, 'mmol')
    }
    case 5: {
      const syms = ['Cu', 'Fe', 'Zn', 'Ag', 'Hg', 'Pb', 'I', 'Ba', 'Sn', 'Au', 'Ca', 'Mg']
      const sym = pick(rng, syms)
      const n = pick(rng, [50, 125, 200, 250, 400])
      return molAusMN(round((n / 1000) * ELEMENTS[sym].m, 2), 'mg', n, 'µmol', sym)
    }
    case 6: {
      const counts = parseFormula(c.f)
      const el = pick(rng, counts).el
      return atomeInMasse(c, el, amount(rng), pick(rng, ['g', 'mg']))
    }
    default:
      return prozentVerbindung(c.f.length > 3 ? c : COMPOUNDS[6], rng() < 0.5 ? 'masse' : 'atom')
  }
}

export const STOFF_GENS: GenInfo[] = [
  { id: 'stoffmenge', title: 'Gemischte Aufgaben', gen },
  { id: 'n-m', title: 'Stoffmenge ↔ Masse', gen: (rng) => (rng() < 0.5 ? gen(rng, 1) : mAusN(pick(rng, COMPOUNDS), amount(rng) / 10, pick(rng, ['mol', 'mmol']))) },
  {
    id: 'teilchen',
    title: 'Teilchenzahl',
    gen: (rng) => {
      const fromMass = rng() < 0.5
      return teilchen(pick(rng, COMPOUNDS), amount(rng), fromMass ? pick(rng, ['mg', 'g']) : pick(rng, ['mmol', 'mol', 'µmol']), fromMass)
    },
  },
  { id: 'prozent-verb', title: 'Atom-% & Massen-%', gen: (rng) => prozentVerbindung(pick(rng, COMPOUNDS.filter((c) => parseFormula(c.f).length >= 2)), rng() < 0.6 ? 'masse' : 'atom') },
  { id: 'loesung', title: 'Lösungen & Konzentration', gen: loesungGen },
]
