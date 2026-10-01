import { useState } from 'react'
import { Tex } from '../tex'
import { Presets, VizHead } from './controls'

interface Piece {
  text: string
  tex?: string
  id?: number
}

interface Sentence {
  t: string
  parts: Piece[]
  eq: { tex: string; id?: number }[]
}

const SENTENCES: Sentence[] = [
  {
    t: 'Summe von 16 subtrahieren',
    parts: [
      { text: 'Subtrahiert man ', id: 1 },
      { text: 'die Summe aus ', id: 2 },
      { text: 'einer Zahl', id: 3 },
      { text: ' und 5', id: 4 },
      { text: ' von 16', id: 5 },
      { text: ', so erhält man', id: 6 },
      { text: ' 9', id: 7 },
      { text: '.' },
    ],
    eq: [
      { tex: '16', id: 5 },
      { tex: '-', id: 1 },
      { tex: '(', id: 2 },
      { tex: 'x', id: 3 },
      { tex: '+ 5', id: 4 },
      { tex: ')', id: 2 },
      { tex: '=', id: 6 },
      { tex: '9', id: 7 },
    ],
  },
  {
    t: 'Doppeltes einer Zahl',
    parts: [
      { text: 'Addiert man zum ', id: 2 },
      { text: 'Doppelten einer natürlichen Zahl', id: 1 },
      { text: ' 4', id: 3 },
      { text: ' und subtrahiert ', id: 4 },
      { text: 'diese Summe', id: 5 },
      { text: ' von 44', id: 6 },
      { text: ', so erhält man', id: 7 },
      { text: ' 8', id: 8 },
      { text: '.' },
    ],
    eq: [
      { tex: '44', id: 6 },
      { tex: '-', id: 4 },
      { tex: '(', id: 5 },
      { tex: '2x', id: 1 },
      { tex: '+ 4', id: 3 },
      { tex: ')', id: 5 },
      { tex: '=', id: 7 },
      { tex: '8', id: 8 },
    ],
  },
  {
    t: 'Grundstück',
    parts: [
      { text: 'Das Grundstück ist ' },
      { text: '20 m länger als breit', id: 1 },
      { text: '. ' },
      { text: 'Die Länge wird 3 m kleiner', id: 2 },
      { text: ', ' },
      { text: 'die Breite 2 m größer', id: 3 },
      { text: '. Die Fläche ist dann ' },
      { text: '4 m² größer', id: 4 },
      { text: '.' },
    ],
    eq: [
      { tex: '(x + 20 - 3)', id: 2 },
      { tex: '\\cdot', id: 0 },
      { tex: '(x + 2)', id: 3 },
      { tex: '=' },
      { tex: 'x \\cdot (x + 20)', id: 1 },
      { tex: '+ 4', id: 4 },
    ],
  },
]

const WORDS: [string, string][] = [
  ['Summe, addieren, vermehrt um, mehr als', '+'],
  ['Differenz, subtrahieren, vermindert um, weniger', '-'],
  ['Produkt, multiplizieren, das Doppelte / Dreifache', '\\cdot,\\ 2x,\\ 3x'],
  ['Quotient, dividieren, die Hälfte', ':,\\ \\tfrac{x}{2}'],
  ['ist, ergibt, erhält man, ist genauso groß wie', '='],
  ['„a von b subtrahieren“', 'b - a'],
  ['„die Summe aus x und 5“', '(x + 5)'],
]

export default function Translator() {
  const [si, setSi] = useState(0)
  const [hot, setHot] = useState<number | null>(null)
  const s = SENTENCES[si]
  return (
    <div className="tr">
      <VizHead title="Text → Gleichung" />
      <Presets items={SENTENCES.map((x) => ({ t: x.t, v: x }))} active={si} onPick={(i) => { setSi(i); setHot(null) }} />
      <p className="tr__sentence">
        {s.parts.map((p, i) => (
          <span
            key={i}
            className={`tr__piece ${p.id !== undefined ? 'is-link' : ''} ${hot !== null && p.id === hot ? 'is-hot' : ''}`}
            onMouseEnter={() => p.id !== undefined && setHot(p.id)}
            onMouseLeave={() => setHot(null)}
            onClick={() => p.id !== undefined && setHot(p.id)}
          >
            {p.text}
          </span>
        ))}
      </p>
      <div className="tr__eq">
        {s.eq.map((e, i) => (
          <span
            key={i}
            className={`tr__tok ${hot !== null && e.id === hot ? 'is-hot' : ''}`}
            onMouseEnter={() => e.id !== undefined && setHot(e.id)}
            onMouseLeave={() => setHot(null)}
          >
            <Tex>{e.tex}</Tex>
          </span>
        ))}
      </div>
      <p className="viz__note">Fahre über einen Satzteil – das passende Stück der Gleichung leuchtet auf.</p>
      <div className="tr__words">
        {WORDS.map(([w, t]) => (
          <div key={w} className="tr__word">
            <span>{w}</span>
            <span className="tr__sym">
              <Tex>{t}</Tex>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
