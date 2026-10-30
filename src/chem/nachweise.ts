/**
 * Qualitative Ionennachweise (Praktikum BTA) – Ablauf, Beobachtung, Reaktionsgleichungen.
 *
 * Gleichungs-Kurzschrift: Teilchen durch „ + “ getrennt, Pfeil „ → “.
 * „SO4^2-“ = Ladung, „↓“ Niederschlag, „↑“ Gas, „{weiß}“ = Beschriftung darunter,
 * führende Zahl mit Leerzeichen = Koeffizient („3 SCN^-“).
 */

import type { Well } from './lab'

export type Ppt = { color: string; size: 'fein' | 'kaesig' }

export interface Step {
  /** Was du tust */
  act: string
  /** Zugegebenes Reagenz als Formel (Kurzschrift wie oben) */
  reagent?: string
  /** Beobachtung nach dem Schritt */
  obs?: string
  // Reagenzglas
  fill?: number
  liquid?: string
  drops?: boolean
  ppt?: Ppt | 'weg'
  gas?: boolean
  ring?: string
  heat?: boolean
  /** Uhrglas: Menge der festen Probe (0–1) */
  solid?: number
  /** Reagenzglas im Wasserbad */
  bath?: boolean
  /** Geruch, der aufsteigt */
  smell?: string
  // Tüpfelplatte
  /** Änderungen je Mulde (0–5) */
  wells?: Record<number, Well>
  /** in diese Mulden wird getropft */
  into?: number[]
  // Gaskammer
  /** oberes Uhrglas auflegen */
  lid?: boolean
  /** Farbe des Indikatorpapiers */
  paper?: string
  /** aufsteigendes Gas */
  fumes?: string
  // Flammenfärbung
  flame?: string
  stick?: boolean
  cobalt?: boolean
}

export interface Note {
  t: string
  eq?: string
}

export interface Nachweis {
  id: string
  /** Ion als Kurzschrift, z. B. „SO4^2-“ */
  ion: string
  name: string
  kind: 'anion' | 'kation'
  method: 'faellung' | 'gas' | 'farbe' | 'flamme'
  /** Standard: Reagenzglas */
  vessel?: 'uhrglas' | 'tuepfel' | 'gaskammer'
  status: 'praktikum' | 'spaeter'
  /** Reagenzien kurz, für die Liste */
  short: string
  steps: Step[]
  eq: string[]
  /** eindeutiges Ergebnis */
  result: string
  swatch: string
  notes?: Note[]
  /** Säure, mit der angesäuert wird */
  acid?: string
  /** Nachweisreagenz */
  reagentName: string
}

export const C = {
  clear: 'rgba(160, 196, 214, 0.22)',
  white: '#f3f1ea',
  paleYellow: '#ece0a8',
  yellow: '#e2c547',
  bloodRed: '#8f1d1d',
  prussian: '#1d3c8c',
  deepBlue: '#2a5bb0',
  lightBlue: '#8db6d6',
  brown: '#6e4a26',
  /** Titangelb (sauer/neutral) */
  titan: '#e6be37',
  /** Titangelb in Natronlauge ohne Mg²⁺ */
  titanOrange: '#e49a3a',
  /** Farblack Mg(OH)₂ + Titangelb */
  lightRed: '#d2343f',
  rustBrown: '#8a3b1f',
  azo: '#c8326b',
  raspberry: '#d6336c',
  sulfur: '#efe3a0',
  black: '#2d2722',
  paleGreen: 'rgba(170, 200, 160, 0.32)',
  crystal: '#a9c8a0',
  /** feuchtes Universalindikatorpapier */
  paperNeutral: '#e3b448',
  paperBlue: '#3d6fb8',
  paperWhite: '#f3f0e6',
}

const loesen: Step = { act: 'Probe in ca. 2 mL dest. Wasser lösen', reagent: 'H2O', fill: 0.34, liquid: C.clear }

