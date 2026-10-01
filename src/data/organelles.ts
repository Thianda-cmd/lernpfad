export type OrganelleId =
  | 'zellmembran'
  | 'cytoplasma'
  | 'zellkern'
  | 'kernhuelle'
  | 'kernporen'
  | 'nucleolus'
  | 'chromatin'
  | 'raues-er'
  | 'glattes-er'
  | 'ribosomen'
  | 'golgi'
  | 'vesikel'
  | 'mitochondrium'
  | 'lysosom'
  | 'peroxisom'
  | 'zentrosom'
  | 'cytoskelett'
  | 'zellwand'
  | 'plasmodesmen'
  | 'vakuole'
  | 'chloroplast'

export type CellType = 'tier' | 'pflanze'

export type MembranTyp = 'doppelt' | 'einfach' | 'keine'

export interface Organelle {
  id: OrganelleId
  name: string
  /** Kurzer Name für Beschriftungen */
  label: string
  fachbegriff: string
  farbe: string
  membran: MembranTyp
  membranHinweis?: string
  vorkommen: { tier: boolean; pflanze: boolean }
  parent?: OrganelleId
  analogie: string
  kurz: string
  aufbau: string[]
  funktionen: string[]
  steckbrief: { label: string; wert: string }[]
  merksatz: string
  pruefung: string
  tierVsPflanze?: string
  formel?: { titel: string; gleichung: string; hinweis?: string }
}

