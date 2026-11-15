#!/usr/bin/env bash
# Builds an installable zip (for GitHub Releases or extensions.gnome.org).
set -euo pipefail
cd "$(dirname "$0")"
extra=(--extra-source=impl.js --extra-source=LICENSE)
gnome-extensions pack --force --schema=schemas/$(ls schemas | grep gschema.xml) "${extra[@]}" .
echo "Built: $(ls *.shell-extension.zip)"
echo "Install it with: gnome-extensions install --force $(ls *.shell-extension.zip)"