export const NACHWEISE: Nachweis[] = [
  {
    id: 'sulfat',
    ion: 'SO4^2-',
    name: 'Sulfat',
    kind: 'anion',
    method: 'faellung',
    status: 'praktikum',
    short: 'HCl, BaCl2',
    reagentName: 'Bariumchlorid-Lösung',
    acid: 'Salzsäure',
    steps: [
      loesen,
      { act: 'Mit verdünnter Salzsäure ansäuern', reagent: 'HCl', drops: true, fill: 0.4, obs: 'keine Veränderung' },
      { act: 'Bariumchlorid-Lösung zutropfen', reagent: 'BaCl2', drops: true, fill: 0.46, ppt: { color: C.white, size: 'fein' }, obs: 'weißer, feinkristalliner Niederschlag' },
    ],
    eq: ['Ba^2+ + SO4^2- → BaSO4↓{weiß}'],
    result: 'weißer, feinkristalliner Niederschlag mit Bariumchlorid – unlöslich in Säure',
    swatch: C.white,
    notes: [{ t: 'Salzsäure zerstört Carbonat – Bariumcarbonat wäre sonst ebenfalls ein weißer Niederschlag.', eq: 'CO3^2- + 2 H3O^+ → CO2↑ + 3 H2O' }],
  },
  {
    id: 'chlorid',
    ion: 'Cl^-',
    name: 'Chlorid',
    kind: 'anion',
    method: 'faellung',
    status: 'praktikum',
    short: 'HNO3, AgNO3',
    reagentName: 'Silbernitrat-Lösung',
    acid: 'Salpetersäure',
    steps: [
      loesen,
      { act: 'Mit verdünnter Salpetersäure ansäuern', reagent: 'HNO3', drops: true, fill: 0.4, obs: 'keine Veränderung' },
      { act: 'Silbernitrat-Lösung zutropfen', reagent: 'AgNO3', drops: true, fill: 0.46, ppt: { color: C.white, size: 'kaesig' }, obs: 'weißer, käsiger Niederschlag' },
      { act: 'Verdünnte Ammoniak-Lösung zugeben', reagent: 'NH3', drops: true, fill: 0.56, ppt: 'weg', obs: 'Niederschlag löst sich auf' },
    ],
    eq: ['Ag^+ + Cl^- → AgCl↓{weiß}', 'AgCl + 2 NH3 → [Ag(NH3)2]^+ + Cl^-'],
    result: 'weißer, käsiger Niederschlag mit Silbernitrat – löst sich in verdünnter Ammoniak-Lösung',
    swatch: C.white,
    notes: [
      { t: 'Salpetersäure statt Salzsäure – Salzsäure enthält selbst Chlorid.' },
      { t: 'Die Säure entfernt Carbonat und Hydroxid, die mit Ag⁺ sonst auch ausfallen.' },
      { t: 'Am Licht wird Silberchlorid langsam grau-violett (es entsteht Silber).' },
    ],
  },
  {
    id: 'bromid',
    ion: 'Br^-',
    name: 'Bromid',
    kind: 'anion',
    method: 'faellung',
    status: 'praktikum',
    short: 'HNO3, AgNO3, NH3',
    reagentName: 'Silbernitrat-Lösung',
    acid: 'Salpetersäure',
    steps: [
      loesen,
      { act: 'Mit verdünnter Salpetersäure ansäuern', reagent: 'HNO3', drops: true, fill: 0.4, obs: 'keine Veränderung' },
      { act: 'Silbernitrat-Lösung zutropfen', reagent: 'AgNO3', drops: true, fill: 0.46, ppt: { color: C.paleYellow, size: 'kaesig' }, obs: 'gelblich-weißer Niederschlag' },
      { act: 'Verdünnte Ammoniak-Lösung zugeben', reagent: 'NH3', drops: true, fill: 0.54, obs: 'löst sich kaum' },
      { act: 'Konzentrierte Ammoniak-Lösung zugeben (Abzug)', reagent: 'NH3', drops: true, fill: 0.62, ppt: 'weg', obs: 'Niederschlag löst sich auf' },
    ],
    eq: ['Ag^+ + Br^- → AgBr↓{hellgelb}', 'AgBr + 2 NH3 → [Ag(NH3)2]^+ + Br^-'],
    result: 'gelblich-weißer Niederschlag mit Silbernitrat – löst sich erst in konzentrierter Ammoniak-Lösung',
    swatch: C.paleYellow,
    notes: [{ t: 'Ammoniakwasser = Ammoniak-Lösung NH₃(aq). Nicht verwechseln mit Ammonium NH₄⁺.' }],
  },
  {
    id: 'iodid',
    ion: 'I^-',
    name: 'Iodid',
    kind: 'anion',
    method: 'faellung',
    status: 'praktikum',
    short: 'HNO3, AgNO3, NH3',
    reagentName: 'Silbernitrat-Lösung',
    acid: 'Salpetersäure',
    steps: [
      loesen,
      { act: 'Mit verdünnter Salpetersäure ansäuern', reagent: 'HNO3', drops: true, fill: 0.4, obs: 'keine Veränderung' },
      { act: 'Silbernitrat-Lösung zutropfen', reagent: 'AgNO3', drops: true, fill: 0.46, ppt: { color: C.yellow, size: 'kaesig' }, obs: 'gelber Niederschlag' },
      { act: 'Konzentrierte Ammoniak-Lösung zugeben (Abzug)', reagent: 'NH3', drops: true, fill: 0.56, obs: 'Niederschlag bleibt' },
    ],
    eq: ['Ag^+ + I^- → AgI↓{gelb}'],
    result: 'gelber Niederschlag mit Silbernitrat – unlöslich, auch in konzentrierter Ammoniak-Lösung',
    swatch: C.yellow,
  },
  {
    id: 'carbonat',
    ion: 'CO3^2-',
    name: 'Carbonat',
    kind: 'anion',
    method: 'gas',
    vessel: 'uhrglas',
    status: 'praktikum',
    short: 'H2SO4 auf dem Uhrglas',
    reagentName: 'verdünnte Schwefelsäure',
    steps: [
      { act: 'Etwas feste Probe auf ein Uhrglas geben', solid: 1 },
      { act: 'Verdünnte Schwefelsäure zutropfen', reagent: 'H2SO4', drops: true, fill: 0.55, liquid: C.clear, solid: 0.7, gas: true, obs: 'Kohlensäure entsteht – sofort Aufbrausen' },
      { act: 'Beobachten', fill: 0.6, solid: 0.25, gas: true, obs: 'Kohlensäure zerfällt: farbloses, geruchloses Gas (CO₂) entweicht' },
    ],
    eq: ['CO3^2- + 2 H3O^+ → H2CO3{Kohlensäure} + 2 H2O', 'H2CO3{instabil} → CO2↑ + H2O'],
    result: 'Aufbrausen mit verdünnter Schwefelsäure – über Kohlensäure entweicht CO₂',
    swatch: 'transparent',
    notes: [
      { t: 'Beispiel Natriumcarbonat mit Schwefelsäure:', eq: 'Na2CO3 + H2SO4 → Na2SO4 + H2CO3' },
      { t: 'Kohlensäure ist nur ein Übergang: Sie zerfällt sofort in Wasser und Kohlenstoffdioxid – daher das Aufbrausen.' },
      { t: 'Insgesamt:', eq: 'CO3^2- + 2 H3O^+ → CO2↑ + 3 H2O' },
      { t: 'Bestätigung: Das Gas in Kalkwasser einleiten – es entsteht eine weiße Trübung.', eq: 'Ca^2+ + 2 OH^- + CO2 → CaCO3↓{weiß} + H2O' },
    ],
  },
  {
    id: 'natrium',
    ion: 'Na^+',
    name: 'Natrium',
    kind: 'kation',
    method: 'flamme',
    status: 'praktikum',
    short: 'Flammenfärbung',
    reagentName: 'Flammenfärbung (Magnesiastäbchen)',
    steps: [
      { act: 'Magnesiastäbchen ausglühen, bis die Flamme farblos bleibt', stick: true, flame: 'base' },
      { act: 'In Salzsäure tauchen, dann in die Probe', reagent: 'HCl', obs: 'Chloride verdampfen in der Flamme leichter' },
      { act: 'In die nichtleuchtende Flamme halten', stick: true, flame: '#f5a524', obs: 'intensiv gelb-orange, lange anhaltend' },
    ],
    eq: ['Na → Na*{angeregt}', 'Na* → Na + Licht{589 nm}'],
    result: 'Flammenfärbung intensiv gelb-orange (589 nm)',
    swatch: '#f5a524',
    notes: [{ t: 'Die Wärme hebt ein Elektron auf ein höheres Niveau. Fällt es zurück, wird Licht einer festen Wellenlänge frei.' }, { t: 'Schon Spuren Natrium färben gelb und überdecken andere Farben.' }],
  },
  {
    id: 'kalium-flamme',
    ion: 'K^+',
    name: 'Kalium',
    kind: 'kation',
    method: 'flamme',
    status: 'praktikum',
    short: 'Flammenfärbung, Cobaltglas',
    reagentName: 'Flammenfärbung mit Cobaltglas',
    steps: [
      { act: 'Magnesiastäbchen ausglühen, bis die Flamme farblos bleibt', stick: true, flame: 'base' },
      { act: 'In Salzsäure tauchen, dann in die Probe', reagent: 'HCl' },
      { act: 'In die nichtleuchtende Flamme halten', stick: true, flame: '#f0a840', obs: 'meist gelb – Natrium-Spuren überdecken das Violett' },
      { act: 'Durch Cobaltglas betrachten', stick: true, flame: '#b04aa8', cobalt: true, obs: 'rotviolett' },
    ],
    eq: ['K* → K + Licht{766 nm und 404 nm}'],
    result: 'Flammenfärbung fahlviolett, durch Cobaltglas rotviolett',
    swatch: '#b27ad0',
    notes: [{ t: 'Cobaltglas schluckt das gelbe Natriumlicht, das rote und violette Kaliumlicht kommt durch.' }],
  },
  {
    id: 'kalium-tpb',
    ion: 'K^+',
    name: 'Kalium',
    kind: 'kation',
    method: 'faellung',
    status: 'praktikum',
    short: 'Essigsäure, Na[B(C6H5)4]',
    reagentName: 'Natriumtetraphenylborat-Lösung',
    acid: 'Essigsäure',
    steps: [
      loesen,
      { act: 'Mit verdünnter Essigsäure ansäuern', reagent: 'CH3COOH', drops: true, fill: 0.4, obs: 'keine Veränderung' },
      { act: 'Natriumtetraphenylborat-Lösung zutropfen', reagent: 'Na[B(C6H5)4]', drops: true, fill: 0.46, ppt: { color: C.white, size: 'fein' }, obs: 'weißer Niederschlag' },
    ],
    eq: ['K^+ + [B(C6H5)4]^- → K[B(C6H5)4]↓{weiß}'],
    result: 'weißer Niederschlag mit Natriumtetraphenylborat in essigsaurer Lösung',
    swatch: C.white,
    notes: [{ t: 'Ammonium-Ionen stören – NH₄⁺ fällt ebenfalls weiß aus.' }],
  },

  {
    id: 'nitrat',
    ion: 'NO3^-',
    name: 'Nitrat',
    kind: 'anion',
    method: 'farbe',
    vessel: 'tuepfel',
    status: 'praktikum',
    short: 'FeSO4-Kristall, konz. H2SO4',
    reagentName: 'Eisen(II)-sulfat-Kristall + konz. Schwefelsäure (Ringprobe auf der Tüpfelplatte)',
    steps: [
      { act: 'Einen Tropfen Probelösung in eine Mulde der Tüpfelplatte geben', wells: { 0: { label: 'Probe', liquid: C.clear } }, into: [0], obs: 'farbloser Tropfen' },
      { act: 'Einen kleinen Kristall Eisen(II)-sulfat in die Mitte des Tropfens legen', reagent: 'FeSO4', wells: { 0: { crystal: C.crystal } }, obs: 'blassgrüner Kristall im Tropfen' },
      { act: 'Einen Tropfen konzentrierte Schwefelsäure dazugeben (Schutzbrille!)', reagent: 'H2SO4', into: [0], wells: { 0: { ring: C.brown } }, obs: 'um den Kristall bildet sich ein brauner Ring' },
    ],
    eq: ['3 Fe^2+ + NO3^- + 4 H^+ → 3 Fe^3+ + NO + 2 H2O', 'Fe^2+ + NO → [Fe(NO)]^2+{braun}'],
    result: 'brauner Ring um den Eisen(II)-sulfat-Kristall nach Zugabe von konzentrierter Schwefelsäure',
    swatch: C.brown,
    notes: [
      { t: 'Eisen(II) reduziert das Nitrat zu Stickstoffmonoxid NO. Mit weiterem Eisen(II) bildet NO den braunen Komplex – er hält sich nur in der stark sauren Zone direkt am Kristall.' },
      { t: 'Nitrit stört: Es gibt den braunen Ring schon mit verdünnter Säure. Vorher mit Amidosulfonsäure zerstören.', eq: 'HNO2 + H2NSO3H → N2↑ + H2SO4 + H2O' },
      { t: 'Bromid und Iodid stören – konzentrierte Schwefelsäure macht daraus braunes Brom bzw. Iod.' },
      { t: 'Auf der Tüpfelplatte reichen wenige Tropfen – das ist sicherer als die Ringprobe im Reagenzglas mit viel konzentrierter Säure.' },
    ],
  },
  {
    id: 'acetat',
    ion: 'CH3COO^-',
    name: 'Acetat',
    kind: 'anion',
    method: 'gas',
    status: 'praktikum',
    short: 'Ethanol, konz. H2SO4, Wasserbad',
    reagentName: 'Ethanol + konz. Schwefelsäure (Esterprobe)',
    steps: [
      { act: 'Eine Spatelspitze Probe ins Reagenzglas geben, etwa 1 mL Ethanol zugeben', reagent: 'C2H5OH', fill: 0.18, liquid: C.clear },
      { act: 'Einige Tropfen konzentrierte Schwefelsäure zugeben (Schutzbrille!)', reagent: 'H2SO4', drops: true, fill: 0.22 },
      { act: 'Im Wasserbad vorsichtig erwärmen', bath: true, obs: 'die Lösung wird warm' },
      { act: 'Mit der Hand zufächeln und vorsichtig riechen', bath: true, smell: 'fruchtig', obs: 'fruchtiger Geruch nach Klebstoff bzw. Nagellackentferner (Essigsäureethylester)' },
    ],
    eq: ['CH3COO^- + H3O^+ → CH3COOH + H2O', 'CH3COOH + C2H5OH → CH3COOC2H5{Essigsäureethylester, fruchtig} + H2O'],
    result: 'fruchtiger Geruch nach Essigsäureethylester beim Erwärmen mit Ethanol und konzentrierter Schwefelsäure',
    swatch: 'transparent',
    notes: [
      { t: 'Die Schwefelsäure setzt zuerst Essigsäure frei. Dann beschleunigt sie als Katalysator die Veresterung mit dem Ethanol und bindet das entstehende Wasser.' },
      { t: 'Mit Isoamylalkohol statt Ethanol entsteht Isoamylacetat – Geruch nach Birne bzw. Banane.' },
      { t: 'Schneller, aber weniger eindeutig: Probe mit festem Kaliumhydrogensulfat verreiben – Geruch nach Essig.', eq: 'CH3COO^- + HSO4^- → CH3COOH + SO4^2-' },
      { t: 'Nie direkt über das Glas beugen – den Geruch mit der Hand zufächeln.' },
    ],
  },
  {
    id: 'magnesium',
    ion: 'Mg^2+',
    name: 'Magnesium',
    kind: 'kation',
    method: 'farbe',
    vessel: 'tuepfel',
    status: 'praktikum',
    short: 'Essigsäure, Titangelb, NaOH',
    reagentName: 'Titangelb + Natronlauge (Tüpfelplatte)',
    acid: 'Essigsäure',
    steps: [
      {
        act: 'Einen Tropfen Probelösung und daneben einen Tropfen Wasser (Blindprobe) in zwei Mulden der Tüpfelplatte geben',
        wells: { 0: { label: 'Probe', liquid: C.clear }, 1: { label: 'Blindprobe', liquid: C.clear } },
        into: [0, 1],
        obs: 'zwei farblose Tropfen',
      },
      { act: 'In beide Mulden einen Tropfen verdünnte Essigsäure geben', reagent: 'CH3COOH', into: [0, 1], obs: 'keine Veränderung' },
      { act: 'In beide Mulden einen Tropfen Titangelb-Lösung geben', reagent: 'Titangelb', into: [0, 1], wells: { 0: { liquid: C.titan }, 1: { liquid: C.titan } }, obs: 'beide Tropfen gelb' },
      {
        act: 'In beide Mulden einen Tropfen Natronlauge geben',
        reagent: 'NaOH',
        into: [0, 1],
        wells: { 0: { liquid: C.titanOrange, rim: C.lightRed, ppt: C.lightRed }, 1: { liquid: C.titanOrange } },
        obs: 'Probe: roter Rand, hellroter Niederschlag (Farblack) – Blindprobe: bleibt gelb-orange',
      },
    ],
    eq: ['Mg^2+ + 2 OH^- → Mg(OH)2↓{färbt sich mit Titangelb hellrot}'],
    result: 'roter Rand bzw. hellroter Niederschlag mit Titangelb und Natronlauge – die Blindprobe bleibt gelb-orange',
    swatch: C.lightRed,
    notes: [
      { t: 'Titangelb ist ein Farbstoff. Das ausfallende Magnesiumhydroxid lagert ihn an seiner Oberfläche an und färbt sich hellrot – ein sogenannter Farblack.' },
      { t: 'Der rote Rand entsteht dort, wo die Natronlauge in den Tropfen läuft: Hier wird es zuerst stark alkalisch und Mg(OH)₂ fällt aus.' },
      { t: 'Die Essigsäure löst auch schwer lösliche Magnesiumsalze, z. B. Magnesiumcarbonat. Erst die Natronlauge macht die Lösung danach stark alkalisch.', eq: 'MgCO3 + 2 CH3COOH → Mg^2+ + 2 CH3COO^- + CO2↑ + H2O' },
      { t: 'Immer mit Blindprobe vergleichen: Nur wenn die Probe deutlich roter ist als die Blindprobe, ist der Nachweis positiv. Auf der weißen Tüpfelplatte sieht man den Unterschied gut.' },
      { t: 'Ammoniumsalze stören, weil sie das Ausfallen von Mg(OH)₂ verhindern. Calcium allein reagiert nicht, verstärkt aber die Rotfärbung.' },
    ],
  },
  {
    id: 'ammonium',
    ion: 'NH4^+',
    name: 'Ammonium',
    kind: 'kation',
    method: 'gas',
    vessel: 'gaskammer',
    status: 'praktikum',
    short: 'NaOH, Gaskammer – ohne Erhitzen',
    reagentName: 'Natronlauge + feuchtes Indikatorpapier (Gaskammer)',
    steps: [
      { act: 'Etwas Probe (fest oder einige Tropfen Lösung) auf ein Uhrglas geben', solid: 1 },
      { act: 'Einige Tropfen Natronlauge zugeben', reagent: 'NaOH', drops: true, fill: 0.5, liquid: C.clear, solid: 0.6, fumes: 'NH₃', obs: 'Ammoniak wird frei – stechender Geruch' },
      {
        act: 'Sofort mit einem zweiten Uhrglas abdecken, an dem innen ein angefeuchtetes Indikatorpapier klebt',
        lid: true,
        paper: C.paperNeutral,
        fumes: 'NH₃',
        obs: 'die Kammer ist geschlossen, das Papier berührt die Lauge nicht',
      },
      { act: 'Einige Minuten bei Raumtemperatur warten – nicht erhitzen', lid: true, paper: C.paperBlue, fumes: 'NH₃', obs: 'das Indikatorpapier färbt sich blau (alkalisch)' },
    ],
    eq: ['NH4^+ + OH^- → NH3↑ + H2O', 'NH3 + H2O → NH4^+ + OH^-{alkalisch}'],
    result: 'feuchtes Indikatorpapier in der geschlossenen Gaskammer färbt sich blau – ohne Erhitzen',
    swatch: C.paperBlue,
    notes: [
      { t: 'Erhitzen ist nicht nötig: Die Natronlauge treibt das Ammoniak schon bei Raumtemperatur aus. In der geschlossenen Kammer sammelt es sich und erreicht das Papier.' },
      { t: 'Das Papier darf die Lauge nicht berühren – sonst färbt es sich auch ohne Ammonium blau (falsch positiv).' },
      { t: 'Statt Universalindikatorpapier geht auch rotes Lackmuspapier (wird blau).' },
      { t: 'Ammoniak ist eine Base: Im feuchten Papier entstehen Hydroxid-Ionen, deshalb der Farbumschlag.' },
    ],
  },

  /* ---------------- kann noch kommen ---------------- */
  {
    id: 'phosphat',
    ion: 'PO4^3-',
    name: 'Phosphat',
    kind: 'anion',
    method: 'faellung',
    status: 'spaeter',
    short: 'HNO3, Ammoniummolybdat',
    reagentName: 'Ammoniummolybdat-Lösung',
    acid: 'Salpetersäure',
    steps: [
      loesen,
      { act: 'Mit Salpetersäure ansäuern', reagent: 'HNO3', drops: true, fill: 0.4 },
      { act: 'Ammoniummolybdat-Lösung zugeben und erwärmen', reagent: '(NH4)2MoO4', drops: true, fill: 0.48, heat: true, ppt: { color: C.yellow, size: 'fein' }, obs: 'gelber Niederschlag' },
    ],
    eq: ['PO4^3- + 3 NH4^+ + 12 MoO4^2- + 24 H^+ → (NH4)3[P(Mo3O10)4]↓{gelb} + 12 H2O'],
    result: 'gelber Niederschlag mit Ammoniummolybdat in salpetersaurer Lösung',
    swatch: C.yellow,
  },
  {
    id: 'nitrit',
    ion: 'NO2^-',
    name: 'Nitrit',
    kind: 'anion',
    method: 'farbe',
    vessel: 'tuepfel',
    status: 'spaeter',
    short: 'Lunges Reagenz',
    reagentName: 'Lunges Reagenz (Sulfanilsäure + 1-Naphthylamin in Essigsäure)',
    steps: [
      { act: 'Je einen Tropfen Probelösung und Wasser (Blindprobe) in zwei Mulden geben', wells: { 0: { label: 'Probe', liquid: C.clear }, 1: { label: 'Blindprobe', liquid: C.clear } }, into: [0, 1] },
      { act: 'In beide Mulden je einen Tropfen Sulfanilsäure- und Naphthylamin-Lösung geben (Lunges Reagenz)', reagent: 'Lunges Reagenz', into: [0, 1], wells: { 0: { liquid: C.azo } }, obs: 'Probe: rote bis rotviolette Färbung – Blindprobe bleibt farblos' },
    ],
    eq: ['C6H7NO3S{Sulfanilsäure} + NO2^- + 2 H^+ → C6H5N2O3S^+{Diazonium-Ion} + 2 H2O', 'C6H5N2O3S^+ + C10H9N{1-Naphthylamin} → C16H13N3O3S{Azofarbstoff, rot} + H^+'],
    result: 'rote Färbung (Azofarbstoff) mit Lunges Reagenz – sehr empfindlich',
    swatch: C.azo,
    notes: [
      { t: 'Nitrit macht aus der Sulfanilsäure ein Diazonium-Ion. Das kuppelt mit dem Naphthylamin zu einem roten Azofarbstoff.' },
      { t: 'Sehr empfindlich – schon Spuren aus der Laborluft färben schwach. Deshalb immer mit Blindprobe.' },
      { t: 'Nitrat reagiert nicht. Mit etwas Zinkstaub wird es aber zu Nitrit reduziert und dann ebenfalls rot.' },
      { t: 'Naphthylamin ist gesundheitsschädlich – Handschuhe tragen.' },
    ],
  },
  {
    id: 'acetat-fe',
    ion: 'CH3COO^-',
    name: 'Acetat',
    kind: 'anion',
    method: 'farbe',
    vessel: 'tuepfel',
    status: 'spaeter',
    short: 'FeCl3',
    reagentName: 'Eisen(III)-chlorid-Lösung',
    steps: [
      { act: 'Je einen Tropfen neutrale Probelösung und Wasser (Blindprobe) in zwei Mulden geben', wells: { 0: { label: 'Probe', liquid: C.clear }, 1: { label: 'Blindprobe', liquid: C.clear } }, into: [0, 1] },
      { act: 'In beide Mulden einen Tropfen Eisen(III)-chlorid-Lösung geben', reagent: 'FeCl3', into: [0, 1], wells: { 0: { liquid: C.rustBrown }, 1: { liquid: '#e4c766' } }, obs: 'Probe: tiefrot bis rotbraun – Blindprobe: hellgelb' },
    ],
    eq: ['Fe^3+ + 3 CH3COO^- → Fe(CH3COO)3{tiefrot}'],
    result: 'tiefrote bis rotbraune Färbung mit Eisen(III)-chlorid in neutraler Lösung',
    swatch: C.rustBrown,
    notes: [
      { t: 'Genauer entsteht ein mehrkerniger Komplex [Fe₃(OH)₂(CH₃COO)₆]⁺ – die einfache Formel reicht für die Gleichung.' },
      { t: 'Beim Kochen (im Reagenzglas) fällt rotbraunes basisches Eisen(III)-acetat aus.', eq: 'Fe^3+ + 2 H2O + CH3COO^- → Fe(OH)2(CH3COO)↓{rotbraun} + 2 H^+' },
      { t: 'Die Probe muss neutral sein. Formiat, Thiocyanat und Phosphat stören.' },
    ],
  },
  {
    id: 'sulfid',
    ion: 'S^2-',
    name: 'Sulfid',
    kind: 'anion',
    method: 'gas',
    vessel: 'gaskammer',
    status: 'spaeter',
    short: 'HCl, Bleiacetatpapier',
    reagentName: 'Salzsäure + Bleiacetatpapier',
    steps: [
      { act: 'Etwas Probe auf ein Uhrglas geben', solid: 1 },
      { act: 'Einige Tropfen verdünnte Salzsäure zugeben (Abzug!)', reagent: 'HCl', drops: true, fill: 0.5, liquid: C.clear, solid: 0.6, fumes: 'H₂S', obs: 'Geruch nach faulen Eiern (Schwefelwasserstoff)' },
      { act: 'Mit einem Uhrglas abdecken, an dem ein feuchtes Bleiacetatpapier klebt', lid: true, paper: C.paperWhite, fumes: 'H₂S' },
      { act: 'Kurz warten', lid: true, paper: C.black, fumes: 'H₂S', obs: 'das Papier färbt sich schwarz-braun (Bleisulfid)' },
    ],
    eq: ['S^2- + 2 H3O^+ → H2S↑ + 2 H2O', 'Pb^2+ + H2S → PbS↓{schwarz} + 2 H^+'],
    result: 'Bleiacetatpapier färbt sich schwarz-braun (PbS) – Geruch nach faulen Eiern',
    swatch: C.black,
    notes: [{ t: 'Schwefelwasserstoff ist sehr giftig – nur im Abzug und mit kleinen Mengen arbeiten.' }, { t: 'Bleiacetat ist giftig – Papier nur mit der Pinzette anfassen.' }],
  },
  {
    id: 'thiosulfat',
    ion: 'S2O3^2-',
    name: 'Thiosulfat',
    kind: 'anion',
    method: 'faellung',
    status: 'spaeter',
    short: 'HCl',
    reagentName: 'verdünnte Salzsäure',
    steps: [
      loesen,
      { act: 'Verdünnte Salzsäure zugeben', reagent: 'HCl', drops: true, fill: 0.42, ppt: { color: C.sulfur, size: 'fein' }, obs: 'nach einigen Sekunden gelblich-weiße Trübung (Schwefel), stechender Geruch (SO₂)' },
    ],
    eq: ['S2O3^2- + 2 H3O^+ → S↓{gelblich} + SO2↑ + 3 H2O'],
    result: 'gelblich-weiße Trübung durch Schwefel und Geruch nach Schwefeldioxid mit verdünnter Salzsäure',
    swatch: C.sulfur,
    notes: [{ t: 'Die Trübung kommt mit Verzögerung. Sulfit gibt dagegen nur SO₂, aber keine Trübung.' }],
  },
  {
    id: 'eisen-scn',
    ion: 'Fe^3+',
    name: 'Eisen(III)',
    kind: 'kation',
    method: 'farbe',
    status: 'spaeter',
    short: 'KSCN',
    reagentName: 'Kaliumthiocyanat-Lösung',
    steps: [
      { ...loesen, liquid: 'rgba(214, 170, 74, 0.35)' },
      { act: 'Kaliumthiocyanat-Lösung zutropfen', reagent: 'KSCN', drops: true, fill: 0.42, liquid: C.bloodRed, obs: 'blutrote Färbung' },
    ],
    eq: ['Fe^3+ + 3 SCN^- → Fe(SCN)3{blutrot}'],
    result: 'blutrote Lösung mit Kaliumthiocyanat',
    swatch: C.bloodRed,
  },
  {
    id: 'eisen-blau',
    ion: 'Fe^3+',
    name: 'Eisen(III)',
    kind: 'kation',
    method: 'faellung',
    status: 'spaeter',
    short: 'K4[Fe(CN)6]',
    reagentName: 'gelbes Blutlaugensalz K₄[Fe(CN)₆]',
    steps: [
      { ...loesen, liquid: 'rgba(214, 170, 74, 0.35)' },
      { act: 'Kaliumhexacyanidoferrat(II)-Lösung zutropfen', reagent: 'K4[Fe(CN)6]', drops: true, fill: 0.42, liquid: 'rgba(40, 70, 150, 0.55)', ppt: { color: C.prussian, size: 'fein' }, obs: 'tiefblauer Niederschlag (Berliner Blau)' },
    ],
    eq: ['4 Fe^3+ + 3 [Fe(CN)6]^4- → Fe4[Fe(CN)6]3↓{tiefblau}'],
    result: 'tiefblauer Niederschlag (Berliner Blau) mit gelbem Blutlaugensalz',
    swatch: C.prussian,
  },
  {
    id: 'eisen-ii',
    ion: 'Fe^2+',
    name: 'Eisen(II)',
    kind: 'kation',
    method: 'faellung',
    status: 'spaeter',
    short: 'K3[Fe(CN)6]',
    reagentName: 'rotes Blutlaugensalz K₃[Fe(CN)₆]',
    steps: [
      { ...loesen, liquid: C.paleGreen },
      { act: 'Kaliumhexacyanidoferrat(III)-Lösung zutropfen', reagent: 'K3[Fe(CN)6]', drops: true, fill: 0.42, liquid: 'rgba(40, 70, 150, 0.55)', ppt: { color: C.prussian, size: 'fein' }, obs: 'tiefblauer Niederschlag (Turnbulls Blau)' },
    ],
    eq: ['K^+ + Fe^2+ + [Fe(CN)6]^3- → KFe[Fe(CN)6]↓{tiefblau}'],
    result: 'tiefblauer Niederschlag (Turnbulls Blau) mit rotem Blutlaugensalz',
    swatch: C.prussian,
    notes: [{ t: 'Turnbulls Blau und Berliner Blau sind derselbe Stoff – nur der Weg dorthin ist verschieden.' }, { t: 'Eisen(III) gibt mit rotem Blutlaugensalz nur eine braune Färbung, keinen blauen Niederschlag – so lassen sich Fe²⁺ und Fe³⁺ unterscheiden.' }],
  },
  {
    id: 'kupfer',
    ion: 'Cu^2+',
    name: 'Kupfer(II)',
    kind: 'kation',
    method: 'farbe',
    status: 'spaeter',
    short: 'NH3',
    reagentName: 'Ammoniak-Lösung',
    steps: [
      { ...loesen, liquid: 'rgba(110, 170, 210, 0.4)' },
      { act: 'Ammoniak-Lösung tropfenweise zugeben', reagent: 'NH3', drops: true, fill: 0.4, ppt: { color: C.lightBlue, size: 'kaesig' }, obs: 'hellblauer Niederschlag' },
      { act: 'Ammoniak im Überschuss zugeben', reagent: 'NH3', drops: true, fill: 0.5, liquid: C.deepBlue, ppt: 'weg', obs: 'tiefblaue Lösung' },
    ],
    eq: ['Cu^2+ + 2 OH^- → Cu(OH)2↓{hellblau}', 'Cu(OH)2 + 4 NH3 → [Cu(NH3)4]^2+{tiefblau} + 2 OH^-'],
    result: 'erst hellblauer Niederschlag, mit mehr Ammoniak tiefblaue Lösung',
    swatch: C.deepBlue,
    notes: [{ t: 'Flammenfärbung: grün bis blaugrün.' }],
  },
  {
    id: 'calcium',
    ion: 'Ca^2+',
    name: 'Calcium',
    kind: 'kation',
    method: 'faellung',
    status: 'spaeter',
    short: '(NH4)2C2O4, Flamme',
    reagentName: 'Ammoniumoxalat-Lösung',
    steps: [
      loesen,
      { act: 'Ammoniumoxalat-Lösung zutropfen', reagent: '(NH4)2C2O4', drops: true, fill: 0.42, ppt: { color: C.white, size: 'fein' }, obs: 'weißer Niederschlag' },
    ],
    eq: ['Ca^2+ + C2O4^2- → CaC2O4↓{weiß}'],
    result: 'weißer Niederschlag mit Ammoniumoxalat, Flammenfärbung ziegelrot',
    swatch: C.white,
    notes: [{ t: 'Fällung in neutraler oder essigsaurer Lösung. Flammenfärbung: ziegelrot.' }],
  },
  {
    id: 'barium',
    ion: 'Ba^2+',
    name: 'Barium',
    kind: 'kation',
    method: 'faellung',
    status: 'spaeter',
    short: 'H2SO4, Flamme',
    reagentName: 'verdünnte Schwefelsäure',
    steps: [
      loesen,
      { act: 'Verdünnte Schwefelsäure zutropfen', reagent: 'H2SO4', drops: true, fill: 0.42, ppt: { color: C.white, size: 'fein' }, obs: 'weißer, feinkristalliner Niederschlag' },
    ],
    eq: ['Ba^2+ + SO4^2- → BaSO4↓{weiß}'],
    result: 'weißer Niederschlag mit verdünnter Schwefelsäure, Flammenfärbung fahlgrün',
    swatch: C.white,
    notes: [{ t: 'Umkehrung des Sulfat-Nachweises. Flammenfärbung: fahlgrün.' }, { t: 'Bariumsulfat ist so schwer löslich, dass es als Röntgenkontrastmittel geschluckt werden kann – lösliche Bariumsalze sind dagegen giftig.' }],
  },
  {
    id: 'aluminium',
    ion: 'Al^3+',
    name: 'Aluminium',
    kind: 'kation',
    method: 'faellung',
    status: 'spaeter',
    short: 'NaOH (amphoter)',
    reagentName: 'Natronlauge',
    steps: [
      loesen,
      { act: 'Natronlauge tropfenweise zugeben', reagent: 'NaOH', drops: true, fill: 0.4, ppt: { color: C.white, size: 'kaesig' }, obs: 'weißer, gallertartiger Niederschlag' },
      { act: 'Natronlauge im Überschuss zugeben', reagent: 'NaOH', drops: true, fill: 0.5, ppt: 'weg', obs: 'der Niederschlag löst sich wieder auf' },
    ],
    eq: ['Al^3+ + 3 OH^- → Al(OH)3↓{weiß, gallertartig}', 'Al(OH)3 + OH^- → [Al(OH)4]^-{Tetrahydroxidoaluminat}'],
    result: 'weißer, gallertartiger Niederschlag mit Natronlauge – löst sich im Überschuss wieder',
    swatch: C.white,
    notes: [{ t: 'Aluminiumhydroxid ist amphoter: Es löst sich in Säuren und in Laugen.' }, { t: 'Mit Ammoniak fällt Al(OH)₃ ebenfalls aus, löst sich im Überschuss aber nicht – Unterschied zu Zink.' }],
  },
  {
    id: 'magnesium-p',
    ion: 'Mg^2+',
    name: 'Magnesium',
    kind: 'kation',
    method: 'faellung',
    status: 'spaeter',
    short: 'NH4Cl, NH3, Na2HPO4',
    reagentName: 'Natriumhydrogenphosphat in ammoniakalischer Lösung',
    steps: [
      loesen,
      { act: 'Ammoniumchlorid und Ammoniak-Lösung zugeben', reagent: 'NH4Cl, NH3', drops: true, fill: 0.4, obs: 'keine Veränderung' },
      { act: 'Natriumhydrogenphosphat-Lösung zugeben, mit dem Glasstab an der Wand reiben', reagent: 'Na2HPO4', drops: true, fill: 0.48, ppt: { color: C.white, size: 'fein' }, obs: 'weißer, kristalliner Niederschlag' },
    ],
    eq: ['Mg^2+ + NH3 + HPO4^2- + 6 H2O → MgNH4PO4·6H2O↓{weiß, kristallin}'],
    result: 'weißer, kristalliner Niederschlag (Magnesiumammoniumphosphat) in ammoniakalischer Lösung',
    swatch: C.white,
    notes: [{ t: 'Ammoniumchlorid verhindert, dass Magnesiumhydroxid ausfällt.' }, { t: 'Reiben an der Glaswand hilft beim Auskristallisieren.' }],
  },
  {
    id: 'nickel',
    ion: 'Ni^2+',
    name: 'Nickel',
    kind: 'kation',
    method: 'faellung',
    vessel: 'tuepfel',
    status: 'spaeter',
    short: 'NH3, Diacetyldioxim',
    reagentName: 'Diacetyldioxim (Dimethylglyoxim) in ammoniakalischer Lösung',
    steps: [
      { act: 'Einen Tropfen Probelösung in eine Mulde geben', wells: { 0: { label: 'Probe', liquid: 'rgba(140, 190, 140, 0.45)' } }, into: [0] },
      { act: 'Einen Tropfen Ammoniak-Lösung zugeben', reagent: 'NH3', into: [0] },
      { act: 'Einen Tropfen Diacetyldioxim-Lösung zugeben', reagent: 'C4H8N2O2', into: [0], wells: { 0: { ppt: C.raspberry } }, obs: 'himbeerroter Niederschlag' },
    ],
    eq: ['Ni^2+ + 2 C4H8N2O2{Diacetyldioxim} → Ni(C4H7N2O2)2↓{himbeerrot} + 2 H^+'],
    result: 'himbeerroter Niederschlag mit Diacetyldioxim in ammoniakalischer Lösung',
    swatch: C.raspberry,
    notes: [{ t: 'Ammoniak fängt die frei werdenden H⁺-Ionen ab – in saurer Lösung bildet sich der Komplex nicht.' }, { t: 'Sehr empfindlich und typisch für Nickel.' }],
  },
]

