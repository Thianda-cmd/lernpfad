import { Fragment, type ReactNode } from 'react'

/** „[Ar] 3d6 4s2“ → [Ar] 3d⁶ 4s² (Hochstellung per <sup>) */
export function Conf({ conf }: { conf: string }) {
  const parts = conf.split(' ')
  return (
    <span className="conf">
      {parts.map((p, i) => {
        const m = /^(\d[spdf])(\d+)$/.exec(p)
        return (
          <Fragment key={i}>
            {i > 0 && ' '}
            {m ? (
              <span className="conf__sub">
                {m[1]}
                <sup>{m[2]}</sup>
              </span>
            ) : (
              <span className="conf__core">{p}</span>
            )}
          </Fragment>
        )
      })}
    </span>
  )
}

/** Summenformel mit tiefgestellten Zahlen: „Ca3(PO4)2“, „CuSO4·5H2O“ */
export function Formula({ f, charge }: { f: string; charge?: string }) {
  const out: ReactNode[] = []
  const re = /(\d+)|([^\d]+)/g
  let m: RegExpExecArray | null
  let i = 0
  let prev = ''
  while ((m = re.exec(f))) {
    if (m[1]) {
      // Zahl direkt nach „·“ ist ein Koeffizient (Kristallwasser), sonst Index
      if (prev.endsWith('·')) out.push(<Fragment key={i++}>{m[1]}</Fragment>)
      else out.push(<sub key={i++}>{m[1]}</sub>)
    } else out.push(<Fragment key={i++}>{m[2]}</Fragment>)
    prev = m[0]
  }
  return (
    <span className="chf">
      {out}
      {charge && <sup>{charge}</sup>}
    </span>
  )
}

/** Ladung als Hochzahl-Text: 2 → „2+“, −3 → „3−“, 1 → „+“ */
export function chargeText(q: number) {
  const a = Math.abs(q)
  return `${a === 1 ? '' : a}${q > 0 ? '+' : '−'}`
}
