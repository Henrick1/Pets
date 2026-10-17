#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPS="$HOME/.local/share/applications"
AUTOSTART="$HOME/.config/autostart"
ELECTRON="$DIR/node_modules/electron/dist/electron"

if [ ! -x "$ELECTRON" ]; then
  echo "Instalando dependencias..."
  (cd "$DIR" && npm install)
fi

write_entry() {
  cat > "$1" <<ENTRY
[Desktop Entry]
Type=Application
Name=Pets
Comment=Bichinhos 3D na area de trabalho
Exec="$ELECTRON" "$DIR"
Path=$DIR
Icon=$DIR/assets/icon.png
Terminal=false
Categories=Utility;
StartupNotify=false
ENTRY
  chmod +x "$1"
}

mkdir -p "$APPS"
write_entry "$APPS/pets.desktop"
rm -f "$APPS/bolota.desktop"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" || true

if [ "$1" = "--autostart" ]; then
  mkdir -p "$AUTOSTART"
  write_entry "$AUTOSTART/pets.desktop"
  echo "Inicio automatico ativado."
fi

echo "Atalho criado: procure por Pets na tela de aplicativos."
