import { calibrate, fieldOfView, IMG_UNITS, magnification, OBJ_UNITS, OBJECTIVES, objectSize, resolution } from '../../../math/alg/microscope'
import { parseNum } from '../../../math/alg/numinput'
import { CalcPage, Examples, NumField, Rules, Seg, SolutionCard, useParam, useSolve } from '../../../math/ui/Calc'
import type { CalcTool } from '../../../math/tools'

type Mode = 'vergroesserung' | 'eichen' | 'groesse' | 'aufloesung' | 'sehfeld'

const RULES: Record<Mode, [string, string][]> = {
  vergroesserung: [
    ['V = V_{\\text{Obj}} \\cdot V_{\\text{Ok}}', 'Gesamtvergrößerung'],
    ['500 \\cdot A \\le V \\le 1000 \\cdot A', 'förderliche Vergrößerung'],
    ['V > 1000 \\cdot A', 'leere Vergrößerung'],
    ['A = n \\cdot \\sin\\alpha', 'numerische Apertur'],
  ],
  eichen: [
    ['t_{\\text{Obj}} = \\frac{1\\,\\text{mm}}{100} = 10\\,\\mu\\text{m}', 'ein Teilstrich des Objektmikrometers'],
    ['E = \\frac{x \\cdot t_{\\text{Obj}}}{y}', 'Eichfaktor (µm pro Okular-Teilstrich)'],
    ['x\\ \\text{Obj.-Teilstriche} \\;\\widehat{=}\\; y\\ \\text{Ok.-Teilstriche}', 'Deckungsstellen suchen'],
  ],
  groesse: [
    ['G = n \\cdot E', 'Objektgröße mit dem Okularmikrometer'],
    ['B = G \\cdot V', 'Bildgröße = Objektgröße · Vergrößerung'],
    ['G = \\frac{B}{V}', 'Objektgröße aus Zeichnung oder Foto'],
    ['1\\,\\text{mm} = 1000\\,\\mu\\text{m}', 'Einheiten angleichen'],
  ],
  aufloesung: [
    ['d = \\frac{\\lambda}{2 \\cdot A}', 'Abbe (Kondensor wie Objektiv)'],
    ['d = \\frac{\\lambda}{A_{\\text{Obj}} + A_{\\text{Kond}}}', 'Abbe, allgemein'],
    ['d = \\frac{0{,}61 \\cdot \\lambda}{A}', 'Rayleigh-Kriterium'],
    ['\\lambda \\approx 550\\,\\text{nm}', 'grünes Licht (Mitte des Spektrums)'],
  ],
  sehfeld: [
    ['d_{\\text{Sehfeld}} = \\frac{\\text{SFZ}}{V_{\\text{Obj}}}', 'Sehfelddurchmesser'],
    ['\\text{SFZ} = 18 \\dots 22\\,\\text{mm}', 'steht auf dem Okular (10×/20)'],
    ['A = \\pi \\cdot \\left(\\tfrac{d}{2}\\right)^2', 'Sehfeldfläche'],
  ],
}

const OBJ_EX = OBJECTIVES.map((o) => [o.V, o.label] as [string, string])

const EX_CAL: Record<string, { label: string; x: string; y: string; obj: string }> = {
  o10: { label: '10er-Objektiv: 25 ≙ 24', x: '25', y: '24', obj: '10' },
  o40: { label: '40er-Objektiv: 10 ≙ 40', x: '10', y: '40', obj: '40' },
  o100: { label: '100er-Objektiv: 4 ≙ 39', x: '4', y: '39', obj: '100' },
}

const EX_SIZE: Record<string, { label: string; art: string; ts?: string; E?: string; B?: string; bu?: string; G?: string; gu?: string; V?: string }> = {
  pantoffel: { label: 'Pantoffeltierchen: 22 Teilstriche', art: 'okular', ts: '22', E: '10,4' },
  hefe: { label: 'Hefezelle: 3 Teilstriche (40er)', art: 'okular', ts: '3', E: '2,5' },
  zeichnung: { label: 'Zeichnung 45 mm bei 400×', art: 'bild', B: '45', bu: 'mm', G: '', gu: 'µm', V: '400' },
  balken: { label: 'Maßstabsbalken 20 mm ≙ 50 µm', art: 'bild', B: '20', bu: 'mm', G: '50', gu: 'µm', V: '' },
  bildgroesse: { label: 'Erythrozyt 7,5 µm bei 1000×', art: 'bild', B: '', bu: 'mm', G: '7,5', gu: 'µm', V: '1000' },
}

