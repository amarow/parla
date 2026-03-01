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

## Interaktion & Spracherkennung (Karten-UI)
*   **Automatischer Ablauf:**
    *   Beim Erscheinen einer neuen Karte startet die **Spracherkennung automatisch** nach einer kurzen Verzögerung (ca. 800ms).
    *   Die Web Speech API des Browsers erkennt das Ende des Sprechens automatisch (VAD/Stille-Erkennung).
    *   Bei **korrekter Aussprache** springt die App nach 500ms **automatisch zur nächsten Karte**, ohne dass der Nutzer klicken muss.
    *   Bei **falscher Aussprache** wackelt die Karte kurz ("Shake"-Effekt), und die Spracherkennung startet nach 2,5 Sekunden **automatisch neu** für einen weiteren Versuch.
*   **Vorderseite:** Zeigt das Wort in der Start-Sprache und ein aktives Mikrofon-Icon während der Aufnahme.
*   **Rückseite:** Zeigt die Übersetzung in der Zielsprache (nach manuellem Umdrehen oder bei Erfolg). Ein Lautsprecher-Button spielt die Aussprache ab.
*   **Robuster Vergleich:** Die Erkennung ignoriert beim Vergleich Apostrophe, Anführungszeichen, Leerzeichen und Akzente (wichtig für Italienisch, z.B. "l'amico").

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
*   **Frontend:** React (Vite), Lucide-React (Icons)
*   **Spracherkennung (STT):** Web Speech API (Browser-nativ, unlimitiert)
*   **Sprachausgabe (TTS):** Google TTS API (über das Backend)
*   **Backend:** Node.js (Express)
*   **Datenbank:** SQLite3
