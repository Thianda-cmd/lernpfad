import { useId, useMemo, useState } from 'react'
import { BAUSTEIN_ORDER, BAUSTEINE, BEGRIFFE, FUNKTIONEN, SCHICHTEN, VERGLEICH, ZUSAETZE, type BausteinId, type Schicht, type Teil } from '../data/zellwand'
import type { OrganelleId } from '../data/organelles'
import '../styles/zellwand.css'

type LayerId = Schicht['id']

/** springt innerhalb des scrollbaren Panels zu einem Abschnitt */
function jump(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const sc = el.closest('.panel__scroll') as HTMLElement | null
  if (!sc) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  const top = sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 10
  sc.scrollTo({ top, behavior: 'smooth' })
}

/* ------------------------------ Schichtbild ------------------------------ */

interface Row {
  k: string
  label: string
  h: number
  cls: string
  layer?: LayerId
  faded?: boolean
  group?: 'sek'
}

const ROWS: Row[] = [
  { k: 'nbc', label: 'Nachbarzelle', h: 17, cls: 'cyto', faded: true },
  { k: 'nbp', label: 'Primärwand', h: 15, cls: 'pw', layer: 'primaerwand', faded: true },
  { k: 'ml', label: 'Mittellamelle', h: 13, cls: 'ml', layer: 'mittellamelle' },
  { k: 'pw', label: 'Primärwand', h: 24, cls: 'pw', layer: 'primaerwand' },
  { k: 's1', label: 'S1', h: 14, cls: 's1', layer: 'sekundaerwand', group: 'sek' },
  { k: 's2', label: 'S2', h: 32, cls: 's2', layer: 'sekundaerwand', group: 'sek' },
  { k: 's3', label: 'S3', h: 12, cls: 's3', layer: 'sekundaerwand', group: 'sek' },
  { k: 'pm', label: 'Zellmembran', h: 6, cls: 'pm' },
  { k: 'cy', label: 'Cytoplasma', h: 19, cls: 'cyto' },
]

const W = 400
const LX = 128 // rechte Kante der Beschriftung
const X0 = 140
const X1 = 394
const PIT = 318 // Mitte des Tüpfels
const PIT_W = 30

