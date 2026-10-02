/**
 * Zellwand als Vokabelliste: Schicht → Bestandteile → Bausteine.
 * Bausteine mit `g` verweisen auf das Glossar unten.
 */

export type BausteinId =
  | 'glucose'
  | 'galacturonsaeure'
  | 'rhamnose'
  | 'arabinose'
  | 'galactose'
  | 'xylose'
  | 'mannose'
  | 'fucose'
  | 'monolignole'
  | 'aminosaeuren'
  | 'hydroxyprolin'
  | 'calcium'
  | 'fettsaeuren'
  | 'nag'
  | 'nam'

export interface Teil {
  name: string
  /** kurze Rolle oder Zusatz */
  info?: string
  /** Glossar-Eintrag */
  g?: BausteinId
  /** besteht aus … */
  aus?: Teil[]
}

export interface Schicht {
  id: 'mittellamelle' | 'primaerwand' | 'sekundaerwand'
  name: string
  /** eine Zeile: was ist das? */
  kurz: string
  merkmale: string[]
  aus: Teil[]
  /** weitere Vokabeln zu dieser Schicht */
  extra?: [string, string][]
}

const glc: Teil = { name: 'β-D-Glucose', g: 'glucose' }

export const SCHICHTEN: Schicht[] = [
  {
    id: 'mittellamelle',
    name: 'Mittellamelle',
    kurz: 'Kittschicht zwischen zwei Nachbarzellen – wird bei der Zellteilung als Erstes gebildet.',
    merkmale: ['ganz außen', 'sehr dünn', 'klebt Zellen zusammen', 'entsteht aus der Zellplatte'],
    aus: [
      {
        name: 'Pektine',
        info: 'Hauptbestandteil – gelartiger Kitt',
        aus: [
          { name: 'Galacturonsäure', info: 'Hauptbaustein', g: 'galacturonsaeure' },
          { name: 'Rhamnose', info: 'im Rückgrat', g: 'rhamnose' },
          { name: 'Arabinose', info: 'Seitenketten', g: 'arabinose' },
          { name: 'Galactose', info: 'Seitenketten', g: 'galactose' },
        ],
      },
      {
        name: 'Calcium- und Magnesium-Ionen',
        info: 'verbrücken die Pektinketten → Calciumpektat',
        aus: [
          { name: 'Ca²⁺', g: 'calcium' },
          { name: 'Mg²⁺' },
        ],
      },
      { name: 'Proteine', info: 'nur wenig', aus: [{ name: 'Aminosäuren', g: 'aminosaeuren' }] },
    ],
    extra: [
      ['Zellplatte', 'Bei der Zellteilung verschmelzen Golgi-Vesikel voller Pektine zwischen den Tochterkernen – daraus wird die Mittellamelle.'],
      ['Mazeration', 'Lösen der Mittellamelle (Pektin-Abbau): Die Zellen trennen sich, z. B. wenn Obst beim Reifen weich wird.'],
    ],
  },
  {
    id: 'primaerwand',
    name: 'Primärwand',
    kurz: 'Erste eigentliche Wandschicht – wird gebildet, solange die Zelle noch wächst.',
    merkmale: ['dünn (ca. 0,1–1 µm)', 'elastisch und dehnbar', 'wächst mit', 'Fibrillen ungeordnet (Streutextur)'],
    aus: [
      {
        name: 'Cellulose-Mikrofibrillen',
        info: 'Gerüst – zugfeste Fasern',
        aus: [
          {
            name: 'Celluloseketten',
            info: 'parallel, durch Wasserstoffbrücken gebündelt',
            aus: [{ ...glc, info: 'β-1,4-glykosidisch verknüpft' }],
          },
        ],
      },
      {
        name: 'Hemicellulosen',
        info: 'v. a. Xyloglucan – verbinden die Mikrofibrillen',
        aus: [
          { name: 'Glucose', info: 'Rückgrat', g: 'glucose' },
          { name: 'Xylose', info: 'Seitenketten', g: 'xylose' },
          { name: 'Galactose', info: 'Seitenketten', g: 'galactose' },
          { name: 'Fucose', info: 'Kettenende', g: 'fucose' },
        ],
      },
      {
        name: 'Pektine',
        info: 'Gel zwischen den Fasern, bindet Wasser',
        aus: [
          { name: 'Galacturonsäure', g: 'galacturonsaeure' },
          { name: 'Rhamnose', g: 'rhamnose' },
          { name: 'Arabinose', g: 'arabinose' },
          { name: 'Galactose', g: 'galactose' },
          { name: 'Ca²⁺', info: 'vernetzt', g: 'calcium' },
        ],
      },
      {
        name: 'Strukturproteine',
        info: 'z. B. Extensin – festigt die Wand, wenn das Wachstum endet',
        aus: [
          { name: 'Aminosäuren', info: 'v. a. Hydroxyprolin', g: 'hydroxyprolin' },
          { name: 'Arabinose', info: 'Zuckerketten (Glykoprotein)', g: 'arabinose' },
        ],
      },
      { name: 'Wasser', info: 'macht die Matrix quellbar und durchlässig' },
    ],
    extra: [
      ['Matrix', 'Grundsubstanz zwischen den Fibrillen: Hemicellulosen, Pektine, Proteine und Wasser.'],
      ['Expansine', 'Proteine, die beim Streckungswachstum die Bindungen zwischen Cellulose und Hemicellulosen lockern – der Turgor dehnt dann die Wand.'],
    ],
  },
  {
    id: 'sekundaerwand',
    name: 'Sekundärwand',
    kurz: 'Wird nach dem Wachstum innen auf die Primärwand aufgelagert – nur in Zellen, die Festigkeit brauchen (Holz, Fasern, Leitgewebe).',
    merkmale: ['innen, an der Zellmembran', 'dick (oft mehrere µm)', 'fest, kaum dehnbar', 'oft verholzt', 'Fibrillen parallel (Paralleltextur)'],
    aus: [
      {
        name: 'Cellulose',
        info: 'Hauptbestandteil – mehr als in der Primärwand',
        aus: [{ ...glc, info: 'β-1,4-glykosidisch' }],
      },
      {
        name: 'Hemicellulosen',
        info: 'Xylane (Laubholz, Gräser) bzw. Glucomannane (Nadelholz)',
        aus: [
          { name: 'Xylose', info: 'Xylane', g: 'xylose' },
          { name: 'Glucose', info: 'Glucomannane', g: 'glucose' },
          { name: 'Mannose', info: 'Glucomannane', g: 'mannose' },
          { name: 'Arabinose', info: 'Seitenketten', g: 'arabinose' },
        ],
      },
      {
        name: 'Lignin',
        info: 'Holzstoff – macht die Wand druckfest, hart und wasserabweisend',
        aus: [
          {
            name: 'Monolignole',
            g: 'monolignole',
            aus: [{ name: 'p-Cumarylalkohol' }, { name: 'Coniferylalkohol' }, { name: 'Sinapylalkohol' }],
          },
        ],
      },
      { name: 'Pektine und Proteine', info: 'kaum noch' },
    ],
    extra: [
      ['S1 · S2 · S3', 'Drei Lagen mit jeweils parallelen Fibrillen, die Richtung wechselt von Lage zu Lage (Sperrholz-Prinzip). S2 ist die dickste Lage.'],
      ['Tüpfel', 'Aussparungen in der Sekundärwand. Dort trennen nur Primärwand und Mittellamelle (Schließhaut) die Zellen – Stoffaustausch und Plasmodesmen.'],
      ['Verholzung', 'Lignifizierung: Lignin wird in alle Wandschichten eingelagert. Verholzte Zellen sterben oft ab (Holzfasern, Tracheen).'],
    ],
  },
]

