# 🚀 Parladino - Serverless Italienisch-Lern-App

Herzlich willkommen bei **Parladino**, einer modernen, serverlosen Web-App zum Erlernen der italienischen Sprache direkt im Browser. 

Die App nutzt modernste Web-APIs, um ein interaktives Vokabel- und Aussprachetraining ohne schwerfälliges Backend zu ermöglichen.

---

## 🔗 Live-Anwendung
Die App ist über GitHub Pages direkt im Browser verfügbar:
👉 **[Parladino starten (Live-App)](https://amarow.github.io/parla/)** 👈

---

## ✨ Features

- **Karteikarten-Modul (Einfaches Vokabeltraining):** Lernen von Einzelwörtern und kurzen Ausdrücken (inklusive geschlechtsbestimmender Artikel, z.B. *l'amico*, *la mela*).
- **Der Hardcore-Modus:** 
  - Stapelgröße von max. 20 Vokabeln pro Session.
  - Fehlerfreies Durchlaufen erforderlich: Wird ein Fehler gemacht, bricht die Session ab und beginnt sofort wieder von vorn bei Karte 1.
  - Ein Belohnungs-Gimmick wartet am Ende einer erfolgreichen fehlerfreien Session.
- **Spracherkennung (Speech-to-Text):** Browser-native Spracheingabe mittels Web Speech API (startet automatisch ca. 800ms nach Erscheinen einer Karte).
- **Aussprache-Feedback:** 
  - Automatischer Wechsel zur nächsten Karte bei korrekter Aussprache nach 500ms.
  - "Shake"-Effekt und automatischer Neustart der Aufnahme bei falscher Aussprache nach 2,5 Sekunden.
  - Robuster Vergleich (ignoriert Akzente, Apostrophe, Satzzeichen und Leerzeichen beim Abgleich).
- **Sprachausgabe (Text-to-Speech):** Vorlesen der italienischen Vokabeln via Web Speech API.
- **Offline-First / Serverless:** Alle Benutzerdaten und Lernfortschritte werden lokal im Browser (`localStorage`) gespeichert. Es ist keine Anmeldung und kein externes Datenbanksystem erforderlich.

---

## 🛠️ Technologie-Stack

- **Frontend:** React (TypeScript)
- **Bundler / Tooling:** Vite
- **Icons:** Lucide-React
- **Web-APIs:** 
  - Native Web Speech API (Speech Recognition & Speech Synthesis)
  - `localStorage` API für Persistenz

---

## 💻 Lokale Entwicklung

Falls du das Projekt lokal starten oder weiterentwickeln möchtest, folge diesen Schritten:

1. **Repository klonen:**
   ```bash
   git clone https://github.com/amarow/parla.git
   cd parla
   ```

2. **In das Frontend-Verzeichnis wechseln:**
   ```bash
   cd frontend
   ```

3. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```

4. **Entwicklungsserver starten:**
   ```bash
   npm run dev
   ```
   Die App ist anschließend unter [http://localhost:5173/parla/](http://localhost:5173/parla/) erreichbar.

---

## 🚀 Deployment

Das Deployment der App erfolgt automatisiert über GitHub Pages aus dem `docs/`-Ordner im Hauptverzeichnis.

Um eine neue Version zu bauen und bereitzustellen, führe einfach das Skript im Hauptverzeichnis aus:
```bash
./deploy.sh
```

Das Skript führt folgende Schritte aus:
1. Fragt nach einer neuen Versionsnummer (erhöht diese in `frontend/package.json`).
2. Installiert Abhängigkeiten und baut das Frontend (`npm run build`).
3. Kopiert den fertigen Build in das Verzeichnis `docs/`.
4. Erstellt einen Git-Commit und pusht die Änderungen auf GitHub, woraufhin GitHub Pages die Live-Seite aktualisiert.
