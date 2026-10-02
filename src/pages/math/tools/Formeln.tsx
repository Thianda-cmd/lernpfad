import { useMemo, useState } from 'react'
import { equationPreview } from '../../../math/alg/equation'
import { evaluate, formulaVars, rearrange, substituteNode, toTex } from '../../../math/alg/rearrange'
import { parseNum } from '../../../math/alg/numinput'
import { varTex } from '../../../math/alg/poly'
import { approxTex, toNum } from '../../../math/q'
import { CalcPage, Examples, NumField, Rules, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import MathInput from '../../../math/ui/MathInput'
import { Tex } from '../../../math/tex'
import type { CalcTool } from '../../../math/tools'

const PRESETS: [string, string][] = [
  ['c = n/V', 'Konzentration'],
  ['n = m/M', 'Stoffmenge'],
  ['c_1·V_1 = c_2·V_2', 'Verdünnen'],
  ['w = m_S/m_L · 100', 'Massenanteil'],
  ['p·V = n·R·T', 'Gasgleichung'],
  ['A_R = e·f/2', 'Raute'],
  ['A = (a + c)/2 · h', 'Trapez'],
  ['A = π·r^2', 'Kreis'],
  ['V = π·r^2·h', 'Zylinder'],
  ['A = s^2/4 · √3', 'gleichs. Dreieck'],
  ['Q = c·m·(T_2 - T_1)', 'Wärme'],
  ['s = 1/2·a·t^2', 'Beschleunigung'],
  ['E = 1/2·m·v^2', 'Bewegungsenergie'],
  ['K = K_0·(1 + p/100)', 'Wachstum'],
  ['f = 1/√(L·C·T)', 'Frequenz'],
  ['U = 2(a + b)', 'Rechteck-Umfang'],
]

const RULES: [string, string][] = [
  ['+ \\;\\leftrightarrow\\; -', 'Plus mit Minus rückgängig machen'],
  ['\\cdot \\;\\leftrightarrow\\; :', 'Mal mit Geteilt rückgängig machen'],
  ['x^2 \\;\\leftrightarrow\\; \\sqrt{x}', 'Quadrat mit Wurzel rückgängig machen'],
  ['\\tfrac{\\ldots}{N} \\;\\rightarrow\\; \\cdot N', 'Bruch zuerst auflösen'],
]

function Insert({ expr, vars, target }: { expr: NonNullable<ReturnType<typeof rearrange>['expr']>; vars: string[]; target: string }) {
  const others = vars.filter((v) => v !== target)
  const [vals, setVals] = useState<Record<string, string>>({})
  const out = useMemo(() => {
    try {
      const env: Record<string, number> = {}
      for (const v of others) {
        const p = parseNum(vals[v] ?? '', v)
        if (!p) return null
        env[v] = toNum(p.q)
      }
      const sub = substituteNode(expr, env)
      const r = evaluate(sub)
      return { tex: toTex(sub), r }
    } catch (e) {
      return { err: (e as Error).message }
    }
  }, [vals, others, expr])
  return (
    <div className="calc__insert">
      <h3>Werte einsetzen</h3>
      <div className="calc__fields">
        {others.map((v) => (
          <NumField key={v} label={<Tex>{varTex(v)}</Tex>} value={vals[v] ?? ''} onChange={(x) => setVals((s) => ({ ...s, [v]: x }))} />
        ))}
      </div>
      {out && 'tex' in out && out.tex && (
        <div className="calc__insert-res">
          <Tex block>{`${varTex(target)} = ${out.tex} ${Number.isFinite(out.r) ? `\\approx ${approxTex(out.r!, 5)}` : '\\;\\text{(nicht definiert)}'}`}</Tex>
        </div>
      )}
      {out && 'err' in out && <p className="calc__insert-err">{out.err}</p>}
      {!out && <p className="calc__insert-hint">Alle übrigen Größen eintragen – die Einheiten musst du selbst passend wählen.</p>}
    </div>
  )
}

export default function Formeln({ tool }: { tool: CalcTool }) {
  const [f, setF] = useParam('f', PRESETS[0][0])
  const [nach, setNach] = useParam('nach', '')
  const vars = useMemo(() => {
    try {
      return formulaVars(f)
    } catch {
      return []
    }
  }, [f])
  // Standard: die erste Größe auf der rechten Seite
  const target = nach && vars.includes(nach) ? nach : (vars[0] ?? '')
  const { res, err } = useSolve(() => (f.trim() && target ? rearrange(f, target) : null), [f, target])
  const preview = useMemo(() => (s: string) => equationPreview(s), [])
  return (
    <CalcPage
      eyebrow="Mathematik · Rechner"
      title={tool.title}
      intro="Formel eingeben und auswählen, wonach umgestellt werden soll. Der Rechner macht die Rechenschritte um die gesuchte Größe von außen nach innen rückgängig (Zwiebelprinzip) – danach kannst du direkt Werte einsetzen."
      path={tool.path}
    >
      <div className="calc__grid">
        <section className="calc__in card">
          <span className="calc__label">Formel</span>
          <MathInput value={f} onChange={setF} keys="formula" size="lg" placeholder="z. B. c = n/V" previewFn={preview} ariaLabel="Formel" />
          {vars.length > 0 && (
            <div className="calc__var">
              <span>Umstellen nach</span>
              <div className="seg seg--wrap">
                {vars.map((x) => (
                  <button key={x} type="button" className={`seg__btn ${target === x ? 'is-active' : ''}`} onClick={() => setNach(x)}>
                    <Tex>{varTex(x)}</Tex>
                  </button>
                ))}
              </div>
            </div>
          )}
          <Examples
            items={PRESETS}
            onPick={(v) => {
              setF(v)
              setNach('')
            }}
            current={f}
          />
          <p className="calc__hint">
            Index: <kbd>c_1</kbd> · Wurzel: <kbd>√(…)</kbd> · Pi: <kbd>π</kbd> oder <kbd>pi</kbd> · Mal zwischen Größen: <kbd>*</kbd> oder <kbd>·</kbd>
          </p>
        </section>
        <Rules title="Umkehroperationen" items={RULES} />
      </div>
      <SolutionCard sol={res} err={err}>
        {res?.expr && <Insert key={`${f}|${target}`} expr={res.expr} vars={res.vars} target={res.target} />}
      </SolutionCard>
    </CalcPage>
  )
}
