#!/bin/bash
set -e

# Farben für die Ausgabe
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 🚀 Baue Parladino für GitHub Pages ===${NC}"

# 1. Build im Frontend-Ordner
cd frontend
npm install
npm run build
cd ..

echo ""
echo -e "${BLUE}=== 📂 Kopiere Build nach 'docs/' ===${NC}"
# Sicherstellen, dass docs existiert
mkdir -p docs
# Kopiere Inhalt von dist nach docs
cp -r frontend/dist/* docs/

echo ""
echo -e "${BLUE}=== 📤 Push nach GitHub ===${NC}"

# Aktuellen Branch ermitteln
BRANCH=$(git branch --show-current)

# Änderungen prüfen
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}Keine Änderungen zum Committen.${NC}"
else
    read -p "Commit-Nachricht (Standard: 'Deploy to GitHub Pages'): " msg
    msg=${msg:-"Deploy to GitHub Pages"}

    git add .
    git commit -m "$msg"
    
    echo -e "${BLUE}Pushe zu origin $BRANCH...${NC}"
    git push origin "$BRANCH"
fi

echo ""
echo -e "${GREEN}=== ✅ Deployment abgeschlossen! ===${NC}"
echo "Die App sollte in Kürze unter deiner GitHub Pages URL (mit Base-Pfad aus vite.config.ts) erreichbar sein."
