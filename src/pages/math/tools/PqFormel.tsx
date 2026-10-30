import type { CalcTool } from '../../../math/tools'
import Gleichungen from './Gleichungen'

/** p-q-Formel = Gleichungsrechner im Modus „quadratisch“ */
export default function PqFormel({ tool }: { tool: CalcTool }) {
  return <Gleichungen tool={tool} pq />
}
