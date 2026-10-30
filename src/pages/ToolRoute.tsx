import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { useParams } from 'react-router-dom'
import { TOOL_BY_ID, type CalcTool, type Subject } from '../math/tools'
import NotFound from './NotFound'

type Page = LazyExoticComponent<ComponentType<{ tool: CalcTool }>>

/** Jeder Rechner ist ein eigener Baustein und wird erst beim Öffnen geladen. */
const PAGES: Record<string, Page> = {
  // Mathematik
  terme: lazy(() => import('./math/tools/Terme')),
  gleichungen: lazy(() => import('./math/tools/Gleichungen')),
  'pq-formel': lazy(() => import('./math/tools/PqFormel')),
  lgs: lazy(() => import('./math/tools/Lgs')),
  brueche: lazy(() => import('./math/tools/Brueche')),
  potenzen: lazy(() => import('./math/tools/Potenzen')),
  formeln: lazy(() => import('./math/tools/Formeln')),
  prozent: lazy(() => import('./math/tools/Prozent')),
  geraden: lazy(() => import('./math/tools/Geraden')),
  statistik: lazy(() => import('./math/tools/Statistik')),
  logarithmen: lazy(() => import('./math/tools/Logarithmen')),
  einheiten: lazy(() => import('./math/tools/Einheiten')),
  // Chemie
  rechnen: lazy(() => import('./chem/Rechnen')),
  konzentrationen: lazy(() => import('./chem/tools/Konzentrationen')),
  ph: lazy(() => import('./chem/tools/Ph')),
  titration: lazy(() => import('./chem/tools/Titration')),
  gase: lazy(() => import('./chem/tools/Gase')),
  reaktionen: lazy(() => import('./chem/tools/Reaktionen')),
  photometrie: lazy(() => import('./chem/tools/Photometrie')),
  // Biologie
  zellzahl: lazy(() => import('./bio/tools/Zellzahl')),
  mikrobiologie: lazy(() => import('./bio/tools/Mikrobiologie')),
  verduennungsreihe: lazy(() => import('./bio/tools/Verduennungsreihe')),
  mikroskopie: lazy(() => import('./bio/tools/Mikroskopie')),
  zentrifuge: lazy(() => import('./bio/tools/Zentrifuge')),
  nukleinsaeuren: lazy(() => import('./bio/tools/Nukleinsaeuren')),
  pcr: lazy(() => import('./bio/tools/Pcr')),
}

function Loader() {
  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
      <div className="spinner" />
    </div>
  )
}

export default function ToolRoute({ subject }: { subject: Subject }) {
  const { tool = '' } = useParams()
  const t = TOOL_BY_ID[tool]
  const Page = t && t.subject === subject ? PAGES[t.id] : undefined
  if (!t || !Page) return <NotFound />
  return (
    <Suspense fallback={<Loader />}>
      <Page key={t.id} tool={t} />
    </Suspense>
  )
}