export const ORGANELLES: Record<OrganelleId, Organelle> = {
  zellmembran: {
    id: 'zellmembran',
    name: 'Zellmembran',
    label: 'Zellmembran',
    fachbegriff: 'Plasmamembran · Plasmalemma',
    farbe: '#d58d9c',
    membran: 'einfach',
    membranHinweis: 'Sie ist selbst eine Biomembran (Lipiddoppelschicht).',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Die Grenzkontrolle der Zelle – sie entscheidet, was hinein- und hinausdarf.',
    kurz: 'Die Zellmembran umschließt die Zelle, trennt das Zellinnere von der Umgebung und regelt den Stoffaustausch.',
    aufbau: [
      'Phospholipid-Doppelschicht: Die hydrophilen (wasserliebenden) Köpfe zeigen nach außen und innen, die hydrophoben (wassermeidenden) Fettsäureschwänze zeigen zueinander.',
      'Eingelagerte Proteine: integrale Proteine durchspannen die Membran (Kanäle, Carrier, Pumpen), periphere Proteine liegen ihr nur an.',
      'Cholesterin (in Tierzellen) stabilisiert die Membran und reguliert ihre Fluidität.',
      'Glykokalyx: Zuckerketten an Proteinen (Glykoproteine) und Lipiden (Glykolipide) auf der Außenseite.',
      'Flüssig-Mosaik-Modell (Singer & Nicolson, 1972): Lipide und viele Proteine sind seitlich beweglich.',
    ],
    funktionen: [
      'Abgrenzung der Zelle von ihrer Umgebung (Kompartimentierung).',
      'Selektive Permeabilität: Kleine unpolare Moleküle wie O₂ und CO₂ diffundieren leicht hindurch, Ionen und große polare Moleküle brauchen Transportproteine.',
      'Stofftransport: passiv (Diffusion, erleichterte Diffusion, Osmose) oder aktiv unter ATP-Verbrauch (z. B. Natrium-Kalium-Pumpe).',
      'Endocytose und Exocytose: Aufnahme bzw. Abgabe großer Partikel über Vesikel.',
      'Signalaufnahme über Rezeptoren (z. B. für Hormone) und Zell-Zell-Erkennung über die Glykokalyx.',
    ],
    steckbrief: [
      { label: 'Dicke', wert: 'ca. 7–10 nm' },
      { label: 'Grundgerüst', wert: 'Phospholipid-Doppelschicht' },
      { label: 'Modell', wert: 'Flüssig-Mosaik-Modell' },
      { label: 'Vorkommen', wert: 'alle Zellen (auch Bakterien)' },
    ],
    merksatz: 'Köpfe ans Wasser, Schwänze ins Trockene: Die hydrophoben Fettsäureschwänze verstecken sich in der Mitte der Doppelschicht.',
    pruefung:
      'Die Zellmembran ist selektiv permeabel – nicht „undurchlässig“. Wasser passiert sie langsam direkt und sehr schnell über Aquaporine (Wasserkanäle).',
    tierVsPflanze:
      'In Pflanzenzellen liegt die Zellmembran der Zellwand von innen eng an. Statt Cholesterin enthalten Pflanzenmembranen vor allem Phytosterine.',
  },

  cytoplasma: {
    id: 'cytoplasma',
    name: 'Cytoplasma',
    label: 'Cytoplasma',
    fachbegriff: 'Zytoplasma · Grundsubstanz: Cytosol',
    farbe: '#a9c7c3',
    membran: 'keine',
    membranHinweis: 'Kein Organell, sondern der Zellinnenraum.',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Die Fabrikhalle, in der alle Maschinen stehen und arbeiten.',
    kurz: 'Das Cytoplasma ist der gesamte Zellinhalt innerhalb der Zellmembran – ohne den Zellkern. Es besteht aus der gelartigen Grundsubstanz (Cytosol) und den darin liegenden Organellen.',
    aufbau: [
      'Cytosol: wässrige, gelartige Flüssigkeit mit gelösten Ionen, Nährstoffen, Enzymen und anderen Proteinen.',
      'Darin eingebettet: Organellen, Ribosomen und das Cytoskelett.',
      'Das Innere des Zellkerns gehört nicht dazu – es heißt Karyoplasma (Nucleoplasma).',
    ],
    funktionen: [
      'Ort vieler Stoffwechselreaktionen, z. B. der Glykolyse (erster Schritt des Glucoseabbaus).',
      'Proteinbiosynthese an freien Ribosomen.',
      'Transportmedium: Stoffe verteilen sich per Diffusion, Organellen werden entlang des Cytoskeletts bewegt.',
      'In Pflanzenzellen: Plasmaströmung verteilt Stoffe und Organellen – gut zu beobachten z. B. bei der Wasserpest (Elodea).',
    ],
    steckbrief: [
      { label: 'Hauptbestandteil', wert: 'Wasser' },
      { label: 'Konsistenz', wert: 'gelartig, dynamisch' },
      { label: 'pH-Wert (Cytosol)', wert: 'ca. 7,2' },
      { label: 'Vorkommen', wert: 'alle Zellen' },
    ],
    merksatz: 'Cytoplasma = Cytosol + alles, was darin schwimmt (außer dem Zellkern).',
    pruefung:
      'Nicht verwechseln: Das Cytosol ist nur die Flüssigkeit. Das Cytoplasma umfasst zusätzlich die Organellen – aber nicht den Zellkern.',
    tierVsPflanze:
      'In ausgewachsenen Pflanzenzellen drückt die große Zentralvakuole das Cytoplasma als dünne Schicht an die Zellwand.',
  },

  zellkern: {
    id: 'zellkern',
    name: 'Zellkern',
    label: 'Zellkern',
    fachbegriff: 'Nucleus (lat.) · Karyon (griech.)',
    farbe: '#7a6cb2',
    membran: 'doppelt',
    membranHinweis: 'Umgeben von der Kernhülle (Doppelmembran).',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Die Chefetage mit dem Bauplan-Archiv – hier liegt die Erbinformation.',
    kurz: 'Der Zellkern enthält den größten Teil der Erbinformation (DNA) und steuert über die Aktivität der Gene die Vorgänge in der Zelle.',
    aufbau: [
      'Kernhülle: Doppelmembran mit zahlreichen Kernporen; die äußere Membran geht in das ER über.',
      'Karyoplasma (Nucleoplasma): Grundsubstanz im Inneren des Kerns.',
      'Chromatin: DNA, die mit Proteinen (v. a. Histonen) verpackt ist.',
      'Nucleolus (Kernkörperchen): Bildungsort der Ribosomen-Untereinheiten.',
      'Kernlamina: Netz aus Laminen (Intermediärfilamente) an der Innenseite der Kernhülle, stabilisiert den Kern.',
    ],
    funktionen: [
      'Speicherung der genetischen Information (DNA).',
      'Replikation: Verdopplung der DNA vor der Zellteilung.',
      'Transkription: Gene werden in mRNA umgeschrieben, die durch die Kernporen ins Cytoplasma gelangt.',
      'Steuerung von Stoffwechsel, Wachstum und Zellteilung durch Regulation der Genaktivität.',
    ],
    steckbrief: [
      { label: 'Durchmesser', wert: 'meist ca. 5–10 µm' },
      { label: 'Anzahl', wert: 'meist 1 pro Zelle' },
      { label: 'Ausnahmen', wert: 'mehrkernige Skelettmuskelfasern; reife rote Blutkörperchen der Säugetiere sind kernlos' },
      { label: 'Membran', wert: 'Doppelmembran (Kernhülle)' },
    ],
    merksatz: 'Ohne Kern keine neue mRNA: Reife rote Blutkörperchen (Säuger) haben keinen Zellkern und leben deshalb nur etwa 120 Tage.',
    pruefung:
      'Der Zellkern ist das Kennzeichen der Eukaryoten (eu = echt, karyon = Kern). Prokaryoten wie Bakterien haben keinen Zellkern – ihre DNA liegt als Nucleoid frei im Cytoplasma.',
    tierVsPflanze:
      'In Pflanzenzellen wird der Zellkern oft von der Zentralvakuole an den Rand gedrückt; in Tierzellen liegt er häufig zentral.',
  },

  kernhuelle: {
    id: 'kernhuelle',
    name: 'Kernhülle',
    label: 'Kernhülle',
    fachbegriff: 'Kernmembran · Nuclear Envelope',
    farbe: '#6b5da7',
    membran: 'doppelt',
    vorkommen: { tier: true, pflanze: true },
    parent: 'zellkern',
    analogie: 'Die Mauer um die Chefetage – mit bewachten Toren.',
    kurz: 'Die Kernhülle ist eine Doppelmembran, die den Zellkern vom Cytoplasma trennt.',
    aufbau: [
      'Äußere und innere Kernmembran, dazwischen der perinukleäre Raum.',
      'Die äußere Kernmembran geht direkt in das Endoplasmatische Retikulum über und trägt oft Ribosomen.',
      'Von Tausenden Kernporen durchbrochen.',
      'Innen durch die Kernlamina gestützt.',
    ],
    funktionen: [
      'Räumliche Trennung von Transkription (im Kern) und Translation (im Cytoplasma).',
      'Schutz der DNA.',
      'Kontrollierter Stoffaustausch über die Kernporen.',
      'Zerfällt zu Beginn der Kernteilung und bildet sich in der Telophase neu.',
    ],
    steckbrief: [
      { label: 'Aufbau', wert: '2 Membranen + perinukleärer Raum' },
      { label: 'Verbindung', wert: 'geht in das ER über' },
      { label: 'Stütze', wert: 'Kernlamina (Lamine)' },
    ],
    merksatz: 'Doppelt hält besser: Zellkern, Mitochondrien und Chloroplasten haben eine Doppelmembran.',
    pruefung:
      'Organellen mit Doppelmembran: Zellkern, Mitochondrien und Plastiden (z. B. Chloroplasten). Eigene DNA und 70S-Ribosomen haben davon aber nur Mitochondrien und Plastiden (Endosymbiontentheorie).',
  },

  kernporen: {
    id: 'kernporen',
    name: 'Kernporen',
    label: 'Kernporen',
    fachbegriff: 'Kernporenkomplexe',
    farbe: '#cdc4e9',
    membran: 'keine',
    membranHinweis: 'Proteinkomplexe in der Kernhülle.',
    vorkommen: { tier: true, pflanze: true },
    parent: 'zellkern',
    analogie: 'Die Sicherheitsschleusen am Tor des Zellkerns.',
    kurz: 'Kernporen sind große Proteinkomplexe in der Kernhülle, die den Transport zwischen Zellkern und Cytoplasma regeln.',
    aufbau: [
      'Aus vielen Kopien von rund 30 verschiedenen Proteinen (Nucleoporinen) aufgebaut, mit achtzähliger Symmetrie.',
      'An den Porenrändern gehen innere und äußere Kernmembran ineinander über.',
    ],
    funktionen: [
      'Export von mRNA, tRNA und Ribosomen-Untereinheiten aus dem Kern.',
      'Import von Proteinen in den Kern, z. B. Histone, DNA-Polymerasen und Transkriptionsfaktoren.',
      'Kleine Moleküle und Ionen diffundieren frei, große Moleküle werden gezielt transportiert.',
    ],
    steckbrief: [
      { label: 'Anzahl', wert: 'mehrere Tausend pro Zellkern' },
      { label: 'Bausteine', wert: 'Nucleoporine' },
      { label: 'Symmetrie', wert: 'achtzählig' },
    ],
    merksatz: 'mRNA raus, Proteine rein.',
    pruefung:
      'Ribosomen-Untereinheiten werden im Nucleolus gebaut, aber erst im Cytoplasma zu fertigen Ribosomen vereinigt – ihr Weg dorthin führt durch die Kernporen.',
  },

  nucleolus: {
    id: 'nucleolus',
    name: 'Nucleolus',
    label: 'Nucleolus',
    fachbegriff: 'Kernkörperchen (Plural: Nucleoli)',
    farbe: '#433879',
    membran: 'keine',
    vorkommen: { tier: true, pflanze: true },
    parent: 'zellkern',
    analogie: 'Die Ribosomen-Werkstatt im Zellkern.',
    kurz: 'Der Nucleolus ist ein dichter, nicht von einer Membran umgebener Bereich im Zellkern. Hier wird ribosomale RNA (rRNA) gebildet und mit Proteinen zu Ribosomen-Untereinheiten zusammengebaut.',
    aufbau: [
      'Keine Membran – entsteht an Chromosomenabschnitten mit rRNA-Genen (Nucleolus-Organisator-Regionen).',
      'Besteht aus rRNA, Proteinen und DNA.',
      'Im Lichtmikroskop als dunkel angefärbtes Körperchen im Kern erkennbar.',
    ],
    funktionen: [
      'Transkription der rRNA-Gene.',
      'Zusammenbau der großen und kleinen Ribosomen-Untereinheiten aus rRNA und ribosomalen Proteinen.',
    ],
    steckbrief: [
      { label: 'Anzahl', wert: '1 bis mehrere pro Zellkern' },
      { label: 'Größe', wert: 'abhängig von der Syntheseaktivität der Zelle' },
      { label: 'Membran', wert: 'keine' },
    ],
    merksatz: 'Nucleolus = Ribosomen-Fabrik: Je mehr Protein eine Zelle herstellt, desto größer ist ihr Nucleolus.',
    pruefung:
      'Der Nucleolus ist kein Organell mit Membran. Während der Zellteilung löst er sich auf und bildet sich danach neu.',
  },

  chromatin: {
    id: 'chromatin',
    name: 'Chromatin',
    label: 'Chromatin',
    fachbegriff: 'DNA-Protein-Komplex',
    farbe: '#9b8fcd',
    membran: 'keine',
    vorkommen: { tier: true, pflanze: true },
    parent: 'zellkern',
    analogie: 'Das Archiv mit allen Bauplänen – ordentlich aufgewickelt.',
    kurz: 'Chromatin ist die Form, in der die DNA im Zellkern vorliegt: DNA-Fäden, die um Histon-Proteine gewickelt sind.',
    aufbau: [
      'DNA-Doppelhelix, um Histone gewickelt → Nukleosomen („Perlenkette“).',
      'Euchromatin: locker gepackt, genetisch aktiv (wird abgelesen).',
      'Heterochromatin: dicht gepackt, weitgehend inaktiv; liegt oft am Rand des Zellkerns.',
      'Vor der Zellteilung kondensiert das Chromatin zu Chromosomen, die im Lichtmikroskop sichtbar werden.',
    ],
    funktionen: [
      'Platzsparende Verpackung: Die DNA einer menschlichen Zelle wäre ausgestreckt rund 2 m lang.',
      'Regulation der Genaktivität über den Verpackungsgrad.',
      'Schutz der DNA vor Schäden.',
    ],
    steckbrief: [
      { label: 'Mensch', wert: '46 Chromosomen (23 Paare) pro Körperzelle' },
      { label: 'DNA-Länge', wert: 'ca. 2 m pro Zelle' },
      { label: 'Hauptproteine', wert: 'Histone' },
    ],
    merksatz: 'Locker = lesbar (Euchromatin), dicht = dichtgemacht (Heterochromatin).',
    pruefung:
      'Chromatin und Chromosomen bestehen aus demselben Material – Chromosomen sind nur die stark kondensierte Transportform während der Zellteilung.',
  },

  'raues-er': {
    id: 'raues-er',
    name: 'Raues ER',
    label: 'Raues ER',
    fachbegriff: 'Raues Endoplasmatisches Retikulum (rER)',
    farbe: '#5b7eb5',
    membran: 'einfach',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Die Produktionsstraße für Export- und Membranproteine.',
    kurz: 'Das raue ER ist ein Membransystem aus flachen Säckchen (Zisternen), dessen Außenseite mit Ribosomen besetzt ist. Hier entstehen Proteine für Membranen, Lysosomen und den Export.',
    aufbau: [
      'Netzwerk aus flachen, miteinander verbundenen Membransäckchen (Zisternen); der Innenraum heißt Lumen.',
      'Auf der Cytoplasma-Seite mit Ribosomen besetzt – daher „rau“ (im Elektronenmikroskop gekörnt).',
      'Steht direkt mit der äußeren Kernmembran in Verbindung.',
    ],
    funktionen: [
      'Synthese von Proteinen, die ausgeschleust, in Membranen eingebaut oder zu Lysosomen gebracht werden.',
      'Die wachsende Proteinkette wird schon während der Translation ins ER-Lumen eingeschleust (cotranslationaler Import).',
      'Faltung von Proteinen, Bildung von Disulfidbrücken und Beginn der Glykosylierung (Anhängen von Zuckerketten).',
      'Qualitätskontrolle: Falsch gefaltete Proteine werden erkannt und abgebaut.',
      'Weitertransport der Proteine in Vesikeln zum Golgi-Apparat.',
    ],
    steckbrief: [
      { label: 'Membran', wert: 'einfach' },
      { label: 'Besonders ausgeprägt in', wert: 'Plasmazellen (Antikörper), Bauchspeicheldrüsenzellen (Verdauungsenzyme)' },
      { label: 'Verbindung', wert: 'mit Kernhülle und glattem ER' },
    ],
    merksatz: 'Rau = Ribosomen drauf = Proteine.',
    pruefung:
      'Proteine, die im Cytosol bleiben, entstehen an freien Ribosomen. Proteine für Export, Membranen und Lysosomen entstehen am rauen ER.',
  },

  'glattes-er': {
    id: 'glattes-er',
    name: 'Glattes ER',
    label: 'Glattes ER',
    fachbegriff: 'Glattes Endoplasmatisches Retikulum (sER)',
    farbe: '#4f98a0',
    membran: 'einfach',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Die Chemie- und Entgiftungsabteilung der Zelle.',
    kurz: 'Das glatte ER ist ein röhrenförmiges Membransystem ohne Ribosomen. Es bildet Lipide, entgiftet Stoffe und speichert Calcium-Ionen.',
    aufbau: [
      'Verzweigtes Netzwerk aus Membranröhren (Tubuli).',
      'Keine Ribosomen auf der Oberfläche – daher „glatt“.',
      'Geht fließend in das raue ER über.',
    ],
    funktionen: [
      'Synthese von Lipiden: Phospholipide für Membranen, Cholesterin und Steroidhormone (z. B. Testosteron, Östrogene).',
      'Entgiftung von Medikamenten und Giftstoffen, besonders in Leberzellen (z. B. durch Cytochrom-P450-Enzyme).',
      'Speicherung von Calcium-Ionen (Ca²⁺); in Muskelzellen als sarkoplasmatisches Retikulum wichtig für die Kontraktion.',
      'Kohlenhydratstoffwechsel: In Leberzellen wird Glucose-6-phosphat beim Glykogenabbau zu Glucose umgewandelt.',
    ],
    steckbrief: [
      { label: 'Membran', wert: 'einfach' },
      { label: 'Besonders ausgeprägt in', wert: 'Leberzellen, hormonbildenden Zellen (Nebenniere, Keimdrüsen), Muskelzellen' },
    ],
    merksatz: 'Glatt = Fett: Das glatte ER macht Lipide.',
    pruefung:
      'Beide ER-Formen bilden ein zusammenhängendes Membransystem. Unterschied: Ribosomen (rau) → Proteine; keine Ribosomen (glatt) → Lipide, Entgiftung, Ca²⁺-Speicher.',
  },

  ribosomen: {
    id: 'ribosomen',
    name: 'Ribosomen',
    label: 'Ribosomen',
    fachbegriff: 'Ribosom (80S bei Eukaryoten)',
    farbe: '#3d3a69',
    membran: 'keine',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Die Nähmaschinen, die Proteine nach Anleitung zusammennähen.',
    kurz: 'Ribosomen sind kleine Komplexe aus rRNA und Proteinen, an denen die Proteinbiosynthese (Translation) stattfindet.',
    aufbau: [
      'Zwei Untereinheiten: große (60S) und kleine (40S) – zusammen ein 80S-Ribosom.',
      'Bestehen aus ribosomaler RNA (rRNA) und Proteinen – keine Membran.',
      'Frei im Cytoplasma oder an das raue ER bzw. die äußere Kernmembran gebunden.',
      'Mehrere Ribosomen an einer mRNA bilden ein Polysom.',
    ],
    funktionen: [
      'Translation: Übersetzung der Basenfolge der mRNA in die Aminosäuresequenz eines Proteins.',
      'Freie Ribosomen: Proteine für Cytosol, Zellkern, Mitochondrien, Plastiden und Peroxisomen.',
      'ER-gebundene Ribosomen: Proteine für Membranen, Lysosomen und den Export.',
    ],
    steckbrief: [
      { label: 'Größe', wert: 'ca. 25–30 nm' },
      { label: 'Cytoplasma (Eukaryoten)', wert: '80S (60S + 40S)' },
      { label: 'Mitochondrien, Plastiden, Bakterien', wert: '70S (50S + 30S)' },
      { label: 'Bildung', wert: 'Untereinheiten im Nucleolus' },
    ],
    merksatz: '60S + 40S = 80S – und trotzdem richtig gerechnet: S-Werte (Svedberg) sind nicht additiv.',
    pruefung:
      'Der S-Wert (Svedberg-Einheit) beschreibt das Sedimentationsverhalten in der Ultrazentrifuge und hängt von Masse und Form ab. Deshalb ist 60S + 40S = 80S kein Rechenfehler.',
  },

  golgi: {
    id: 'golgi',
    name: 'Golgi-Apparat',
    label: 'Golgi-Apparat',
    fachbegriff: 'Golgi-Apparat · ein Stapel = Dictyosom',
    farbe: '#cfa24f',
    membran: 'einfach',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Die Post- und Versandabteilung: verpacken, beschriften, verschicken.',
    kurz: 'Der Golgi-Apparat verändert, sortiert und verpackt Proteine und Lipide aus dem ER und schickt sie in Vesikeln an ihren Bestimmungsort.',
    aufbau: [
      'Stapel aus flachen, leicht gekrümmten Membransäckchen (Zisternen); ein Stapel heißt Dictyosom.',
      'cis-Seite: dem ER zugewandt, nimmt Transportvesikel auf (Empfangsseite).',
      'trans-Seite: gibt Vesikel ab (Versandseite); dort liegt das trans-Golgi-Netzwerk.',
      'Die Stoffe durchlaufen den Stapel von cis über medial nach trans.',
    ],
    funktionen: [
      'Modifikation von Proteinen, v. a. Umbau und Ergänzung der Zuckerketten (Glykosylierung).',
      'Sortierung und „Adressierung“, z. B. Markierung lysosomaler Enzyme mit Mannose-6-phosphat.',
      'Bildung von sekretorischen Vesikeln (Exocytose) und Lysosomen.',
      'In Pflanzenzellen: Synthese von Zellwand-Polysacchariden (Hemicellulosen, Pektine).',
    ],
    steckbrief: [
      { label: 'Membran', wert: 'einfach' },
      { label: 'Zisternen pro Stapel', wert: 'meist 4–8' },
      { label: 'Benannt nach', wert: 'Camillo Golgi (1898)' },
    ],
    merksatz: 'Golgi = die Post: Pakete (Vesikel) kommen cis an und gehen trans raus.',
    pruefung:
      'Cellulose wird NICHT im Golgi-Apparat gebildet, sondern von Cellulose-Synthase-Komplexen in der Zellmembran. Der Golgi liefert Hemicellulosen und Pektine.',
    tierVsPflanze:
      'Tierzellen besitzen meist einen zusammenhängenden Golgi-Apparat nahe dem Zellkern; Pflanzenzellen haben viele einzelne, im Cytoplasma verteilte Dictyosomen.',
  },

  vesikel: {
    id: 'vesikel',
    name: 'Vesikel',
    label: 'Vesikel',
    fachbegriff: 'Transportvesikel · Bläschen',
    farbe: '#e3cb8d',
    membran: 'einfach',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Die Paketboten der Zelle.',
    kurz: 'Vesikel sind kleine, von einer Membran umschlossene Bläschen, die Stoffe innerhalb der Zelle transportieren oder aus der Zelle ausschleusen.',
    aufbau: [
      'Kugelige Bläschen, umgeben von einer einfachen Lipiddoppelschicht.',
      'Schnüren sich von Membranen ab (ER, Golgi-Apparat, Zellmembran) und verschmelzen mit Zielmembranen.',
      'Hüllproteine (z. B. Clathrin, COPI, COPII) helfen beim Abschnüren.',
    ],
    funktionen: [
      'Transport von Proteinen und Lipiden zwischen ER, Golgi-Apparat, Lysosomen und Zellmembran.',
      'Exocytose: Ausschleusen von Stoffen, z. B. Hormonen, Verdauungsenzymen oder Neurotransmittern.',
      'Endocytose: Aufnahme von Stoffen in die Zelle (Phagocytose = „Zellfressen“, Pinocytose = „Zelltrinken“).',
      'Erneuerung der Zellmembran: Beim Verschmelzen wird Vesikelmembran in die Zellmembran eingebaut.',
    ],
    steckbrief: [
      { label: 'Größe', wert: 'meist deutlich unter 1 µm' },
      { label: 'Membran', wert: 'einfach' },
    ],
    merksatz: 'Endo = hinein, Exo = hinaus.',
    pruefung: 'Endo- und Exocytose sind energieabhängige (aktive) Transportvorgänge.',
  },

  mitochondrium: {
    id: 'mitochondrium',
    name: 'Mitochondrien',
    label: 'Mitochondrium',
    fachbegriff: 'Mitochondrium (griech. mitos = Faden, chondros = Korn)',
    farbe: '#cf7f58',
    membran: 'doppelt',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Das Kraftwerk der Zelle – es wandelt die Energie aus Nährstoffen in ATP um.',
    kurz: 'Mitochondrien sind die Orte der Zellatmung. Sie gewinnen aus Nährstoffen wie Glucose und Fettsäuren den universellen Energieträger ATP.',
    aufbau: [
      'Doppelmembran: glatte äußere Membran und stark gefaltete innere Membran.',
      'Cristae: Einfaltungen der inneren Membran – sie vergrößern die Oberfläche für die Atmungskette.',
      'Matrix: Innenraum mit Enzymen des Citratzyklus, eigener ringförmiger DNA (mtDNA) und 70S-Ribosomen.',
      'Intermembranraum: Raum zwischen äußerer und innerer Membran.',
    ],
    funktionen: [
      'Zellatmung: vollständiger Abbau von Glucose zu CO₂ und H₂O.',
      'Citratzyklus in der Matrix; Atmungskette und ATP-Synthese an der inneren Membran.',
      'Abbau von Fettsäuren (β-Oxidation) in der Matrix.',
      'Beteiligung am programmierten Zelltod (Apoptose) und an der Wärmebildung (braunes Fettgewebe).',
    ],
    steckbrief: [
      { label: 'Größe', wert: 'ca. 0,5–1 µm breit, 1–10 µm lang' },
      { label: 'Anzahl', wert: 'je nach Zelltyp wenige bis mehrere Tausend' },
      { label: 'ATP-Ausbeute', wert: 'ca. 30–32 ATP pro Glucose (ältere Lehrbücher: 36–38)' },
      { label: 'Vererbung', wert: 'mütterlich (über die Eizelle)' },
    ],
    merksatz: 'Viel Bewegung = viele Mitochondrien: Herz- und Muskelzellen sind voll davon.',
    pruefung:
      'Endosymbiontentheorie: Mitochondrien stammen von aufgenommenen Bakterien ab. Belege: Doppelmembran, eigene ringförmige DNA, 70S-Ribosomen und Vermehrung durch Teilung.',
    tierVsPflanze:
      'Auch Pflanzenzellen besitzen Mitochondrien! Pflanzen betreiben Photosynthese UND Zellatmung – ein beliebter Prüfungsfehler.',
    formel: {
      titel: 'Summengleichung der Zellatmung',
      gleichung: 'C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O',
      hinweis: 'Die frei werdende Energie wird teilweise in ATP gespeichert.',
    },
  },

  lysosom: {
    id: 'lysosom',
    name: 'Lysosomen',
    label: 'Lysosom',
    fachbegriff: 'Lysosom (griech. lysis = Auflösung)',
    farbe: '#ad6282',
    membran: 'einfach',
    vorkommen: { tier: true, pflanze: false },
    analogie: 'Der Recyclinghof und die Müllverbrennung der Zelle.',
    kurz: 'Lysosomen sind Bläschen voller Verdauungsenzyme. Sie bauen aufgenommene Stoffe, Krankheitserreger und verbrauchte Zellbestandteile ab.',
    aufbau: [
      'Von einer einfachen Membran umgeben, die die Zelle vor den eigenen Enzymen schützt.',
      'Enthalten rund 50 verschiedene saure Hydrolasen (z. B. Proteasen, Nucleasen, Lipasen, Glykosidasen).',
      'Saurer Innenraum (pH ca. 4,5–5), aufrechterhalten durch Protonenpumpen in der Membran.',
      'Entstehen aus Vesikeln des Golgi-Apparats (trans-Golgi-Netzwerk).',
    ],
    funktionen: [
      'Intrazelluläre Verdauung von Stoffen, die per Endocytose oder Phagocytose aufgenommen wurden (z. B. Bakterien in Fresszellen).',
      'Autophagie: Abbau und Recycling eigener, defekter Organellen.',
      'Bereitstellung der Abbauprodukte (Aminosäuren, Zucker, Nucleotide) für die Zelle.',
      'Autolyse: Selbstauflösung abgestorbener Zellen.',
    ],
    steckbrief: [
      { label: 'Größe', wert: 'ca. 0,1–1 µm' },
      { label: 'pH innen', wert: 'ca. 4,5–5' },
      { label: 'pH im Cytosol', wert: 'ca. 7,2' },
      { label: 'Membran', wert: 'einfach' },
    ],
    merksatz: 'Lyse = lösen: Lysosomen lösen auf, was die Zelle nicht mehr braucht.',
    pruefung:
      'Die Enzyme arbeiten nur im Sauren optimal. Gelangen sie ins neutrale Cytosol (pH ≈ 7,2), sind sie weitgehend inaktiv – ein Schutzmechanismus. Defekte Enzyme verursachen lysosomale Speicherkrankheiten (z. B. Tay-Sachs).',
    tierVsPflanze:
      'Pflanzenzellen besitzen keine typischen Lysosomen – ihre Abbaufunktion übernimmt vor allem die Zentralvakuole.',
  },

  peroxisom: {
    id: 'peroxisom',
    name: 'Peroxisomen',
    label: 'Peroxisom',
    fachbegriff: 'Peroxisom (Microbody)',
    farbe: '#a3b764',
    membran: 'einfach',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Die Entgiftungsstation mit eingebautem Feuerlöscher (Katalase).',
    kurz: 'Peroxisomen sind kleine Bläschen mit oxidierenden Enzymen. Sie bauen Fettsäuren ab und entgiften Stoffe – das dabei entstehende Wasserstoffperoxid wird sofort von Katalase zerlegt.',
    aufbau: [
      'Kugelige Bläschen mit einfacher Membran.',
      'Enthalten Oxidasen (bilden H₂O₂) und Katalase (baut H₂O₂ ab).',
      'Keine eigene DNA: Ihre Proteine entstehen an freien Ribosomen und werden aus dem Cytosol importiert.',
      'Vermehren sich durch Teilung oder entstehen neu aus dem ER.',
    ],
    funktionen: [
      'Abbau sehr langkettiger Fettsäuren (β-Oxidation).',
      'Entgiftung, z. B. Abbau eines Teils des Alkohols in Leberzellen.',
      'Zerlegung des giftigen Wasserstoffperoxids durch Katalase.',
      'Synthese bestimmter Lipide (Plasmalogene, z. B. für die Myelinscheiden von Nervenzellen).',
      'In Pflanzen: Beteiligung an der Photorespiration; in keimenden Samen als Glyoxysomen (Umwandlung von Fett in Zucker).',
    ],
    steckbrief: [
      { label: 'Größe', wert: 'ca. 0,1–1 µm' },
      { label: 'Schlüsselenzym', wert: 'Katalase' },
      { label: 'Membran', wert: 'einfach' },
    ],
    merksatz: 'Peroxisom → Peroxid: Hier wird Wasserstoffperoxid (H₂O₂) entsorgt.',
    pruefung:
      'Katalase im Labor: Gibt man H₂O₂ auf frisches Gewebe (z. B. Leber oder Kartoffel), schäumt es durch den frei werdenden Sauerstoff – ein klassischer Nachweisversuch.',
    formel: {
      titel: 'Reaktion der Katalase',
      gleichung: '2 H₂O₂ → 2 H₂O + O₂',
    },
  },

  zentrosom: {
    id: 'zentrosom',
    name: 'Zentrosom',
    label: 'Zentrosom',
    fachbegriff: 'Centrosom mit zwei Centriolen',
    farbe: '#c2625a',
    membran: 'keine',
    vorkommen: { tier: true, pflanze: false },
    analogie: 'Die Bauleitung für das Mikrotubuli-Gerüst und den Spindelapparat.',
    kurz: 'Das Zentrosom ist das wichtigste Mikrotubuli-Organisationszentrum (MTOC) der Tierzelle. Es besteht aus zwei rechtwinklig angeordneten Zentriolen, umgeben von pericentriolärem Material.',
    aufbau: [
      'Zwei Zentriolen, die meist rechtwinklig zueinander liegen.',
      'Jede Zentriole ist ein Hohlzylinder aus 9 Mikrotubuli-Tripletts (9×3-Muster).',
      'Umgeben von pericentriolärem Material, aus dem Mikrotubuli auswachsen.',
      'Keine Membran; liegt meist nahe am Zellkern.',
    ],
    funktionen: [
      'Organisation der Mikrotubuli des Cytoskeletts.',
      'Bildung des Spindelapparats bei der Zellteilung (Mitose, Meiose): Die verdoppelten Zentrosomen wandern zu den Zellpolen.',
      'Zentriolen können zu Basalkörpern werden, aus denen Zilien und Geißeln wachsen (z. B. Spermiengeißel).',
    ],
    steckbrief: [
      { label: 'Zentriole', wert: 'ca. 0,25 µm Durchmesser, ca. 0,5 µm lang' },
      { label: 'Bauplan', wert: '9 × 3 Mikrotubuli' },
      { label: 'Verdopplung', wert: 'einmal pro Zellzyklus' },
    ],
    merksatz: '9 × 3 = Zentriole · 9 × 2 + 2 = Geißel bzw. Zilie.',
    pruefung:
      'Höhere Pflanzen besitzen keine Zentriolen – ihr Spindelapparat bildet sich trotzdem, organisiert von anderen Strukturen.',
    tierVsPflanze: 'Zentriolen fehlen den Zellen höherer Pflanzen.',
  },

  cytoskelett: {
    id: 'cytoskelett',
    name: 'Cytoskelett',
    label: 'Cytoskelett',
    fachbegriff: 'Zellskelett',
    farbe: '#8f9aad',
    membran: 'keine',
    vorkommen: { tier: true, pflanze: true },
    analogie: 'Gerüst, Schienennetz und Muskeln der Zelle zugleich.',
    kurz: 'Das Cytoskelett ist ein dynamisches Netzwerk aus Proteinfasern. Es gibt der Zelle Form und Stabilität, ermöglicht Bewegung und dient als Transportschiene.',
    aufbau: [
      'Mikrotubuli: Hohlröhren aus Tubulin, ca. 25 nm Durchmesser.',
      'Mikrofilamente (Aktinfilamente): dünne Fäden aus Aktin, ca. 7 nm Durchmesser.',
      'Intermediärfilamente: seilartige Fasern, ca. 10 nm Durchmesser (z. B. aus Keratin oder Laminen).',
    ],
    funktionen: [
      'Mikrotubuli: Transportschienen für Vesikel und Organellen (Motorproteine Kinesin und Dynein), Spindelapparat, Aufbau von Zilien und Geißeln.',
      'Aktinfilamente: Zellform und Zellbewegung, Muskelkontraktion zusammen mit Myosin, Durchschnürung der Tierzelle bei der Teilung; in Pflanzen die Plasmaströmung.',
      'Intermediärfilamente: mechanische Zugfestigkeit, Verankerung von Zellkern und Zellkontakten.',
    ],
    steckbrief: [
      { label: 'Mikrotubuli', wert: 'ca. 25 nm (Tubulin)' },
      { label: 'Intermediärfilamente', wert: 'ca. 10 nm' },
      { label: 'Aktinfilamente', wert: 'ca. 7 nm (Aktin)' },
    ],
    merksatz: 'Mikrotubuli = Tuben (hohl und dick), Aktin = dünne Fäden, Intermediär = dazwischen.',
    pruefung: 'Nach Durchmesser sortiert: Mikrotubuli (25 nm) > Intermediärfilamente (10 nm) > Aktinfilamente (7 nm).',
    tierVsPflanze:
      'Pflanzenzellen besitzen Mikrotubuli und Aktinfilamente, aber keine typischen Intermediärfilamente im Cytoplasma. Corticale Mikrotubuli unter der Zellmembran bestimmen dort die Ausrichtung der neu gebildeten Cellulosefasern.',
  },

  zellwand: {
    id: 'zellwand',
    name: 'Zellwand',
    label: 'Zellwand',
    fachbegriff: 'Zellwand (Cellulosewand)',
    farbe: '#9db77b',
    membran: 'keine',
    membranHinweis: 'Keine Membran, sondern eine feste Hülle außerhalb der Zellmembran.',
    vorkommen: { tier: false, pflanze: true },
    analogie: 'Die feste Außenmauer eines Hauses.',
    kurz: 'Die Zellwand ist eine feste, aber wasserdurchlässige Hülle außerhalb der Zellmembran. Sie gibt der Pflanzenzelle Form und Stabilität und schützt sie vor dem Platzen.',
    aufbau: [
      'Mittellamelle: pektinreiche Kittschicht, die benachbarte Zellen miteinander verbindet.',
      'Primärwand: dünn und dehnbar; Cellulose-Mikrofibrillen in einer Matrix aus Hemicellulosen, Pektinen und Proteinen.',
      'Sekundärwand (in manchen Zellen): wird nach dem Wachstum innen aufgelagert, dicker, oft mit Lignin verholzt.',
      'Von Plasmodesmen durchzogen.',
    ],
    funktionen: [
      'Mechanische Stabilität und Formgebung.',
      'Gegendruck zum Turgor (Wanddruck) – verhindert, dass die Zelle bei Wasseraufnahme platzt.',
      'Schutz vor Krankheitserregern und mechanischer Beschädigung.',
      'Frei durchlässig für Wasser und kleine gelöste Stoffe.',
    ],
    steckbrief: [
      { label: 'Hauptbestandteil', wert: 'Cellulose (Polysaccharid aus β-Glucose)' },
      { label: 'Schichten', wert: 'Mittellamelle · Primärwand · ggf. Sekundärwand' },
      { label: 'Zum Vergleich', wert: 'Pilze: Chitin · Bakterien: Murein' },
    ],
    merksatz: 'Turgor drückt, Zellwand hält dagegen.',
    pruefung:
      'Die Zellwand ist frei durchlässig (permeabel), die Zellmembran dagegen selektiv permeabel. Welche Stoffe in die Zelle gelangen, entscheidet also die Membran – nicht die Wand.',
    tierVsPflanze:
      'Tierzellen haben keine Zellwand. Sie werden durch das Cytoskelett und die extrazelluläre Matrix gestützt.',
  },

  plasmodesmen: {
    id: 'plasmodesmen',
    name: 'Plasmodesmen',
    label: 'Plasmodesmen',
    fachbegriff: 'Plasmodesmos (Sg.) · Plasmodesmata',
    farbe: '#6e8a50',
    membran: 'einfach',
    membranHinweis: 'Kanäle, die von der Zellmembran ausgekleidet sind.',
    vorkommen: { tier: false, pflanze: true },
    analogie: 'Tunnel durch die Mauer zum Nachbarhaus.',
    kurz: 'Plasmodesmen sind feine Kanäle durch die Zellwand, die das Cytoplasma benachbarter Pflanzenzellen miteinander verbinden.',
    aufbau: [
      'Kanal durch die Zellwand, ausgekleidet von der Zellmembran, die so in die Nachbarzelle übergeht.',
      'Im Zentrum verläuft der Desmotubulus – ein schmaler Strang des ER.',
      'Oft gehäuft in dünnen Wandbereichen (primäre Tüpfelfelder).',
    ],
    funktionen: [
      'Stoffaustausch zwischen Nachbarzellen: Wasser, Ionen, Zucker, Aminosäuren.',
      'Kommunikation: Transport von Signalstoffen, bestimmten Proteinen und RNA.',
      'Verbinden die Zellen zu einem zusammenhängenden Cytoplasma-System (Symplast).',
    ],
    steckbrief: [
      { label: 'Anzahl', wert: 'häufig Tausende pro Zelle' },
      { label: 'Im Zentrum', wert: 'Desmotubulus (ER)' },
      { label: 'Gegenstück bei Tieren', wert: 'Gap Junctions' },
    ],
    merksatz: 'Plasmo-desmen = Plasma-Brücken (griech. desmos = Band).',
    pruefung:
      'Symplast = über Plasmodesmen verbundenes Cytoplasma. Apoplast = Zellwände und Zellzwischenräume außerhalb der Zellmembranen.',
  },

  vakuole: {
    id: 'vakuole',
    name: 'Zentralvakuole',
    label: 'Vakuole',
    fachbegriff: 'Vakuole mit Tonoplast',
    farbe: '#8cbad4',
    membran: 'einfach',
    membranHinweis: 'Umgeben vom Tonoplasten.',
    vorkommen: { tier: false, pflanze: true },
    analogie: 'Wassertank, Lager und Entsorgungsstation in einem – und das Luftpolster, das die Zelle prall hält.',
    kurz: 'Die Zentralvakuole ist ein großer, mit Zellsaft gefüllter Raum, umgeben vom Tonoplasten. Sie kann bis zu 90 % des Zellvolumens einnehmen.',
    aufbau: [
      'Tonoplast: einfache Membran, die die Vakuole vom Cytoplasma trennt.',
      'Zellsaft: wässrige Lösung aus Ionen, Zuckern, organischen Säuren, Proteinen, Farbstoffen (z. B. Anthocyane) und Abfallstoffen.',
      'Entsteht in jungen Zellen durch Verschmelzen vieler kleiner Vakuolen.',
    ],
    funktionen: [
      'Aufbau des Turgors: Wasser strömt osmotisch ein, die Vakuole drückt das Cytoplasma gegen die Zellwand – die Pflanze bleibt straff.',
      'Zellwachstum: Die Zelle vergrößert sich vor allem durch Wasseraufnahme in die Vakuole.',
      'Speicherung von Nährstoffen, Ionen und Farbstoffen (z. B. Blütenfarben).',
      'Abbau und Entsorgung: enthält lytische Enzyme (übernimmt Aufgaben der Lysosomen) und lagert Abfall- und Abwehrstoffe (Fraßschutz).',
    ],
    steckbrief: [
      { label: 'Anteil am Zellvolumen', wert: 'bis zu 80–90 %' },
      { label: 'Membran', wert: 'Tonoplast (einfach)' },
      { label: 'Zellsaft', wert: 'meist leicht sauer' },
    ],
    merksatz: 'Voll = straff, leer = schlapp: Welke Pflanzen haben zu wenig Wasser in ihren Vakuolen.',
    pruefung:
      'Plasmolyse: In einer hypertonischen Lösung (z. B. konzentrierte Salz- oder Zuckerlösung) verliert die Vakuole Wasser und der Protoplast löst sich von der Zellwand. In Wasser wird das wieder rückgängig gemacht (Deplasmolyse) – klassischer Mikroskopierversuch mit roter Zwiebelhaut.',
    tierVsPflanze:
      'Tierzellen haben höchstens kleine Vakuolen (z. B. Nahrungsvakuolen), aber keine große Zentralvakuole.',
  },

  chloroplast: {
    id: 'chloroplast',
    name: 'Chloroplasten',
    label: 'Chloroplast',
    fachbegriff: 'Chloroplast (griech. chloros = grün) · ein Plastid',
    farbe: '#5a9c61',
    membran: 'doppelt',
    vorkommen: { tier: false, pflanze: true },
    analogie: 'Das Solarkraftwerk mit angeschlossener Zuckerfabrik.',
    kurz: 'Chloroplasten sind die Orte der Photosynthese. Sie nutzen Lichtenergie, um aus Kohlenstoffdioxid und Wasser Glucose herzustellen – dabei wird Sauerstoff frei.',
    aufbau: [
      'Hülle aus Doppelmembran (äußere und innere Membran).',
      'Thylakoide: flache Membransäckchen mit Chlorophyll; gestapelt bilden sie Grana (Sg. Granum), verbunden durch Stromathylakoide.',
      'Stroma: Grundsubstanz mit den Enzymen des Calvin-Zyklus, eigener ringförmiger DNA und 70S-Ribosomen.',
      'Oft Stärkekörner (Assimilationsstärke) und Lipidtröpfchen (Plastoglobuli).',
    ],
    funktionen: [
      'Lichtabhängige Reaktionen an den Thylakoidmembranen: Lichtabsorption durch Chlorophyll, Spaltung von Wasser (Photolyse), Bildung von ATP und NADPH, Freisetzung von O₂.',
      'Calvin-Zyklus (lichtunabhängige Reaktionen) im Stroma: Fixierung von CO₂ und Aufbau von Zucker mithilfe von ATP und NADPH.',
      'Kurzzeitige Speicherung von Stärke.',
      'Synthese von Fettsäuren und einigen Aminosäuren.',
    ],
    steckbrief: [
      { label: 'Form & Größe', wert: 'linsenförmig, ca. 3–10 µm Durchmesser' },
      { label: 'Anzahl', wert: 'ca. 20–100 pro Blattzelle (Mesophyll)' },
      { label: 'Pigmente', wert: 'Chlorophyll a und b, Carotinoide' },
      { label: 'Herkunft', wert: 'Endosymbiose (Vorfahren: Cyanobakterien)' },
    ],
    merksatz: 'Licht an den Thylakoiden, Zucker im Stroma.',
    pruefung:
      'Chloroplasten gehören zu den Plastiden. Weitere Plastiden: Chromoplasten (gelb-rote Farbstoffe, z. B. in Karotten und Tomaten) und Leukoplasten (farblos, z. B. Amyloplasten als Stärkespeicher in Kartoffelknollen).',
    tierVsPflanze: 'Tierzellen besitzen keine Chloroplasten und können keine Photosynthese betreiben.',
    formel: {
      titel: 'Summengleichung der Photosynthese',
      gleichung: '6 CO₂ + 12 H₂O → C₆H₁₂O₆ + 6 O₂ + 6 H₂O',
      hinweis: 'Vereinfacht: 6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂ (Energiequelle: Licht)',
    },
  },
}

