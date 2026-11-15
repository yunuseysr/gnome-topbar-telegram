// SPDX-License-Identifier: GPL-2.0-or-later
// Owned by the loader in extension.js, which re-imports this file on every enable
// so updates apply with a disable/enable of this extension alone (no logout needed).

import GObject from 'gi://GObject';
import St from 'gi://St';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

// Desktop file ids of Telegram Desktop: Flatpak / Fedora, Debian / Ubuntu / Arch, Snap.
const APP_IDS = [
    'org.telegram.desktop.desktop',
    'telegramdesktop.desktop',
    'telegram-desktop.desktop',
    'telegram-desktop_telegram-desktop.desktop',
];
const WM_CLASS = 'TelegramDesktop';

const ToggleButton = GObject.registerClass(
class ToggleButton extends PanelMenu.Button {
    _init(onToggle) {
        super._init(0.5, 'Telegram', true);
        this._onToggle = onToggle;

        // Setting both gicon and icon_name clears the icon, so pass only a themed name.
        this.add_child(new St.Icon({
            icon_name: 'org.telegram.desktop-symbolic',
            fallback_icon_name: 'telegram',
            style_class: 'system-status-icon',
        }));
    }

    vfunc_event(event) {
        const type = event.type();
        if (type === Clutter.EventType.BUTTON_PRESS || type === Clutter.EventType.TOUCH_BEGIN) {
            this._onToggle();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }
});

export class TopBarTelegram {
    constructor(ext) {
        this._ext = ext;
    }

    enable() {
        this._settings = this._ext.getSettings();
        this._window = null;
        this._windowSignals = [];
        this._pendingShow = false;
        this._hiding = false;

        this._button = new ToggleButton(() => this.toggle());
        Main.panel.addToStatusArea(this._ext.uuid, this._button);

        Main.wm.addKeybinding('toggle-key', this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this.toggle());

        this._displaySignals = [
            global.display.connect('window-created', (_d, win) => this._onWindowCreated(win)),
            global.display.connect('notify::focus-window', () => this._onFocusChanged()),
        ];
        this._settingsSignals = ['width-percent', 'height-percent'].map(key =>
            this._settings.connect(`changed::${key}`, () => {
                if (this._window && !this._window.minimized)
                    this._place(this._window);
            }));

        // The shell's own minimize/unminimize effects would fight the slide animation.
        const extension = this;
        this._origShouldAnimateActor = Main.wm._shouldAnimateActor;
        Main.wm._shouldAnimateActor = function (actor, types) {
            if (extension._window && actor === extension._window.get_compositor_private())
                return false;
            return extension._origShouldAnimateActor.call(this, actor, types);
        };
    }

    disable() {
        Main.wm._shouldAnimateActor = this._origShouldAnimateActor;
        this._origShouldAnimateActor = null;

        Main.wm.removeKeybinding('toggle-key');

        this._displaySignals.forEach(id => global.display.disconnect(id));
        this._settingsSignals.forEach(id => this._settings.disconnect(id));
        this._displaySignals = [];
        this._settingsSignals = [];

        this._release();

        this._button.destroy();
        this._button = null;
        this._settings = null;
    }

    toggle() {
        const win = this._window ?? this._findWindow();

        if (!win) {
            // Not running, or closed to tray: activating brings the window back.
            this._pendingShow = true;
            const appSystem = Shell.AppSystem.get_default();
            const app = APP_IDS.map(id => appSystem.lookup_app(id)).find(a => a);
            if (app)
                app.activate();
            else
                Main.notify('Top Bar Telegram', 'Telegram Desktop is not installed.');
            return;
        }

        this._adopt(win);

        if (win.minimized || this._hiding)
            this._show(win);
        else if (win.has_focus())
            this._hide(win);
        else
            this._activate(win);
    }

    _isTelegramWindow(win) {
        if (win.get_window_type() !== Meta.WindowType.NORMAL || win.get_transient_for())
            return false;
        const app = Shell.WindowTracker.get_default().get_window_app(win);
        return APP_IDS.includes(app?.get_id()) || win.get_wm_class() === WM_CLASS;
    }

    _findWindow() {
        const windows = global.display.list_all_windows().filter(w => this._isTelegramWindow(w));
        // The media viewer is a separate top-level window; prefer the main one.
        return windows.find(w => w.get_title()?.startsWith('Telegram')) ?? windows[0] ?? null;
    }

    _onWindowCreated(win) {
        if (!this._pendingShow || this._window || !this._isTelegramWindow(win))
            return;
        this._pendingShow = false;

        const id = win.connect('shown', () => {
            win.disconnect(id);
            this._adopt(win);
            this._place(win);
            this._activate(win);
            this._slideIn(win);
        });
    }

    _onFocusChanged() {
        const win = this._window;
        if (!win || win.minimized || this._hiding || !this._settings.get_boolean('hide-on-unfocus'))
            return;

        const focus = global.display.focus_window;
        // Top bar menus, the overview etc. leave focus_window null; keep the window then.
        if (!focus || focus === win)
            return;
        // Dialogs and file choosers opened by Telegram keep it open.
        if (focus.find_root_ancestor() === win || this._isTelegramWindow(focus) ||
            APP_IDS.includes(Shell.WindowTracker.get_default().get_window_app(focus)?.get_id()))
            return;

        this._hide(win);
    }

    _adopt(win) {
        if (this._window === win)
            return;
        this._release();

        this._window = win;
        if (win.get_maximized())
            win.unmaximize(Meta.MaximizeFlags.BOTH);
        win.make_above();
        win.stick();

        this._windowSignals = [
            win.connect('unmanaged', () => {
                this._windowSignals = [];
                this._window = null;
                this._hiding = false;
            }),
            win.connect('notify::minimized', () => {
                // Unminimized from elsewhere (dock, alt-tab): bring it in properly.
                if (!win.minimized && !this._hiding) {
                    this._place(win);
                    this._slideIn(win);
                }
            }),
        ];
    }

    _release() {
        const win = this._window;
        if (!win)
            return;

        this._windowSignals.forEach(id => win.disconnect(id));
        this._windowSignals = [];
        this._window = null;
        this._hiding = false;

        const actor = win.get_compositor_private();
        if (actor) {
            actor.remove_all_transitions();
            actor.translation_y = 0;
        }
        win.unmake_above();
        win.unstick();
    }

    _workArea() {
        const monitor = global.display.get_current_monitor();
        return {monitor, area: Main.layoutManager.getWorkAreaForMonitor(monitor)};
    }

    _place(win) {
        const {monitor, area} = this._workArea();
        const width = Math.round(area.width * this._settings.get_int('width-percent') / 100);
        const height = Math.round(area.height * this._settings.get_int('height-percent') / 100);
        const x = area.x + Math.round((area.width - width) / 2);

        if (win.get_monitor() !== monitor)
            win.move_to_monitor(monitor);
        if (win.get_maximized())
            win.unmaximize(Meta.MaximizeFlags.BOTH);
        win.move_resize_frame(true, x, area.y, width, height);
    }

    _activate(win) {
        if (Main.overview.visible)
            Main.overview.hide();
        win.activate(global.get_current_time());
    }

    _offscreenOffset(win) {
        const actor = win.get_compositor_private();
        const {area} = this._workArea();
        return -(actor.y + actor.height - area.y + 1);
    }

    _slideIn(win) {
        const actor = win.get_compositor_private();
        if (!actor)
            return;
        actor.remove_all_transitions();
        actor.translation_y = this._offscreenOffset(win);
        actor.ease({
            translation_y: 0,
            duration: this._settings.get_int('animation-duration'),
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    _show(win) {
        this._hiding = false;
        this._place(win);
        if (win.minimized)
            win.unminimize(); // notify::minimized triggers the slide-in
        else
            this._slideIn(win);
        this._activate(win);
    }

    _hide(win) {
        const actor = win.get_compositor_private();
        if (!actor) {
            win.minimize();
            return;
        }

        this._hiding = true;
        actor.remove_all_transitions();
        actor.ease({
            translation_y: this._offscreenOffset(win),
            duration: this._settings.get_int('animation-duration'),
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onStopped: isFinished => {
                if (!isFinished || this._window !== win || !this._hiding)
                    return;
                win.minimize();
                this._hiding = false;
            },
        });
    }
}
