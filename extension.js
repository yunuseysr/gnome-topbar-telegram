// SPDX-License-Identifier: GPL-2.0-or-later
// Top Bar Telegram — loader.
// GNOME Shell caches ES modules for the whole session, so a changed extension.js only
// takes effect after logging out. This loader keeps the real code in impl.js and imports
// it with the file's modification time in the URL: every enable picks up the newest code.
// To apply an update: ./reload.sh (disables/enables only this extension).

import Gio from 'gi://Gio';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class TopBarTelegramExtension extends Extension {
    enable() {
        const token = {};
        this._token = token;
        const file = Gio.File.new_for_path(`${this.path}/impl.js`);
        let version = '0';
        try {
            version = String(file.query_info('time::modified', Gio.FileQueryInfoFlags.NONE, null)
                .get_modification_date_time().to_unix());
        } catch (e) {
            logError(e, 'topbar-telegram: impl.js');
        }
        import(`${file.get_uri()}?v=${version}`).then(mod => {
            if (this._token !== token)
                return; // disabled while loading
            this._impl = new mod.TopBarTelegram(this);
            this._impl.enable();
        }).catch(e => logError(e, 'topbar-telegram: failed to load impl.js'));
    }

    disable() {
        this._token = null;
        this._impl?.disable();
        this._impl = null;
    }
}
