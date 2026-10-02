import { useMemo, useRef, type KeyboardEvent } from 'react'
import { toTex, tryParse } from '../expr'
import { Tex } from '../tex'

export type KeySet = 'algebra' | 'equation' | 'number' | 'root' | 'formula'

const K = {
  sq: { k: 'x²', ins: '^2', title: 'Quadrat' },
  pow: { k: 'xⁿ', ins: '^', title: 'Hochzahl' },
  powp: { k: 'x⁽ⁿ⁾', ins: '^()', title: 'Hochzahl mit Klammer, z. B. ^(1/2)' },
  dot: { k: '·', ins: '·', title: 'mal' },
  frac: { k: '/', ins: '/', title: 'Bruchstrich' },
  div: { k: ':', ins: ' : ', title: 'geteilt' },
  par: { k: '( )', ins: '()', title: 'Klammer' },
  sqp: { k: '[ ]', ins: '[]', title: 'eckige Klammer' },
  sqrt: { k: '√', ins: '√()', title: 'Quadratwurzel' },
  cbrt: { k: '∛', ins: '∛()', title: 'Dritte Wurzel' },
  sub: { k: 'x₁', ins: '_', title: 'Index (tiefgestellt), z. B. c_1' },
  pi: { k: 'π', ins: 'π', title: 'Pi' },
  eq: { k: '=', ins: ' = ', title: 'ist gleich' },
  lt: { k: '<', ins: ' < ', title: 'kleiner' },
  gt: { k: '>', ins: ' > ', title: 'größer' },
  le: { k: '≤', ins: ' ≤ ', title: 'kleiner gleich' },
  ge: { k: '≥', ins: ' ≥ ', title: 'größer gleich' },
  minus: { k: '−', ins: '-', title: 'Minus' },
  ten: { k: '·10ⁿ', ins: '·10^', title: 'Zehnerpotenz' },
}

const KEYS: Record<KeySet, { k: string; ins: string; title: string }[]> = {
  algebra: [K.sq, K.pow, K.dot, K.frac, K.par, K.sqp, K.sub, K.pi],
  equation: [K.eq, K.sq, K.pow, K.dot, K.frac, K.par, K.lt, K.gt, K.le, K.ge],
  number: [K.frac, K.div, K.dot, K.minus, K.par, K.pow],
  root: [K.sqrt, K.cbrt, K.powp, K.pow, K.dot, K.frac, K.par, K.ten],
  formula: [K.eq, K.dot, K.frac, K.sq, K.pow, K.sqrt, K.sub, K.par, K.pi],
}

export type Preview = { tex?: string; error?: string } | null

interface Props {
  value: string
  onChange: (v: string) => void
  onEnter?: () => void
  placeholder?: string
  keys?: KeySet | false
  preview?: boolean
  /** eigene Vorschau (z. B. für Gleichungen); Standard: Term-Parser */
  previewFn?: (v: string) => Preview
  sci?: boolean
  disabled?: boolean
  state?: 'ok' | 'bad' | null
  ariaLabel?: string
  size?: 'md' | 'sm' | 'lg'
  autoFocus?: boolean
}

export default function MathInput({ value, onChange, onEnter, placeholder, keys = 'algebra', preview = true, previewFn, sci, disabled, state, ariaLabel, size = 'md', autoFocus }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const parsed = useMemo<Preview>(() => {
    if (!value.trim()) return null
    if (previewFn) return previewFn(value)
    const r = tryParse(value, { sci })
    return r.node ? { tex: toTex(r.node) } : { error: r.error }
  }, [value, sci, previewFn])

  const insert = (ins: string) => {
    const el = ref.current
    if (!el) return
    const s = el.selectionStart ?? value.length
    const e = el.selectionEnd ?? value.length
    const sel = value.slice(s, e)
    let text = ins
    let caret = s + ins.length
    const pair = ins.endsWith('()') ? ['(', ')'] : ins.endsWith('[]') ? ['[', ']'] : null
    if (pair) {
      text = ins.slice(0, -1) + sel + pair[1]
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
          {parsed.tex ? <Tex d>{parsed.tex}</Tex> : <span>{parsed.error}</span>}
        </div>
      )}
    </div>
  )
}