export default function Mikroskopie({ tool }: { tool: CalcTool }) {
  const [mode, setMode] = useParam('modus', 'vergroesserung')
  const m = (Object.keys(RULES).includes(mode) ? mode : 'vergroesserung') as Mode
  // gemeinsam: Objektiv
  const [obj, setObj] = useParam('obj', '40')
  const [na, setNa] = useParam('A', '0,65')
  // Vergrößerung
  const [ok, setOk] = useParam('ok', '10')
  const [tube, setTube] = useParam('q', '')
  // Eichen
  const [len, setLen] = useParam('L', '1')
  const [div, setDiv] = useParam('teile', '100')
  const [x, setX] = useParam('x', '10')
  const [y, setY] = useParam('y', '40')
  // Größe
  const [art, setArt] = useParam('art', 'okular')
  const [ts, setTs] = useParam('ts', '12')
  const [E, setE] = useParam('E', '2,5')
  const [B, setB] = useParam('B', '45')
  const [bu, setBu] = useParam('bu', 'mm')
  const [G, setG] = useParam('G', '')
  const [gu, setGu] = useParam('gu', 'µm')
  const [V, setV] = useParam('V', '400')
  // Auflösung
  const [lam, setLam] = useParam('lambda', '550')
  const [naK, setNaK] = useParam('AK', '')
  // Sehfeld
  const [fz, setFz] = useParam('sfz', '20')
  const [cnt, setCnt] = useParam('anzahl', '')

  const sizeMode = art === 'bild' ? 'bild' : 'okular'
  const buOk = IMG_UNITS.includes(bu) ? bu : 'mm'
  const guOk = OBJ_UNITS.includes(gu) ? gu : 'µm'
  const { res, err } = useSolve(() => {
    switch (m) {
      case 'vergroesserung':
        return magnification({ obj: parseNum(obj, 'Objektiv'), ok: parseNum(ok, 'Okular'), tube: parseNum(tube, 'Zwischenvergrößerung'), na: parseNum(na, 'Numerische Apertur') })
      case 'eichen':
        return calibrate({ len: parseNum(len, 'Länge'), div: parseNum(div, 'Teilstriche'), x: parseNum(x, 'Objektmikrometer'), y: parseNum(y, 'Okularmikrometer'), obj: parseNum(obj, 'Objektiv') })
      case 'groesse':
        return objectSize({ mode: sizeMode, ts: parseNum(ts, 'Teilstriche'), E: parseNum(E, 'Eichfaktor'), B: parseNum(B, 'Bildgröße'), bu: buOk, G: parseNum(G, 'Objektgröße'), gu: guOk, V: parseNum(V, 'Vergrößerung') })
      case 'aufloesung':
        return resolution({ lambda: parseNum(lam, 'Wellenlänge'), na: parseNum(na, 'Numerische Apertur'), naK: parseNum(naK, 'Kondensor-Apertur') })
      case 'sehfeld':
        return fieldOfView({ fz: parseNum(fz, 'Sehfeldzahl'), obj: parseNum(obj, 'Objektiv'), tube: parseNum(tube, 'Zwischenvergrößerung'), count: parseNum(cnt, 'Anzahl') })
    }
  }, [m, obj, na, ok, tube, len, div, x, y, sizeMode, ts, E, B, buOk, G, guOk, V, lam, naK, fz, cnt])

  const pickObjective = (v: string) => {
    const o = OBJECTIVES.find((e) => e.V === v)
    if (!o) return
    setObj(o.V)
    setNa(o.A)
  }
  const pickCal = (k: string) => {
    const e = EX_CAL[k]
    setX(e.x)
    setY(e.y)
    setObj(e.obj)
    setLen('1')
    setDiv('100')
  }
  const pickSize = (k: string) => {
    const e = EX_SIZE[k]
    setArt(e.art)
    if (e.ts !== undefined) setTs(e.ts)
    if (e.E !== undefined) setE(e.E)
    if (e.B !== undefined) setB(e.B)
    if (e.bu !== undefined) setBu(e.bu)
    if (e.G !== undefined) setG(e.G)
    if (e.gu !== undefined) setGu(e.gu)
    if (e.V !== undefined) setV(e.V)
  }

  return (
    <CalcPage
      eyebrow="Biologie · Laborrechner"
      title={tool.title}
      intro="Rechnen am Lichtmikroskop: Gesamt- und förderliche Vergrößerung, Okularmikrometer eichen, Objekte ausmessen, Auflösungsgrenze und Sehfeld – jeweils mit vollständigem Rechenweg."
      path={tool.path}
      actions={
        <Seg
          value={m}
          onChange={setMode}
          options={[
            ['vergroesserung', 'Vergrößerung'],
            ['eichen', 'Okularmikrometer eichen'],
            ['groesse', 'Objektgröße'],
            ['aufloesung', 'Auflösung'],
            ['sehfeld', 'Sehfeld'],
          ]}
          label="Aufgabe"
        />
      }
    >
      <div className="calc__grid">
        <section className="calc__in card">
          {m === 'vergroesserung' && (
            <>
              <div className="calc__fields">
                <NumField label="Objektiv" sub="Vergrößerung" value={obj} onChange={setObj} unit="×" />
                <NumField label="Okular" sub="Vergrößerung" value={ok} onChange={setOk} unit="×" />
                <NumField label="Zwischenvergrößerung q" sub="optional, z. B. 1,25" value={tube} onChange={setTube} />
                <NumField label="Numerische Apertur A" sub="optional, auf dem Objektiv" value={na} onChange={setNa} />
              </div>
              <Examples items={[...OBJ_EX]} onPick={pickObjective} current={obj} />
            </>
          )}
          {m === 'eichen' && (
            <>
              <span className="calc__label">Objektmikrometer</span>
              <div className="calc__fields">
                <NumField label="Länge der Skala" value={len} onChange={setLen} unit="mm" />
                <NumField label="geteilt in" value={div} onChange={setDiv} unit="Teilstriche" />
              </div>
              <span className="calc__label">Deckungsstellen</span>
              <div className="calc__fields">
                <NumField label="x Teilstriche" sub="Objektmikrometer" value={x} onChange={setX} />
                <NumField label="y Teilstriche" sub="Okularmikrometer" value={y} onChange={setY} />
                <NumField label="Objektiv" sub="optional, für den Hinweis" value={obj} onChange={setObj} unit="×" />
              </div>
              <Examples items={Object.entries(EX_CAL).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickCal} />
            </>
          )}
          {m === 'groesse' && (
            <>
              <div className="calc__row">
                <span className="calc__label">Gemessen</span>
                <Seg
                  value={sizeMode}
                  onChange={setArt}
                  options={[
                    ['okular', 'mit Okularmikrometer'],
                    ['bild', 'auf Bild oder Zeichnung'],
                  ]}
                  label="Messung"
                />
              </div>
              {sizeMode === 'okular' ? (
                <div className="calc__fields">
                  <NumField label="Teilstriche" sub="Länge des Objekts" value={ts} onChange={setTs} />
                  <NumField label="Eichfaktor E" sub="für dieses Objektiv" value={E} onChange={setE} unit="µm" />
                </div>
              ) : (
                <>
                  <span className="calc__label">Zwei Werte eintragen, einer bleibt leer</span>
                  <div className="calc__fields">
                    <NumField label="Bildgröße B" sub="im Bild gemessen" value={B} onChange={setB} unit={buOk} units={IMG_UNITS} onUnit={setBu} />
                    <NumField label="Objektgröße G" sub="wirkliche Größe" value={G} onChange={setG} unit={guOk} units={OBJ_UNITS} onUnit={setGu} />
                    <NumField label="Vergrößerung V" sub="bzw. Maßstab V : 1" value={V} onChange={setV} />
                  </div>
                </>
              )}
              <Examples items={Object.entries(EX_SIZE).map(([k, e]) => [k, e.label] as [string, string])} onPick={pickSize} />
            </>
          )}
          {m === 'aufloesung' && (
            <>
              <div className="calc__fields">
                <NumField label="Wellenlänge λ" sub="grünes Licht ≈ 550 nm" value={lam} onChange={setLam} unit="nm" />
                <NumField label="Numerische Apertur A" sub="des Objektivs" value={na} onChange={setNa} />
                <NumField label="Apertur des Kondensors" sub="optional" value={naK} onChange={setNaK} />
              </div>
              <Examples items={OBJECTIVES.map((o) => [o.V, o.label] as [string, string])} onPick={pickObjective} current={obj} />
              <div className="calc__ex">
                <span className="calc__ex-k">Licht</span>
                {[
                  ['450', 'blau 450 nm'],
                  ['550', 'grün 550 nm'],
                  ['650', 'rot 650 nm'],
                ].map(([v, l]) => (
                  <button key={v} type="button" className={`calc__chip ${lam === v ? 'is-on' : ''}`} onClick={() => setLam(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </>
          )}
          {m === 'sehfeld' && (
            <>
              <div className="calc__fields">
                <NumField label="Sehfeldzahl" sub="auf dem Okular, z. B. 10×/20" value={fz} onChange={setFz} unit="mm" />
                <NumField label="Objektiv" sub="Vergrößerung" value={obj} onChange={setObj} unit="×" />
                <NumField label="Zwischenvergrößerung q" sub="optional" value={tube} onChange={setTube} />
                <NumField label="Objekte über den Durchmesser" sub="optional, zum Schätzen" value={cnt} onChange={setCnt} />
              </div>
              <Examples items={OBJECTIVES.map((o) => [o.V, o.label] as [string, string])} onPick={pickObjective} current={obj} />
              <div className="calc__ex">
                <span className="calc__ex-k">Sehfeldzahl</span>
                {['18', '20', '22'].map((v) => (
                  <button key={v} type="button" className={`calc__chip ${fz === v ? 'is-on' : ''}`} onClick={() => setFz(v)}>
                    {v} mm
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="calc__hint">Kommazahlen mit Komma oder Punkt.</p>
        </section>
        <Rules items={RULES[m]} />
      </div>
      <SolutionCard sol={res ?? null} err={err} empty="Trage die Werte ein – der Lösungsweg erscheint hier." />
    </CalcPage>
  )
}
