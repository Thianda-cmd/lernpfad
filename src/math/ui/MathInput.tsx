import { useMemo, useRef, type KeyboardEvent } from 'react'
import { toTex, tryParse } from '../expr'
import { Tex } from '../tex'

export type KeySet = 'algebra' | 'number' | 'root'

const KEYS: Record<KeySet, { k: string; ins: string; title: string }[]> = {
  algebra: [
    { k: 'x²', ins: '^2', title: 'Quadrat' },
    { k: 'xⁿ', ins: '^', title: 'Hochzahl' },
    { k: '·', ins: '·', title: 'mal' },
    { k: '/', ins: '/', title: 'Bruchstrich' },
    { k: '( )', ins: '()', title: 'Klammer' },
    { k: '√', ins: '√()', title: 'Wurzel' },
    { k: 'x₁', ins: '_', title: 'Index (tiefgestellt)' },
    { k: 'π', ins: 'π', title: 'Pi' },
  ],
  number: [
    { k: '/', ins: '/', title: 'Bruch' },
    { k: '−', ins: '-', title: 'Minus' },
    { k: '·10ⁿ', ins: '·10^', title: 'Zehnerpotenz' },
    { k: '( )', ins: '()', title: 'Klammer' },
  ],
  root: [
    { k: 'xⁿ', ins: '^()', title: 'Hochzahl' },
    { k: '/', ins: '/', title: 'Bruch' },
    { k: '−', ins: '-', title: 'Minus' },
    { k: '( )', ins: '()', title: 'Klammer' },
  ],
}

interface Props {
  value: string
  onChange: (v: string) => void
  onEnter?: () => void
  placeholder?: string
  keys?: KeySet | false
  preview?: boolean
  sci?: boolean
  disabled?: boolean
  state?: 'ok' | 'bad' | null
  ariaLabel?: string
  size?: 'md' | 'sm'
  autoFocus?: boolean
}

export default function MathInput({ value, onChange, onEnter, placeholder, keys = 'algebra', preview = true, sci, disabled, state, ariaLabel, size = 'md', autoFocus }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const parsed = useMemo(() => (value.trim() ? tryParse(value, { sci }) : null), [value, sci])

  const insert = (ins: string) => {
    const el = ref.current
    if (!el) return
    const s = el.selectionStart ?? value.length
    const e = el.selectionEnd ?? value.length
    const sel = value.slice(s, e)
    let text = ins
    let caret = s + ins.length
    if (ins.endsWith('()')) {
      text = ins.slice(0, -1) + sel + ')'
      caret = s + ins.length - 1 + sel.length + (sel ? 1 : 0)
    }
    const next = value.slice(0, s) + text + value.slice(e)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEnter?.()
    }
  }

  return (
    <div className={`mi mi--${size} ${state ? `is-${state}` : ''}`}>
      <input
        ref={ref}
        className="mi__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        inputMode="text"
        aria-label={ariaLabel}
        autoFocus={autoFocus}
      />
      {keys && !disabled && (
        <div className="mi__keys" aria-label="Sonderzeichen">
          {KEYS[keys].map((k) => (
            <button key={k.k} type="button" className="mi__key" title={k.title} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(k.ins)}>
              {k.k}
            </button>
          ))}
        </div>
      )}
      {preview && parsed && (
        <div className={`mi__preview ${parsed.error ? 'is-error' : ''}`} aria-live="polite">
          {parsed.node ? <Tex d>{toTex(parsed.node)}</Tex> : <span>{parsed.error}</span>}
        </div>
      )}
    </div>
  )
}