/** deterministische Zufallszahlen für die Fibrillen */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function WallDiagram({ active, onPick }: { active: LayerId | null; onPick: (id: LayerId) => void }) {
  const uid = useId().replace(/:/g, '')
  const layout = useMemo(() => {
    let y = 4
    const rows = ROWS.map((r) => {
      const o = { ...r, y, cy: y + r.h / 2 }
      y += r.h
      return o
    })
    // Beschriftungen ohne Überlappung (mind. 14 Einheiten Abstand)
    const ys = rows.map((r) => r.cy)
    for (let it = 0; it < 60; it++) {
      for (let i = 1; i < ys.length; i++) {
        const d = ys[i] - ys[i - 1]
        if (d < 14) {
          ys[i - 1] -= (14 - d) / 2
          ys[i] += (14 - d) / 2
        }
      }
    }
    const labelY = new Map(rows.map((r, i) => [r.k, ys[i]]))
    return { rows, labelY, bandH: y - 4, H: y + 16 }
  }, [])
  const { rows, labelY, bandH, H } = layout
  const by = Object.fromEntries(rows.map((r) => [r.k, r]))
  const sek = rows.filter((r) => r.group === 'sek')
  const sekTop = sek[0].y
  const sekBot = sek[sek.length - 1].y + sek[sek.length - 1].h
  const pwBot = by.pw.y + by.pw.h
  const pitL = PIT - PIT_W / 2
  const pitR = PIT + PIT_W / 2

  // Streutextur der Primärwände
  const fibrils = useMemo(() => {
    const out: { k: string; d: string }[] = []
    for (const key of ['nbp', 'pw']) {
      const r = rows.find((x) => x.k === key)!
      const rand = rng(key === 'pw' ? 7 : 19)
      const n = key === 'pw' ? 46 : 30
      let d = ''
      for (let i = 0; i < n; i++) {
        const cx = X0 + 4 + rand() * (X1 - X0 - 8)
        if (Math.abs(cx - PIT) < 9) continue
        const cy = r.y + 3 + rand() * (r.h - 6)
        const a = rand() * Math.PI
        const l = 5 + rand() * 7
        const dx = (Math.cos(a) * l) / 2
        const dy = (Math.sin(a) * l) / 2
        const yA = Math.min(r.y + r.h - 1.5, Math.max(r.y + 1.5, cy - dy))
        const yB = Math.min(r.y + r.h - 1.5, Math.max(r.y + 1.5, cy + dy))
        d += `M${(cx - dx).toFixed(1)} ${yA.toFixed(1)}L${(cx + dx).toFixed(1)} ${yB.toFixed(1)}`
      }
      out.push({ k: key, d })
    }
    return out
  }, [rows])

  const hitRows: { id: LayerId; y: number; h: number }[] = [
    { id: 'primaerwand', y: by.nbp.y, h: by.nbp.h },
    { id: 'mittellamelle', y: by.ml.y, h: by.ml.h },
    { id: 'primaerwand', y: by.pw.y, h: by.pw.h },
    { id: 'sekundaerwand', y: sekTop, h: sekBot - sekTop },
  ]
  const outline = (id: LayerId) => {
    if (id === 'sekundaerwand') return [{ y: sekTop, h: sekBot - sekTop }]
    return rows.filter((r) => r.layer === id).map((r) => ({ y: r.y, h: r.h }))
  }

  const pat = (n: string) => `${uid}-${n}`
  return (
    <figure className="zw-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schichten der Zellwand von der Nachbarzelle bis zum Cytoplasma">
        <defs>
          <pattern id={pat('dots')} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.05" className="zw-dot" />
            <circle cx="4.5" cy="4.5" r="1.05" className="zw-dot" />
          </pattern>
          {(
            [
              ['s1', -58, 4.2],
              ['s2', 74, 3.6],
              ['s3', -24, 4.2],
            ] as [string, number, number][]
          ).map(([k, a, sp]) => (
            <pattern key={k} id={pat(k)} width={sp} height="10" patternUnits="userSpaceOnUse" patternTransform={`rotate(${a})`}>
              <line x1="0" y1="0" x2="0" y2="10" className="zw-par" />
            </pattern>
          ))}
          <clipPath id={pat('band')}>
            <rect x={X0} y={0} width={X1 - X0} height={H} rx="5" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${pat('band')})`}>
          {rows.map((r) => {
            const body = (x: number, w: number, key?: string) => (
              <g key={key ?? r.k} className={r.faded ? 'is-faded' : undefined}>
                <rect x={x} y={r.y} width={w} height={r.h} className={`zw-band zw-band--${r.cls}`} />
                {r.cls === 'ml' && <rect x={x} y={r.y} width={w} height={r.h} fill={`url(#${pat('dots')})`} />}
                {(r.cls === 's1' || r.cls === 's2' || r.cls === 's3') && <rect x={x} y={r.y} width={w} height={r.h} fill={`url(#${pat(r.cls)})`} />}
              </g>
            )
            if (r.group === 'sek') {
              // Sekundärwand mit Tüpfel-Aussparung
              return (
                <g key={r.k}>
                  {body(X0, pitL - X0, r.k + 'a')}
                  {body(pitR, X1 - pitR, r.k + 'b')}
                </g>
              )
            }
            if (r.k === 'pm') return null
            return body(X0, X1 - X0)
          })}
          {/* Tüpfel: Cytoplasma reicht bis an die Primärwand */}
          <rect x={pitL} y={sekTop} width={PIT_W} height={by.cy.y - sekTop + by.cy.h} className="zw-band zw-band--cyto" />
          {/* Fibrillen der Primärwände */}
          {fibrils.map((f) => (
            <path key={f.k} d={f.d} className={`zw-fib ${f.k === 'nbp' ? 'is-faded' : ''}`} />
          ))}
          {/* Plasmodesmos durch Primärwände und Mittellamelle */}
          <rect x={PIT - 3.2} y={by.nbp.y} width={6.4} height={pwBot - by.nbp.y} className="zw-band zw-band--cyto" />
          <path d={`M${PIT - 3.2} ${by.nbp.y}V${pwBot}M${PIT + 3.2} ${by.nbp.y}V${pwBot}`} className="zw-mem zw-mem--thin" />
          <path d={`M${PIT} ${by.nbp.y - 3}V${pwBot + 3}`} className="zw-desmo" />
          {/* Zellmembranen */}
          <path d={`M${X0} ${by.nbp.y}H${PIT - 3.2}M${PIT + 3.2} ${by.nbp.y}H${X1}`} className="zw-mem is-faded" />
          <path d={`M${X0} ${by.pm.cy}H${pitL}V${pwBot + 1}H${PIT - 3.2}M${PIT + 3.2} ${pwBot + 1}H${pitR}V${by.pm.cy}H${X1}`} className="zw-mem" />
        </g>
        <rect x={X0} y={4} width={X1 - X0} height={bandH} rx="5" className="zw-frame" />

        {/* Auswahl */}
        {active &&
          outline(active).map((o, i) => <rect key={i} x={X0 - 1.5} y={o.y - 1} width={X1 - X0 + 3} height={o.h + 2} rx="3" className="zw-sel" />)}

        {/* Beschriftung */}
        {rows.map((r) => {
          const ly = labelY.get(r.k)!
          const on = !!r.layer && r.layer === active
          return (
            <g key={r.k} className={`zw-lab ${r.faded ? 'is-faded' : ''} ${on ? 'is-on' : ''}`}>
              <text x={LX - 4} y={ly} dy="0.35em" textAnchor="end" className={r.group ? 'zw-lab__s' : undefined}>
                {r.label}
              </text>
              <path d={`M${LX} ${ly}C${LX + 6} ${ly} ${X0 - 8} ${r.cy} ${X0 - 2} ${r.cy}`} className="zw-lead" />
            </g>
          )
        })}
        {(() => {
          const a = labelY.get(sek[0].k)! - 6
          const b = labelY.get(sek[sek.length - 1].k)! + 6
          return (
            <g className={`zw-lab ${active === 'sekundaerwand' ? 'is-on' : ''}`}>
              <path d={`M${LX - 22} ${a}h-4V${b}h4`} className="zw-brace" />
              <text x={LX - 31} y={(a + b) / 2} dy="0.35em" textAnchor="end">
                Sekundärwand
              </text>
            </g>
          )
        })()}
        <text x={PIT} y={bandH + 16} textAnchor="middle" className="zw-note">
          Tüpfel mit Plasmodesmos
        </text>

        {/* Klickflächen */}
        {hitRows.map((h, i) => (
          <rect
            key={i}
            x={0}
            y={h.y - 1}
            width={W}
            height={h.h + 2}
            className="zw-hit"
            role="button"
            tabIndex={0}
            aria-label={SCHICHTEN.find((s) => s.id === h.id)!.name}
            onClick={() => onPick(h.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onPick(h.id)
              }
            }}
          />
        ))}
      </svg>
      <figcaption>
        <span>
          <i className="zw-key zw-key--fib" /> Cellulose
        </span>
        <span>
          <i className="zw-key zw-key--ml" /> Pektin
        </span>
        <span>
          <i className="zw-key zw-key--lig" /> Lignin
        </span>
        <span>
          <i className="zw-key zw-key--pm" /> Membran
        </span>
        <span className="zw-fig__hint">Schematisch · Schicht antippen</span>
      </figcaption>
    </figure>
  )
}

