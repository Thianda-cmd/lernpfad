import { AUSMULT, GLEICHUNGEN, KLAMMERN, TEXTAUFGABEN } from './algebra'
import { BRUECHE, FORMELN_CH, POTENZEN, PROZENT } from './rechnen'
import { GERADEN, LGS, LGSTEXT, PQ, STOFFMENGE } from './mfh'
import type { ChapterContent } from './types'

export const CONTENT: Record<string, ChapterContent> = Object.fromEntries(
  [KLAMMERN, AUSMULT, GLEICHUNGEN, TEXTAUFGABEN, BRUECHE, POTENZEN, FORMELN_CH, PROZENT, STOFFMENGE, LGS, LGSTEXT, PQ, GERADEN].map((c) => [c.id, c]),
)
