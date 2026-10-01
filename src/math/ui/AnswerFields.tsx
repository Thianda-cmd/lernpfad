import { Rich, Tex } from '../tex'
import type { UserInput } from '../check'
import type { Answer } from '../types'
import MathInput from './MathInput'
import { IconCheck } from '../../components/icons'

const REL_TEX: Record<string, string> = { '<': '<', '>': '>', '≤': '\\le', '≥': '\\ge' }

export function emptyInput(a: Answer): UserInput {
  return { text: a.kind === 'nums' ? a.labels.map(() => '') : [''] }
}

interface Props {
  answer: Answer
  input: UserInput
  setInput: (u: UserInput) => void
  onEnter?: () => void
  disabled?: boolean
  state?: 'ok' | 'bad' | null
  /** richtige Option (nach dem Prüfen) */
  reveal?: boolean
}

export default function AnswerFields({ answer: a, input, setInput, onEnter, disabled, state, reveal }: Props) {
  const setText = (i: number, v: string) => {
    const text = [...input.text]
    text[i] = v
    setInput({ ...input, text, none: false })
  }
  switch (a.kind) {
    case 'expr':
    case 'factor':
      return (
        <div className="af af--row">
          {a.kind === 'expr' && a.label && (
            <span className="af__label">
              <Tex>{a.label}</Tex>
            </span>
          )}
          <MathInput
            value={input.text[0] ?? ''}
            onChange={(v) => setText(0, v)}
            onEnter={onEnter}
            disabled={disabled}
            state={state}
            placeholder={a.kind === 'factor' ? 'z. B. 6a(2x − 3y + 1)' : 'Term eingeben, z. B. 3,2p + 6,2q'}
            ariaLabel="Antwort"
          />
        </div>
      )
    case 'num':
      return (
        <div className="af af--row">
          {a.label && (
            <span className="af__label">
              <Tex>{a.label}</Tex>
            </span>
          )}
          <MathInput
            value={input.text[0] ?? ''}
            onChange={(v) => setText(0, v)}
            onEnter={onEnter}
            disabled={disabled}
            state={state}
            keys="number"
            sci
            preview={/[/^·*e]/.test(input.text[0] ?? '')}
            placeholder={a.fraction ? 'z. B. 53/120' : 'Zahl, z. B. 3,5'}
            ariaLabel="Antwort"
            size="sm"
          />
          {a.unit && <span className="af__unit">{a.unit}</span>}
        </div>
      )
    case 'nums':
      return (
        <div className="af">
          <div className="af__grid">
            {a.labels.map((l, i) => (
              <div key={l + i} className="af__cell">
                <span className="af__label">
                  <Tex>{/^[a-z](_\d)?$/.test(l) ? l + ' =' : `\\text{${l}}`}</Tex>
                </span>
                <MathInput
                  value={input.text[i] ?? ''}
                  onChange={(v) => setText(i, v)}
                  onEnter={onEnter}
                  disabled={disabled || input.none}
                  state={state}
                  keys={false}
                  sci
                  preview={/[/^·*e]/.test(input.text[i] ?? '')}
                  placeholder="Zahl"
                  ariaLabel={l}
                  size="sm"
                />
                {a.units?.[i] && <span className="af__unit">{a.units[i]}</span>}
              </div>
            ))}
          </div>
          {a.allowNone && (
            <label className="af__none">
              <input type="checkbox" checked={!!input.none} disabled={disabled} onChange={(e) => setInput({ ...input, none: e.target.checked })} />
              <span>keine (reelle) Lösung</span>
            </label>
          )}
          {!a.ordered && <p className="af__hint">Reihenfolge egal. Bei einer doppelten Lösung reicht ein Feld.</p>}
        </div>
      )
    case 'ineq':
      return (
        <div className="af af--row">
          <span className="af__label">
            <Tex>{a.variable}</Tex>
          </span>
          <div className="seg seg--rel" role="radiogroup" aria-label="Relationszeichen">
            {(['<', '>', '≤', '≥'] as const).map((r) => (
              <button key={r} type="button" disabled={disabled} className={`seg__btn ${input.rel === r ? 'is-active' : ''}`} onClick={() => setInput({ ...input, rel: r })} aria-pressed={input.rel === r}>
                <Tex>{REL_TEX[r]}</Tex>
              </button>
            ))}
          </div>
          <MathInput value={input.text[0] ?? ''} onChange={(v) => setText(0, v)} onEnter={onEnter} disabled={disabled} state={state} placeholder="Grenze, z. B. 2" ariaLabel="Grenze" size="sm" keys={false} />
        </div>
      )
    case 'choice':
      return (
        <div className="af af--choice">
          {a.options.map((o, i) => {
            const picked = input.choice === i
            const right = reveal && i === a.correct
            const wrong = reveal && picked && i !== a.correct
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                className={`af__opt ${picked ? 'is-picked' : ''} ${right ? 'is-right' : ''} ${wrong ? 'is-wrong' : ''}`}
                onClick={() => setInput({ ...input, choice: i })}
              >
                <span className="af__opt-mark">{right ? <IconCheck size={14} /> : String.fromCharCode(65 + i)}</span>
                <span>
                  <Rich text={o} />
                </span>
              </button>
            )
          })}
        </div>
      )
  }
}
