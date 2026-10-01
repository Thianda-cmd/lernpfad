export type SubjectId = 'biologie' | 'chemie' | 'mathematik'

export interface Module {
  id: string
  titel: string
  beschreibung: string
  status: 'verfuegbar' | 'geplant'
  pfad?: string
  themen: string[]
}

export interface Subject {
  id: SubjectId
  name: string
  kurz: string
  beschreibung: string
  farbe: string
  soft: string
  pfad: string
  status: 'aktiv' | 'in-vorbereitung'
  module: Module[]
}

export const SUBJECTS: Subject[] = [
  {
    id: 'biologie',
    name: 'Biologie',
    kurz: 'Bio',
    beschreibung: 'Zellbiologie in 3D, Mitose und Meiose, Lexikon, Karteikarten und Quiz.',
    farbe: 'var(--bio)',
    soft: 'var(--bio-soft)',
    pfad: '/biologie',
    status: 'aktiv',
    module: [
      {
        id: 'zellbiologie',
        titel: 'Zellbiologie',
        beschreibung: 'Tier- und Pflanzenzelle in 3D und 2D, alle Organellen, Vergleich, Karteikarten, Quiz.',
        status: 'verfuegbar',
        pfad: '/biologie/zellbiologie',
        themen: ['Tierzelle 3D/2D', 'Pflanzenzelle 3D/2D', 'Organellen-Lexikon', 'Vergleich', 'Quiz & Karteikarten'],
      },
      {
        id: 'mikroskopie',
        titel: 'Mikroskopie',
        beschreibung: 'Aufbau und Bedienung des Lichtmikroskops, Präparation, Färbungen und das Berechnen der Vergrößerung.',
        status: 'geplant',
        themen: ['Lichtmikroskop', 'Präparate', 'Färbetechniken', 'Vergrößerung'],
      },
      {
        id: 'zellteilung',
        titel: 'Zellzyklus & Zellteilung',
        beschreibung: 'Zellzyklus, Mitose und Meiose als Animation – mit Chromosomenzahlen und Quiz.',
        status: 'verfuegbar',
        pfad: '/biologie/zellteilung',
        themen: ['Zellzyklus', 'Mitose', 'Meiose'],
      },
      {
        id: 'genetik',
        titel: 'Genetik & Molekularbiologie',
        beschreibung: 'DNA-Aufbau, Replikation, Proteinbiosynthese und molekularbiologische Methoden wie PCR und Gelelektrophorese.',
        status: 'geplant',
        themen: ['DNA & RNA', 'Proteinbiosynthese', 'PCR', 'Gelelektrophorese'],
      },
      {
        id: 'mikrobiologie',
        titel: 'Mikrobiologie',
        beschreibung: 'Bakterien, Pilze und Viren, steriles Arbeiten, Nährmedien und Keimzahlbestimmung.',
        status: 'geplant',
        themen: ['Bakterien', 'Steriltechnik', 'Nährmedien', 'Keimzahl'],
      },
      {
        id: 'stoffwechsel',
        titel: 'Biochemie & Stoffwechsel',
        beschreibung: 'Enzyme, Zellatmung und Photosynthese im Detail.',
        status: 'geplant',
        themen: ['Enzyme', 'Zellatmung', 'Photosynthese'],
      },
    ],
  },
  {
    id: 'chemie',
    name: 'Chemie',
    kurz: 'Chem',
    beschreibung: 'Periodensystem, molare Masse, Salzformeln und Ionennachweise.',
    farbe: 'var(--chem)',
    soft: 'var(--chem-soft)',
    pfad: '/chemie',
    status: 'aktiv',
    module: [
      { id: 'pse', titel: 'Periodensystem', beschreibung: 'Alle 118 Elemente mit Schalenmodell, Orbitalen, Stoffdaten, 3D-Ansicht und Quiz.', status: 'verfuegbar', pfad: '/chemie/periodensystem', themen: [] },
      { id: 'molmasse', titel: 'Molare Masse', beschreibung: 'Formeln auswerten und umrechnen.', status: 'verfuegbar', pfad: '/chemie/molmasse', themen: [] },
      { id: 'ionen', titel: 'Ionen & Salzformeln', beschreibung: 'Salze bilden und benennen.', status: 'verfuegbar', pfad: '/chemie/ionen', themen: [] },
      { id: 'nachweise', titel: 'Ionennachweise', beschreibung: 'Fällungen, Gasnachweise und Flammenfärbung mit Reaktionsgleichung.', status: 'verfuegbar', pfad: '/chemie/nachweise', themen: [] },
      { id: 'bindung', titel: 'Chemische Bindung', beschreibung: 'Ionenbindung, Atombindung, Metallbindung und zwischenmolekulare Kräfte.', status: 'geplant', themen: [] },
      { id: 'stoechiometrie', titel: 'Stoffmenge & Stöchiometrie', beschreibung: 'Mol, molare Masse und Reaktionsgleichungen.', status: 'geplant', themen: [] },
      { id: 'saeuren', titel: 'Säuren, Basen & pH-Wert', beschreibung: 'Protolyse, pH-Berechnung, Puffer und Titration.', status: 'geplant', themen: [] },
      { id: 'redox', titel: 'Redoxreaktionen', beschreibung: 'Oxidationszahlen, Redoxgleichungen und Elektrochemie.', status: 'geplant', themen: [] },
      { id: 'organik', titel: 'Organische Chemie', beschreibung: 'Stoffklassen, funktionelle Gruppen und Biomoleküle.', status: 'geplant', themen: [] },
    ],
  },
  {
    id: 'mathematik',
    name: 'Mathematik',
    kurz: 'Mathe',
    beschreibung: 'Algebra, chemisches Rechnen, Gleichungssysteme und p-q-Formel.',
    farbe: 'var(--math)',
    soft: 'var(--math-soft)',
    pfad: '/mathematik',
    status: 'aktiv',
    module: [
      { id: 'lf1t', titel: 'LF 1T · Grundlagen', beschreibung: 'Klammern, Ausmultiplizieren, Gleichungen, Brüche, Potenzen, Formeln, Prozent.', status: 'verfuegbar', pfad: '/mathematik', themen: [] },
      { id: 'chem', titel: 'Chemisches Rechnen', beschreibung: 'Stoffmenge, Masse, molare Masse, Teilchenzahl und Anteile.', status: 'verfuegbar', pfad: '/mathematik/stoffmenge', themen: [] },
      { id: 'mfh', titel: 'MFH', beschreibung: 'Lineare Gleichungssysteme, Textaufgaben, p-q-Formel und Geraden.', status: 'verfuegbar', pfad: '/mathematik/lgs', themen: [] },
      { id: 'konzentration', titel: 'Konzentrationsangaben', beschreibung: 'Massenkonzentration und Stoffmengenkonzentration.', status: 'geplant', themen: [] },
      { id: 'verduennung', titel: 'Verdünnen & Mischen', beschreibung: 'Verdünnungsreihen, Mischungsrechnen und Mischungskreuz.', status: 'geplant', themen: [] },
      { id: 'statistik', titel: 'Statistik & Auswertung', beschreibung: 'Mittelwert, Standardabweichung und Kalibriergeraden.', status: 'geplant', themen: [] },
    ],
  },
]

export const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s])) as Record<SubjectId, Subject>
