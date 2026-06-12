#!/bin/bash
set -e

# Farben für die Ausgabe
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 🚀 Parladino Deployment & Versionierung ===${NC}"

# 1. Versionsmanagement
CURRENT_VERSION=$(grep '"version":' frontend/package.json | sed -E 's/.*"version": "(.*)".*/\1/')
echo -e "${BLUE}Aktuelle Version in frontend/package.json: ${GREEN}${CURRENT_VERSION}${NC}"

read -p "Neue Versionsnummer eingeben (Enter für keine Änderung): " NEW_VERSION

if [ ! -z "$NEW_VERSION" ]; then
    # Version in package.json ersetzen
    # Nutze eine temporäre Datei für bessere Kompatibilität (macOS vs Linux sed)
    sed "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" frontend/package.json > frontend/package.json.tmp && mv frontend/package.json.tmp frontend/package.json
    echo -e "${GREEN}Version erfolgreich auf $NEW_VERSION aktualisiert.${NC}"
    VERSION_MSG=" (v$NEW_VERSION)"
else
    VERSION_MSG=" (v$CURRENT_VERSION)"
fi

echo ""
echo -e "${BLUE}=== 📦 Baue Frontend ===${NC}"

# 2. Build im Frontend-Ordner
cd frontend
npm install
npm run build
cd ..

echo ""
echo -e "${BLUE}=== 📂 Kopiere Build nach 'docs/' ===${NC}"
mkdir -p docs
cp -r frontend/dist/* docs/

echo ""
echo -e "${BLUE}=== 📤 Push nach GitHub ===${NC}"

# Aktuellen Branch ermitteln
BRANCH=$(git branch --show-current)

# Änderungen prüfen
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}Keine Änderungen zum Committen.${NC}"
else
    read -p "Commit-Nachricht (Standard: 'Deploy$VERSION_MSG'): " msg
    msg=${msg:-"Deploy$VERSION_MSG"}

    git add .
    git commit -m "$msg"
    
    echo -e "${BLUE}Pushe zu origin $BRANCH...${NC}"
    git push origin "$BRANCH"
fi

echo ""
echo -e "${GREEN}=== ✅ Deployment abgeschlossen! ===${NC}"
echo "Die App ist nun in Version ${NEW_VERSION:-$CURRENT_VERSION} bereit."
