/** Zellzahl, Keimzahl & Wachstum, Verdünnungsreihe, Mikroskopie, Zentrifuge */
import { check, expectError, group, near, resultHas, run } from '../harness'
import type { Solution } from '../../src/math/alg/step'
import { parseNum } from '../../src/math/alg/numinput'
import { toNum } from '../../src/math/q'
import { CHAMBERS, chamberCount, seeding, viability } from '../../src/math/alg/cells'
import { colonyCount, growth, round2, weightedMean } from '../../src/math/alg/micro'
import { parseFactors, sci, serialDilution, standardSeries, totalDilution } from '../../src/math/alg/serial'
import { calibrate, fieldOfView, magnification, objectSize, resolution } from '../../src/math/alg/microscope'
import { K_RZB, rcfFromRpm, rotorSwap, rpmFromRcf } from '../../src/math/alg/centrifuge'

group('bio', () => {
  const N = (s: string) => parseNum(s)
  /** rechnen + KaTeX prüfen + markierte Ergebniszeile verlangen */
  const R = <S extends Solution>(where: string, f: () => S): S | null => {
    const s = run(where, f)
    if (s) check(`${where} [Ergebniszeile]`, s.steps.some((x) => x.final), 'keine Zeile mit final: true')
    return s
  }
  /** Text in Hinweis, Überschriften oder Erklärungen */
  const has = (where: string, s: Solution | null, text: string) =>
    check(where, !!s && [s.remark ?? '', ...s.steps.map((x) => `${x.head ?? ''} ${x.note ?? ''}`)].join(' ').includes(text), `„${text}“ fehlt`)
  const hasNot = (where: string, s: Solution | null, text: string) => check(where, !!s && !(s.remark ?? '').includes(text), `„${text}“ sollte nicht im Hinweis stehen`)
  /** Kammerdaten: Neubauer-Großquadrat, Trypanblau 1 + 1 */
  const NB = { chamber: 'gross', vCells: N('10'), vStain: N('10') }

  /* ============================ Zählkammer ============================ */

  // Zellkultur: 4 Eckquadrate 52/47/55/50, Trypanblau 1 + 1 → 51 / 10⁻⁴ mL · 2 = 1,02 · 10⁶ Zellen/mL
  let c = R('Zählkammer Zellkultur', () => chamberCount({ ...NB, counts: '52; 47; 55; 50', vol: N('10'), volUnit: 'mL' }))
  near('Zählkammer Zellkultur: Mittelwert', c?.mean ?? NaN, 51)
  near('Zählkammer Zellkultur: Zellen/mL', c?.perMl ?? NaN, 1.02e6)
  near('Zählkammer Zellkultur: Gesamtzellzahl', c?.total ?? NaN, 1.02e7)
  near('Zählkammer Zellkultur: Quadratvolumen', c?.vQ ?? NaN, 1e-4)
  near('Zählkammer Zellkultur: Faktor', c?.factor ?? NaN, 2)
  resultHas('Zählkammer Zellkultur: Anzeige', c, '1,02 \\cdot 10^{6}', 'Zellen/mL')
  has('Zählkammer: L-Regel', c, 'L-Regel')
  has('Zählkammer: Einheiten umrechnen', c, 'Einheiten umrechnen')
  // Komma mit Leerzeichen als Trenner
  c = R('Zählkammer Liste mit Kommas', () => chamberCount({ ...NB, counts: '52, 47, 55, 50' }))
  near('Zählkammer Liste mit Kommas: Zellen/mL', c?.perMl ?? NaN, 1.02e6)
  // Leukozyten: Türk 1 : 20, 4 Großquadrate → 40 / 10⁻⁴ · 20 = 8 · 10⁶/mL = 8000/µL (klassisch: Summe · 50)
  c = R('Zählkammer Leukozyten', () => chamberCount({ chamber: 'gross', counts: '35; 42; 38; 45', pre: N('20') }))
  near('Zählkammer Leukozyten: Zellen/mL', c?.perMl ?? NaN, 8e6)
  resultHas('Zählkammer Leukozyten: pro µL', c, '8000', 'Zellen/')
  near('Zählkammer Leukozyten = Summe · 50 pro µL', (c?.perMl ?? NaN) / 1000, (35 + 42 + 38 + 45) * 50)
  // Erythrozyten: 5 Gruppenquadrate (0,04 mm², 0,1 mm), 1 : 200 → 100 / 4 · 10⁻⁶ mL · 200 = 5 · 10⁹/mL
  c = R('Zählkammer Erythrozyten', () => chamberCount({ chamber: 'gruppe', counts: '98; 102; 95; 105; 100', pre: N('200') }))
  near('Zählkammer Erythrozyten: Quadratvolumen', c?.vQ ?? NaN, 4e-6)
  near('Zählkammer Erythrozyten: Zellen/mL', c?.perMl ?? NaN, 5e9)
  // Liquor: Fuchs-Rosenthal (Tiefe 0,2 mm), alle 16 Großquadrate, 12 Zellen → 3,75 Zellen/µL (= 12 / 3,2 µL)
  c = R('Zählkammer Liquor Fuchs-Rosenthal', () => chamberCount({ chamber: 'fr', counts: '1; 0; 2; 1; 0; 1; 1; 0; 2; 1; 0; 1; 1; 1; 0; 0' }))
  near('Zählkammer Liquor: Zellen/mL', c?.perMl ?? NaN, 3750)
  near('Zählkammer Liquor: = Zellen / 3,2 µL', (c?.perMl ?? NaN) / 1000, 12 / 3.2)
  has('Zählkammer Liquor: wenige Zellen', c, 'Zufallsfehler')
  // Hefe in Kleinstquadraten (0,0025 mm²), Vorverdünnung 1 : 10 → 5 / 2,5 · 10⁻⁷ mL · 10 = 2 · 10⁸/mL
  c = R('Zählkammer Hefe Kleinstquadrate', () => chamberCount({ chamber: 'klein', counts: '6; 4; 5; 7; 3; 5; 6; 4; 5; 5; 6; 7; 4; 5; 6; 2; 5; 4; 6; 5', pre: N('10') }))
  near('Zählkammer Hefe: Zellen/mL', c?.perMl ?? NaN, 2e8)
  // eigene Kammer: 0,25 mm², 0,02 mm tief → 5 · 10⁻⁶ mL; 22 / 5 · 10⁻⁶ = 4,4 · 10⁶
  c = R('Zählkammer eigene Kammer', () => chamberCount({ chamber: 'eigen', area: N('0,25'), depth: N('0,02'), counts: '20; 24; 22' }))
  near('Zählkammer eigene Kammer: Zellen/mL', c?.perMl ?? NaN, 4.4e6)
  // Trypanblau 10 + 40 µL (F = 5) und Vorverdünnung 2 → F = 10
  c = R('Zählkammer Trypan 1 + 4 und Vorverdünnung', () => chamberCount({ chamber: 'gross', vCells: N('10'), vStain: N('40'), pre: N('2'), counts: '30; 34' }))
  near('Zählkammer Trypan 1 + 4: Faktor', c?.factor ?? NaN, 10)
  near('Zählkammer Trypan 1 + 4: Zellen/mL', c?.perMl ?? NaN, 3.2e6)
  // Warnungen
  c = R('Zählkammer ungleichmäßig', () => chamberCount({ ...NB, counts: '50; 52; 48; 95' }))
  has('Zählkammer ungleichmäßig: Hinweis', c, 'ungleichmäßig')
  c = R('Zählkammer zu dicht', () => chamberCount({ ...NB, counts: '250; 260; 240; 255' }))
  has('Zählkammer zu dicht: Hinweis', c, 'Stärker verdünnen')
  c = R('Zählkammer wenige Zellen', () => chamberCount({ ...NB, counts: '3; 5; 4; 2' }))
  has('Zählkammer wenige Zellen: Hinweis', c, 'mindestens 100 Zellen')
  c = R('Zählkammer dünne Suspension', () => chamberCount({ ...NB, counts: '9; 8; 10; 9; 9; 8; 10; 9; 9; 9; 10; 8' }))
  has('Zählkammer dünne Suspension: Hinweis', c, 'gut zählbar')
  c = R('Zählkammer gleichmäßig', () => chamberCount({ ...NB, counts: '52; 47; 55; 50' }))
  hasNot('Zählkammer gleichmäßig: keine Warnung', c, 'ungleichmäßig')
  for (const ch of CHAMBERS) R(`Zählkammer Vorlage ${ch.id}`, () => chamberCount({ chamber: ch.id, area: N('0,04'), depth: N('0,1'), counts: '40; 44' }))
  expectError('Zählkammer: keine Werte', () => chamberCount({ ...NB, counts: '  ' }))
  expectError('Zählkammer: negativer Wert', () => chamberCount({ ...NB, counts: '52; -5' }))
  expectError('Zählkammer: Kommazahl', () => chamberCount({ ...NB, counts: '52,5; 47' }))
  expectError('Zählkammer: nur Nullen', () => chamberCount({ ...NB, counts: '0; 0; 0' }))
  expectError('Zählkammer: eigene Kammer ohne Tiefe', () => chamberCount({ chamber: 'eigen', area: N('1'), depth: null, counts: '10' }))
  expectError('Zählkammer: Tiefe 0', () => chamberCount({ chamber: 'eigen', area: N('1'), depth: N('0'), counts: '10' }))
  expectError('Zählkammer: Fläche zu groß', () => chamberCount({ chamber: 'eigen', area: N('400'), depth: N('0,1'), counts: '10' }))
  expectError('Zählkammer: Trypanblau ohne Zellvolumen', () => chamberCount({ chamber: 'gross', vCells: null, vStain: N('10'), counts: '10' }))
  expectError('Zählkammer: Zellvolumen ohne Trypanblau', () => chamberCount({ chamber: 'gross', vCells: N('10'), vStain: null, counts: '10' }))
  expectError('Zählkammer: Vorverdünnung unter 1', () => chamberCount({ chamber: 'gross', pre: N('0,5'), counts: '10' }))
  expectError('Zählkammer: Text statt Zahl', () => chamberCount({ ...NB, counts: '52; abc' }))

  /* ============================ Vitalität ============================ */

  // 195 lebende, 16 tote in 4 Quadraten, Trypanblau 1 + 1 → 92,42 %, lebend 9,75 · 10⁵/mL, gesamt 1,055 · 10⁶/mL
  let v = R('Vitalität je Quadrat', () => viability({ ...NB, live: '48; 52; 45; 50', dead: '4; 3; 5; 4', vol: N('10'), volUnit: 'mL' }))
  near('Vitalität je Quadrat: %', v?.vit ?? NaN, 92.41706)
  near('Vitalität je Quadrat: lebende/mL', v?.liveMl ?? NaN, 975000)
  near('Vitalität je Quadrat: alle/mL', v?.allMl ?? NaN, 1055000)
  near('Vitalität je Quadrat: lebende gesamt', v?.liveTotal ?? NaN, 9.75e6)
  resultHas('Vitalität je Quadrat: Anzeige', v, '92,4')
  has('Vitalität: zügig auszählen', v, 'Zügig auszählen')
  // Summen: 180 lebend, 45 tot in 4 Quadraten → 80 %, lebend 45 / 10⁻⁴ · 2 = 9 · 10⁵/mL
  v = R('Vitalität aus Summen', () => viability({ ...NB, live: '180', dead: '45', squares: N('4') }))
  near('Vitalität aus Summen: %', v?.vit ?? NaN, 80)
  near('Vitalität aus Summen: lebende/mL', v?.liveMl ?? NaN, 9e5)
  has('Vitalität aus Summen: mäßig', v, 'mäßig')
  // ohne Trypanblau-Verdünnung (z. B. Erythrosin direkt), 60 % → niedrig
  v = R('Vitalität niedrig', () => viability({ chamber: 'gross', live: '60', dead: '40', squares: N('2') }))
  near('Vitalität niedrig: %', v?.vit ?? NaN, 60)
  near('Vitalität niedrig: lebende/mL', v?.liveMl ?? NaN, 3e5)
  has('Vitalität niedrig: Hinweis', v, 'niedrig')
  expectError('Vitalität: ungleich viele Werte', () => viability({ ...NB, live: '48; 52; 45', dead: '4; 3' }))
  expectError('Vitalität: Quadrate passen nicht', () => viability({ ...NB, live: '48; 52; 45', dead: '4; 3; 5', squares: N('4') }))
  expectError('Vitalität: keine Zellen', () => viability({ ...NB, live: '0; 0', dead: '0; 0' }))
  expectError('Vitalität: Quadrate keine ganze Zahl', () => viability({ ...NB, live: '100', dead: '10', squares: N('2,5') }))
  expectError('Vitalität: tote fehlen', () => viability({ ...NB, live: '100', dead: '' }))

  /* ============================ Zellen aussäen ============================ */

  // 24-Well, je 5 · 10⁴ Zellen in 0,5 mL, 10 % Zuschlag, c₁ = 1,02 · 10⁶/mL → V₁ = 1 · 10⁵ · 13,2 / 1,02 · 10⁶ = 1,294 mL
  let s = R('Aussäen 24-Well', () => seeding({ c: N('1,02·10^6'), target: 'abs', perVessel: N('5·10^4'), n: N('24'), vMed: N('0,5'), vu: 'mL', reserve: N('10') }))
  near('Aussäen 24-Well: c₂', s?.c2 ?? NaN, 1e5)
  near('Aussäen 24-Well: Gesamtvolumen', s?.vTotal ?? NaN, 13.2)
  near('Aussäen 24-Well: Zellsuspension', s?.vCells ?? NaN, 1.2941176)
  near('Aussäen 24-Well: Medium', s?.vMedium ?? NaN, 11.905882)
  resultHas('Aussäen 24-Well: Anzeige', s, '1,294', '11,91', 'mL')
  // 6-Well über die Fläche: 1 · 10⁴ Zellen/cm² · 9,6 cm², 2 mL, ohne Zuschlag, c₁ = 8 · 10⁵/mL → 0,72 mL + 11,28 mL
  s = R('Aussäen 6-Well über Fläche', () => seeding({ c: N('8·10^5'), target: 'flaeche', density: N('1·10^4'), area: N('9,6'), n: N('6'), vMed: N('2'), vu: 'mL', reserve: N('0') }))
  near('Aussäen 6-Well: Zellen pro Well', s?.perVessel ?? NaN, 96000)
  near('Aussäen 6-Well: Zellsuspension', s?.vCells ?? NaN, 0.72)
  near('Aussäen 6-Well: Medium', s?.vMedium ?? NaN, 11.28)
  // 96-Well mit 100 µL je Well
  s = R('Aussäen 96-Well in µL', () => seeding({ c: N('5e5'), target: 'abs', perVessel: N('1·10^4'), n: N('96'), vMed: N('100'), vu: 'µL', reserve: N('10') }))
  near('Aussäen 96-Well: Gesamtvolumen', s?.vTotal ?? NaN, 10.56)
  near('Aussäen 96-Well: Zellsuspension', s?.vCells ?? NaN, 2.112)
  near('Aussäen 96-Well: Medium', s?.vMedium ?? NaN, 8.448)
  expectError('Aussäen: Suspension zu dünn', () => seeding({ c: N('5·10^4'), target: 'abs', perVessel: N('5·10^4'), n: N('24'), vMed: N('0,5'), vu: 'mL' }))
  expectError('Aussäen: Gefäße keine ganze Zahl', () => seeding({ c: N('1e6'), target: 'abs', perVessel: N('5e4'), n: N('2,5'), vMed: N('0,5'), vu: 'mL' }))
  expectError('Aussäen: 0 Gefäße', () => seeding({ c: N('1e6'), target: 'abs', perVessel: N('5e4'), n: N('0'), vMed: N('0,5'), vu: 'mL' }))
  expectError('Aussäen: Zuschlag über 100 %', () => seeding({ c: N('1e6'), target: 'abs', perVessel: N('5e4'), n: N('4'), vMed: N('0,5'), vu: 'mL', reserve: N('150') }))
  expectError('Aussäen: Dichte fehlt', () => seeding({ c: N('1e6'), target: 'flaeche', density: null, area: N('9,6'), n: N('6'), vMed: N('2'), vu: 'mL' }))
  expectError('Aussäen: Konzentration fehlt', () => seeding({ c: null, target: 'abs', perVessel: N('5e4'), n: N('6'), vMed: N('2'), vu: 'mL' }))

  /* ============================ Koloniezahl (KbE) ============================ */

  // 3 Spatelplatten 10⁻⁵, je 0,1 mL: 164 / (0,1 mL · 10⁻⁵) = 1,64 · 10⁸ → 1,6 · 10⁸ KbE/mL
  let k = R('KbE Spatelplatten', () => colonyCount({ plates: '156; 172; 164', V: N('0,1'), vu: 'mL', k: N('5'), per: 'mL' }))
  near('KbE Spatelplatten: N', k?.N ?? NaN, 1.64e8)
  near('KbE Spatelplatten: gerundet', k?.rounded ?? NaN, 1.6e8)
  resultHas('KbE Spatelplatten: Anzeige', k, '1,6 \\cdot 10^{8}', 'KbE/mL')
  has('KbE: zählbarer Bereich erklärt', k, '30–300')
  // Gussplatten 1 mL, 10⁻³: 52 / 10⁻³ = 5,2 · 10⁴
  k = R('KbE Gussplatten', () => colonyCount({ plates: '48; 56', V: N('1'), vu: 'mL', k: N('3') }))
  near('KbE Gussplatten: N', k?.N ?? NaN, 52000)
  near('KbE Gussplatten: gerundet', k?.rounded ?? NaN, 52000)
  // gleiches Ergebnis mit 100 µL auf 10⁻²; „-3“ als Stufe wird wie 3 verstanden
  k = R('KbE Volumen in µL', () => colonyCount({ plates: '48; 56', V: N('100'), vu: 'µL', k: N('2') }))
  near('KbE Volumen in µL: N', k?.N ?? NaN, 52000)
  k = R('KbE Stufe mit Minus', () => colonyCount({ plates: '48; 56', V: N('1'), vu: 'mL', k: N('-3') }))
  near('KbE Stufe mit Minus: N', k?.N ?? NaN, 52000)
  // feste Probe: KbE/g
  k = R('KbE Lebensmittel', () => colonyCount({ plates: '87; 95', V: N('1'), vu: 'mL', k: N('4'), per: 'g' }))
  near('KbE Lebensmittel: N', k?.N ?? NaN, 910000)
  resultHas('KbE Lebensmittel: Einheit', k, 'KbE/g', '9,1')
  // Rundung: dritte Ziffer 5 → aufrunden (16 500 → 1,7 · 10⁴)
  k = R('KbE Rundung', () => colonyCount({ plates: '165', V: N('1'), vu: 'mL', k: N('2') }))
  near('KbE Rundung: gerundet', k?.rounded ?? NaN, 17000)
  near('round2 19 182', round2(19181.818), 19000)
  near('round2 27 757 576', round2(27757575.76), 2.8e7)
  near('round2 99,6', round2(99.6), 100)
  // außerhalb des zählbaren Bereichs
  k = R('KbE zu dicht', () => colonyCount({ plates: '412; 389', V: N('0,1'), vu: 'mL', k: N('3') }))
  has('KbE zu dicht: Warnung', k, 'mehr als 300')
  k = R('KbE zu wenige', () => colonyCount({ plates: '12; 18', V: N('0,1'), vu: 'mL', k: N('3') }))
  has('KbE zu wenige: Warnung', k, 'weniger als 30')
  expectError('KbE: keine Platten', () => colonyCount({ plates: '', V: N('1'), vu: 'mL', k: N('3') }))
  expectError('KbE: Volumen 0', () => colonyCount({ plates: '50', V: N('0'), vu: 'mL', k: N('3') }))
  expectError('KbE: Stufe keine ganze Zahl', () => colonyCount({ plates: '50', V: N('1'), vu: 'mL', k: N('2,5') }))
  expectError('KbE: keine Kolonien', () => colonyCount({ plates: '0; 0', V: N('1'), vu: 'mL', k: N('3') }))
  expectError('KbE: Stufe fehlt', () => colonyCount({ plates: '50', V: N('1'), vu: 'mL', k: null }))

  /* ============================ gewichtetes Mittel ============================ */

  // häufiges Lehrbuchbeispiel: 168 + 215 (10⁻²), 14 + 25 (10⁻³), je 1 mL → 422 / (1 · 2,2 · 10⁻²) = 19 182 → 1,9 · 10⁴
  let w = R('Gewichtet je 2 Platten', () => weightedMean({ c1: '168; 215', c2: '14; 25', V: N('1'), vu: 'mL', k: N('2') }))
  near('Gewichtet je 2 Platten: N', w?.N ?? NaN, 19181.818)
  near('Gewichtet je 2 Platten: gerundet', w?.rounded ?? NaN, 19000)
  resultHas('Gewichtet je 2 Platten: Anzeige', w, '1,9 \\cdot 10^{4}')
  has('Gewichtet: Norm genannt', w, 'DIN EN ISO 7218')
  // Futtermittel-Anleitung der HS Neubrandenburg (Formel wie DIN EN ISO 7218), Beispiel A: 847 + 69 Kolonien, 0,1 mL, d = 10⁻⁴.
  // Dort steht im Nenner versehentlich 0,22 – richtig ist 0,1 · (3 + 0,1 · 3) = 0,33: 916 / 3,3 · 10⁻⁵ = 2,78 · 10⁷ → 2,8 · 10⁷ KbE/g
  w = R('Gewichtet je 3 Platten', () => weightedMean({ c1: '295; 278; 274', c2: '19; 27; 23', V: N('0,1'), vu: 'mL', k: N('4'), per: 'g' }))
  near('Gewichtet je 3 Platten: N', w?.N ?? NaN, 27757575.76)
  near('Gewichtet je 3 Platten: gerundet', w?.rounded ?? NaN, 2.8e7)
  resultHas('Gewichtet je 3 Platten: Einheit', w, 'KbE/g')
  // Platte über 300 wird nicht berücksichtigt: n₁ = 2, n₂ = 3, ΣC = 633 → 633 / (0,1 · 2,3 · 10⁻⁵) = 2,75 · 10⁸
  w = R('Gewichtet mit Platte über 300', () => weightedMean({ c1: '312; 268; 281', c2: '31; 24; 29', V: N('0,1'), vu: 'mL', k: N('5') }))
  near('Gewichtet über 300: N', w?.N ?? NaN, 275217391.3)
  has('Gewichtet über 300: Hinweis', w, '312')
  // je eine Platte: (168 + 15) / (1 · 1,1 · 10⁻²) = 16 636 → 1,7 · 10⁴
  w = R('Gewichtet je 1 Platte', () => weightedMean({ c1: '168', c2: '15', V: N('1'), vu: 'mL', k: N('2') }))
  near('Gewichtet je 1 Platte: N', w?.N ?? NaN, 16636.364)
  near('Gewichtet je 1 Platte: gerundet', w?.rounded ?? NaN, 17000)
  expectError('Gewichtet: niedrige Stufe alle über 300', () => weightedMean({ c1: '412; 389', c2: '41; 39', V: N('1'), vu: 'mL', k: N('2') }))
  expectError('Gewichtet: höhere Stufe fehlt', () => weightedMean({ c1: '168; 215', c2: '', V: N('1'), vu: 'mL', k: N('2') }))
  expectError('Gewichtet: alle unter 10 Kolonien', () => weightedMean({ c1: '8; 6', c2: '1; 0', V: N('1'), vu: 'mL', k: N('2') }))
  expectError('Gewichtet: Stufen vertauscht', () => weightedMean({ c1: '14; 25', c2: '168; 215', V: N('1'), vu: 'mL', k: N('2') }))
  expectError('Gewichtet: Volumen fehlt', () => weightedMean({ c1: '168; 215', c2: '14; 25', V: null, vu: 'mL', k: N('2') }))

  /* ============================ Generationszeit ============================ */

  // E. coli: 2 · 10⁴ → 6,4 · 10⁵ in 100 min → n = 5, g = 20 min, µ = ln 32 / 100 min
  let g = R('Wachstum E. coli', () => growth({ mode: 'messung', N0: N('2·10^4'), Nt: N('6,4·10^5'), t: N('100'), tu: 'min', unit: 'Zellen/mL' }))
  near('Wachstum E. coli: n', g?.n ?? NaN, 5)
  near('Wachstum E. coli: g', g?.g ?? NaN, 20)
  near('Wachstum E. coli: µ', g?.mu ?? NaN, 0.034657359)
  resultHas('Wachstum E. coli: Anzeige', g, '20', 'min')
  resultHas('Wachstum E. coli: µ pro Stunde', g, '2,079')
  // Hefe: 1,5 · 10⁶ → 2,4 · 10⁷ in 6 h → n = 4, g = 1,5 h
  g = R('Wachstum Hefe', () => growth({ mode: 'messung', N0: N('1,5·10^6'), Nt: N('2,4·10^7'), t: N('6'), tu: 'h' }))
  near('Wachstum Hefe: g', g?.g ?? NaN, 1.5)
  near('Wachstum Hefe: µ', g?.mu ?? NaN, 0.46209812)
  // nicht ganzzahlige Generationen: 10⁵ → 3 · 10⁶ in 4 h → n = log₂ 30 = 4,907, g = 0,8152 h = 48,91 min
  g = R('Wachstum krumme Generationen', () => growth({ mode: 'messung', N0: N('1e5'), Nt: N('3e6'), t: N('4'), tu: 'h' }))
  near('Wachstum krumm: n', g?.n ?? NaN, 4.9068906)
  near('Wachstum krumm: g', g?.g ?? NaN, 0.81518019)
  resultHas('Wachstum krumm: in Minuten', g, '48,91', 'min')
  // Zellzahl nach 3 h bei g = 20 min: 10³ · 2⁹ = 5,12 · 10⁵
  g = R('Wachstum Zellzahl nach t', () => growth({ mode: 'menge', N0: N('1·10^3'), g: N('20'), t: N('180'), tu: 'min' }))
  near('Wachstum Zellzahl nach t: N', g?.Nt ?? NaN, 512000)
  near('Wachstum Zellzahl nach t: n', g?.n ?? NaN, 9)
  // Zeit bis 10⁶ bei g = 30 min ab 500: t = 30 · log₂ 2000 = 328,97 min
  g = R('Wachstum Zeit bis N', () => growth({ mode: 'dauer', N0: N('5·10^2'), g: N('30'), N: N('1·10^6'), tu: 'min' }))
  near('Wachstum Zeit bis N: t', g?.t ?? NaN, 328.97353)
  resultHas('Wachstum Zeit bis N: in Stunden', g, '5,483', 'h')
  // Zellkultur: 2 · 10⁵ → 1,6 · 10⁶ bei g = 24 h → 3 Generationen = 72 h = 3 d
  g = R('Wachstum Zellkultur', () => growth({ mode: 'dauer', N0: N('2·10^5'), g: N('24'), N: N('1,6·10^6'), tu: 'h', unit: 'Zellen' }))
  near('Wachstum Zellkultur: t', g?.t ?? NaN, 72)
  resultHas('Wachstum Zellkultur: in Tagen', g, '= 3', 'd')
  expectError('Wachstum: Zellzahl nimmt ab', () => growth({ mode: 'messung', N0: N('1e6'), Nt: N('5e5'), t: N('60'), tu: 'min' }))
  expectError('Wachstum: keine Veränderung', () => growth({ mode: 'messung', N0: N('1e6'), Nt: N('1e6'), t: N('60'), tu: 'min' }))
  expectError('Wachstum: Zeit 0', () => growth({ mode: 'messung', N0: N('1e4'), Nt: N('1e6'), t: N('0'), tu: 'min' }))
  expectError('Wachstum: Generationszeit fehlt', () => growth({ mode: 'menge', N0: N('1e3'), g: null, t: N('60'), tu: 'min' }))
  expectError('Wachstum: Ziel kleiner als Start', () => growth({ mode: 'dauer', N0: N('1e6'), g: N('20'), N: N('1e5'), tu: 'min' }))
  expectError('Wachstum: unrealistische Zellzahl', () => growth({ mode: 'menge', N0: N('1e300'), g: N('20'), t: N('200'), tu: 'min' }))
  expectError('Wachstum: zu viele Generationen', () => growth({ mode: 'menge', N0: N('1e3'), g: N('20'), t: N('10000'), tu: 'min' }))

  /* ============================ serielle Verdünnung ============================ */

  // 10⁸ KbE/mL, 6 Stufen 1 : 10, je 10 mL → 1 mL + 9 mL, letzte Stufe 100 KbE/mL, 10⁻⁶
  let d = R('Seriell 1 : 10', () => serialDilution({ c0: N('1·10^8'), unit: 'KbE/mL', F: N('10'), k: N('6'), V: N('10'), vu: 'mL', basis: 'misch' }))
  near('Seriell 1 : 10: Übertrag', toNum(d?.vT ?? { n: 0n, d: 1n }), 0.001)
  near('Seriell 1 : 10: Verdünnungsmittel', toNum(d?.vD ?? { n: 0n, d: 1n }), 0.009)
  check('Seriell 1 : 10: 6 Zeilen', d?.rows.length === 6)
  near('Seriell 1 : 10: letzte Konzentration', d?.rows[5].c ? toNum(d.rows[5].c) : NaN, 100)
  near('Seriell 1 : 10: Gesamtverdünnung', d ? toNum(d.rows[5].F) : NaN, 1e6)
  resultHas('Seriell 1 : 10: Anzeige', d, '100', 'KbE/mL', '10^{-6}')
  has('Seriell: Schreibweise erklärt', d, '1 Teil Probe in insgesamt')
  // Mikrotiterplatte 1 : 2, 100 µL sollen übrig bleiben → 200 µL mischen, 100 µL übertragen; 64 µg/mL → 0,25 µg/mL nach 8 Stufen
  d = R('Seriell 1 : 2 Restvolumen', () => serialDilution({ c0: N('64'), unit: 'µg/mL', F: N('2'), k: N('8'), V: N('100'), vu: 'µL', basis: 'rest' }))
  near('Seriell 1 : 2: Mischvolumen', toNum(d?.vMix ?? { n: 0n, d: 1n }), 200e-6)
  near('Seriell 1 : 2: Übertrag', toNum(d?.vT ?? { n: 0n, d: 1n }), 100e-6)
  near('Seriell 1 : 2: letzte Konzentration', d?.rows[7].c ? toNum(d.rows[7].c) : NaN, 0.25)
  near('Seriell 1 : 2: Gesamtverdünnung', d ? toNum(d.rows[7].F) : NaN, 256)
  // ohne Konzentration: 1 : 5 in 1 mL → 200 µL + 800 µL, 1 : 625
  d = R('Seriell 1 : 5 ohne c₀', () => serialDilution({ F: N('5'), k: N('4'), V: N('1'), vu: 'mL' }))
  near('Seriell 1 : 5: Übertrag', toNum(d?.vT ?? { n: 0n, d: 1n }), 200e-6)
  near('Seriell 1 : 5: Verdünnungsmittel', toNum(d?.vD ?? { n: 0n, d: 1n }), 800e-6)
  resultHas('Seriell 1 : 5: Anzeige', d, '200', '800', 'L')
  near('Seriell 1 : 5: Gesamtverdünnung', d ? toNum(d.rows[3].F) : NaN, 625)
  // Faktor 2,5: 100 → 16 nach 2 Stufen; 5 mL → 2 mL + 3 mL
  d = R('Seriell Faktor 2,5', () => serialDilution({ c0: N('100'), unit: 'mg/L', F: N('2,5'), k: N('2'), V: N('5'), vu: 'mL' }))
  near('Seriell Faktor 2,5: Übertrag', toNum(d?.vT ?? { n: 0n, d: 1n }), 0.002)
  near('Seriell Faktor 2,5: c₂', d?.rows[1].c ? toNum(d.rows[1].c) : NaN, 16)
  d = R('Seriell winziger Übertrag', () => serialDilution({ F: N('10'), k: N('2'), V: N('1'), vu: 'µL' }))
  has('Seriell winziger Übertrag: Warnung', d, '2 µL')
  expectError('Seriell: Faktor 1', () => serialDilution({ F: N('1'), k: N('3'), V: N('1'), vu: 'mL' }))
  expectError('Seriell: Faktor unter 1', () => serialDilution({ F: N('0,5'), k: N('3'), V: N('1'), vu: 'mL' }))
  expectError('Seriell: 0 Stufen', () => serialDilution({ F: N('10'), k: N('0'), V: N('1'), vu: 'mL' }))
  expectError('Seriell: halbe Stufe', () => serialDilution({ F: N('10'), k: N('2,5'), V: N('1'), vu: 'mL' }))
  expectError('Seriell: zu viele Stufen', () => serialDilution({ F: N('10'), k: N('25'), V: N('1'), vu: 'mL' }))
  expectError('Seriell: Volumen 0', () => serialDilution({ F: N('10'), k: N('3'), V: N('0'), vu: 'mL' }))
  expectError('Seriell: negative Konzentration', () => serialDilution({ c0: N('-5'), F: N('10'), k: N('3'), V: N('1'), vu: 'mL' }))
  expectError('Seriell: unbekannte Einheit', () => serialDilution({ F: N('10'), k: N('3'), V: N('1'), vu: 'dl' }))

  /* ============================ Standardreihe ============================ */

  // BSA aus 2 mg/mL, je 500 µL: 0 / 6,25 / 12,5 / 25 / 50 µL Stamm, zusammen 93,75 µL
  let t = R('Standardreihe BSA', () => standardSeries({ stock: N('2'), su: 'mg/mL', targets: '0; 25; 50; 100; 200', tu: 'µg/mL', V: N('500'), vu: 'µL' }))
  const bsa = [0, 6.25, 12.5, 25, 50]
  bsa.forEach((x, i) => near(`Standardreihe BSA: Std ${i + 1}`, t?.rows[i] ? toNum(t.rows[i].vS) : NaN, x, 1e-9, 1e-12))
  near('Standardreihe BSA: Summe Stamm', toNum(t?.totalS ?? { n: 0n, d: 1n }), 93.75)
  near('Standardreihe BSA: Summe Puffer', toNum(t?.totalD ?? { n: 0n, d: 1n }), 2406.25)
  resultHas('Standardreihe BSA: Anzeige', t, '93,75')
  has('Standardreihe BSA: Einheiten umgerechnet', t, 'Einheiten umrechnen')
  // Glucose aus 100 mmol/L, je 1 mL: 0,02 … 0,1 mL, zusammen 0,3 mL
  t = R('Standardreihe Glucose', () => standardSeries({ stock: N('100'), su: 'mmol/L', targets: '0; 2; 4; 6; 8; 10', tu: 'mmol/L', V: N('1'), vu: 'mL' }))
  near('Standardreihe Glucose: Std 6', t?.rows[5] ? toNum(t.rows[5].vS) : NaN, 0.1)
  near('Standardreihe Glucose: Summe', toNum(t?.totalS ?? { n: 0n, d: 1n }), 0.3)
  // Nitrat aus 1 g/L im 50-mL-Kolben: 0,25 / 0,5 / 1,25 / 2,5 mL
  t = R('Standardreihe Nitrat', () => standardSeries({ stock: N('1'), su: 'g/L', targets: '0, 5, 10, 25, 50', tu: 'mg/L', V: N('50'), vu: 'mL' }))
  near('Standardreihe Nitrat: Std 5', t?.rows[4] ? toNum(t.rows[4].vS) : NaN, 2.5)
  near('Standardreihe Nitrat: Summe', toNum(t?.totalS ?? { n: 0n, d: 1n }), 4.5)
  t = R('Standardreihe winzige Volumina', () => standardSeries({ stock: N('10'), su: 'mg/mL', targets: '10; 20', tu: 'µg/mL', V: N('500'), vu: 'µL' }))
  has('Standardreihe winzig: Zwischenverdünnung', t, 'Zwischenverdünnung')
  expectError('Standardreihe: Standard konzentrierter als Stamm', () => standardSeries({ stock: N('1'), su: 'mg/mL', targets: '500; 2000', tu: 'µg/mL', V: N('1'), vu: 'mL' }))
  expectError('Standardreihe: Masse und Stoffmenge gemischt', () => standardSeries({ stock: N('1'), su: 'mg/mL', targets: '1; 2', tu: 'mmol/L', V: N('1'), vu: 'mL' }))
  expectError('Standardreihe: negativer Standard', () => standardSeries({ stock: N('1'), su: 'mg/mL', targets: '-5; 2', tu: 'µg/mL', V: N('1'), vu: 'mL' }))
  expectError('Standardreihe: keine Standards', () => standardSeries({ stock: N('1'), su: 'mg/mL', targets: ' ', tu: 'µg/mL', V: N('1'), vu: 'mL' }))
  expectError('Standardreihe: Volumen 0', () => standardSeries({ stock: N('1'), su: 'mg/mL', targets: '1; 2', tu: 'µg/mL', V: N('0'), vu: 'mL' }))
  expectError('Standardreihe: Stamm fehlt', () => standardSeries({ stock: null, su: 'mg/mL', targets: '1; 2', tu: 'µg/mL', V: N('1'), vu: 'mL' }))

  /* ============================ Gesamtverdünnung ============================ */

  // 1 : 10 · 1 : 10 · 1 : 2 = 200; gemessen 0,35 mg/mL → 70 mg/mL
  let f = R('Gesamtverdünnung mit Rückrechnung', () => totalDilution({ factors: '1:10; 1:10; 1:2', c: N('0,35'), unit: 'mg/mL' }))
  near('Gesamtverdünnung: F', f ? toNum(f.F) : NaN, 200)
  resultHas('Gesamtverdünnung: c₀', f, '70', 'mg/mL')
  f = R('Gesamtverdünnung Zehnerstufen', () => totalDilution({ factors: '10 10 10 10' }))
  near('Gesamtverdünnung Zehnerstufen: F', f ? toNum(f.F) : NaN, 1e4)
  resultHas('Gesamtverdünnung Zehnerstufen: Stufe', f, '10^{-4}')
  f = R('Gesamtverdünnung Lebensmittel', () => totalDilution({ factors: '1+9; 1:10; 1:10; 1:10' }))
  near('Gesamtverdünnung Lebensmittel: F', f ? toNum(f.F) : NaN, 1e4)
  f = R('Gesamtverdünnung 1 + 4 und 1 : 20', () => totalDilution({ factors: '1 + 4; 1 : 20', c: N('0,42'), unit: 'µg/mL' }))
  near('Gesamtverdünnung 1 + 4: F', f ? toNum(f.F) : NaN, 100)
  resultHas('Gesamtverdünnung 1 + 4: c₀', f, '42')
  near('Faktoren mit Komma', toNum(parseFactors('2,5; 4').reduce((a, x) => ({ n: a.n * x.F.n, d: a.d * x.F.d }), { n: 1n, d: 1n })), 10)
  near('Faktor als Zehnerpotenz 1e+3', toNum(parseFactors('1e+3')[0].F), 1000)
  f = R('Gesamtverdünnung krummer Faktor', () => totalDilution({ factors: '3:10' }))
  resultHas('Gesamtverdünnung krummer Faktor: gerundet', f, '\\approx', '3,333')
  expectError('Gesamtverdünnung: Faktor unter 1', () => totalDilution({ factors: '0,5' }))
  expectError('Gesamtverdünnung: leer', () => totalDilution({ factors: '' }))
  expectError('Gesamtverdünnung: 1 : 0', () => totalDilution({ factors: '1:0' }))
  expectError('Gesamtverdünnung: falsch herum', () => totalDilution({ factors: '10:1' }))
  expectError('Gesamtverdünnung: Unsinn', () => totalDilution({ factors: 'abc' }))
  expectError('Gesamtverdünnung: doppelter Doppelpunkt', () => totalDilution({ factors: '1:2:3' }))

  /* ============================ Mikroskopie ============================ */

  // 40 × 10 = 400; A = 0,65 → förderlich 325 … 650
  let m = R('Vergrößerung 40 × 10', () => magnification({ obj: N('40'), ok: N('10'), na: N('0,65') }))
  near('Vergrößerung 40 × 10', m?.V ?? NaN, 400)
  check('Vergrößerung 40 × 10: förderlich', m?.verdict === 'foerderlich')
  m = R('Vergrößerung leer', () => magnification({ obj: N('40'), ok: N('25'), na: N('0,65') }))
  near('Vergrößerung 40 × 25', m?.V ?? NaN, 1000)
  check('Vergrößerung 40 × 25: leer', m?.verdict === 'leer')
  resultHas('Vergrößerung leer: Anzeige', m, 'leere Vergrößerung')
  m = R('Vergrößerung unterhalb', () => magnification({ obj: N('10'), ok: N('10'), na: N('0,25') }))
  check('Vergrößerung 10 × 10: unterhalb', m?.verdict === 'unter')
  m = R('Vergrößerung mit Tubusfaktor', () => magnification({ obj: N('100'), ok: N('10'), tube: N('1,25'), na: N('1,25') }))
  near('Vergrößerung 100 × 10 × 1,25', m?.V ?? NaN, 1250)
  check('Vergrößerung 1250 bei A = 1,25: noch förderlich', m?.verdict === 'foerderlich')
  m = R('Vergrößerung ohne Apertur', () => magnification({ obj: N('4'), ok: N('10') }))
  near('Vergrößerung 4 × 10', m?.V ?? NaN, 40)
  expectError('Vergrößerung: Objektiv 0', () => magnification({ obj: N('0'), ok: N('10') }))
  expectError('Vergrößerung: Okular fehlt', () => magnification({ obj: N('40'), ok: null }))
  expectError('Vergrößerung: Apertur 2', () => magnification({ obj: N('40'), ok: N('10'), na: N('2') }))
  expectError('Vergrößerung: Tubusfaktor 0', () => magnification({ obj: N('40'), ok: N('10'), tube: N('0') }))

  // Okularmikrometer: 10 Teilstriche Objektmikrometer (je 10 µm) ≙ 40 Okular-Teilstriche → 2,5 µm
  let e = R('Eichen 40er', () => calibrate({ len: N('1'), div: N('100'), x: N('10'), y: N('40'), obj: N('40') }))
  near('Eichen 40er: E', e?.E ?? NaN, 2.5)
  resultHas('Eichen 40er: Anzeige', e, '2,5')
  e = R('Eichen 10er', () => calibrate({ len: N('1'), div: N('100'), x: N('25'), y: N('24') }))
  near('Eichen 10er: E', e?.E ?? NaN, 10.416667)
  e = R('Eichen 2-mm-Skala', () => calibrate({ len: N('2'), div: N('200'), x: N('50'), y: N('49') }))
  near('Eichen 2-mm-Skala: E', e?.E ?? NaN, 10.204082)
  e = R('Eichen 100er', () => calibrate({ len: N('1'), div: N('100'), x: N('4'), y: N('39'), obj: N('100') }))
  near('Eichen 100er: E', e?.E ?? NaN, 1.025641)
  expectError('Eichen: mehr Teilstriche als vorhanden', () => calibrate({ len: N('1'), div: N('100'), x: N('150'), y: N('40') }))
  expectError('Eichen: Okular 0', () => calibrate({ len: N('1'), div: N('100'), x: N('10'), y: N('0') }))
  expectError('Eichen: Skala zu lang', () => calibrate({ len: N('50'), div: N('100'), x: N('10'), y: N('40') }))
  expectError('Eichen: halbe Teilung', () => calibrate({ len: N('1'), div: N('2,5'), x: N('1'), y: N('4') }))

  // Objektgröße
  let z = R('Objektgröße Okularmikrometer', () => objectSize({ mode: 'okular', ts: N('12'), E: N('2,5') }))
  near('Objektgröße 12 · 2,5 µm', z?.G ?? NaN, 30)
  z = R('Objektgröße Pantoffeltierchen', () => objectSize({ mode: 'okular', ts: N('22'), E: N('10,4') }))
  near('Objektgröße 22 · 10,4 µm', z?.G ?? NaN, 228.8)
  z = R('Objektgröße aus Zeichnung', () => objectSize({ mode: 'bild', B: N('45'), bu: 'mm', V: N('400') }))
  near('Objektgröße 45 mm / 400', z?.G ?? NaN, 112.5)
  resultHas('Objektgröße aus Zeichnung: Anzeige', z, '112,5')
  z = R('Bildgröße', () => objectSize({ mode: 'bild', G: N('7,5'), gu: 'µm', V: N('1000') }))
  near('Bildgröße 7,5 µm · 1000', z?.B ?? NaN, 7500)
  resultHas('Bildgröße: in mm', z, '7,5', 'mm')
  z = R('Maßstab aus Balken', () => objectSize({ mode: 'bild', B: N('20'), bu: 'mm', G: N('50'), gu: 'µm' }))
  near('Maßstab 20 mm / 50 µm', z?.V ?? NaN, 400)
  z = R('Maßstab gemischte Einheiten', () => objectSize({ mode: 'bild', B: N('2'), bu: 'cm', G: N('0,05'), gu: 'mm' }))
  near('Maßstab 2 cm / 0,05 mm', z?.V ?? NaN, 400)
  expectError('Objektgröße: alle drei Werte', () => objectSize({ mode: 'bild', B: N('20'), bu: 'mm', G: N('50'), gu: 'µm', V: N('400') }))
  expectError('Objektgröße: nur ein Wert', () => objectSize({ mode: 'bild', B: N('20'), bu: 'mm' }))
  expectError('Objektgröße: negative Bildgröße', () => objectSize({ mode: 'bild', B: N('-20'), bu: 'mm', V: N('400') }))
  expectError('Objektgröße: Eichfaktor fehlt', () => objectSize({ mode: 'okular', ts: N('12'), E: null }))

  // Auflösung: d = λ / (2A)
  let a = R('Auflösung Öl 1,25', () => resolution({ lambda: N('550'), na: N('1,25') }))
  near('Auflösung Öl: Abbe', a?.abbe ?? NaN, 220)
  near('Auflösung Öl: Rayleigh', a?.rayleigh ?? NaN, 268.4)
  resultHas('Auflösung Öl: in µm', a, '0,22', '\\mu\\text{m}')
  a = R('Auflösung 40er', () => resolution({ lambda: N('550'), na: N('0,65') }))
  near('Auflösung 40er: Abbe', a?.abbe ?? NaN, 423.07692)
  near('Auflösung 40er: Rayleigh', a?.rayleigh ?? NaN, 516.15385)
  a = R('Auflösung mit Kondensor', () => resolution({ lambda: N('550'), na: N('1,25'), naK: N('0,9') }))
  near('Auflösung mit Kondensor: Abbe', a?.abbe ?? NaN, 255.81395)
  a = R('Auflösung blaues Licht', () => resolution({ lambda: N('450'), na: N('1,4') }))
  near('Auflösung blau: Abbe', a?.abbe ?? NaN, 160.71429)
  expectError('Auflösung: Apertur zu groß', () => resolution({ lambda: N('550'), na: N('1,8') }))
  expectError('Auflösung: Wellenlänge zu klein', () => resolution({ lambda: N('50'), na: N('1,25') }))
  expectError('Auflösung: Wellenlänge fehlt', () => resolution({ lambda: null, na: N('1,25') }))

  // Sehfeld: SFZ / V_Obj
  let fv = R('Sehfeld 20 / 40', () => fieldOfView({ fz: N('20'), obj: N('40') }))
  near('Sehfeld 20 / 40', fv?.d ?? NaN, 0.5)
  resultHas('Sehfeld 20 / 40: in µm', fv, '500', '\\mu\\text{m}')
  resultHas('Sehfeld 20 / 40: Fläche', fv, '0,1963')
  fv = R('Sehfeld 18 / 10', () => fieldOfView({ fz: N('18'), obj: N('10') }))
  near('Sehfeld 18 / 10', fv?.d ?? NaN, 1.8)
  fv = R('Sehfeld mit Tubusfaktor', () => fieldOfView({ fz: N('22'), obj: N('100'), tube: N('1,25') }))
  near('Sehfeld 22 / (100 · 1,25)', fv?.d ?? NaN, 0.176)
  fv = R('Sehfeld Größe schätzen', () => fieldOfView({ fz: N('20'), obj: N('40'), count: N('4') }))
  near('Sehfeld Größe schätzen', fv?.size ?? NaN, 125)
  expectError('Sehfeld: SFZ 0', () => fieldOfView({ fz: N('0'), obj: N('40') }))
  expectError('Sehfeld: SFZ unrealistisch', () => fieldOfView({ fz: N('60'), obj: N('40') }))
  expectError('Sehfeld: Objektiv fehlt', () => fieldOfView({ fz: N('20'), obj: null }))

  /* ============================ Zentrifuge ============================ */

  // Faktor aus der Herleitung: 4π² / (3600 · 100 · 9,81) ≈ 1,118 · 10⁻⁵
  near('Zentrifuge: Faktor', toNum(K_RZB), (4 * Math.PI ** 2) / (3600 * 100 * 9.81), 1e-3)
  // r = 10 cm, 3000 min⁻¹ → 1006 × g
  let z2 = R('RZB 10 cm, 3000 rpm', () => rcfFromRpm({ r: N('10'), ru: 'cm', n: N('3000') }))
  near('RZB 10 cm, 3000 rpm', z2?.rcf ?? NaN, 1006.2)
  resultHas('RZB 10 cm, 3000 rpm: Anzeige', z2, '1006', '\\times g')
  has('RZB: Herleitung erklärt', z2, '\\omega')
  has('RZB: r_max erklärt', z2, 'r_{\\max}')
  z2 = R('RZB 84 mm, 13 000 rpm', () => rcfFromRpm({ r: N('84'), ru: 'mm', n: N('13000') }))
  near('RZB 84 mm, 13 000 rpm', z2?.rcf ?? NaN, 15871.128)
  z2 = R('RZB doppelte Drehzahl', () => rcfFromRpm({ r: N('10'), ru: 'cm', n: N('6000') }))
  near('RZB doppelte Drehzahl = 4-fach', z2?.rcf ?? NaN, 4 * 1006.2)
  // 10 000 × g bei r = 7 cm → 11 304 min⁻¹
  z2 = R('Drehzahl 10 000 × g, 7 cm', () => rpmFromRcf({ r: N('7'), ru: 'cm', rcf: N('10000') }))
  near('Drehzahl 10 000 × g, 7 cm', z2?.rpm ?? NaN, 11303.946)
  resultHas('Drehzahl 10 000 × g: Anzeige', z2, '11 304')
  z2 = R('Drehzahl 10 000 × g, 70 mm', () => rpmFromRcf({ r: N('70'), ru: 'mm', rcf: N('10000') }))
  near('Drehzahl 10 000 × g, 70 mm', z2?.rpm ?? NaN, 11303.946)
  z2 = R('Drehzahl 300 × g, 15 cm', () => rpmFromRcf({ r: N('15'), ru: 'cm', rcf: N('300') }))
  near('Drehzahl 300 × g, 15 cm', z2?.rpm ?? NaN, 1337.5009)
  // Rotor wechseln: 4000 min⁻¹ bei 15 cm → 4899 min⁻¹ bei 10 cm, RZB 2683 × g
  z2 = R('Rotor wechseln 15 → 10 cm', () => rotorSwap({ r1: N('15'), n1: N('4000'), r2: N('10'), ru: 'cm' }))
  near('Rotor wechseln: n₂', z2?.rpm ?? NaN, 4898.9795)
  near('Rotor wechseln: RZB', z2?.rcf ?? NaN, 2683.2)
  z2 = R('Rotor wechseln 8 → 9,5 cm', () => rotorSwap({ r1: N('8'), n1: N('12000'), r2: N('9,5'), ru: 'cm' }))
  near('Rotor wechseln größer: n₂', z2?.rpm ?? NaN, 11011.955)
  expectError('Zentrifuge: Radius 0', () => rcfFromRpm({ r: N('0'), ru: 'cm', n: N('3000') }))
  expectError('Zentrifuge: Radius 2 m', () => rcfFromRpm({ r: N('200'), ru: 'cm', n: N('3000') }))
  expectError('Zentrifuge: Radius winzig', () => rcfFromRpm({ r: N('0,1'), ru: 'cm', n: N('3000') }))
  expectError('Zentrifuge: negative Drehzahl', () => rcfFromRpm({ r: N('10'), ru: 'cm', n: N('-3000') }))
  expectError('Zentrifuge: RZB unter 1 × g', () => rpmFromRcf({ r: N('10'), ru: 'cm', rcf: N('0,5') }))
  expectError('Zentrifuge: RZB fehlt', () => rpmFromRcf({ r: N('10'), ru: 'cm', rcf: null }))
  expectError('Zentrifuge: Radius in m', () => rcfFromRpm({ r: N('0,1'), ru: 'm', n: N('3000') }))
  expectError('Zentrifuge: Rotor ohne r₂', () => rotorSwap({ r1: N('15'), n1: N('4000'), r2: null, ru: 'cm' }))

  /* ============================ Zahlenformat ============================ */

  check('sci: 1,02 · 10⁶', sci(1.02e6, 3).t === '1{,}02 \\cdot 10^{6}' && !sci(1.02e6, 3).approx)
  check('sci: exakte Hälfte rundet auf', sci(1055000, 3).t === '1{,}06 \\cdot 10^{6}' && sci(1055000, 3).approx)
  check('sci: kleine Zahl', sci(2.5e-7, 4, 1e-2).t === '2{,}5 \\cdot 10^{-7}')
  check('sci: mittlere Zahl normal', sci(8000, 3).t === '8000')
})