/* ---------------- Flammenfärbung ---------------- */

export interface Flame {
  id: string
  label: string
  ion: string
  name: string
  color: string
  text: string
  nm?: string
  /** Farbe durch Cobaltglas (fehlt = kaum sichtbar) */
  cobalt?: string
}

export const FLAMES: Flame[] = [
  { id: 'Li', label: 'Li', ion: 'Li^+', name: 'Lithium', color: '#d42a44', text: 'karminrot', nm: '671 nm', cobalt: '#a8326e' },
  { id: 'Na', label: 'Na', ion: 'Na^+', name: 'Natrium', color: '#f5a524', text: 'gelb-orange', nm: '589 nm' },
  { id: 'K', label: 'K', ion: 'K^+', name: 'Kalium', color: '#b27ad0', text: 'fahlviolett', nm: '766 / 404 nm', cobalt: '#b04aa8' },
  { id: 'Ca', label: 'Ca', ion: 'Ca^2+', name: 'Calcium', color: '#e2582c', text: 'ziegelrot' },
  { id: 'Sr', label: 'Sr', ion: 'Sr^2+', name: 'Strontium', color: '#e3203f', text: 'karminrot' },
  { id: 'Ba', label: 'Ba', ion: 'Ba^2+', name: 'Barium', color: '#a6cc68', text: 'fahlgrün' },
  { id: 'Cu', label: 'Cu', ion: 'Cu^2+', name: 'Kupfer', color: '#3cbf94', text: 'grün bis blaugrün' },
  { id: 'NaK', label: 'Na + K', ion: 'Na^+', name: 'Gemisch Na/K', color: '#f2a82e', text: 'gelb – Kalium nicht zu sehen', cobalt: '#b04aa8' },
]

/* ---------------- Halogenide ---------------- */

export const HALIDES = [
  { id: 'Cl', ion: 'Cl^-', salt: 'AgCl', color: C.white, text: 'weiß', dil: true, conc: true },
  { id: 'Br', ion: 'Br^-', salt: 'AgBr', color: C.paleYellow, text: 'gelblich-weiß', dil: false, conc: true },
  { id: 'I', ion: 'I^-', salt: 'AgI', color: C.yellow, text: 'gelb', dil: false, conc: false },
] as const
