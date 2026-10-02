/**
 * Prozentrechnung: Grundwert G, Prozentwert W, Prozentsatz p (mit Formel und Dreisatz),
 * Aufschlag/Rabatt (vermehrter bzw. verminderter Grundwert) und Massenanteil von Lösungen.
 */
import { add, approxTex, CalcError, div, isTerminating, isZero, mul, neg, ONE, q, qTex, sign, sub, toNum, type Q } from '../q'
import type { NumIn } from './numinput'
import type { Solution, Step } from './step'

const F = { dec: true }
const HUNDRED = q(100)
const PCT = '\\,\\%'

/** Zahl als TeX: exakt, wenn kurz – sonst gerundet mit „≈“ */
export function show(x: Q, sig = 4): { tex: string; approx: boolean } {
  if (isTerminating(x)) {
    const t = qTex(x, F)
    if (t.replace(/[^0-9]/g, '').length <= 9) return { tex: t, approx: false }
  }
  return { tex: approxTex(toNum(x), sig), approx: true }
}
const eqv = (x: Q, sig = 4) => {
  const s = show(x, sig)
  return `${s.approx ? '\\approx' : '='} ${s.tex}`
}
const tx = (x: Q) => qTex(x, F)
const unitTex = (u?: string) => (u ? `\\,\\text{${u}}` : '')

function need(vals: (NumIn | null)[], k: number, msg: string) {
  if (vals.filter(Boolean).length !== k) throw new CalcError(msg)
}

/* ---------------------------- Grundaufgaben ---------------------------- */

