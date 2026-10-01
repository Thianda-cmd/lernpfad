import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { VizId } from '../content/types'

export const VIZ: Record<VizId, LazyExoticComponent<ComponentType>> = {
  signflip: lazy(() => import('./SignFlip')),
  area: lazy(() => import('./AreaModel')),
  waage: lazy(() => import('./Waage')),
  translator: lazy(() => import('./Translator')),
  fractionbars: lazy(() => import('./FractionBars')),
  exponents: lazy(() => import('./Exponents')),
  onion: lazy(() => import('./Onion')),
  percent: lazy(() => import('./PercentViz')),
  molrechner: lazy(() => import('./MolRechner')),
  lgsgraph: lazy(() => import('./LgsGraph')),
  mix: lazy(() => import('./MixViz')),
  parabola: lazy(() => import('./Parabola')),
  line: lazy(() => import('./LineViz')),
}
