import { useSyncExternalStore } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'lernlabor-theme'
const listeners = new Set<() => void>()
const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: light)') : null

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* Speicher nicht verfügbar */
  }
  return 'system'
}

let pref: ThemePref = readPref()

function emit() {
  listeners.forEach((l) => l())
}

mq?.addEventListener('change', emit)

function apply() {
  const el = document.documentElement
  if (pref === 'system') delete el.dataset.theme
  else el.dataset.theme = pref
  const dark = resolve() === 'dark'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1412' : '#f3f1eb')
}

function resolve(): 'light' | 'dark' {
  if (pref === 'system') return mq?.matches ? 'light' : 'dark'
  return pref
}

export function setThemePref(p: ThemePref) {
  pref = p
  try {
    if (p === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, p)
  } catch {
    /* Speicher nicht verfügbar */
  }
  apply()
  emit()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useTheme() {
  useSyncExternalStore(subscribe, () => `${pref}|${mq?.matches}`)
  const resolved = resolve()
  return {
    pref,
    resolved,
    dark: resolved === 'dark',
    setPref: setThemePref,
    toggle: () => setThemePref(resolved === 'dark' ? 'light' : 'dark'),
  }
}

apply()