export interface LegendGroup {
  titel: string
  ids: OrganelleId[]
}

export const CELL_GROUPS: Record<CellType, LegendGroup[]> = {
  tier: [
    { titel: 'Hülle & Grundsubstanz', ids: ['zellmembran', 'cytoplasma'] },
    { titel: 'Zellkern', ids: ['zellkern', 'kernhuelle', 'kernporen', 'nucleolus', 'chromatin'] },
    { titel: 'Endomembransystem', ids: ['raues-er', 'glattes-er', 'golgi', 'vesikel', 'lysosom'] },
    { titel: 'Weitere Bestandteile', ids: ['mitochondrium', 'ribosomen', 'peroxisom', 'zentrosom', 'cytoskelett'] },
  ],
  pflanze: [
    { titel: 'Typisch Pflanze', ids: ['zellwand', 'plasmodesmen', 'vakuole', 'chloroplast'] },
    { titel: 'Hülle & Grundsubstanz', ids: ['zellmembran', 'cytoplasma'] },
    { titel: 'Zellkern', ids: ['zellkern', 'kernhuelle', 'kernporen', 'nucleolus', 'chromatin'] },
    { titel: 'Endomembransystem', ids: ['raues-er', 'glattes-er', 'golgi', 'vesikel'] },
    { titel: 'Weitere Bestandteile', ids: ['mitochondrium', 'ribosomen', 'peroxisom', 'cytoskelett'] },
  ],
}

