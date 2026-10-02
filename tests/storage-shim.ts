/** localStorage für Node, damit der echte Fortschritts-Store (zustand + persist) im Test läuft. Muss zuerst importiert werden. */
const data = new Map<string, string>()
const storage = {
  getItem: (k: string) => data.get(k) ?? null,
  setItem: (k: string, v: string) => void data.set(k, String(v)),
  removeItem: (k: string) => void data.delete(k),
  clear: () => data.clear(),
  key: (i: number) => [...data.keys()][i] ?? null,
  get length() {
    return data.size
  },
}
;(globalThis as { localStorage?: unknown }).localStorage = storage
// zustand liest window.localStorage
;(globalThis as { window?: unknown }).window ??= globalThis
export {}
