// SPDX-License-Identifier: GPL-2.0-or-later
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class TopBarTelegramPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;

        const page = new Adw.PreferencesPage();
        window.add(page);

        const sizeGroup = new Adw.PreferencesGroup({title: 'Window'});
        page.add(sizeGroup);

        for (const [key, title] of [
            ['width-percent', 'Width (%)'],
            ['height-percent', 'Height (%)'],
        ]) {
            const row = Adw.SpinRow.new_with_range(20, 100, 5);
            row.title = title;
            settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
            sizeGroup.add(row);
        }

        const animRow = Adw.SpinRow.new_with_range(0, 1000, 50);
        animRow.title = 'Animation duration (ms)';
        settings.bind('animation-duration', animRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        sizeGroup.add(animRow);

        const behaviorGroup = new Adw.PreferencesGroup({title: 'Behavior'});
        page.add(behaviorGroup);

        const unfocusRow = new Adw.SwitchRow({title: 'Hide when another window gets focus'});
        settings.bind('hide-on-unfocus', unfocusRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(unfocusRow);

        const keyRow = new Adw.EntryRow({
            title: 'Toggle shortcut (e.g. <Super>F12)',
            show_apply_button: true,
            text: settings.get_strv('toggle-key')[0] ?? '',
        });
        keyRow.connect('apply', () => {
            const accel = keyRow.text.trim();
            const [ok] = Gtk.accelerator_parse(accel);
            if (accel === '' || ok) {
                keyRow.remove_css_class('error');
                settings.set_strv('toggle-key', accel ? [accel] : []);
            } else {
                keyRow.add_css_class('error');
            }
        });
        behaviorGroup.add(keyRow);
    }
}
