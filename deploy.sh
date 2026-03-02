#!/bin/bash
set -e # Bricht ab, sobald ein Befehl fehlschlägt

# --- KONFIGURATION ---
# IP oder Hostname deines Oracle Servers (Alias aus ~/.ssh/config)
REMOTE_HOST="oracle" 
# SSH User
REMOTE_USER="opc"
# Zielverzeichnis auf dem Server
REMOTE_DIR="/home/opc/parla"
# Name des PM2 Prozesses auf dem Server
PM2_NAME="parla"
# ----------------------

echo "=== 🚀 Start Deployment: Parla ==="

# 1. Frontend bauen
echo "🔨 [1/5] Baue React Frontend lokal..."
cd frontend
npm install --silent
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend Build fehlgeschlagen!"
    exit 1
fi
cd ..

# 2. Artefakt vorbereiten
echo "📦 [2/5] Erstelle Deployment-Paket..."
rm -rf deploy_tmp
mkdir -p deploy_tmp
mkdir -p deploy_tmp/public

echo "🔨 Baue Node Backend lokal..."
cd backend
npm install --silent
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Backend Build fehlgeschlagen!"
    exit 1
fi
cd ..

# Backend-Dateien kopieren
cp backend/package.json deploy_tmp/
cp backend/package-lock.json deploy_tmp/
cp backend/dist/server.js deploy_tmp/
cp backend/dist/database.js deploy_tmp/
cp backend/dist/seed.js deploy_tmp/
cp -r backend/data deploy_tmp/

# Frontend-Build in den 'public' Ordner des Backends kopieren
cp -r frontend/dist/* deploy_tmp/public/

# .env kopieren, falls vorhanden (lokal konfiguriert)
if [ -f backend/.env ]; then
    cp backend/.env deploy_tmp/
fi

# 3. Übertragen
echo "📡 [3/5] Übertrage Daten an $REMOTE_HOST..."
# Wir schließen die SQLite-Datenbank aus, um Remote-Daten nicht zu überschreiben
rsync -avz --delete --exclude='*.sqlite' deploy_tmp/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

# 4. Remote Installation
echo "🔧 [4/5] Installiere Abhängigkeiten auf dem Server..."
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && npm install --omit=dev"

# 5. Neustart via PM2
echo "🔄 [5/5] Starte Service via PM2..."
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && (pm2 restart $PM2_NAME || pm2 start server.js --name $PM2_NAME)"

# Aufräumen
rm -rf deploy_tmp

echo "=== ✅ Deployment erfolgreich abgeschlossen! ==="