export const CELL_ORGANELLES: Record<CellType, OrganelleId[]> = {
  tier: CELL_GROUPS.tier.flatMap((g) => g.ids),
  pflanze: CELL_GROUPS.pflanze.flatMap((g) => g.ids),
}

export const ALL_ORGANELLE_IDS = Object.keys(ORGANELLES) as OrganelleId[]

export function parentOf(id: OrganelleId): OrganelleId | undefined {
  return ORGANELLES[id].parent
}

export function childrenOf(id: OrganelleId): OrganelleId[] {
  return ALL_ORGANELLE_IDS.filter((o) => ORGANELLES[o].parent === id)
}

export const MEMBRAN_LABEL: Record<MembranTyp, string> = {
  doppelt: 'Doppelmembran',
  einfach: 'Einfache Membran',
  keine: 'Ohne Membran',
}

export const CELL_META: Record<CellType, { name: string; titel: string; untertitel: string; pfad: string }> = {
  tier: {
    name: 'Tierzelle',
    titel: 'Die Tierzelle',
    untertitel: 'Eukaryotische Zelle ohne Zellwand – flexibel, vielgestaltig und mit Zentrosom.',
    pfad: '/biologie/zellbiologie/tierzelle',
  },
  pflanze: {
    name: 'Pflanzenzelle',
    titel: 'Die Pflanzenzelle',
    untertitel: 'Eukaryotische Zelle mit Zellwand, Zentralvakuole und Chloroplasten.',
    pfad: '/biologie/zellbiologie/pflanzenzelle',
  },
}
