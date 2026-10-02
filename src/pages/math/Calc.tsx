import { useParams } from 'react-router-dom'
import { TOOL_BY_ID } from '../../math/tools'
import NotFound from '../NotFound'
import Terme from './tools/Terme'
import Gleichungen from './tools/Gleichungen'
import Lgs from './tools/Lgs'
import Brueche from './tools/Brueche'
import Potenzen from './tools/Potenzen'
import Formeln from './tools/Formeln'
import Prozent from './tools/Prozent'
import Geraden from './tools/Geraden'

export default function Calc() {
  const { tool = '' } = useParams()
  const t = TOOL_BY_ID[tool]
  if (!t) return <NotFound />
  switch (t.id) {
    case 'terme':
      return <Terme key={t.id} tool={t} />
    case 'gleichungen':
      return <Gleichungen key={t.id} tool={t} />
    case 'pq-formel':
      return <Gleichungen key={t.id} tool={t} pq />
    case 'lgs':
      return <Lgs key={t.id} tool={t} />
    case 'brueche':
      return <Brueche key={t.id} tool={t} />
    case 'potenzen':
      return <Potenzen key={t.id} tool={t} />
    case 'formeln':
      return <Formeln key={t.id} tool={t} />
    case 'prozent':
      return <Prozent key={t.id} tool={t} />
    case 'geraden':
      return <Geraden key={t.id} tool={t} />
    default:
      return <NotFound />
  }
}
