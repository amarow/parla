#!/bin/bash

echo "🚀 Starte Parla! Vokabeltrainer..."

# Beende alte Node-Prozesse auf den verwendeten Ports, falls sie noch laufen
kill -9 $(lsof -t -i:3001) 2>/dev/null
kill -9 $(lsof -t -i:5173) 2>/dev/null

# Backend im Hintergrund starten
echo "📦 Starte Backend (Port 3001)..."
cd backend || exit
npm start &
BACKEND_PID=$!
cd ..

# Frontend starten und Browser automatisch öffnen
echo "🎨 Starte Frontend (Port 5173)..."
cd frontend || exit

# Warten, bis der Port frei ist (falls er noch belegt war)
sleep 1

# Vite mit dem --open Flag starten, das öffnet den Browser automatisch
npm run dev -- --open

# Wenn das Frontend beendet wird (Strg+C), beende auch das Backend
kill $BACKEND_PID
echo "🛑 Parla! wurde beendet."
