# LernLabor · BTA

Lernplattform für die Ausbildung zur/zum **Biologisch-technischen Assistent/in (BTA)** in Bückeburg –
Biologie, Chemie und Mathematik an einem Ort. Die komplette Oberfläche ist auf Deutsch.

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

Alle Mathe-Aufgabengeneratoren, Kapitel, Übungsblätter und Probeklausuren automatisch prüfen:

```bash
npm run test:math
```

Alle Reaktionsgleichungen der Ionennachweise auf Atom- und Ladungsbilanz prüfen:

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
| Start-Animation | gestepptes Leder in mattem Grün, Goldnaht, goldgeprägtes Logo; die Seite wird erst nach der Animation eingesetzt. Klick/Taste überspringt, abschaltbar in den Einstellungen |
| Übersicht | kompakt: nächste Klausur mit Kapitelstand, vier Kennzahlen, „Weiter bei …“, Fächer, Kapitel bis zur Klausur |
| Biologie → Zellbiologie | Tier- und Pflanzenzelle als **3D-Modell** und als **Schaubild**, Lexikon, Vergleich, Karteikarten, Quiz |
| Biologie → Zellteilung | Zellzyklus als Ring, **Mitose und Meiose als Animation** (Zeitleiste, Abspielen, Schieberegler), Crossing-over sichtbar, Chromosomenzahl/Chromatiden/DNA-Gehalt je Phase, Vergleich, Quiz mit Phasen-Erkennen |
| Mathematik | 13 Kapitel aus den Unterlagen (LF 1T Grundlagen, Chemisches Rechnen, MFH) – je mit Erklärung, interaktivem Schaubild, Schritt-für-Schritt-Beispielen, typischen Fehlern und unbegrenzt vielen Übungsaufgaben mit Kontrolle (50 Aufgabentypen, u. a. Ausklammern, Kürzen, Zehnerpotenzen, Lage von Geraden, LGS-Sonderfälle, Lösungen ansetzen) |
| Übungsblätter | die fünf Blätter aus dem Unterricht interaktiv, mit Lösungsweg und Hinweisen, wo das Lösungsblatt der Schule falsch ist |
| Probeklausuren | LF 1T, MFH und chemisches Rechnen – jedes Mal neu zusammengestellt, mit Zeitlimit, Punkten und Note (IHK-Schlüssel) |
| Formelsammlung | alle Regeln auf einer Seite, druckbar |
| Chemie → Periodensystem | alle 118 Elemente bildschirmfüllend: Stoffgruppen/Blöcke, Eigenschaften als Farbskala und 3D-Säulen, Aggregatzustand bei jeder Temperatur, Zeitreise der Entdeckungen, Quiz; pro Element Schalenmodell, Orbitalschema und Stoffdaten |
| Chemie → Werkzeuge | Molare Masse (mit ausführlichem Rechenweg m ↔ n ↔ N), Ionen & Salzformeln (Überkreuzregel, Namen), Konstanten |
| Chemie → Ionennachweise | Nachweise aus dem Praktikum (Sulfat, Chlorid, Bromid, Iodid, Carbonat, Natrium, Kalium) und kommende (Ammonium, Eisen(III), Kupfer, Calcium, Nitrat, Phosphat) mit animiertem Reagenzglas, Ionengleichungen mit Ladungen, Halogenid-Vergleich mit NH₃, Flammenfärbung mit Cobaltglas, Quiz |

Der Lernfortschritt wird nur lokal im Browser gespeichert (`localStorage`).

## Projektstruktur

```
src/
  intro/                 Start-Animation (Leder-Textur wird prozedural erzeugt)
  components/Logo.tsx    Bildmarke (offene Zelle mit Kern und austretendem Vesikel)
  data/                  Biologie-Inhalte, Fächer, Quiz
  cell3d/  cell2d/       Zellmodelle in 3D und 2D
  math/
    meta.ts              Kapitel, Klausurtermine, Übungsblätter, Probeklausuren, Notenschlüssel
    expr.ts  check.ts    Term-Parser und Antwortprüfung (Dezimalkomma, Brüche, 1,8·10^21 …)
    gen/                 Aufgabengeneratoren mit automatischem Lösungsweg (je Thema eine Datei)
    content/             Kapiteltexte, Beispiele, Übungsblätter (sheets.ts), Probeklausuren (exams.ts)
    viz/                 interaktive Schaubilder (Waage, Flächenmodell, Parabel, Molmassen-Rechner …)
    ui/                  Aufgabenkarte, Eingabefeld mit Vorschau, Lösungsweg, Übungsmodus
  pages/math/            Mathe-Seiten (Übersicht, Kapitel, Übungsblatt, Probeklausur, Formelsammlung)
  chem/elements.ts       alle 118 Elemente (IUPAC-Atomgewichte, NIST-Konfigurationen, PubChem-Stoffdaten)
  chem/pse/              Periodensystem: Schalenmodell, Orbitale, Detailansicht, Eigenschaften
  chem/nachweise.ts      Ionennachweise: Ablauf, Beobachtung, Gleichungen; chem/lab.tsx Reagenzglas, Brenner, Gleichungen
  pages/chem/            Chemie-Seiten (Übersicht, Periodensystem, Molare Masse, Ionen, Ionennachweise)
  bio/division.ts        Mitose/Meiose als Schlüsselbilder (Modellzelle 2n = 4), bio/DivisionSvg.tsx zeichnet sie
  pages/bio/             Zellteilung (Zellzyklus, Mitose, Meiose, Vergleich, Quiz)
tests/                   Smoke-Tests für alle Generatoren und Inhalte (npm run test:math)
mathphoto/               Fotos und PDFs aus dem Unterricht (Quelle der Mathe-Inhalte)
```

## Neue Inhalte ergänzen

- **Klausurtermin:** in `src/math/meta.ts` unter `KLAUSUREN` eintragen (Datum, Themen = Kapitel-IDs).
- **Neues Übungsblatt:** Aufgaben in `src/math/content/sheets.ts` anlegen und in `SHEETS` (`meta.ts`) eintragen.
- **Neues Mathe-Kapitel:** Eintrag in `CHAPTERS` (`meta.ts`), Inhalt als `ChapterContent` in `src/math/content/`, Generatoren in `src/math/gen/`.
- **Quizfrage / Organell-Text:** in `src/data/quiz.ts` bzw. `src/data/organelles.ts`.

## Technik

Vite · React 19 · TypeScript · KaTeX · Three.js mit React Three Fiber/Drei · Zustand · eigene SVG-Icons und Schaubilder.