export interface Baustein {
  id: BausteinId
  name: string
  klasse: string
  formel?: string
  in: string
}

export const BAUSTEINE: Record<BausteinId, Baustein> = {
  glucose: { id: 'glucose', name: 'β-D-Glucose', klasse: 'Hexose (Einfachzucker, 6 C)', formel: 'C6H12O6', in: 'Cellulose, Rückgrat des Xyloglucans, Glucomannane' },
  galacturonsaeure: { id: 'galacturonsaeure', name: 'Galacturonsäure', klasse: 'Uronsäure – Galactose mit Säuregruppe (–COOH) an C6', formel: 'C6H10O7', in: 'Pektine (Polygalacturonsäure)' },
  rhamnose: { id: 'rhamnose', name: 'Rhamnose', klasse: 'Desoxyzucker (6 C)', formel: 'C6H12O5', in: 'Pektine – im Rückgrat zwischen Galacturonsäure' },
  arabinose: { id: 'arabinose', name: 'Arabinose', klasse: 'Pentose (Einfachzucker, 5 C)', formel: 'C5H10O5', in: 'Seitenketten von Pektinen und Hemicellulosen, Extensin' },
  galactose: { id: 'galactose', name: 'Galactose', klasse: 'Hexose (Einfachzucker, 6 C)', formel: 'C6H12O6', in: 'Seitenketten von Pektinen und Xyloglucan' },
  xylose: { id: 'xylose', name: 'Xylose', klasse: 'Pentose („Holzzucker“, 5 C)', formel: 'C5H10O5', in: 'Xyloglucan (Seitenketten), Xylane' },
  mannose: { id: 'mannose', name: 'Mannose', klasse: 'Hexose (Einfachzucker, 6 C)', formel: 'C6H12O6', in: 'Glucomannane (Nadelholz)' },
  fucose: { id: 'fucose', name: 'Fucose', klasse: 'Desoxyzucker (6 C)', formel: 'C6H12O5', in: 'Enden der Xyloglucan-Seitenketten' },
  monolignole: { id: 'monolignole', name: 'Monolignole', klasse: 'Phenylpropan-Alkohole, gebildet aus der Aminosäure Phenylalanin', in: 'Lignin – p-Cumaryl-, Coniferyl- und Sinapylalkohol, unregelmäßig vernetzt' },
  aminosaeuren: { id: 'aminosaeuren', name: 'Aminosäuren', klasse: 'Bausteine der Proteine', in: 'Strukturproteine, Enzyme der Wand' },
  hydroxyprolin: { id: 'hydroxyprolin', name: 'Hydroxyprolin', klasse: 'Aminosäure (hydroxyliertes Prolin)', formel: 'C5H9NO3', in: 'Extensin – typisch für Wandproteine' },
  calcium: { id: 'calcium', name: 'Calcium-Ionen', klasse: 'zweifach positives Ion', formel: 'Ca²⁺', in: 'binden die Säuregruppen zweier Pektinketten → Calciumpektat (Gel)' },
  fettsaeuren: { id: 'fettsaeuren', name: 'Hydroxyfettsäuren', klasse: 'langkettige Fettsäuren mit OH-Gruppen', in: 'Cutin und Suberin – wasserabweisende Auflagerungen' },
  nag: { id: 'nag', name: 'N-Acetylglucosamin', klasse: 'Aminozucker (abgeleitet von Glucose)', formel: 'C8H15NO6', in: 'Chitin (Pilze), Murein (Bakterien)' },
  nam: { id: 'nam', name: 'N-Acetylmuraminsäure', klasse: 'Aminozucker mit Milchsäure-Rest', formel: 'C11H19NO8', in: 'Murein (Bakterien)' },
}