/* ------------------------------ Vokabeln ------------------------------ */

/** C6H12O6 → C₆H₁₂O₆ mit echten Tiefstellungen */
function Formel({ f }: { f: string }) {
  return (
    <span className="zw-def__f">
      {f.split(/(\d+)/).map((p, i) => (/^\d+$/.test(p) ? <sub key={i}>{p}</sub> : p))}
    </span>
  )
}

function Def({ id, onClose }: { id: BausteinId; onClose: () => void }) {
  const b = BAUSTEINE[id]
  return (
    <div className="zw-def" role="note">
      <div className="zw-def__top">
        <strong>{b.name}</strong>
        {b.formel && <Formel f={b.formel} />}
        <button type="button" className="zw-def__x" onClick={onClose} aria-label="Schließen">
          ×
        </button>
      </div>
      <p>{b.klasse}</p>
      <p>
        <em>steckt in</em> {b.in}
      </p>
    </div>
  )
}

function Chip({ t, open, onPick }: { t: Teil; open: BausteinId | null; onPick: (g: BausteinId) => void }) {
  const inner = (
    <>
      <span className="zw-chip__n">{t.name}</span>
      {t.info && <span className="zw-chip__i">{t.info}</span>}
    </>
  )
  if (!t.g) return <span className="zw-chip">{inner}</span>
  const g = t.g
  return (
    <button type="button" className={`zw-chip zw-chip--g ${open === g ? 'is-open' : ''}`} aria-expanded={open === g} onClick={() => onPick(g)}>
      {inner}
    </button>
  )
}

