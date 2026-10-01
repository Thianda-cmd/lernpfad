import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CellType, OrganelleId } from '../data/organelles'

export interface QuizResult {
  date: string
  correct: number
  total: number
  mode: 'wissen' | 'beschriftung-tier' | 'beschriftung-pflanze'
}

export interface MathStat {
  tries: number
  correct: number
  streak: number
  best: number
}

export interface ExamResult {
  id: string
  date: string
  points: number
  max: number
  grade: number
  minutes: number
}

interface ProgressState {
  learned: Partial<Record<OrganelleId, true>>
  viewed: Partial<Record<OrganelleId, number>>
  cards: Partial<Record<OrganelleId, number>>
  quizHistory: QuizResult[]
  labelBest: Record<CellType, number>
  activeDays: string[]
  lastVisit: { path: string; title: string } | null
  /** Mathe: Übungsstatistik je Kapitel */
  math: Record<string, MathStat>
  /** Mathe: Kapitel als verstanden markiert */
  mathRead: Record<string, true>
  /** Mathe: gelöste Aufgaben der Übungsblätter („blatt:nr“) */
  sheetDone: Record<string, true>
  examHistory: ExamResult[]
  recordMath: (chapter: string, ok: boolean) => void
  setMathRead: (chapter: string, v: boolean) => void
  markSheet: (key: string) => void
  addExam: (r: Omit<ExamResult, 'date'>) => void
  toggleLearned: (id: OrganelleId) => void
  setLearned: (id: OrganelleId, value: boolean) => void
  markViewed: (id: OrganelleId) => void
  setCard: (id: OrganelleId, box: number) => void
  addQuiz: (r: Omit<QuizResult, 'date'>) => void
  setLabelBest: (cell: CellType, pct: number) => void
  touchDay: () => void
  setLastVisit: (v: { path: string; title: string }) => void
  reset: () => void
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const initial = {
  learned: {},
  viewed: {},
  cards: {},
  quizHistory: [],
  labelBest: { tier: 0, pflanze: 0 },
  activeDays: [],
  lastVisit: null,
  math: {},
  mathRead: {},
  sheetDone: {},
  examHistory: [],
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,
      toggleLearned: (id) => {
        const learned = { ...get().learned }
        if (learned[id]) delete learned[id]
        else learned[id] = true
        set({ learned })
      },
      setLearned: (id, value) => {
        const learned = { ...get().learned }
        if (value) learned[id] = true
        else delete learned[id]
        set({ learned })
      },
      markViewed: (id) => set({ viewed: { ...get().viewed, [id]: (get().viewed[id] ?? 0) + 1 } }),
      setCard: (id, box) => set({ cards: { ...get().cards, [id]: box } }),
      addQuiz: (r) => set({ quizHistory: [...get().quizHistory, { ...r, date: new Date().toISOString() }].slice(-100) }),
      setLabelBest: (cell, pct) => set({ labelBest: { ...get().labelBest, [cell]: Math.max(get().labelBest[cell], pct) } }),
      touchDay: () => {
        const k = todayKey()
        const days = get().activeDays
        if (!days.includes(k)) set({ activeDays: [...days, k].slice(-400) })
      },
      setLastVisit: (v) => set({ lastVisit: v }),
      recordMath: (chapter, ok) => {
        const s = get().math[chapter] ?? { tries: 0, correct: 0, streak: 0, best: 0 }
        const streak = ok ? s.streak + 1 : 0
        set({ math: { ...get().math, [chapter]: { tries: s.tries + 1, correct: s.correct + (ok ? 1 : 0), streak, best: Math.max(s.best, streak) } } })
      },
      setMathRead: (chapter, v) => {
        const m = { ...get().mathRead }
        if (v) m[chapter] = true
        else delete m[chapter]
        set({ mathRead: m })
      },
      markSheet: (key) => set({ sheetDone: { ...get().sheetDone, [key]: true } }),
      addExam: (r) => set({ examHistory: [...get().examHistory, { ...r, date: new Date().toISOString() }].slice(-50) }),
      reset: () => set({ ...initial }),
    }),
    { name: 'lernlabor-fortschritt', version: 1 },
  ),
)

/** Anzahl aufeinanderfolgender Lerntage bis heute (oder gestern). */
export function computeStreak(days: string[]) {
  const set = new Set(days)
  const d = new Date()
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1)
  let streak = 0
  while (set.has(todayKey(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function bestQuizPercent(history: QuizResult[], mode: QuizResult['mode'] = 'wissen') {
  const rel = history.filter((h) => h.mode === mode && h.total > 0)
  if (!rel.length) return null
  return Math.max(...rel.map((h) => Math.round((h.correct / h.total) * 100)))
}
