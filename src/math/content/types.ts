import type { GenInfo, Problem, Step } from '../types'

export type VizId =
  | 'signflip'
  | 'area'
  | 'waage'
  | 'translator'
  | 'fractionbars'
  | 'exponents'
  | 'onion'
  | 'percent'
  | 'molrechner'
  | 'lgsgraph'
  | 'mix'
  | 'parabola'
  | 'line'

export type Block =
  | { k: 'p'; t: string }
  | { k: 'rules'; title?: string; items: { tex: string; t?: string }[] }
  | { k: 'example'; title: string; prompt?: string; task: string; steps: Step[]; source?: string }
  | { k: 'mistake'; wrong: string; right: string; why: string; source?: string }
  | { k: 'viz'; id: VizId }
  | { k: 'table'; head: string[]; rows: string[][] }
  | { k: 'merk'; t: string }
  | { k: 'try'; title?: string; p: Problem }

export interface Section {
  id: string
  title: string
  blocks: Block[]
}

export interface ChapterContent {
  id: string
  intro: string
  sections: Section[]
  gens: GenInfo[]
  /** die wichtigsten Formeln (Formelsammlung, „Auf einen Blick“) */
  formulas: { tex: string; t: string }[]
}

/** Beispiel direkt aus einer generierten Aufgabe (garantiert gleicher Lösungsweg wie im Übungsmodus) */
export function exampleFrom(p: Problem, title: string, source?: string): Block {
  return { k: 'example', title, prompt: p.prompt, task: p.tex ?? '', steps: p.steps, source }
}
