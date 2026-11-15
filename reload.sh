#!/bin/sh
# Applies an update of impl.js without logging out.
# Only this extension is disabled and re-enabled; no other extension is touched.
UUID=topbar-telegram@yunusemreyasar
gnome-extensions disable "$UUID" && sleep 1 && gnome-extensions enable "$UUID" && \
  gnome-extensions info "$UUID" | grep -E "State"
