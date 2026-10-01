import { useEffect, useRef, useState, type ReactNode } from 'react'
import { check, type CheckResult, type UserInput } from '../check'
import { Rich, Tex } from '../tex'
import type { Problem } from '../types'
import AnswerFields, { emptyInput } from './AnswerFields'
import Figure from './Figure'
import Steps from './Steps'
import { IconArrowRight, IconCheck } from '../../components/icons'

interface Props {
  problem: Problem
  /** wird bei jedem gewerteten Versuch aufgerufen; `first` = erster Versuch dieser Aufgabe */
  onResult?: (ok: boolean, first: boolean) => void
  onNext?: () => void
  head?: ReactNode
  /** Nummer/Titel links oben */
  label?: string
  compact?: boolean
}

export default function ProblemCard({ problem, onResult, onNext, head, label, compact }: Props) {
  const [input, setInput] = useState<UserInput>(() => emptyInput(problem.answer))
  const [res, setRes] = useState<CheckResult | null>(null)
  const [tries, setTries] = useState(0)
  const [hint, setHint] = useState(false)
  const [sol, setSol] = useState(false)
  const [solved, setSolved] = useState(false)
  const nextRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setInput(emptyInput(problem.answer))
    setRes(null)
    setTries(0)
    setHint(false)
    setSol(false)
    setSolved(false)
  }, [problem])

  useEffect(() => {
    if (solved) nextRef.current?.focus()
  }, [solved])

  const doCheck = () => {
    if (solved) return
    const r = check(problem.answer, input)
    setRes(r)
    if (r.invalid) return
    onResult?.(r.ok, tries === 0)
    setTries((t) => t + 1)
    if (r.ok) setSolved(true)
  }

  const showSolution = () => {
    if (!sol && !solved && tries === 0) onResult?.(false, true)
    setSol(true)
    setTries((t) => Math.max(1, t))
  }

  const state = res && !res.invalid ? (res.ok ? 'ok' : 'bad') : null

  return (
    <div className={`pcard ${compact ? 'pcard--compact' : ''} ${solved ? 'is-solved' : ''}`}>
      {(label || head) && (
        <div className="pcard__head">
          {label && <span className="pcard__label">{label}</span>}
          {head}
        </div>
      )}
      <div className="pcard__prompt">
        <Rich text={problem.prompt} />
      </div>
      {problem.tex && (
        <div className="pcard__tex">
          <Tex block>{problem.tex}</Tex>
        </div>
      )}
      {problem.figure && <Figure fig={problem.figure} />}

      <div className="pcard__answer">
        <AnswerFields answer={problem.answer} input={input} setInput={setInput} onEnter={doCheck} disabled={solved} state={state} reveal={solved || sol} />
      </div>

      {res && (
        <div className={`pcard__fb ${res.invalid ? 'is-info' : res.ok ? 'is-ok' : 'is-bad'}`} role="status">
          {res.ok && <IconCheck size={16} />}
          <span>
            {res.invalid ? res.msg : res.ok ? res.msg ?? 'Richtig!' : res.msg ?? 'Noch nicht richtig.'}
          </span>
        </div>
      )}

      {hint && problem.hint && !solved && (
        <div className="pcard__hint">
          <Rich text={problem.hint} />
        </div>
      )}

      <div className="pcard__actions">
        {!solved ? (
          <button type="button" className="btn btn--primary" onClick={doCheck}>
            Prüfen
          </button>
        ) : (
          onNext && (
            <button ref={nextRef} type="button" className="btn btn--primary" onClick={onNext}>
              Nächste Aufgabe <IconArrowRight size={16} />
            </button>
          )
        )}
        {!solved && problem.hint && !hint && (
          <button type="button" className="btn btn--ghost" onClick={() => setHint(true)}>
            Tipp
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={() => (sol ? setSol(false) : showSolution())}>
          {sol ? 'Lösungsweg ausblenden' : solved ? 'Lösungsweg ansehen' : 'Lösung zeigen'}
        </button>
        {!solved && onNext && sol && (
          <button type="button" className="btn btn--ghost" onClick={onNext}>
            Neue Aufgabe
          </button>
        )}
      </div>

      {problem.sheetNote && (sol || solved) && (
        <div className="pcard__sheet">
          <strong>Hinweis zum Lösungsblatt:</strong> <Rich text={problem.sheetNote} />
        </div>
      )}

      {sol && (
        <div className="pcard__solution">
          <div className="pcard__sol-title">Lösungsweg</div>
          <Steps steps={problem.steps} resetKey={problem} />
        </div>
      )}
    </div>
  )
}