export function percentBasic(G: NumIn | null, W: NumIn | null, p: NumIn | null, unit = ''): Solution {
  need([G, W, p], 2, 'Bitte genau zwei der drei Werte eingeben – der dritte wird berechnet.')
  const u = unitTex(unit)
  const steps: Step[] = []
  if (!W) {
    const g = G!.q
    const pp = p!.q
    const prod = mul(g, pp)
    const w = div(prod, HUNDRED)
    steps.push({ tex: `G = ${tx(g)}${u}, \\quad p = ${tx(pp)}${PCT}`, note: 'Gegeben: das Ganze (Grundwert $G$) und der Prozentsatz $p$. Gesucht: der Anteil (Prozentwert $W$).', head: 'Mit der Formel' })
    steps.push({ tex: `W = \\frac{G \\cdot p}{100}`, note: 'Prozentwert = Grundwert mal Prozentsatz durch 100.' })
    steps.push({ tex: `W = \\frac{${tx(g)} \\cdot ${tx(pp)}}{100} = \\frac{${tx(prod)}}{100} ${eqv(w)}${u}`, final: true })
    steps.push({ tex: `100${PCT} \\;\\widehat{=}\\; ${tx(g)}${u}`, head: 'Mit dem Dreisatz', note: 'Das Ganze sind 100 %.' })
    const one = div(g, HUNDRED)
    steps.push({ tex: `1${PCT} \\;\\widehat{=}\\; ${tx(g)} : 100 ${eqv(one)}${u}`, note: 'Durch 100 teilen.' })
    steps.push({ tex: `${tx(pp)}${PCT} \\;\\widehat{=}\\; ${show(one).tex} \\cdot ${tx(pp)} ${eqv(w)}${u}`, note: `Mit ${tx(pp).replace('{,}', ',')} malnehmen.` })
    return { result: `W ${eqv(w)}${u}`, steps }
  }
  if (!p) {
    const g = G!.q
    const w = W.q
    if (isZero(g)) throw new CalcError('Der Grundwert darf nicht 0 sein.')
    const r = div(w, g)
    const pp = mul(r, HUNDRED)
    steps.push({ tex: `G = ${tx(g)}${u}, \\quad W = ${tx(w)}${u}`, note: 'Gegeben: das Ganze $G$ und der Anteil $W$. Gesucht: der Prozentsatz $p$.', head: 'Mit der Formel' })
    steps.push({ tex: `p = \\frac{W}{G} \\cdot 100`, note: 'Prozentsatz = Anteil geteilt durch das Ganze, mal 100.' })
    steps.push({ tex: `p = \\frac{${tx(w)}}{${tx(g)}} \\cdot 100 ${eqv(r, 6)} \\cdot 100 ${eqv(pp)}${PCT}`, final: true })
    steps.push({ tex: `${tx(g)}${u} \\;\\widehat{=}\\; 100${PCT}`, head: 'Mit dem Dreisatz' })
    const one = div(HUNDRED, g)
    steps.push({ tex: `1${u} \\;\\widehat{=}\\; 100 : ${tx(g)} ${eqv(one, 6)}${PCT}`, note: `Durch ${tx(g).replace('{,}', ',')} teilen.` })
    steps.push({ tex: `${tx(w)}${u} \\;\\widehat{=}\\; ${show(one, 6).tex} \\cdot ${tx(w)} ${eqv(pp)}${PCT}`, note: `Mit ${tx(w).replace('{,}', ',')} malnehmen.` })
    return { result: `p ${eqv(pp)}${PCT}`, steps }
  }
  const w = W.q
  const pp = p.q
  if (isZero(pp)) throw new CalcError('Der Prozentsatz darf nicht 0 sein.')
  const g = div(mul(w, HUNDRED), pp)
  steps.push({ tex: `W = ${tx(w)}${u}, \\quad p = ${tx(pp)}${PCT}`, note: 'Gegeben: der Anteil $W$ und sein Prozentsatz $p$. Gesucht: das Ganze (Grundwert $G$).', head: 'Mit der Formel' })
  steps.push({ tex: `G = \\frac{W \\cdot 100}{p}`, note: 'Die Grundformel nach $G$ umgestellt.' })
  steps.push({ tex: `G = \\frac{${tx(w)} \\cdot 100}{${tx(pp)}} = \\frac{${tx(mul(w, HUNDRED))}}{${tx(pp)}} ${eqv(g)}${u}`, final: true })
  steps.push({ tex: `${tx(pp)}${PCT} \\;\\widehat{=}\\; ${tx(w)}${u}`, head: 'Mit dem Dreisatz' })
  const one = div(w, pp)
  steps.push({ tex: `1${PCT} \\;\\widehat{=}\\; ${tx(w)} : ${tx(pp)} ${eqv(one, 6)}${u}`, note: `Durch ${tx(pp).replace('{,}', ',')} teilen.` })
  steps.push({ tex: `100${PCT} \\;\\widehat{=}\\; ${show(one, 6).tex} \\cdot 100 ${eqv(g)}${u}`, note: 'Mit 100 malnehmen.' })
  return { result: `G ${eqv(g)}${u}`, steps }
}

/* ---------------------------- Aufschlag & Rabatt ---------------------------- */

export type ChangeMode = 'neu' | 'alt' | 'satz'

/**
 * neu: alter Wert und p → neuer Wert · alt: neuer Wert und p → alter Wert · satz: alt und neu → p
 */