function Aus({ items, open, onPick, of }: { items: Teil[]; open: BausteinId | null; onPick: (g: BausteinId) => void; of?: string }) {
  return (
    <>
      <div className={`zw-aus ${of ? 'zw-aus--sub' : ''}`}>
        <span className="zw-aus__k">{of ? <>{of} aus</> : 'aus'}</span>
        <div className="zw-aus__chips">
          {items.map((t, i) => (
            <Chip key={t.name + i} t={t} open={open} onPick={onPick} />
          ))}
        </div>
      </div>
      {items
        .filter((t) => t.aus)
        .map((t) => (
          <Aus key={'sub' + t.name} items={t.aus!} open={open} onPick={onPick} of={t.name} />
        ))}
    </>
  )
}

function Part({ t }: { t: Teil }) {
  const [open, setOpen] = useState<BausteinId | null>(null)
  const pick = (g: BausteinId) => setOpen((o) => (o === g ? null : g))
  return (
    <div className="zw-part">
      <div className="zw-part__head">
        <strong>{t.name}</strong>
        {t.info && <span>{t.info}</span>}
      </div>
      {t.aus && <Aus items={t.aus} open={open} onPick={pick} />}
      {open && <Def id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function LayerCard({ s, n, active }: { s: Schicht; n: number; active: boolean }) {
  return (
    <article id={`zw-${s.id}`} className={`zw-layer zw-layer--${s.id} ${active ? 'is-active' : ''}`}>
      <header className="zw-layer__head">
        <span className="zw-layer__n">{n}</span>
        <div>
          <span className="zw-layer__k">Schicht {n} · {n === 1 ? 'außen' : n === 3 ? 'innen' : 'Mitte'}</span>
          <h4>{s.name}</h4>
        </div>
      </header>
      <p className="zw-layer__kurz">{s.kurz}</p>
      <div className="zw-tags">
        {s.merkmale.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="zw-layer__k zw-layer__k--sec">besteht aus</div>
      <div className="zw-parts">
        {s.aus.map((t) => (
          <Part key={t.name} t={t} />
        ))}
      </div>
      {s.extra && (
        <dl className="zw-voc zw-voc--extra">
          {s.extra.map(([a, b]) => (
            <div key={a}>
              <dt>{a}</dt>
              <dd>{b}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  )
}

const SECTIONS: [string, string][] = [
  ['zw-schichten', 'Schichten'],
  ['zw-zusaetze', 'Ein- & Auflagerungen'],
  ['zw-bausteine', 'Bausteine'],
  ['zw-funktionen', 'Funktionen'],
  ['zw-begriffe', 'Begriffe'],
  ['zw-vergleich', 'Andere Zellwände'],
]

const LINKS: Partial<Record<string, OrganelleId>> = {
  Plasmodesmen: 'plasmodesmen',
  Turgor: 'vakuole',
}

export function ZellwandVokabeln({ onNavigate }: { onNavigate?: (id: OrganelleId) => void }) {
  const [active, setActive] = useState<LayerId | null>(null)
  const [glossOpen, setGlossOpen] = useState<BausteinId | null>(null)
  const pick = (id: LayerId) => {
    setActive(id)
    jump(`zw-${id}`)
  }
  return (
    <div className="zw">
      <nav className="zw-nav" aria-label="Abschnitte">
        {SECTIONS.map(([id, l]) => (
          <button key={id} type="button" onClick={() => jump(id)}>
            {l}
          </button>
        ))}
      </nav>

      <section id="zw-schichten" className="odetail__section">
        <h3>Schichten von außen nach innen</h3>
        <WallDiagram active={active} onPick={pick} />
        <div className="zw-chain" aria-label="Reihenfolge">
          {SCHICHTEN.map((s, i) => (
            <button key={s.id} type="button" className={active === s.id ? 'is-on' : ''} onClick={() => pick(s.id)}>
              <b>{i + 1}</b> {s.name}
            </button>
          ))}
          <span>→ Zellmembran</span>
        </div>
        <div className="zw-layers">
          {SCHICHTEN.map((s, i) => (
            <LayerCard key={s.id} s={s} n={i + 1} active={active === s.id} />
          ))}
        </div>
      </section>

      <section id="zw-zusaetze" className="odetail__section">
        <h3>Ein- und Auflagerungen</h3>
        <div className="zw-parts zw-parts--box">
          {ZUSAETZE.map((t) => (
            <Part key={t.name} t={t} />
          ))}
        </div>
      </section>

      <section id="zw-bausteine" className="odetail__section">
        <h3>Bausteine</h3>
        <div className="zw-bs">
          {BAUSTEIN_ORDER.map((id) => {
            const b = BAUSTEINE[id]
            const on = glossOpen === id
            return (
              <button key={id} type="button" className={`zw-bs__item ${on ? 'is-open' : ''}`} aria-expanded={on} onClick={() => setGlossOpen(on ? null : id)}>
                <span className="zw-bs__top">
                  <strong>{b.name}</strong>
                  {b.formel && <Formel f={b.formel} />}
                </span>
                <span className="zw-bs__k">{b.klasse}</span>
                {on && (
                  <span className="zw-bs__in">
                    <em>steckt in</em> {b.in}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section id="zw-funktionen" className="odetail__section">
        <h3>Funktionen</h3>
        <dl className="zw-voc">
          {FUNKTIONEN.map(([a, b]) => (
            <div key={a}>
              <dt>{a}</dt>
              <dd>{b}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="zw-begriffe" className="odetail__section">
        <h3>Begriffe</h3>
        {BEGRIFFE.map((g) => (
          <div key={g.t} className="zw-group">
            <h5>{g.t}</h5>
            <dl className="zw-voc">
              {g.items.map(([a, b]) => {
                const link = LINKS[a]
                return (
                  <div key={a}>
                    <dt>
                      {link && onNavigate ? (
                        <button type="button" className="zw-link" onClick={() => onNavigate(link)}>
                          {a}
                        </button>
                      ) : (
                        a
                      )}
                    </dt>
                    <dd>{b}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
        ))}
      </section>

      <section id="zw-vergleich" className="odetail__section">
        <h3>Andere Zellwände</h3>
        <div className="zw-cmp">
          {VERGLEICH.map((v) => (
            <div key={v.wer} className={`zw-cmp__row ${v.aus === '–' ? 'is-none' : ''}`}>
              <strong>{v.wer}</strong>
              <div>
                <span className="zw-cmp__stoff">{v.stoff}</span>
                {v.aus !== '–' && (
                  <span className="zw-cmp__aus">
                    <em>aus</em> {v.aus}
                  </span>
                )}
                {v.extra && <small>{v.extra}</small>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
