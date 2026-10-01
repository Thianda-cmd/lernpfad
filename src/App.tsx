import { Suspense, lazy, type ReactNode } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'

const SubjectPage = lazy(() => import('./pages/SubjectPage'))
const Zellbiologie = lazy(() => import('./pages/Zellbiologie'))
const CellViewer = lazy(() => import('./pages/CellViewer'))
const Vergleich = lazy(() => import('./pages/Vergleich'))
const Lexikon = lazy(() => import('./pages/Lexikon'))
const Karteikarten = lazy(() => import('./pages/Karteikarten'))
const Quiz = lazy(() => import('./pages/Quiz'))
const Einstellungen = lazy(() => import('./pages/Einstellungen'))
const NotFound = lazy(() => import('./pages/NotFound'))
const MathHome = lazy(() => import('./pages/math/MathHome'))
const MathChapter = lazy(() => import('./pages/math/MathChapter'))
const Worksheet = lazy(() => import('./pages/math/Worksheet'))
const MockExam = lazy(() => import('./pages/math/MockExam'))
const Formelsammlung = lazy(() => import('./pages/math/Formelsammlung'))
const ChemHome = lazy(() => import('./pages/chem/ChemHome'))
const Periodensystem = lazy(() => import('./pages/chem/Periodensystem'))
const Molmasse = lazy(() => import('./pages/chem/Molmasse'))
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
          <Route index element={<Dashboard />} />
          <Route path="biologie" element={<S><SubjectPage id="biologie" /></S>} />
          <Route path="chemie" element={<S><ChemHome /></S>} />
          <Route path="chemie/periodensystem" element={<S><Periodensystem /></S>} />
          <Route path="chemie/molmasse" element={<S><Molmasse /></S>} />
          <Route path="chemie/ionen" element={<S><Ionen /></S>} />
          <Route path="chemie/nachweise" element={<S><Nachweise /></S>} />
          <Route path="mathematik" element={<S><MathHome /></S>} />
          <Route path="mathematik/formelsammlung" element={<S><Formelsammlung /></S>} />
          <Route path="mathematik/blatt/:blatt" element={<S><Worksheet /></S>} />
          <Route path="mathematik/probeklausur/:exam" element={<S><MockExam /></S>} />
          <Route path="mathematik/:kapitel" element={<S><MathChapter /></S>} />
          <Route path="biologie/zellbiologie" element={<S><Zellbiologie /></S>} />
          <Route path="biologie/zellteilung" element={<S><Zellteilung /></S>} />
          <Route path="biologie/zellbiologie/tierzelle" element={<S><CellViewer key="tier" cell="tier" /></S>} />
          <Route path="biologie/zellbiologie/pflanzenzelle" element={<S><CellViewer key="pflanze" cell="pflanze" /></S>} />
          <Route path="biologie/zellbiologie/vergleich" element={<S><Vergleich /></S>} />
          <Route path="biologie/zellbiologie/lexikon" element={<S><Lexikon /></S>} />
          <Route path="biologie/zellbiologie/karteikarten" element={<S><Karteikarten /></S>} />
          <Route path="biologie/zellbiologie/quiz" element={<S><Quiz /></S>} />
          <Route path="einstellungen" element={<S><Einstellungen /></S>} />
          <Route path="*" element={<S><NotFound /></S>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
