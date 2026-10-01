import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { IconRestart, IconZoomIn, IconZoomOut } from './icons'

interface T {
  s: number
  x: number
  y: number
}

const MAX = 6

/**
 * Zoomen (Mausrad, Knöpfe) und Verschieben (Ziehen) für Schaubilder.
 * Ein Klick nach dem Ziehen wird unterdrückt, damit nicht versehentlich ein Organell gewählt wird.
 */
export function ZoomPan({ children, className = '' }: { children: ReactNode; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [t, setT] = useState<T>({ s: 1, x: 0, y: 0 })
  const tRef = useRef(t)
  tRef.current = t
  const drag = useRef<{ px: number; py: number; tx: number; ty: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  const clamp = useCallback((n: T): T => {
    const el = wrap.current
    if (!el) return n
    const w = el.clientWidth
    const h = el.clientHeight
    const s = Math.min(MAX, Math.max(1, n.s))
    return { s, x: Math.min(0, Math.max(w - w * s, n.x)), y: Math.min(0, Math.max(h - h * s, n.y)) }
  }, [])

  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      const cur = tRef.current
      const s = Math.min(MAX, Math.max(1, cur.s * factor))
      const r = s / cur.s
      const next = clamp({ s, x: px - (px - cur.x) * r, y: py - (py - cur.y) * r })
      tRef.current = next
      setT(next)
    },
    [clamp],
  )

  const zoomCenter = (factor: number) => {
    const el = wrap.current
    if (!el) return
    zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor)
  }

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0018))
    }
    const onClickCapture = (e: MouseEvent) => {
      if (suppressClick.current) {
        e.stopPropagation()
        e.preventDefault()
        suppressClick.current = false
      }
    }
    const onResize = () => setT((cur) => clamp(cur))
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('click', onClickCapture, true)
    window.addEventListener('resize', onResize)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('resize', onResize)
    }
  }, [zoomAt, clamp])

  return (
    <div
      ref={wrap}
      className={`zoompan ${t.s > 1 ? 'is-zoomed' : ''} ${className}`}
      onPointerDown={(e) => {
        if (e.button !== 0 || tRef.current.s <= 1) return
        drag.current = { px: e.clientX, py: e.clientY, tx: tRef.current.x, ty: tRef.current.y, moved: false }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        const dx = e.clientX - d.px
        const dy = e.clientY - d.py
        if (!d.moved && Math.hypot(dx, dy) > 4) {
          d.moved = true
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }
        if (d.moved) setT(clamp({ s: tRef.current.s, x: d.tx + dx, y: d.ty + dy }))
      }}
      onPointerUp={(e) => {
        if (drag.current?.moved) {
          suppressClick.current = true
          ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
        }
        drag.current = null
      }}
      onDoubleClick={() => setT({ s: 1, x: 0, y: 0 })}
    >
      <div className="zoompan__inner" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }}>
        {children}
      </div>
      <div className="zoompan__ctrl" onPointerDown={(e) => e.stopPropagation()}>
        <button className="icon-btn" onClick={() => zoomCenter(1.4)} aria-label="Vergrößern" title="Vergrößern">
          <IconZoomIn />
        </button>
        <button className="icon-btn" onClick={() => zoomCenter(1 / 1.4)} aria-label="Verkleinern" title="Verkleinern" disabled={t.s <= 1}>
          <IconZoomOut />
        </button>
        <button className="icon-btn" onClick={() => setT({ s: 1, x: 0, y: 0 })} aria-label="Zoom zurücksetzen" title="Zurücksetzen" disabled={t.s <= 1}>
          <IconRestart />
        </button>
        <span className="zoompan__level">{Math.round(t.s * 100)} %</span>
      </div>
    </div>
  )
}
