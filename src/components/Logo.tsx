import { useId } from 'react'

/**
 * Bildmarke „Lernpfad“: eine geöffnete Zellmembran mit Zellkern und Nucleolus,
 * aus der ein Vesikel austritt (Exocytose – Wissen, das nach außen geht).
 */
export const LOGO_RING = 'M31.18 39.41 A17 17 0 1 1 39.41 31.18'
export const LOGO_NUCLEUS = { cx: 21.5, cy: 21.5, r: 6.8 }
export const LOGO_NUCLEOLUS = { cx: 23.3, cy: 19.7, r: 2.1 }
export const LOGO_VESICLE = { cx: 39.2, cy: 39.2, r: 2.7 }

export function Logo({ size = 20, accent }: { size?: number; accent?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <mask id={`${id}-m`}>
          <rect width="48" height="48" fill="#fff" />
          <circle {...LOGO_NUCLEOLUS} fill="#000" />
        </mask>
      </defs>
      <path d={LOGO_RING} stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <circle {...LOGO_NUCLEUS} fill="currentColor" mask={`url(#${id}-m)`} />
      <circle {...LOGO_VESICLE} fill={accent ?? 'currentColor'} />
    </svg>
  )
}
