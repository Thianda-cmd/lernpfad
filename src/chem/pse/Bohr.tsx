import { SHELL_NAMES, shells, type Element } from '../elements'

/** Schalenmodell (nach Bohr) mit kreisenden Elektronen */
export default function Bohr({ e, size = 240 }: { e: Element; size?: number }) {
  const sh = shells(e.conf)
  const n = sh.length
  const r0 = 22
  const rMax = 94
  const step = n > 1 ? (rMax - r0 - 8) / (n - 1) : 0
  return (
    <svg className="bohr" viewBox="-100 -100 200 200" width={size} height={size} role="img" aria-label={`Schalenmodell: ${sh.join(', ')} Elektronen`} key={e.z}>
      <defs>
        <radialGradient id="bohr-core" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="var(--sand-2)" />
          <stop offset="100%" stopColor="var(--sand)" />
        </radialGradient>
      </defs>
      {sh.map((count, i) => {
        const r = r0 + 8 + i * step
        const dot = count > 18 ? 2.1 : count > 8 ? 2.6 : 3.2
        const dur = 14 + i * 7
        return (
          <g key={i} className="bohr__shell" style={{ animationDelay: `${i * 90}ms` }}>
            <circle r={r} className="bohr__orbit" />
            <g className="bohr__spin" style={{ animationDuration: `${dur}s`, animationDirection: i % 2 ? 'reverse' : 'normal' }}>
              {Array.from({ length: count }).map((_, k) => {
                const a = (k / count) * Math.PI * 2 + i * 0.35
                return <circle key={k} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={dot} className="bohr__e" />
              })}
            </g>
            <text x={r * 0.7071 + 3} y={-r * 0.7071 - 3} className="bohr__label">
              {SHELL_NAMES[i]}
            </text>
          </g>
        )
      })}
      <circle r={r0 - 4} fill="url(#bohr-core)" className="bohr__core" />
      <text y={4.5} textAnchor="middle" className="bohr__z">
        {e.z}+
      </text>
    </svg>
  )
}
