import { CalcPage } from '../../../math/ui/Calc'
import type { CalcTool } from '../../../math/tools'

/** Platzhalter – wird durch den fertigen Rechner ersetzt */
export default function Statistik({ tool }: { tool: CalcTool }) {
  return (
    <CalcPage eyebrow="Mathematik · Rechner" title={tool.title} intro={tool.short} path={tool.path}>
      <section className="calc__out card calc__out--empty">
        <p>Dieser Rechner wird gerade gebaut.</p>
      </section>
    </CalcPage>
  )
}