export function percentChange(mode: ChangeMode, up: boolean, a: NumIn | null, b: NumIn | null, unit = ''): Solution {
  const u = unitTex(unit)
  const steps: Step[] = []
  if (mode === 'satz') {
    if (!a || !b) throw new CalcError('Bitte alten und neuen Wert eingeben.')
    const alt = a.q
    const neu = b.q
    if (isZero(alt)) throw new CalcError('Der alte Wert darf nicht 0 sein.')
    const diff = sub(neu, alt)
    const pp = mul(div(diff, alt), HUNDRED)
    steps.push({ tex: `\\Delta = ${tx(neu)} - ${tx(alt)} = ${tx(diff)}${u}`, note: 'Änderung = neuer Wert minus alter Wert.', head: 'Änderung' })
    steps.push({ tex: `p = \\frac{\\Delta}{G_{\\text{alt}}} \\cdot 100 = \\frac{${tx(diff)}}{${tx(alt)}} \\cdot 100 ${eqv(pp)}${PCT}`, note: 'Bezogen auf den **alten** Wert – er ist der Grundwert.', final: true })
    const s = sign(pp) > 0 ? 'Zunahme' : sign(pp) < 0 ? 'Abnahme' : 'keine Änderung'
    return { result: `p ${eqv(pp)}${PCT}`, steps, extra: [`\\text{${s}}`] }
  }
  if (!a || !b) throw new CalcError(mode === 'neu' ? 'Bitte alten Wert und Prozentsatz eingeben.' : 'Bitte neuen Wert und Prozentsatz eingeben.')
  const pp = b.q
  const qf = up ? add(ONE, div(pp, HUNDRED)) : sub(ONE, div(pp, HUNDRED))
  const fTex = `${up ? '1 +' : '1 -'} \\frac{${tx(pp)}}{100} = ${tx(qf)}`
  steps.push({
    tex: `q = ${fTex}`,
    note: up ? `Aufschlag: Der neue Wert ist $100\\,\\% + ${tx(pp)}\\,\\% = ${tx(mul(qf, HUNDRED))}\\,\\%$ des alten Werts.` : `Rabatt: Der neue Wert ist $100\\,\\% - ${tx(pp)}\\,\\% = ${tx(mul(qf, HUNDRED))}\\,\\%$ des alten Werts.`,
    head: 'Wachstumsfaktor',
  })
  if (sign(qf) <= 0) throw new CalcError('Mehr als 100 % Rabatt geht nicht.')
  if (mode === 'neu') {
    const neu = mul(a.q, qf)
    steps.push({ tex: `G_{\\text{neu}} = G_{\\text{alt}} \\cdot q = ${tx(a.q)} \\cdot ${tx(qf)} ${eqv(neu)}${u}`, head: 'Neuer Wert', final: true })
    const d = sub(neu, a.q)
    return { result: `G_{\\text{neu}} ${eqv(neu)}${u}`, steps, extra: [`${up ? '\\text{Aufschlag}' : '\\text{Ersparnis}'}\\ ${eqv(up ? d : neg(d))}${u}`] }
  }
  const alt = div(a.q, qf)
  steps.push({ tex: `G_{\\text{alt}} = \\frac{G_{\\text{neu}}}{q} = \\frac{${tx(a.q)}}{${tx(qf)}} ${eqv(alt)}${u}`, head: 'Alter Wert', note: 'Rückwärts rechnen: durch den Faktor teilen – **nicht** einfach die Prozente wieder abziehen!', final: true })
  return { result: `G_{\\text{alt}} ${eqv(alt)}${u}`, steps }
}

/* ---------------------------- Massenanteil ---------------------------- */

/**
 * Massenanteil w = m(Stoff) / m(Lösung) · 100 %, m(Lösung) = m(Stoff) + m(Lösungsmittel).
 * Zwei der Größen eingeben (w, mS, mLM, mL).
 */
