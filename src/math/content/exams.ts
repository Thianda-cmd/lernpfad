import { mulberry32 } from '../../lib/random'
import { KLAMMER_GENS } from '../gen/klammern'
import { AUSMULT_GENS } from '../gen/ausmultiplizieren'
import { GLEICHUNG_GENS } from '../gen/gleichungen'
import { TEXT_GENS } from '../gen/textaufgaben'
import { BRUCH_GENS } from '../gen/brueche'
import { POTENZ_GENS } from '../gen/potenzen'
import { FORMEL_GENS } from '../gen/formeln'
import { PROZENT_GENS } from '../gen/prozent'
import { STOFF_GENS } from '../gen/stoffmenge'
import { LGS_GENS } from '../gen/lgs'
import { LGSTEXT_GENS } from '../gen/lgstext'
import { PQ_GENS } from '../gen/pq'
import { GERADEN_GENS } from '../gen/geraden'
import type { GenInfo, Level, Problem } from '../types'

export interface ExamTask {
  p: Problem
  points: number
  chapter: string
  topic: string
}

type Slot = { gens: GenInfo[]; level: Level; points: number; chapter: string }

const S = (gens: GenInfo[], level: Level, points: number, chapter: string): Slot => ({ gens, level, points, chapter })

const PLANS: Record<string, Slot[]> = {
  lf1t: [
    S(KLAMMER_GENS.slice(0, 1), 2, 3, 'klammern'),
    S(KLAMMER_GENS.slice(0, 1), 3, 4, 'klammern'),
    S(KLAMMER_GENS.slice(1, 2), 2, 3, 'klammern'),
    S(AUSMULT_GENS.slice(0, 1), 2, 3, 'ausmultiplizieren'),
    S(AUSMULT_GENS.slice(0, 1), 3, 4, 'ausmultiplizieren'),
    S(GLEICHUNG_GENS.slice(1, 2), 2, 4, 'gleichungen'),
    S(GLEICHUNG_GENS.slice(2, 3), 2, 3, 'gleichungen'),
    S(GLEICHUNG_GENS.slice(3, 4), 2, 3, 'gleichungen'),
    S(BRUCH_GENS.slice(1, 4), 2, 3, 'brueche'),
    S(BRUCH_GENS.slice(4, 5), 3, 4, 'brueche'),
    S(POTENZ_GENS.slice(1, 3), 2, 3, 'potenzen'),
    S(FORMEL_GENS, 3, 4, 'formeln'),
    S(TEXT_GENS.slice(0, 2), 2, 4, 'textaufgaben'),
    S(PROZENT_GENS.slice(0, 4), 2, 2, 'prozent'),
  ],
  mfh: [
    S(LGS_GENS.slice(0, 1), 1, 4, 'lgs'),
    S(LGS_GENS.slice(0, 1), 2, 5, 'lgs'),
    S(LGS_GENS.slice(1, 3), 2, 4, 'lgs'),
    S(LGSTEXT_GENS, 2, 6, 'lgs-text'),
    S(PQ_GENS, 1, 3, 'pq'),
    S(PQ_GENS, 2, 4, 'pq'),
    S(PQ_GENS, 3, 4, 'pq'),
    S(GERADEN_GENS.slice(2, 4), 2, 4, 'geraden'),
    S(GERADEN_GENS.slice(5, 6), 2, 4, 'geraden'),
    S(GERADEN_GENS.slice(4, 5), 2, 2, 'geraden'),
  ],
  stoff: [
    S(STOFF_GENS.slice(1, 2), 1, 2, 'stoffmenge'),
    S(STOFF_GENS.slice(1, 2), 1, 2, 'stoffmenge'),
    S(STOFF_GENS.slice(2, 3), 2, 3, 'stoffmenge'),
    S(STOFF_GENS.slice(0, 1), 2, 3, 'stoffmenge'),
    S(STOFF_GENS.slice(0, 1), 3, 4, 'stoffmenge'),
    S(STOFF_GENS.slice(3, 4), 3, 4, 'stoffmenge'),
  ],
}

export function buildExam(id: string, seed: number): ExamTask[] {
  const plan = PLANS[id] ?? []
  const rng = mulberry32(seed)
  return plan.map((slot, i) => {
    const g = slot.gens[Math.floor(rng() * slot.gens.length)]
    let p: Problem | null = null
    for (let k = 0; k < 6 && !p; k++) {
      try {
        p = g.gen(mulberry32(seed + i * 977 + k * 31), slot.level)
      } catch {
        p = null
      }
    }
    return { p: p ?? slot.gens[0].gen(mulberry32(i + 1), 1), points: slot.points, chapter: slot.chapter, topic: g.title }
  })
}

export function examPoints(id: string) {
  return (PLANS[id] ?? []).reduce((s, x) => s + x.points, 0)
}

export function examCount(id: string) {
  return (PLANS[id] ?? []).length
}
