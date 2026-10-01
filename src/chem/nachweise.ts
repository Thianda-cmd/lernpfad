/**
 * Qualitative Ionennachweise (Praktikum BTA) – Ablauf, Beobachtung, Reaktionsgleichungen.
 *
 * Gleichungs-Kurzschrift: Teilchen durch „ + “ getrennt, Pfeil „ → “.
 * „SO4^2-“ = Ladung, „↓“ Niederschlag, „↑“ Gas, „{weiß}“ = Beschriftung darunter,
 * führende Zahl mit Leerzeichen = Koeffizient („3 SCN^-“).
 */

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
  /** zweites Glas (z. B. Kalkwasser) */
  tube2?: { liquid: string; ppt?: Ppt }
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
  status: 'praktikum' | 'spaeter'
  /** Reagenzien kurz, für die Liste */
  short: string
  steps: Step[]
  eq: string[]
  /** eindeutiges Ergebnis (auch für das Quiz) */
  result: string
  swatch: string
  notes?: Note[]
  /** Säure, mit der angesäuert wird (Quiz) */
  acid?: string
  /** Nachweisreagenz (Quiz) */
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
  milky: 'rgba(236, 233, 224, 0.75)',
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
    status: 'praktikum',
    short: 'H2SO4, Kalkwasser',
    reagentName: 'verdünnte Säure + Kalkwasser',
    steps: [
      { act: 'Feste Probe ins Reagenzglas geben', fill: 0, ppt: { color: C.white, size: 'kaesig' } },
      { act: 'Verdünnte Schwefelsäure zugeben', reagent: 'H2SO4', drops: true, fill: 0.3, liquid: C.clear, gas: true, ppt: 'weg', obs: 'Aufschäumen, farbloses Gas' },
      { act: 'Gas in Kalkwasser leiten', reagent: 'Ca(OH)2', gas: true, tube2: { liquid: C.milky, ppt: { color: C.white, size: 'fein' } }, obs: 'Kalkwasser wird trüb' },
    ],
    eq: ['CO3^2- + 2 H3O^+ → CO2↑ + 3 H2O', 'CO2 + Ca^2+ + 2 OH^- → CaCO3↓{weiß} + H2O'],
    result: 'mit Säure entsteht ein farbloses Gas, das Kalkwasser trübt',
    swatch: C.milky,
    notes: [{ t: 'Geht auch mit Salzsäure. Statt Kalkwasser kann Barytwasser Ba(OH)₂ genommen werden.' }],
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

  /* ---------------- kommt noch ---------------- */
  {
    id: 'ammonium',
    ion: 'NH4^+',
    name: 'Ammonium',
    kind: 'kation',
    method: 'gas',
    status: 'spaeter',
    short: 'NaOH, erwärmen',
    reagentName: 'Natronlauge',
    steps: [
      loesen,
      { act: 'Natronlauge zugeben und erwärmen', reagent: 'NaOH', drops: true, fill: 0.42, heat: true, gas: true, obs: 'stechender Geruch' },
      { act: 'Feuchtes Indikatorpapier über die Öffnung halten', gas: true, obs: 'Papier färbt sich blau' },
    ],
    eq: ['NH4^+ + OH^- → NH3↑ + H2O'],
    result: 'beim Erwärmen mit Natronlauge entsteht ein Gas, das feuchtes Indikatorpapier blau färbt',
    swatch: '#3d6fb8',
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
    id: 'nitrat',
    ion: 'NO3^-',
    name: 'Nitrat',
    kind: 'anion',
    method: 'farbe',
    status: 'spaeter',
    short: 'FeSO4, konz. H2SO4',
    reagentName: 'Eisen(II)-sulfat + konz. Schwefelsäure (Ringprobe)',
    steps: [
      loesen,
      { act: 'Frische Eisen(II)-sulfat-Lösung zugeben', reagent: 'FeSO4', drops: true, fill: 0.42, liquid: 'rgba(170, 200, 160, 0.3)' },
      { act: 'Konz. Schwefelsäure vorsichtig an der Glaswand unterschichten', reagent: 'H2SO4', fill: 0.5, ring: C.brown, obs: 'brauner Ring an der Grenzfläche' },
    ],
    eq: ['3 Fe^2+ + NO3^- + 4 H^+ → 3 Fe^3+ + NO + 2 H2O', 'Fe^2+ + NO → [Fe(NO)]^2+{braun}'],
    result: 'brauner Ring an der Grenzfläche zur konzentrierten Schwefelsäure',
    swatch: C.brown,
  },
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
