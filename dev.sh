#!/bin/bash

echo "🚀 Starte Parla! im Entwicklungsmodus (Hot-Reloading)..."

# Beende alte Prozesse, falls sie noch hängen
kill -9 $(lsof -t -i:3001) 2>/dev/null
kill -9 $(lsof -t -i:5173) 2>/dev/null

# Funktion zum sauberen Beenden beider Prozesse bei Strg+C
cleanup() {
    echo ""
    echo "🛑 Beende Entwicklungsserver..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

# Trap setzt die cleanup-Funktion, wenn das Skript abgebrochen wird (SIGINT = Strg+C)
trap cleanup SIGINT

# Backend mit Watcher starten
echo "📦 Starte Backend (Port 3001) mit tsx watch..."
cd backend || exit
npm run start &
BACKEND_PID=$!
cd ..

# Kurz warten, damit das Backend bereit ist
sleep 2

# Frontend mit Vite (Hot Module Replacement) starten und Browser öffnen
echo "🎨 Starte Frontend (Port 5173)..."
cd frontend || exit
npm run dev -- --open &
FRONTEND_PID=$!
cd ..

echo "✅ Beide Server laufen! Drücke Strg+C zum Beenden."

# Wartet unendlich, bis Strg+C gedrückt wird (dann greift der trap)
wait
