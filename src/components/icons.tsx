import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 18, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

/* ---------- Navigation ---------- */

export const IconOverview = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.8" />
    <rect x="13" y="4" width="7" height="7" rx="1.8" />
    <rect x="4" y="13" width="7" height="7" rx="1.8" />
    <rect x="13" y="13" width="7" height="7" rx="1.8" />
  </Icon>
)

export const IconBiology = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.6c4.7 0 8.4 3.5 8.4 8.3 0 4.9-3.7 8.5-8.5 8.5-4.9 0-8.3-3.6-8.3-8.4 0-4.9 3.7-8.4 8.4-8.4Z" />
    <circle cx="13.2" cy="11.4" r="3" />
    <circle cx="7.9" cy="15.4" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="8.6" cy="8.2" r="0.7" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconChemistry = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.2 3.5h5.6" />
    <path d="M10.3 3.5v5.4l-4.9 8.4a2.1 2.1 0 0 0 1.8 3.2h9.6a2.1 2.1 0 0 0 1.8-3.2l-4.9-8.4V3.5" />
    <path d="M7.4 14.6h9.2" />
  </Icon>
)

export const IconMath = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 5H7.2l5.3 7-5.3 7H17" />
  </Icon>
)

export const IconPeriodic = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="4" height="4" rx="1" />
    <rect x="16.5" y="4.5" width="4" height="4" rx="1" />
    <rect x="3.5" y="10" width="4" height="4" rx="1" />
    <rect x="12" y="10" width="4" height="4" rx="1" />
    <rect x="16.5" y="10" width="4" height="4" rx="1" />
    <rect x="3.5" y="15.5" width="4" height="4" rx="1" />
    <rect x="8" y="15.5" width="4" height="4" rx="1" />
    <rect x="12.5" y="15.5" width="8" height="4" rx="1" opacity=".55" />
  </Icon>
)

export const IconFlask = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 3.5h5" />
    <path d="M10.5 3.5v4.2L5.8 17a2.2 2.2 0 0 0 2 3.3h8.4a2.2 2.2 0 0 0 2-3.3l-4.7-9.3V3.5" />
    <circle cx="10.4" cy="15.6" r="1" fill="currentColor" stroke="none" />
    <circle cx="13.8" cy="13.6" r="0.8" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconTube = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 3.5h6" />
    <path d="M10 3.5v13.2a2 2 0 0 0 4 0V3.5" />
    <path d="M10 12h4" />
  </Icon>
)

export const IconDivide = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 6.4C10.6 4.8 9 4 7.3 4 4.4 4 2.5 7.3 2.5 12s1.9 8 4.8 8c1.7 0 3.3-.8 4.7-2.4 1.4 1.6 3 2.4 4.7 2.4 2.9 0 4.8-3.3 4.8-8s-1.9-8-4.8-8c-1.7 0-3.3.8-4.7 2.4Z" />
    <path d="M6.5 10.5l1.5 3M8 10.5l-1.5 3M16 10.5l1.5 3M17.5 10.5l-1.5 3" />
  </Icon>
)

export const IconIons = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="12" r="4.5" />
    <circle cx="16.5" cy="12" r="3.3" />
    <path d="M6.4 12h3.2M8 10.4v3.2" />
    <path d="M15.2 12h2.6" />
  </Icon>
)

export const IconChapters = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4.5h10.5a2 2 0 0 1 2 2V20l-2.8-1.6L12 20l-2.7-1.6L6.5 20H5z" />
    <path d="M8.2 9h6" />
    <path d="M8.2 12.4h4.3" />
    <path d="M19.2 7.5v11" opacity=".5" />
  </Icon>
)

export const IconExam = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="13" r="7.2" />
    <path d="M12 9.2V13l2.6 1.8" />
    <path d="M10 3.4h4" />
    <path d="M18.4 6.4l1.3-1.3" />
  </Icon>
)

export const IconFormula = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5.5h6.5" />
    <path d="M5 5.5l4 6.5-4 6.5h6.5" />
    <path d="M14.5 11.5l5 5.8" />
    <path d="M19.5 11.5l-5 5.8" />
    <path d="M14.8 6.2h4.6" />
  </Icon>
)

export const IconSheet = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 3.5h7.8l3.7 3.7v13.3h-11.5z" />
    <path d="M14.2 3.5v3.8h3.8" />
    <path d="M9 12l1.6 1.6L13.8 10.4" />
    <path d="M9 17h6" />
  </Icon>
)

export const IconAnimalCell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12.3 3.8c4-.3 7.7 2.5 8.1 6.6.4 4.3-2.4 8.7-6.8 9.6-4.4 1-8.9-1.6-9.7-6.1-.8-4.6 3.2-9.8 8.4-10.1Z" />
    <circle cx="12.4" cy="12" r="3.1" />
    <circle cx="12.9" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
    <path d="M6.9 9.6c.8-.9 1.8-1.4 2.9-1.5" />
  </Icon>
)

export const IconPlantCell = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.4" />
    <rect x="5.6" y="6.6" width="12.8" height="10.8" rx="1.4" />
    <rect x="10.2" y="8.4" width="6.4" height="7.2" rx="2" />
    <circle cx="7.9" cy="12" r="1.3" />
  </Icon>
)

