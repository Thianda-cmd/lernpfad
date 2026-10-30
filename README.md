# Lernpfad · BTA

Werkzeuge für die Ausbildung zur/zum **Biologisch-technischen Assistent/in (BTA)** in Bückeburg –
Rechner mit vollständigem Lösungsweg, Periodensystem, Zellmodelle und Nachschlagewerke für Biologie,
Chemie und Mathematik an einem Ort. Die komplette Oberfläche ist auf Deutsch.

## Starten

**Einfach:** Doppelklick auf `start.bat` – beim ersten Mal werden die Pakete installiert, danach öffnet sich
die Seite automatisch im Browser (http://localhost:5173).

**Im Terminal:**

```bash
npm install
npm run dev
```

Fertige Version bauen (landet im Ordner `dist/`) und lokal testen:

```bash
npm run build
npm run preview
```

Alle Rechner mit vielen Beispielen durchrechnen – Ergebnisse werden unabhängig nachgerechnet und jede Formel im
Lösungsweg mit KaTeX gesetzt (rund 2 500 Prüfungen). Einzelne Gruppen gehen mit `CALC_ONLY`
(`core`, `chem-a`, `chem-b`, `bio`, `molbio-math`):

```bash
npm run test:calc
CALC_ONLY=bio npm run test:calc
```

Alle Reaktionsgleichungen der Ionennachweise auf Atom- und Ladungsbilanz prüfen (dazu Aufbau von Tüpfelplatte und
Gaskammer):

```bash
npm run test:nachweise
```

Elementdaten des Periodensystems mit PubChem (NIH) abgleichen (braucht Internet):

```bash
npm run test:chem
```

## Was drin ist

| Bereich | Inhalt |
| --- | --- |
| Start-Animation | Teilchen auf Millimeterpapier: ein Gas verdichtet sich zum Natrium-Atom (Schalenmodell 2 · 8 · 1), das äußere Elektron löst sich (Na → Na⁺ + e⁻) und zeichnet die Parabel f(x) = x² − 2x − 3 mit Nullstellen und Scheitelpunkt, die Kurve verdrillt sich zur DNA-Doppelhelix, alles zieht sich zur Lernpfad-Zelle zusammen – deren Membran sich öffnet und die Seite freigibt. Dauert gut drei Sekunden; hell/dunkel, Klick/Taste überspringt, abschaltbar in den Einstellungen, ruhige Fassung bei „Bewegung reduzieren“ |
| Übersicht | Schnellrechner (Aufgabe eintippen, der passende Rechner wird erkannt, Ergebnis sofort, Enter öffnet den Lösungsweg), zuletzt benutzte Werkzeuge, alle Werkzeuge nach Fach |
| Mathematik | zwölf Rechner mit Schritt-für-Schritt-Lösungsweg wie im Unterricht (Umformung rechts, Erklärung darunter, Probe): **Terme** (Klammern, binomische Formeln, Ausklammern), **Gleichungen & Ungleichungen** (auch mit Brüchen, Parametern, x im Nenner), **p-q-Formel** (mit Parabel, Scheitelpunkt, Linearfaktoren), **Gleichungssysteme** (Additions-, Einsetzungs-, Gleichsetzungsverfahren, Sonderfälle), **Brüche** (Hauptnenner, Doppelbrüche, gemischte Zahlen, Bruchterme), **Potenzen & Wurzeln** (Potenzgesetze, teilweise Wurzelziehen, Zehnerpotenzen), **Formeln umstellen** (Zwiebelprinzip, Werte einsetzen), **Prozent** (Grundwert/Prozentwert/-satz, Änderungen, Massenanteil, Dreisatz) und **Geraden** (zwei Punkte, Punkt-Steigung, Lage zweier Geraden), **Statistik** (Mittelwert, Median, Standardabweichung, Variationskoeffizient, Vertrauensbereich, Ausreißertests nach Grubbs und Dixon, Regression mit Diagramm), **Logarithmen & Exponentialgleichungen** (lg, ln, log₂, Delogarithmieren, a·bˣ + d = c, Verdopplungs- und Halbwertszeit) und **Einheiten umrechnen** (zehn Größen, Zehnerpotenzen im Rechenweg). Exakt mit Brüchen gerechnet; Eingaben mit Komma liefern Dezimalzahlen |
| Chemie → Periodensystem | alle 118 Elemente bildschirmfüllend: Stoffgruppen/Blöcke, Eigenschaften als Farbskala und 3D-Säulen, Aggregatzustand bei jeder Temperatur, Zeitreise der Entdeckungen, Quiz; pro Element Schalenmodell, Orbitalschema und Stoffdaten |
| Chemie → Rechner | Molare Masse, **Stoffmenge & Lösungen** (m ↔ n ↔ N, molare Masse gesucht mit Element-Erkennung, Atome zählen, Zusammensetzung, Lösung ansetzen, Verdünnen, Mischungskreuz, Mischtemperatur), **Konzentrationen** (c, β, w, φ über die Dichte, Lösungen aus konzentrierten Säuren/Laugen ansetzen, Volumenanteil), **pH-Wert & Puffer** (pH ↔ Konzentration, starke und schwache Säuren/Basen mit Protolysegrad, Henderson-Hasselbalch, Puffer ansetzen, Pufferkurve), **Titration** (Parallelbestimmungen, Titer mit Urtitersubstanzen, Verbrauch vorhersagen), **Gasgesetze** (ideales Gas, molares Volumen, Zustandsänderung), **Reaktionsgleichungen** (ausgleichen auch mit Ionen/Elektronen über ein Gleichungssystem, Massen und Gasvolumina, Unterschuss und Ausbeute), **Photometrie** (Lambert-Beer, Transmission ↔ Extinktion, Kalibriergerade mit Diagramm) – alle mit Rechenweg und Einheiten; Ionen & Salzformeln (Überkreuzregel, Namen), Konstanten |
| Chemie → Ionennachweise | Nachweise aus dem Praktikum (Sulfat, Chlorid, Bromid, Iodid, Carbonat, Natrium, Kalium, **Nitrat** als Ringprobe auf der Tüpfelplatte, **Acetat** als Esterprobe im Wasserbad, **Magnesium** mit Essigsäure, Titangelb und Natronlauge auf der Tüpfelplatte mit Blindprobe, **Ammonium** in der Gaskammer ohne Erhitzen) und weitere, die noch kommen können (Nitrit, Acetat mit Eisen(III)-chlorid, Sulfid, Thiosulfat, Eisen(II)/(III), Kupfer, Calcium, Barium, Aluminium, Magnesium als Phosphat, Nickel, Phosphat). Animiertes Reagenzglas, Uhrglas, Gaskammer (zwei Uhrgläser mit Indikatorpapier) und Tüpfelplatte mit sechs Mulden, Ionengleichungen mit Ladungen, Halogenid-Vergleich mit NH₃, Flammenfärbung mit Cobaltglas |
| Biologie → Laborrechner | **Zellzahl** (Zählkammer Neubauer improved/Fuchs-Rosenthal mit Trypanblau und Vorverdünnung, Vitalität, Zellen aussäen), **Keimzahl & Wachstum** (KbE/mL, gewichtetes Mittel nach DIN EN ISO 7218, Generationszeit mit logarithmischem Diagramm), **Verdünnungsreihe** (seriell mit Pipettierschema, Standardreihe, Gesamtverdünnung), **Mikroskopie** (Vergrößerung, Okularmikrometer eichen, Objektgröße, Auflösung, Sehfeld), **Zentrifuge** (Drehzahl ↔ RZB, Rotor wechseln), **DNA, RNA & Protein** (Konzentration aus A260, Reinheit A260/A280 und A260/A230, ng ↔ pmol ↔ Kopien, Ligation, Primer-Schmelztemperatur, Protein aus A280, Fällung mit Natrium- oder Ammoniumacetat), **PCR-Ansatz** (Mastermix mit Reserve und Pipettierschema, Primer lösen und verdünnen) – alle mit Rechenweg |
| Biologie → Zellbiologie | Tier- und Pflanzenzelle als **3D-Modell** und als **Schaubild**, Organellen-Lexikon, Vergleich |
| Biologie → Zellwand | als Vokabeln: Schichtbild zum Antippen, Mittellamelle / Primärwand / Sekundärwand → Bestandteile → Bausteine (z. B. Pektine aus Galacturonsäure, Rhamnose …), Bausteine mit Summenformel, Ein- und Auflagerungen, Begriffe, Zellwände anderer Lebewesen |
| Biologie → Zellteilung | Zellzyklus als Ring, **Mitose und Meiose als Animation** (Zeitleiste, Abspielen, Schieberegler), Crossing-over sichtbar, Chromosomenzahl/Chromatiden/DNA-Gehalt je Phase, Vergleich |

Einstellungen und Verlauf werden nur lokal im Browser gespeichert (`localStorage`).

## Projektstruktur

```
src/
  intro/                 Start-Animation (engine.ts: Teilchensystem auf Canvas, Intro.tsx: Beschriftung)
  components/Logo.tsx    Bildmarke (offene Zelle mit Kern und austretendem Vesikel)
  components/ZellwandVokabeln.tsx  Zellwand als Vokabeln mit Schichtbild
  data/                  Biologie-Inhalte (Organellen, Zellwand), Fächer, Werkzeuge
  cell3d/  cell2d/       Zellmodelle in 3D und 2D
  math/
    q.ts                 exakte Brüche mit BigInt, Formatierung (Dezimalkomma)
    expr.ts              Term-Parser
    alg/                 Rechenkerne mit Lösungsweg: Terme, Gleichungen, LGS, Brüche, Potenzen, Formeln umstellen,
                         Prozent, Geraden, Statistik, Logarithmen, Einheiten, Stöchiometrie, Konzentrationen, pH,
                         Titration, Gase, Reaktionen, Photometrie, Zellzahl, Keimzahl, Verdünnungsreihe,
                         Mikroskopie, Zentrifuge, Nukleinsäuren, PCR; units.ts (Einheiten), regress.ts (Statistik)
    tools.ts  quick.ts   Liste aller Rechner (Mathe, Chemie, Biologie), Erkennung für den Schnellrechner
    ui/                  Rechner-Gerüst, Eingabefeld mit Vorschau, Lösungsweg, Graphen
  pages/ToolRoute.tsx    lädt die Rechnerseite zu /mathematik/…, /chemie/…, /biologie/…
  pages/math/            Mathe-Übersicht und die einzelnen Rechner (tools/)
  chem/elements.ts       alle 118 Elemente (IUPAC-Atomgewichte, NIST-Konfigurationen, PubChem-Stoffdaten)
  chem/pse/              Periodensystem: Schalenmodell, Orbitale, Detailansicht, Eigenschaften
  chem/nachweise.ts      Ionennachweise: Ablauf, Beobachtung, Gleichungen; chem/lab.tsx Reagenzglas, Brenner, Gleichungen
  pages/chem/            Chemie-Seiten (Übersicht, Periodensystem, Molare Masse, Stoffmenge & Lösungen, Ionen, Ionennachweise),
                         Chemie-Rechner in tools/
  bio/division.ts        Mitose/Meiose als Schlüsselbilder (Modellzelle 2n = 4), bio/DivisionSvg.tsx zeichnet sie
  pages/bio/             Zellteilung (Zellzyklus, Mitose, Meiose, Vergleich), Laborrechner in tools/
tests/                   calc.smoke.ts mit den Gruppen in calc/ (core, chem-a, chem-b, bio, molbio-math),
                         harness.ts, nachweise.check.ts, elements.check.ts
mathphoto/               Fotos und PDFs aus dem Unterricht (Quelle der Mathe-Beispiele)
```

## Neue Inhalte ergänzen

- **Neuer Rechner:** Rechenkern in `src/math/alg/` (liefert `Solution` mit `result` und `steps`, ungültige Eingaben
  werfen `CalcError`), Seite in `src/pages/<fach>/tools/`, Eintrag in `MATH_TOOLS`, `CHEM_TOOLS` oder `BIO_TOOLS`
  (`src/math/tools.ts`) und in `PAGES` (`src/pages/ToolRoute.tsx`) – Navigation, Übersicht und Startseite übernehmen
  ihn automatisch. Beispiele mit unabhängig nachgerechneten Werten in `tests/calc/<gruppe>.ts` ergänzen.
- **Neuer Ionennachweis:** Eintrag in `NACHWEISE` (`src/chem/nachweise.ts`) mit Gefäß (Reagenzglas, Uhrglas,
  Gaskammer oder Tüpfelplatte), Schritten und Gleichungen; `npm run test:nachweise` prüft die Bilanz.
- **Organell-Text:** in `src/data/organelles.ts`, Zellwand-Vokabeln in `src/data/zellwand.ts`.

## Technik

Vite · React 19 · TypeScript · KaTeX · Three.js mit React Three Fiber/Drei · Zustand · eigene SVG-Icons und Schaubilder.
