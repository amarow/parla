# 🚀 Parladino - Serverless Italienisch-Lern-App

Herzlich willkommen bei **Parladino**, einer modernen, serverlosen Web-App zum Erlernen der italienischen Sprache direkt im Browser. 

Die App nutzt modernste Web-APIs, um ein interaktives Vokabel- und Aussprache-Feedback zu ermöglichen – ganz ohne schwerfälliges Backend (Serverless).

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
  - Ein cooles Belohnungs-Gimmick (Confetti!) wartet am Ende einer erfolgreichen fehlerfreien Session.
- **Spracherkennung (Speech-to-Text - STT):** Browser-native Spracheingabe mittels Web Speech API (startet automatisch ca. 800ms nach Erscheinen einer Karte).
- **Aussprache-Feedback:** 
  - Automatischer Wechsel zur nächsten Karte bei korrekter Aussprache nach 500ms.
  - "Shake"-Effekt und automatischer Neustart der Aufnahme bei falscher Aussprache nach 2,5 Sekunden.
  - Robuster Vergleich (ignoriert Akzente, Apostrophe, Satzzeichen und Leerzeichen beim Abgleich).
- **Sprachausgabe (Text-to-Speech - TTS):** Vorlesen der italienischen Vokabeln via Web Speech API.
- **Offline-First / Serverless:** Alle Benutzerdaten und Lernfortschritte werden lokal im Browser (`localStorage`) gespeichert. Es ist keine Anmeldung und kein externes Datenbanksystem erforderlich.

---

## 🛠️ Technologie-Stack

- **Frontend-Framework:** React 19 (TypeScript)
- **Bundler & Development Server:** Vite 7
- **Zustandsverwaltung & Caching:** TanStack React Query v5
- **UI-Icons:** Lucide-React
- **Effekte:** Canvas-Confetti
- **Spracherkennung & Sprachausgabe:** Browser-native Web Speech API

---

## 💻 Lokale Entwicklung

Folge diesen Schritten, um die App lokal auf deinem Rechner zu starten:

1. Navigiere in das Frontend-Verzeichnis:
   ```bash
   cd frontend
   ```
2. Installiere alle Abhängigkeiten:
   ```bash
   npm install
   ```
3. Starte den lokalen Entwicklungsserver:
   ```bash
   npm run dev
   ```
4. Öffne die in der Konsole angezeigte Adresse (z. B. `http://localhost:5173`) im Browser.

---

## 📦 Deployment

Das Projekt enthält ein automatisiertes Deployment-Skript (`deploy.sh`), mit dem die App gebaut, versioniert und nach GitHub Pages (`docs/`-Ordner) kopiert wird.

Führe einfach das Skript im Hauptverzeichnis aus:
```bash
./deploy.sh
```

Das Skript fragt nach einer neuen Versionsnummer, führt `npm run build` im `frontend`-Ordner aus, verschiebt das Build-Ergebnis nach `docs/` und pusht die Änderungen automatisch in deinen GitHub-Branch.
