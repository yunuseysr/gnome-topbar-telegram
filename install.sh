#!/usr/bin/env bash
# Links this directory into the user's GNOME Shell extensions and compiles the schema.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
UUID="topbar-telegram@yunusemreyasar"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

glib-compile-schemas "$SRC/schemas"
mkdir -p "$(dirname "$DEST")"
ln -sfn "$SRC" "$DEST"

echo "Installed to $DEST"
echo "First install: log out and back in (Wayland), then run: gnome-extensions enable $UUID"
echo "Later changes to impl.js: ./reload.sh"
