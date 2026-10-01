import { useMemo, useState } from 'react'
import { mulberry32 } from '../../lib/random'
import { useProgress } from '../../store/progress'
import type { GenInfo, Level, Problem } from '../types'
import ProblemCard from './ProblemCard'
import { IconShuffle } from '../../components/icons'

const LEVELS: { v: Level; t: string }[] = [
  { v: 1, t: 'Einstieg' },
  { v: 2, t: 'Standard' },
  { v: 3, t: 'Klausur' },
]

function makeProblem(gens: GenInfo[], which: number, level: Level, seed: number): { p: Problem; g: GenInfo } {
  const rng = mulberry32(seed)
  const g = which < 0 ? gens[Math.floor(rng() * gens.length)] : gens[which]
  for (let i = 0; i < 5; i++) {
    try {
      return { p: g.gen(mulberry32(seed + i * 101), level), g }
    } catch {
      /* nächsten Seed versuchen */
    }
  }
  return { p: gens[0].gen(mulberry32(1), 1), g: gens[0] }
}

export default function Practice({ chapterId, gens }: { chapterId: string; gens: GenInfo[] }) {
  const [which, setWhich] = useState(-1)
  const [level, setLevel] = useState<Level>(2)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [session, setSession] = useState({ ok: 0, n: 0, streak: 0 })
  const record = useProgress((s) => s.recordMath)
  const stat = useProgress((s) => s.math[chapterId])

  const { p, g } = useMemo(() => makeProblem(gens, which, level, seed), [gens, which, level, seed])
  const next = () => setSeed((s) => (s * 1103515245 + 12345) % 2147483647)

  const onResult = (ok: boolean, first: boolean) => {
    if (!first) return
    record(chapterId, ok)
    setSession((s) => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1, streak: ok ? s.streak + 1 : 0 }))
  }

  return (
    <div className="practice">
      <div className="practice__bar">
        {gens.length > 1 && (
          <div className="practice__types" role="tablist" aria-label="Aufgabentyp">
            <button type="button" className={`pill ${which === -1 ? 'is-active' : ''}`} onClick={() => setWhich(-1)}>
              <IconShuffle size={14} /> Gemischt
            </button>
            {gens.map((x, i) => (
              <button key={x.id} type="button" className={`pill ${which === i ? 'is-active' : ''}`} onClick={() => setWhich(i)}>
                {x.title}
              </button>
            ))}
          </div>
        )}
        <div className="practice__row">
          <div className="seg" role="radiogroup" aria-label="Schwierigkeit">
            {LEVELS.map((l) => (
              <button key={l.v} type="button" className={`seg__btn ${level === l.v ? 'is-active' : ''}`} onClick={() => setLevel(l.v)} aria-pressed={level === l.v}>
                <span className="lvl" data-l={l.v} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                {l.t}
              </button>
            ))}
          </div>
          <div className="practice__stats">
            <span>
              <strong>{session.ok}</strong> / {session.n} richtig
            </span>
            <span>
              Serie <strong>{session.streak}</strong>
            </span>
            {stat && (
              <span className="faint">
                insgesamt {stat.correct}/{stat.tries} · Rekord {stat.best}
              </span>
            )}
          </div>
        </div>
      </div>
      <ProblemCard problem={p} onResult={onResult} onNext={next} label={g.title} />
    </div>
  )
}