/** Reihenfolge im Glossar */
export const BAUSTEIN_ORDER: BausteinId[] = ['glucose', 'galacturonsaeure', 'rhamnose', 'arabinose', 'galactose', 'xylose', 'mannose', 'fucose', 'monolignole', 'hydroxyprolin', 'calcium', 'fettsaeuren']

/** Ein- und Auflagerungen in bzw. auf die Wand */
export const ZUSAETZE: Teil[] = [
  { name: 'Cutin + Wachse', info: 'Auflagerung: Cuticula auf der Außenwand der Epidermis – Verdunstungsschutz', aus: [{ name: 'Hydroxyfettsäuren', g: 'fettsaeuren' }] },
  { name: 'Suberin', info: 'Auflagerung: Korkstoff – macht Zellwände wasserdicht (Kork, Endodermis)', aus: [{ name: 'Hydroxyfettsäuren', g: 'fettsaeuren' }, { name: 'Glycerin' }, { name: 'Phenole' }] },
  { name: 'Kieselsäure', info: 'Einlagerung, z. B. bei Schachtelhalm und Gräsern – hart und scharfkantig', aus: [{ name: 'SiO₂' }] },
]

export const BEGRIFFE: { t: string; items: [string, string][] }[] = [
  {
    t: 'Wasser und Druck',
    items: [
      ['Turgor', 'Innendruck der Zelle: Wasser strömt in die Vakuole und drückt den Protoplasten gegen die Wand.'],
      ['Wanddruck', 'Gegendruck der Zellwand. Turgor drückt, Zellwand hält dagegen – die Zelle platzt nicht.'],
      ['Plasmolyse', 'In einer hypertonischen Lösung verliert die Vakuole Wasser, der Protoplast löst sich von der Wand.'],
      ['Deplasmolyse', 'In Wasser (hypotonisch) strömt Wasser zurück, der Protoplast legt sich wieder an.'],
      ['Protoplast', 'Die Zelle ohne Zellwand: Zellmembran und alles, was darin liegt.'],
    ],
  },
  {
    t: 'Durchlässigkeit und Verbindung',
    items: [
      ['permeabel', 'Die Zellwand ist frei durchlässig für Wasser und kleine gelöste Stoffe. Die Auswahl trifft die Zellmembran (selektiv permeabel).'],
      ['Plasmodesmen', 'Plasmabrücken durch die Wand, verbinden das Cytoplasma benachbarter Zellen.'],
      ['Apoplast', 'Zusammenhängender Raum aus allen Zellwänden und Zellzwischenräumen – Wasserweg außerhalb der Membranen.'],
      ['Symplast', 'Über Plasmodesmen verbundenes Cytoplasma aller Zellen.'],
    ],
  },
  {
    t: 'Aufbau',
    items: [
      ['Mikrofibrille', 'Bündel paralleler Celluloseketten – die „Bewehrung“ der Wand.'],
      ['Matrix', 'Grundsubstanz zwischen den Fibrillen aus Hemicellulosen, Pektinen, Proteinen und Wasser.'],
      ['Streutextur', 'Fibrillen liegen ungeordnet – typisch für die Primärwand.'],
      ['Paralleltextur', 'Fibrillen liegen parallel – typisch für die Sekundärwand.'],
      ['Cellulose-Synthase', 'Enzymkomplex in der Zellmembran, der Cellulose direkt nach außen in die Wand spinnt. Pektine und Hemicellulosen kommen dagegen aus dem Golgi-Apparat.'],
    ],
  },
  {
    t: 'Veränderungen der Wand',
    items: [
      ['Inkrustierung', 'Einlagerung von Stoffen in die Wand, z. B. Lignin (Verholzung) oder Kieselsäure.'],
      ['Akkrustierung', 'Auflagerung von Stoffen auf die Wand, z. B. Cutin, Suberin, Wachse.'],
      ['Verholzung', 'Einlagerung von Lignin – die Wand wird druckfest und wasserabweisend.'],
      ['Verkorkung', 'Auflagerung von Suberin – die Zelle wird wasserdicht und stirbt meist ab.'],
    ],
  },
]