export const IconCompare = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="12" r="5.6" />
    <circle cx="15" cy="12" r="5.6" />
  </Icon>
)

export const IconBook = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 6.6C10.3 5.2 7.9 4.6 4 4.6v13.2c3.9 0 6.3.6 8 1.9 1.7-1.3 4.1-1.9 8-1.9V4.6c-3.9 0-6.3.6-8 2Z" />
    <path d="M12 6.6v13.1" />
  </Icon>
)

export const IconCards = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.5" y="7.5" width="12" height="12.5" rx="2" />
    <path d="M8 4.5h9.3a2.2 2.2 0 0 1 2.2 2.2V16" />
  </Icon>
)

export const IconQuiz = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="m8.4 12.2 2.4 2.4 4.8-5" />
  </Icon>
)

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7.5h9" />
    <path d="M17.5 7.5H20" />
    <path d="M4 16.5h2.5" />
    <path d="M11 16.5h9" />
    <circle cx="15.3" cy="7.5" r="2.2" />
    <circle cx="8.7" cy="16.5" r="2.2" />
  </Icon>
)

export const IconSidebar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.4" />
    <path d="M9.2 4.5v15" />
  </Icon>
)

export const IconSun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.8" />
    <path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1" />
  </Icon>
)

export const IconMoon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19.6 14.6A7.9 7.9 0 0 1 9.4 4.4a8 8 0 1 0 10.2 10.2Z" />
  </Icon>
)

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 7h15M4.5 12h15M4.5 17h9" />
  </Icon>
)

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Icon>
)

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />
  </Icon>
)

export const IconArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M10.5 6.5 5 12l5.5 5.5" />
  </Icon>
)

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Icon>
)

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
)

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />
  </Icon>
)

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.2" />
    <path d="m15.6 15.6 4 4" />
  </Icon>
)

export const IconShuffle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7.5h3.2c2 0 3 1 4.3 3l1 1.5c1.3 2 2.3 3 4.3 3H20" />
    <path d="M4 16.5h3.2c1.2 0 2-.4 2.8-1.2M14 8.7c.8-.8 1.6-1.2 2.8-1.2H20" />
    <path d="m17.5 5 2.5 2.5-2.5 2.5M17.5 14l2.5 2.5-2.5 2.5" />
  </Icon>
)

export const IconRestart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
    <path d="M4.5 4.5v4h4" />
  </Icon>
)

/* ---------- Werkzeuge der Zellansicht ---------- */

export const IconLabels = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6.5" cy="17.5" r="1.4" />
    <path d="M7.6 16.4 11 11" />
    <rect x="10.5" y="5.5" width="9.5" height="5.5" rx="1.6" />
  </Icon>
)

export const IconCut = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.8a8.2 8.2 0 1 0 8.2 8.2H12Z" />
    <path d="M12 3.8V12h8.2" strokeDasharray="1.6 2.2" />
  </Icon>
)

export const IconOrbit = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="2.6" />
    <path d="M20.5 12c0 2.3-3.8 4.2-8.5 4.2S3.5 14.3 3.5 12 7.3 7.8 12 7.8c2.6 0 4.9.6 6.5 1.5" />
    <path d="m17.2 7.6 1.5 1.8-2 1.1" />
  </Icon>
)

export const IconNetwork = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="7" r="1.6" />
    <circle cx="18" cy="6" r="1.6" />
    <circle cx="12" cy="13" r="1.6" />
    <circle cx="6.5" cy="18" r="1.6" />
    <circle cx="18" cy="17.5" r="1.6" />
    <path d="M7.3 7.9 10.8 12M16.8 7.1l-3.7 4.8M11 14.3l-3.3 2.6M13.3 14l3.4 2.6" />
  </Icon>
)

export const IconQuality = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.6c.7 4.6 2 5.9 6.6 6.6-4.6.7-5.9 2-6.6 6.6-.7-4.6-2-5.9-6.6-6.6 4.6-.7 5.9-2 6.6-6.6Z" />
    <path d="M18.4 16.2c.3 1.6.8 2.1 2.4 2.4-1.6.3-2.1.8-2.4 2.4-.3-1.6-.8-2.1-2.4-2.4 1.6-.3 2.1-.8 2.4-2.4Z" />
  </Icon>
)

export const IconExpand = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" />
  </Icon>
)

export const IconCollapse = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4.5V9H4.5M19.5 9H15V4.5M15 19.5V15h4.5M4.5 15H9v4.5" />
  </Icon>
)

export const IconZoomIn = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 6v12M6 12h12" />
  </Icon>
)

export const IconZoomOut = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 12h12" />
  </Icon>
)

export const IconCube = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3.8 7.5 4.1v8.2L12 20.2l-7.5-4.1V7.9Z" />
    <path d="m4.5 7.9 7.5 4.1 7.5-4.1M12 12v8.2" />
  </Icon>
)

export const IconDiagram = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
    <circle cx="10" cy="12" r="3" />
    <path d="M13 12h3.5M16.5 12v-3h2" />
  </Icon>
)
