import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowRight, IconRestart, IconShuffle } from '../components/icons'
import { CELL_ORGANELLES, ORGANELLES, ALL_ORGANELLE_IDS, type OrganelleId } from '../data/organelles'
import { useProgress } from '../store/progress'

type Deck = 'alle' | 'tier' | 'pflanze'
type Richtung = 'name' | 'funktion'

const BOX_LABELS = ['Neu', 'Box 1', 'Box 2', 'Sicher']

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Blendet den Namen des Organells im Text aus (für „Funktion → Name“). */
function mask(text: string, id: OrganelleId) {
  const o = ORGANELLES[id]
  const words = new Set<string>([o.name, o.label, o.name.split(/[\s-]/)[0], o.label.split(/[\s-]/)[0]])
  if (id === 'mitochondrium') ['Mitochondrien', 'Mitochondrium'].forEach((w) => words.add(w))
  if (id === 'chloroplast') ['Chloroplasten', 'Chloroplast'].forEach((w) => words.add(w))
  if (id === 'vakuole') ['Vakuole', 'Zentralvakuole'].forEach((w) => words.add(w))
  let out = text
  for (const w of [...words].filter((w) => w.length > 3).sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`${escapeRe(w)}\\w*`, 'gi'), '▢▢▢')
  }
  return out
}

export default function Karteikarten() {
  const [deck, setDeck] = useState<Deck>('alle')
  const [richtung, setRichtung] = useState<Richtung>('name')
  const cards = useProgress((s) => s.cards)
  const setCard = useProgress((s) => s.setCard)
  const [queue, setQueue] = useState<OrganelleId[]>([])
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ gewusst: 0, unsicher: 0, nochmal: 0 })

  const ids = useMemo(() => (deck === 'alle' ? ALL_ORGANELLE_IDS : CELL_ORGANELLES[deck]), [deck])

  const start = useCallback(() => {
    const boxes = useProgress.getState().cards
    const byBox = [0, 1, 2, 3].flatMap((b) => shuffle(ids.filter((i) => (boxes[i] ?? 0) === b)))
    setQueue(byBox)
    setPos(0)
    setFlipped(false)
    setStats({ gewusst: 0, unsicher: 0, nochmal: 0 })
  }, [ids])

  useEffect(() => {
    start()
  }, [start])

  const current = queue[pos]
  const done = pos >= queue.length && queue.length > 0

  const rate = useCallback(
    (r: 'gewusst' | 'unsicher' | 'nochmal') => {
      if (!current) return
      const box = cards[current] ?? 0
      const next = r === 'gewusst' ? Math.min(3, box + 1) : r === 'unsicher' ? Math.max(1, box) : 0
      setCard(current, next)
      setStats((s) => ({ ...s, [r]: s[r] + 1 }))
      if (r === 'nochmal') setQueue((q) => [...q, current])
      setFlipped(false)
      setPos((p) => p + 1)
    },
    [current, cards, setCard],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (flipped && e.key === '1') rate('nochmal')
      else if (flipped && e.key === '2') rate('unsicher')
      else if (flipped && e.key === '3') rate('gewusst')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, rate])

  const boxCounts = [0, 1, 2, 3].map((b) => ids.filter((i) => (cards[i] ?? 0) === b).length)
  const o = current ? ORGANELLES[current] : null

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Karteikarten</h1>
          <p>Gewusst: eine Box weiter. Nicht gewusst: kommt sofort wieder.</p>
        </div>
      </header>

      <div className="fc-controls">
        <div className="seg">
          {(
            [
              ['alle', 'Alle Organellen'],
              ['tier', 'Tierzelle'],
              ['pflanze', 'Pflanzenzelle'],
            ] as [Deck, string][]
          ).map(([k, l]) => (
            <button key={k} className={`seg__btn ${deck === k ? 'is-active' : ''}`} onClick={() => setDeck(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="seg">
          <button className={`seg__btn ${richtung === 'name' ? 'is-active' : ''}`} onClick={() => setRichtung('name')}>
            Name → Funktion
          </button>
          <button className={`seg__btn ${richtung === 'funktion' ? 'is-active' : ''}`} onClick={() => setRichtung('funktion')}>
            Funktion → Name
          </button>
        </div>
        <button className="btn btn--sm" onClick={start}>
          <IconShuffle size={15} /> Neu mischen
        </button>
      </div>

      <div className="fc-boxes">
        {boxCounts.map((n, b) => (
          <div key={b} className={`fc-box fc-box--${b}`}>
            <span>{BOX_LABELS[b]}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>

      {done ? (
        <div className="fc-done card card--pad">
          
          <h2>Runde geschafft!</h2>
          <p className="muted">
            {stats.gewusst} gewusst · {stats.unsicher} unsicher · {stats.nochmal}× wiederholt
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
            <button className="btn btn--primary" onClick={start}>
              <IconRestart size={16} /> Neue Runde
            </button>
            <Link to="/biologie/zellbiologie/quiz" className="btn">
              Zum Quiz <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        o &&
        current && (
          <>
            <div className="fc-progress">
              <span>
                Karte {Math.min(pos + 1, queue.length)} von {queue.length}
              </span>
              <div className="progress" style={{ flex: 1 }}>
                <div className="progress__bar" style={{ width: `${(pos / queue.length) * 100}%` }} />
              </div>
              <span className="chip">{BOX_LABELS[cards[current] ?? 0]}</span>
            </div>
            <div className={`fc ${flipped ? 'is-flipped' : ''}`} style={{ '--c': o.farbe } as CSSProperties} onClick={() => setFlipped((f) => !f)}>
              <div className="fc__inner">
                <div className="fc__face fc__front">
                  {richtung === 'name' ? (
                    <>
                      <span className="fc__swatch" />
                      <h2>{o.name}</h2>
                      <div className="faint">{o.fachbegriff}</div>
                      <p className="fc__q">Welche Aufgaben hat dieses Organell – und wie ist es aufgebaut?</p>
                    </>
                  ) : (
                    <>
                      <span className="fc__q-kicker">Welcher Bestandteil ist gemeint?</span>
                      <p className="fc__clue serif">„{mask(o.analogie, current)}“</p>
                      <ul className="bullets" style={{ textAlign: 'left', maxWidth: 520 }}>
                        {o.funktionen.slice(0, 2).map((f) => (
                          <li key={f}>{mask(f, current)}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <span className="fc__hint">Klicken oder Leertaste zum Umdrehen</span>
                </div>
                <div className="fc__face fc__back">
                  <div className="fc__back-head">
                    <span className="fc__swatch fc__swatch--sm" />
                    <h3>{o.name}</h3>
                  </div>
                  <p>{o.kurz}</p>
                  <ul className="bullets">
                    {o.funktionen.slice(0, 3).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <div className="note note--sand" style={{ marginTop: 14 }}><strong>Merkhilfe</strong><p>{o.merksatz}</p></div>
                </div>
              </div>
            </div>
            <div className={`fc-rate ${flipped ? 'is-visible' : ''}`}>
              <button className="btn fc-rate--again" onClick={() => rate('nochmal')} disabled={!flipped}>
                <kbd>1</kbd> Nochmal
              </button>
              <button className="btn fc-rate--unsure" onClick={() => rate('unsicher')} disabled={!flipped}>
                <kbd>2</kbd> Unsicher
              </button>
              <button className="btn fc-rate--ok" onClick={() => rate('gewusst')} disabled={!flipped}>
                <kbd>3</kbd> Gewusst
              </button>
            </div>
          </>
        )
      )}
    </div>
  )
}
