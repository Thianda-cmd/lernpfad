import { Suspense, lazy, type ReactNode } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'

// Startseite sofort im Hintergrund laden (läuft parallel zur Start-Animation)
const loadDashboard = () => import('./pages/Dashboard')
loadDashboard()
const Dashboard = lazy(loadDashboard)

const SubjectPage = lazy(() => import('./pages/SubjectPage'))
const Zellbiologie = lazy(() => import('./pages/Zellbiologie'))
const CellViewer = lazy(() => import('./pages/CellViewer'))
const Vergleich = lazy(() => import('./pages/Vergleich'))
const Lexikon = lazy(() => import('./pages/Lexikon'))
const Einstellungen = lazy(() => import('./pages/Einstellungen'))
const NotFound = lazy(() => import('./pages/NotFound'))
const MathHome = lazy(() => import('./pages/math/MathHome'))
const Calc = lazy(() => import('./pages/math/Calc'))
const ChemHome = lazy(() => import('./pages/chem/ChemHome'))
const Periodensystem = lazy(() => import('./pages/chem/Periodensystem'))
const Molmasse = lazy(() => import('./pages/chem/Molmasse'))
const ChemRechnen = lazy(() => import('./pages/chem/Rechnen'))
const Ionen = lazy(() => import('./pages/chem/Ionen'))
const Nachweise = lazy(() => import('./pages/chem/Nachweise'))
const Zellteilung = lazy(() => import('./pages/bio/Zellteilung'))

function PageLoader() {
  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
      <div className="spinner" />
    </div>
  )
}

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<S><Dashboard /></S>} />
          <Route path="biologie" element={<S><SubjectPage id="biologie" /></S>} />
          <Route path="chemie" element={<S><ChemHome /></S>} />
          <Route path="chemie/periodensystem" element={<S><Periodensystem /></S>} />
          <Route path="chemie/molmasse" element={<S><Molmasse /></S>} />
          <Route path="chemie/rechnen" element={<S><ChemRechnen /></S>} />
          <Route path="chemie/ionen" element={<S><Ionen /></S>} />
          <Route path="chemie/nachweise" element={<S><Nachweise /></S>} />
          <Route path="mathematik" element={<S><MathHome /></S>} />
          <Route path="mathematik/:tool" element={<S><Calc /></S>} />
          <Route path="biologie/zellbiologie" element={<S><Zellbiologie /></S>} />
          <Route path="biologie/zellteilung" element={<S><Zellteilung /></S>} />
          <Route path="biologie/zellbiologie/tierzelle" element={<S><CellViewer key="tier" cell="tier" /></S>} />
          <Route path="biologie/zellbiologie/pflanzenzelle" element={<S><CellViewer key="pflanze" cell="pflanze" /></S>} />
          <Route path="biologie/zellbiologie/vergleich" element={<S><Vergleich /></S>} />
          <Route path="biologie/zellbiologie/lexikon" element={<S><Lexikon /></S>} />
          <Route path="einstellungen" element={<S><Einstellungen /></S>} />
          <Route path="*" element={<S><NotFound /></S>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
