import { Suspense } from 'react'
import { Rich, Tex } from '../tex'
import type { Block } from '../content/types'
import Steps from './Steps'
import ProblemCard from './ProblemCard'
import { VIZ } from '../viz'

function Rules({ b }: { b: Extract<Block, { k: 'rules' }> }) {
  return (
    <div className="rules">
      {b.title && <div className="rules__title">{b.title}</div>}
      <div className="rules__grid">
        {b.items.map((it, i) => (
          <div key={i} className="rule">
            <div className="rule__tex">
              <Tex d>{it.tex}</Tex>
            </div>
            {it.t && (
              <div className="rule__t">
                <Rich text={it.t} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Example({ b }: { b: Extract<Block, { k: 'example' }> }) {
  return (
    <figure className="example">
      <figcaption className="example__head">
        <span className="example__title">{b.title}</span>
        {b.source && <span className="example__src">{b.source}</span>}
      </figcaption>
      {b.prompt && (
        <p className="example__prompt">
          <Rich text={b.prompt} />
        </p>
      )}
      {b.task && (
        <div className="example__task">
          <Tex block>{b.task}</Tex>
        </div>
      )}
      <Steps steps={b.steps} stepwise />
    </figure>
  )
}

function Mistake({ b }: { b: Extract<Block, { k: 'mistake' }> }) {
  return (
    <div className="mistake">
      <div className="mistake__cols">
        <div className="mistake__col mistake__col--wrong">
          <span className="mistake__tag">Falsch</span>
          <Tex d>{b.wrong}</Tex>
        </div>
        <div className="mistake__col mistake__col--right">
          <span className="mistake__tag">Richtig</span>
          <Tex d>{b.right}</Tex>
        </div>
      </div>
      <p className="mistake__why">
        <Rich text={b.why} />
        {b.source && <span className="mistake__src"> · {b.source}</span>}
      </p>
    </div>
  )
}

export function BlockView({ b }: { b: Block }) {
  switch (b.k) {
    case 'p':
      return (
        <p className="lesson__p">
          <Rich text={b.t} />
        </p>
      )
    case 'merk':
      return (
        <p className="merk">
          <Rich text={b.t} />
        </p>
      )
    case 'rules':
      return <Rules b={b} />
    case 'example':
      return <Example b={b} />
    case 'mistake':
      return <Mistake b={b} />
    case 'table':
      return (
        <div className="ltable-wrap">
          <table className="ltable">
            <thead>
              <tr>
                {b.head.map((h, i) => (
                  <th key={i}>
                    <Rich text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>
                      <Rich text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'viz': {
      const V = VIZ[b.id]
      return (
        <div className="viz">
          <Suspense fallback={<div className="viz__loading" />}>
            <V />
          </Suspense>
        </div>
      )
    }
    case 'try':
      return (
        <div className="try">
          <div className="try__title">{b.title ?? 'Probier es selbst'}</div>
          <ProblemCard problem={b.p} compact />
        </div>
      )
  }
}

export default function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} b={b} />
      ))}
    </>
  )
}
