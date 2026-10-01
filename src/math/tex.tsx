import katex from 'katex'
import 'katex/dist/katex.min.css'
import { Fragment, memo, type ReactNode } from 'react'

const cache = new Map<string, string>()

function render(src: string, display: boolean) {
  const key = (display ? 'D' : 'I') + src
  let html = cache.get(key)
  if (html === undefined) {
    html = katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'html' })
    if (cache.size > 4000) cache.clear()
    cache.set(key, html)
  }
  return html
}

/** Formel mit KaTeX setzen. */
export const Tex = memo(function Tex({ children, block, className, d }: { children: string; block?: boolean; className?: string; /** große Brüche wie in abgesetzten Formeln */ d?: boolean }) {
  return (
    <span
      className={`${block ? 'tex tex--block' : 'tex'}${className ? ' ' + className : ''}`}
      dangerouslySetInnerHTML={{ __html: render(d && !block ? '\\displaystyle ' + children : children, !!block) }}
    />
  )
})

/**
 * Fließtext mit eingebetteten Formeln: `$...$` wird als Formel gesetzt,
 * `**...**` fett. Zeilenumbrüche bleiben erhalten.
 */
export const Rich = memo(function Rich({ text }: { text: string }) {
  const out: ReactNode[] = []
  const re = /\$([^$]+)\$|\*\*([^*]+)\*\*|\n/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>)
    if (m[1] !== undefined) out.push(<Tex key={i++}>{m[1]}</Tex>)
    else if (m[2] !== undefined) out.push(<strong key={i++}>{m[2]}</strong>)
    else out.push(<br key={i++} />)
    last = re.lastIndex
  }
  if (last < text.length) out.push(<Fragment key={i++}>{text.slice(last)}</Fragment>)
  return <>{out}</>
})
