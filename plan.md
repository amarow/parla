# Plan: "Textinseln" (Text Islands) Modul

## 1. Konzept & Zielsetzung
- **Ziel:** Ein Sprachübungswiederholmodus anhand kleiner, thematisch zusammenhängender "Textinseln" (z.B. "Wer bin ich?").
- **Ablauf einer Übung:**
  1. Ein Satz wird von der App auf Italienisch vorgelesen (Text-to-Speech).
  2. Es folgt eine Pause, in der der Nutzer den Satz selbst laut liest/nachspricht. Die Dauer der Pause wird **automatisch** basierend auf der Länge des Textes berechnet. Während dieser Pause ist ein **pulsierendes Mikrofon-Icon** zu sehen.
  3. Dieser Vorgang (Vorsprechen -> Pause -> Nachsprechen) wird pro Satz **zweimal** ausgeführt.
  4. Danach geht es zum nächsten Satz der jeweiligen Textinsel.
  5. Ist die Insel zu Ende, **fängt sie von vorne an (Loop)**, bis der Nutzer sie manuell beendet.
- **Sprach-Fokus:** Es wird standardmäßig **nur der italienische Text** angezeigt und vorgelesen. Der deutsche Text dient nur als Hilfe und kann bei Bedarf eingeblendet werden.

## 2. Datenstruktur & Inhalt
- **Inhaltserstellung:** Die Texte werden in einer JSON Datei (`src/data/textIslands.json`) abgelegt.
- **Struktur-Entwurf:**
  ```json
  [
    {
      "id": "wer_bin_ich",
      "title": "Wer bin ich?",
      "description": "Eine kurze Vorstellung der eigenen Person.",
      "sentences": [
        {
          "de": "Ich bin Andreas Marocco.",
          "it": "Sono Andreas Marocco."
        },
        {
          "de": "Ich habe eine Familie und lebe in Hamburg.",
          "it": "Ho una famiglia e vivo ad Amburgo."
        },
        {
          "de": "Ich habe eine Frau und zwei Söhne.",
          "it": "Ho una moglie e due figli."
        },
        {
          "de": "Ich bin 64 Jahre alt und mein Beruf ist Elektroingenieur.",
          "it": "Ho 64 anni e sono ingegnere elettrotecnico."
        }
      ]
    }
  ]
  ```

## 3. UI/UX & Komponenten
- **IslandSelector (Auswahlmenü):** Übersicht der verfügbaren Textinseln (Karten-Design).
- **IslandPlayer (Übungsmodus):**
  - **Textanzeige:** Groß und lesbar, primär auf Italienisch. Ein Button "Hilfe / Übersetzung" blendet den deutschen Text ein.
  - **Audio-Steuerung:** Nutzt den `VoiceContext` (Web Speech API).
  - **Visuelles Feedback:** Pulsierendes Mikrofon in den Sprech-Pausen.
  - **Aktions-Buttons:** Start, Pause, Abbrechen, Nächster/Vorheriger Satz (optional).

## 4. Implementierungsschritte
- [x] **Schritt 1: Datenstruktur anlegen.** Erstellen der `textIslands.json` mit der ersten Textinsel ("Wer bin ich?").
- [x] **Schritt 2: UI-Komponenten bauen (Teil 1 - Layout).** Erstellen des `IslandSelector` und des grundlegenden Layouts für den `IslandPlayer`.
- [x] **Schritt 3: Abspiel-Logik entwickeln (Timer & State).** Implementieren der State-Maschine (Lesen (IT) -> Pause (Mikrofon pulsiert) -> Lesen (IT) -> Pause -> Nächster Satz -> Loop am Ende).
- [x] **Schritt 4: Navigation.** Das Modul in das Hauptmenü (`App.tsx` oder wo relevant) integrieren.
- [ ] **Schritt 5: Test & Feinschliff.** Timing der Pausen überprüfen (z.B. Lesegeschwindigkeit simulieren) und Animationen polieren.
