#!/usr/bin/env bash
set -e

REPO="Henrick1/Pets"
URL="https://github.com/$REPO/releases/download/desktop/Pets-Linux.AppImage"
ICON_URL="https://raw.githubusercontent.com/$REPO/main/assets/icon.png"
DEST="$HOME/.local/share/pets"
APP="$DEST/Pets.AppImage"
APPS="$HOME/.local/share/applications"
AUTOSTART="$HOME/.config/autostart"

if [ "$1" = "--remover" ]; then
  rm -rf "$DEST"
  rm -f "$APPS/pets.desktop" "$AUTOSTART/pets.desktop"
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" || true
  echo "Pets removido."
  exit 0
fi

if ! ldconfig -p 2>/dev/null | grep -q "libfuse.so.2"; then
  echo "Instalando libfuse2 (necessario para AppImage)..."
  if apt-cache show libfuse2t64 >/dev/null 2>&1; then
    sudo apt-get install -y libfuse2t64
  else
    sudo apt-get install -y libfuse2
  fi
fi

mkdir -p "$DEST" "$APPS"
echo "Baixando a versao mais recente..."
curl -fL --progress-bar "$URL" -o "$APP.tmp"
mv "$APP.tmp" "$APP"
chmod +x "$APP"
curl -fsSL "$ICON_URL" -o "$DEST/icon.png" || true

write_entry() {
  cat > "$1" <<ENTRY
[Desktop Entry]
Type=Application
Name=Pets
Comment=Bichinhos 3D na area de trabalho
Exec="$APP" --no-sandbox
Icon=$DEST/icon.png
Terminal=false
Categories=Utility;
StartupNotify=false
ENTRY
  chmod +x "$1"
}

write_entry "$APPS/pets.desktop"
rm -f "$APPS/bolota.desktop"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" || true

if [ "$1" = "--autostart" ]; then
  mkdir -p "$AUTOSTART"
  write_entry "$AUTOSTART/pets.desktop"
  echo "Inicio automatico ativado."
fi

echo "Pronto! Procure por Pets na tela de aplicativos."
echo "Para atualizar depois, rode este mesmo comando de novo."
