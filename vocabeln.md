# Modul 1: Einfaches Vokabeltraining (Karteikarten)

## Zielsetzung
Ein fokussiertes Vokabel-Lernmodul basierend auf Karteikarten. Der Fokus liegt auf dem einfachen Erlernen von Einzelwörtern oder kurzen Ausdrücken (inklusive geschlechtsbestimmender Artikel, z.B. "der Apfel" -> "la mela") in zwei Sprachen (Standard: Deutsch <-> Italienisch).

## Lernmodus ("Hardcore-Modus")
*   **Stapelgröße:** Maximal 20 Vokabeln pro Lern-Session.
*   **Ablauf:**
    *   Wird eine Vokabel als **"Richtig"** markiert, geht es weiter zur nächsten Karte.
    *   Wird eine Vokabel als **"Falsch"** markiert, bricht der aktuelle Durchlauf ab und beginnt sofort wieder von vorne (bei Karte 1 des aktuellen Stapels).
*   **Ziel:** Der Nutzer muss alle (bis zu 20) Karten am Stück fehlerfrei bewältigen.
*   **Belohnung:** Erst wenn das Ende des Stapels fehlerfrei erreicht wurde, wird ein Belohnungs-Gimmick angezeigt.

## Start-Optionen (Setup vor der Session)
Vor dem Start einer Lern-Session kann der Nutzer wählen:
1.  **Kategorie:** Auswahl eines Vokabelpakets (z.B. "Essen & Trinken", "Lektion 1").
2.  **Lernrichtung:**
    *   Muttersprache -> Fremdsprache (Deutsch -> Italienisch)
    *   Fremdsprache -> Muttersprache (Italienisch -> Deutsch)

## Interaktion (Karten-UI)
*   **Vorderseite:** Zeigt das Wort in der Start-Sprache.
*   **Aktion:** Klicken/Tippen auf die Karte dreht diese um.
*   **Rückseite:** Zeigt die Übersetzung in der Zielsprache.
*   **Audio:** Ein Button auf der Karte spielt die Aussprache der Fremdsprache ab (Technologie: Browser-eigene Web Speech API).
*   **Bewertung:** Nach dem Umdrehen erscheinen die Buttons "Richtig" und "Falsch".

## Datenstruktur (SQLite)
Es werden grundlegend zwei Tabellen benötigt:
1.  **categories**
    *   `id` (Primary Key)
    *   `name` (Name der Kategorie)
2.  **words**
    *   `id` (Primary Key)
    *   `category_id` (Foreign Key zu categories)
    *   `native_word` (Wort in Muttersprache inkl. Artikel)
    *   `foreign_word` (Wort in Fremdsprache inkl. Artikel)

## Technologie-Stack
*   **Frontend:** React (erstellt mit Vite)
*   **Backend:** Node.js mit Express
*   **Datenbank:** SQLite
*   **Audio:** Web Speech API (Browser)