export function massFraction(w: NumIn | null, mS: NumIn | null, mLM: NumIn | null, mL: NumIn | null, unit = 'g'): Solution {
  const u = unitTex(unit)
  const given = [w, mS, mLM, mL].filter(Boolean).length
  if (given !== 2) throw new CalcError('Bitte genau zwei Werte eingeben, z. B. Masse des Stoffes und Masse des Wassers.')
  const steps: Step[] = []
  const formula = { tex: 'w = \\frac{m_{\\text{Stoff}}}{m_{\\text{Lösung}}} \\cdot 100\\,\\%, \\qquad m_{\\text{Lösung}} = m_{\\text{Stoff}} + m_{\\text{Lösungsmittel}}', head: 'Formeln', note: 'Der Grundwert ist die **ganze Lösung** (Stoff + Lösungsmittel), nicht nur das Wasser.' }
  steps.push(formula)
  if (!w) {
    let s: Q
    let l: Q
    if (mS && mLM) {
      s = mS.q
      l = add(mS.q, mLM.q)
      steps.push({ tex: `m_{\\text{Lösung}} = ${tx(mS.q)}${u} + ${tx(mLM.q)}${u} = ${tx(l)}${u}`, head: 'Masse der Lösung' })
    } else if (mS && mL) {
      s = mS.q
      l = mL.q
    } else {
      // mLM und mL
      s = sub(mL!.q, mLM!.q)
      l = mL!.q
      steps.push({ tex: `m_{\\text{Stoff}} = ${tx(mL!.q)}${u} - ${tx(mLM!.q)}${u} = ${tx(s)}${u}`, head: 'Masse des Stoffes' })
    }
    if (sign(l) <= 0 || sign(s) < 0 || sign(sub(l, s)) < 0) throw new CalcError('Diese Massen passen nicht zusammen.')
    const ww = mul(div(s, l), HUNDRED)
    steps.push({ tex: `w = \\frac{${tx(s)}${u}}{${tx(l)}${u}} \\cdot 100\\,\\% ${eqv(ww)}\\,\\%`, head: 'Massenanteil', note: 'Die Einheit kürzt sich weg.', final: true })
    return { result: `w ${eqv(ww)}\\,\\%`, steps, extra: [`m_{\\text{Stoff}} = ${tx(s)}${u},\\quad m_{\\text{Lösung}} = ${tx(l)}${u}`] }
  }
  const wq = w.q
  if (sign(wq) <= 0 || sign(sub(wq, HUNDRED)) >= 0) throw new CalcError('Der Massenanteil muss zwischen 0 und 100 % liegen.')
  const frac = div(wq, HUNDRED)
  let s: Q
  let l: Q
  if (mL) {
    l = mL.q
    s = mul(frac, l)
    steps.push({ tex: `m_{\\text{Stoff}} = \\frac{w \\cdot m_{\\text{Lösung}}}{100\\,\\%} = \\frac{${tx(wq)} \\cdot ${tx(l)}}{100}${u} ${eqv(s)}${u}`, head: 'Masse des Stoffes', note: 'Formel nach $m_{\\text{Stoff}}$ umgestellt.' })
  } else if (mS) {
    s = mS.q
    l = div(s, frac)
    steps.push({ tex: `m_{\\text{Lösung}} = \\frac{m_{\\text{Stoff}} \\cdot 100\\,\\%}{w} = \\frac{${tx(s)} \\cdot 100}{${tx(wq)}}${u} ${eqv(l)}${u}`, head: 'Masse der Lösung', note: 'Formel nach $m_{\\text{Lösung}}$ umgestellt.' })
  } else {
    // w und Lösungsmittel: m_S = w·m_LM / (100 − w)
    const lm = mLM!.q
    s = div(mul(wq, lm), sub(HUNDRED, wq))
    l = add(s, lm)
    steps.push({
      tex: `m_{\\text{Stoff}} = \\frac{w \\cdot m_{\\text{LM}}}{100\\,\\% - w} = \\frac{${tx(wq)} \\cdot ${tx(lm)}}{100 - ${tx(wq)}}${u} ${eqv(s)}${u}`,
      head: 'Masse des Stoffes',
      note: `Das Lösungsmittel macht $100\\,\\% - ${tx(wq)}\\,\\% = ${tx(sub(HUNDRED, wq))}\\,\\%$ der Lösung aus.`,
    })
  }
  const lm = sub(l, s)
  steps.push({ tex: `m_{\\text{Lösungsmittel}} = m_{\\text{Lösung}} - m_{\\text{Stoff}} ${eqv(l)} - ${show(s).tex} ${eqv(lm)}${u}`, head: 'Rest ist Lösungsmittel', final: true })
  return {
    result: `m_{\\text{Stoff}} ${eqv(s)}${u},\\quad m_{\\text{LM}} ${eqv(lm)}${u}`,
    steps,
    extra: [`m_{\\text{Lösung}} ${eqv(l)}${u}`],
    remark: `Ansetzen: $${show(s).tex}${u}$ Stoff einwiegen und $${show(lm).tex}${u}$ Lösungsmittel dazugeben.`,
  }
}
