# Parladino - Serverless Edition

Dieses Projekt ist eine statische Web-App zum Sprachenlernen (Italienisch).

## Architektur
- **Frontend:** React (TypeScript) + Vite
- **Daten:** Statische JSON-Dateien in `frontend/public/data/`
- **Speicherung:** Fortschritte und Benutzerdaten werden lokal im Browser (`localStorage`) gespeichert.
- **Sprachausgabe (TTS):** Native Web Speech API des Browsers.
- **Spracherkennung (STT):** Native Web Speech API des Browsers.

## Entwicklung
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Deployment auf GitHub Pages
1. `./deploy.sh` ausführen.
2. Den Inhalt von `frontend/dist` auf den `gh-pages` Branch oder in den `docs` Ordner deines Repositories pushen.
3. Falls die App in einem Unterordner liegt (z.B. `/parladino/`), muss die `base` in `frontend/vite.config.ts` angepasst werden.
