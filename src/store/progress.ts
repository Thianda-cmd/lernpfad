import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OrganelleId } from '../data/organelles'

export interface Visit {
  path: string
  title: string
  /** Zeitpunkt des Besuchs (ms), damit sich „Zuletzt benutzt“ zwischen Geräten richtig ordnet */
  t?: number
}

interface ProgressState {
  learned: Partial<Record<OrganelleId, true>>
  viewed: Partial<Record<OrganelleId, number>>
  /** zuletzt geöffnete Werkzeuge, neuestes zuerst */
  recent: Visit[]
  /**
   * Wann „gelernt“ zuletzt umgeschaltet wurde (ms), auch für wieder abgewählte Organellen.
   * Damit gewinnt beim Abgleich über Blob (auth/sync.ts) die neuere Änderung.
   */
  learnedAt: Partial<Record<OrganelleId, number>>
  /** Wann der Verlauf zuletzt zurückgesetzt wurde (ms), 0 = nie */
  resetAt: number
  /**
   * Wessen Fortschritt das ist: die Blob-ID (sub) der Person, mit deren Konto er abgeglichen
   * wird, null = ohne Anmeldung entstanden. Meldet sich jemand anderes an, wird er nicht in
   * dessen Konto übernommen (auth/sync.ts). Steht mit im selben Eintrag, damit Fortschritt und
   * Besitzer in allen Tabs immer zusammenpassen.
   */
  owner: string | null
  toggleLearned: (id: OrganelleId) => void
  setLearned: (id: OrganelleId, value: boolean) => void
  markViewed: (id: OrganelleId) => void
  setLastVisit: (v: Visit) => void
  reset: () => void
  /** Fortschritt von diesem Gerät entfernen (kein Zurücksetzen: in Blob bleibt alles). */
  forget: (owner: string | null) => void
}

const initial = {
  learned: {},
  viewed: {},
  recent: [] as Visit[],
  learnedAt: {},
  resetAt: 0,
}

/** Größtes gültiges Datum in JavaScript */
const MAX_TIME = 8.64e15

/** Gleicher Pfad noch einmal ganz oben: erst nach dieser Zeit neu speichern */
const REVISIT_MS = 10 * 60 * 1000

/**
 * Zeitstempel für eine Änderung: jetzt, aber immer später als der Stand, auf dem sie aufbaut
 * (auch später als das letzte Zurücksetzen). So gewinnt eine Änderung auch dann, wenn die Uhr
 * dieses Geräts hinter einem anderen herläuft.
 */
const stamp = (after = 0) => Math.min(Math.max(Date.now(), after + 1), MAX_TIME)

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,
      owner: null,
      toggleLearned: (id) => get().setLearned(id, !get().learned[id]),
      setLearned: (id, value) => {
        const s = get()
        if (!!s.learned[id] === value) return
        const learned = { ...s.learned }
        if (value) learned[id] = true
        else delete learned[id]
        set({ learned, learnedAt: { ...s.learnedAt, [id]: stamp(Math.max(s.learnedAt[id] ?? 0, s.resetAt)) } })
      },
      markViewed: (id) => set({ viewed: { ...get().viewed, [id]: (get().viewed[id] ?? 0) + 1 } }),
      setLastVisit: (v) => {
        const { recent: cur, resetAt } = get()
        const top = cur[0]
        if (top?.path === v.path && top.title === v.title && Date.now() - (top.t ?? 0) < REVISIT_MS) return
        const t = stamp(Math.max(resetAt, ...cur.map((x) => x.t ?? 0)))
        set({ recent: [{ path: v.path, title: v.title, t }, ...cur.filter((x) => x.path !== v.path)].slice(0, 6) })
      },
      reset: () => {
        const s = get()
        const latest = Math.max(s.resetAt, ...Object.values(s.learnedAt).map((t) => t ?? 0), ...s.recent.map((x) => x.t ?? 0))
        set({ ...initial, resetAt: stamp(latest) })
      },
      forget: (owner) => set({ ...initial, owner }),
    }),
    {
      name: 'lernlabor-fortschritt',
      version: 3,
      // v1: alte Lernplattform (Quiz, Karteikarten, Mathe-Übungen, Probeklausuren) → verwerfen
      // v2: ohne Zeitstempel → was schon gelernt ist, zählt ab jetzt (geht beim ersten Abgleich nicht verloren)
      migrate: (old) => {
        const o = (old ?? {}) as Partial<ProgressState> & { lastVisit?: Visit | null }
        const learned = o.learned ?? {}
        const now = Date.now()
        const learnedAt: Partial<Record<OrganelleId, number>> = { ...(o.learnedAt ?? {}) }
        for (const id of Object.keys(learned) as OrganelleId[]) learnedAt[id] ??= now
        const recent = (o.recent ?? (o.lastVisit ? [o.lastVisit] : [])).map((v, i, all) => ({ ...v, t: v.t ?? all.length - i }))
        return {
          learned,
          viewed: o.viewed ?? {},
          recent,
          learnedAt,
          resetAt: o.resetAt ?? 0,
        } as ProgressState
      },
      partialize: (s) => ({ learned: s.learned, viewed: s.viewed, recent: s.recent, learnedAt: s.learnedAt, resetAt: s.resetAt, owner: s.owner }),
    },
  ),
)
