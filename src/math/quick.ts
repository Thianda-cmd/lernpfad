/**
 * Schnellrechner der Startseite: erkennt, was eingetippt wurde,
 * und schickt die Eingabe an den passenden Rechner.
 */
import type { ComponentType } from 'react'
import { parseFormula } from '../chem/formula'
import { IconFlask } from '../components/icons'
import { solveEquation } from './alg/equation'
import { fractionInput } from './alg/fractions'
import { solveLgs } from './alg/lgs'
import { powerInput, sciInput } from './alg/powers'
import { rearrange } from './alg/rearrange'
import { simplifyInput } from './alg/simplify'
import type { Solution } from './alg/step'
import { molarMass } from './alg/stoich'
import { TOOL_BY_ID } from './tools'

export interface QuickHit {
  title: string
  icon: ComponentType<{ size?: number }>
  to: string
  run: () => Solution | null
}

const enc = encodeURIComponent

function isChemFormula(s: string) {
  if (!/^[A-Z(\[][A-Za-z0-9()[\]·.*]*$/.test(s)) return false
  try {
    parseFormula(s)
    return true
  } catch {
    return false
  }
}

const tool = (id: string) => TOOL_BY_ID[id]

export function detect(raw: string): QuickHit | null {
  const s = raw.trim()
  if (!s) return null
  // Summenformel → molare Masse
  if (isChemFormula(s)) {
    return {
      title: 'Molare Masse',
      icon: IconFlask,
      to: `/chemie/molmasse?formel=${enc(s)}`,
      run: () => {
        const m = molarMass(s)
        return { result: m.step.tex, steps: [m.step] }
      },
    }
  }
  // zwei Gleichungen → Gleichungssystem
  const parts = s.split(/\s*[;|]\s*/).filter(Boolean)
  if (parts.length === 2 && parts.every((p) => p.includes('='))) {
    const t = tool('lgs')
    return { title: t.title, icon: t.icon, to: `${t.path}?i=${enc(parts[0])}&ii=${enc(parts[1])}`, run: () => solveLgs(parts[0], parts[1], 'addition') }
  }
  if (/[=<>≤≥]/.test(s)) {
    const letters = new Set((s.match(/[a-zA-Zα-ωΔ](?:_[a-zA-Z0-9]+)?/g) ?? []).filter((x) => !/^(sqrt|pi)$/.test(x)))
    const lhsSingle = /^\s*[a-zA-Z](_[a-zA-Z0-9]+)?\s*=/.test(s)
    // Formel wie c = n/V (mehrere Größen, links eine allein)
    if (s.includes('=') && lhsSingle && letters.size >= 3 && !/[<>≤≥]/.test(s)) {
      const t = tool('formeln')
      return { title: t.title, icon: t.icon, to: `${t.path}?f=${enc(s)}`, run: () => rearrange(s) }
    }
    const quad = /\^2|²|\)\^2/.test(s)
    const t = tool(quad ? 'pq-formel' : 'gleichungen')
    return { title: t.title, icon: t.icon, to: `${t.path}?g=${enc(s)}`, run: () => solveEquation(s, { allowNoRel: quad }) }
  }
  const hasLetters = /[a-zA-Z]/.test(s.replace(/sqrt|cbrt|wurzel|pi/gi, ''))
  if (!hasLetters) {
    if (/10\s*\^|\de[+-]?\d/i.test(s) && !/\//.test(s)) {
      const t = tool('potenzen')
      return { title: `${t.title} (Zehnerpotenzen)`, icon: t.icon, to: `${t.path}?modus=zehner&t=${enc(s)}`, run: () => sciInput(s) }
    }
    if (/[√∛]|sqrt|cbrt|\^\s*\(?-?\d+\/\d+/i.test(s)) {
      const t = tool('potenzen')
      return { title: t.title, icon: t.icon, to: `${t.path}?t=${enc(s)}`, run: () => powerInput(s) }
    }
    const t = tool('brueche')
    return { title: t.title, icon: t.icon, to: `${t.path}?b=${enc(s)}`, run: () => fractionInput(s) }
  }
  // Variablen: Potenzen/Wurzeln oder Terme
  const noSum = !/[+-]/.test(s.replace(/\^\s*\(?-/g, '^').replace(/^-/, ''))
  if (/[√∛]|sqrt|cbrt|wurzel/i.test(s) || (noSum && /\^/.test(s))) {
    const t = tool('potenzen')
    return { title: t.title, icon: t.icon, to: `${t.path}?t=${enc(s)}`, run: () => powerInput(s) }
  }
  const t = tool('terme')
  return { title: t.title, icon: t.icon, to: `${t.path}?t=${enc(s)}`, run: () => simplifyInput(s) }
}
