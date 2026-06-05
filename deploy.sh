#!/bin/bash
set -e

echo "=== 🚀 Baue Parladino für GitHub Pages ==="

cd frontend
npm install
npm run build

echo ""
echo "=== ✅ Build abgeschlossen! ==="
echo "Der Inhalt des Ordners 'frontend/dist' kann jetzt auf GitHub Pages hochgeladen werden."
echo "Hinweis: Wenn du die App in einem Unterordner (z.B. username.github.io/parladino/) hostest,"
echo "stelle sicher, dass in 'frontend/vite.config.ts' die 'base' auf '/parladino/' gesetzt ist."
