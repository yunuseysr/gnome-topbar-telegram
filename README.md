# Top Bar Telegram

A GNOME Shell extension that turns **Telegram Desktop into a drop-down window** — like
[ddterm](https://github.com/ddterm/gnome-shell-extension-ddterm) does for the terminal.
Press <kbd>Super</kbd>+<kbd>F12</kbd> (or click the top bar icon) and Telegram slides down from the
top of the screen; press it again, or click anywhere else, and it slides away.

Chats stay one keystroke away without taking a place in your Alt+Tab list or on a workspace.

## Features

- **Global shortcut** to show / hide (default <kbd>Super</kbd>+<kbd>F12</kbd>, configurable).
- **Top bar button** that does the same.
- **Slide animation** in and out, with adjustable duration (or 0 to disable).
- **Size** as a percentage of the screen (default 60% × 70%), centered under the top bar.
- **Hide on focus loss**: switching to another window tucks Telegram away. Telegram’s own dialogs,
  file pickers and the media viewer keep it open.
- Follows you: appears on the **current monitor** and on **every workspace**, above other windows.
- Starts Telegram if it is not running, or brings it back if it was closed to the tray.
- Works with the **Flatpak**, distro (**Fedora, Debian/Ubuntu, Arch**) and **Snap** packages of Telegram Desktop.

## Install

Requires GNOME Shell 45–48 and [Telegram Desktop](https://desktop.telegram.org/).

```bash
git clone https://github.com/yunuseysr/gnome-topbar-telegram.git
cd gnome-topbar-telegram
./install.sh
```

On Wayland, log out and back in once, then:

```bash
gnome-extensions enable topbar-telegram@yunusemreyasar
```

### As a zip

Build an installable zip (also what you would upload to extensions.gnome.org) and install it:

```bash
./pack.sh
gnome-extensions install --force topbar-telegram@yunusemreyasar.shell-extension.zip
```

## Settings

Open them from the Extensions app, or:

```bash
gnome-extensions prefs topbar-telegram@yunusemreyasar
```

| Setting | Default |
|---|---|
| Width / height (% of the screen) | 60 / 70 |
| Animation duration | 200 ms |
| Hide when another window gets focus | on |
| Toggle shortcut | `<Super>F12` |

## Development

`extension.js` is a small loader that imports `impl.js` with its modification time in the URL. GNOME Shell
caches ES modules for the whole session, so this lets you apply changes without logging out:

```bash
./reload.sh      # disables and re-enables only this extension
./pack.sh        # builds the release zip
```

Logs: `journalctl -f -o cat /usr/bin/gnome-shell`

## License

[GPL-2.0-or-later](LICENSE), like GNOME Shell itself. Not affiliated with Telegram.