export const FUNKTIONEN: [string, string][] = [
  ['Form und Halt', 'Gibt der Pflanzenzelle ihre feste Form, stützt krautige Pflanzen zusammen mit dem Turgor.'],
  ['Schutz vor dem Platzen', 'Hält als Wanddruck dem Turgor stand.'],
  ['Schutz', 'Barriere gegen Krankheitserreger, Fraß und Verletzungen; Lignin und Cutin zusätzlich gegen Wasserverlust.'],
  ['Stoffaustausch', 'Frei durchlässig; Plasmodesmen und Tüpfel verbinden die Nachbarzellen.'],
  ['Wachstum', 'Die dehnbare Primärwand lässt das Streckungswachstum zu.'],
]

export const VERGLEICH: { wer: string; stoff: string; aus: string; extra?: string }[] = [
  { wer: 'Pflanzen', stoff: 'Cellulose', aus: 'β-D-Glucose (β-1,4)', extra: 'mit Hemicellulosen, Pektinen, ggf. Lignin' },
  { wer: 'Pilze', stoff: 'Chitin', aus: 'N-Acetylglucosamin (β-1,4)', extra: 'auch im Panzer von Insekten und Krebsen' },
  { wer: 'Bakterien', stoff: 'Murein (Peptidoglykan)', aus: 'N-Acetylglucosamin + N-Acetylmuraminsäure, über kurze Peptide vernetzt', extra: 'Angriffspunkt von Penicillin' },
  { wer: 'Tiere', stoff: 'keine Zellwand', aus: '–', extra: 'Halt durch Cytoskelett und extrazelluläre Matrix (z. B. Kollagen)' },
]
