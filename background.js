// TubeShift is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// TubeShift is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

console.log("Loading TubeShift extension");

const tubeshift_bg_options_version = 1;

const tubeshift_default_options = {
    first_run: true,
    enable_anonymous_data_collection: true,
    show_overlay: true,

    options_version: tubeshift_bg_options_version,

    seen_access_watch_page: {
        bitchute: true,
        youtube: true,
    },

    lookup_platform: {
        bitchute: true,
        odysee: true,
        youtube: true,
    },

    show_platform: {
        bitchute: true,
        dailymotion: true,
        odysee: true,
        rumble: true,
        youtube: false,
    },

    overlay_platform: {
        bitchute: true,
        youtube: true,
    },

    overlay_config: {
        show_for: 7000,
    },
};

function tubeshift_bg_clone(clone_from) {
    return JSON.parse(JSON.stringify(clone_from));
}

function tubeshift_bg_set_option_defaults(loaded_options, default_values) {
    var changed = false;

    for(const option_name in default_values) {
        if(loaded_options[option_name] == undefined) {
            const default_value = loaded_options[option_name] = default_values[option_name];
            changed = true;
        } else if (typeof loaded_options[option_name] == "object") {
            if (tubeshift_bg_set_option_defaults(loaded_options[option_name], default_values[option_name])) {
                changed = true;
            }
        }
    }

    return changed;
}

function tubeshift_bg_migrate_options_0(options) {
    if (options.options_version != 0) {
        throw "Migration handler for options version 0 got another version: '" + options.options_version + "'";
    }

    // The show_overlay option becomes the default value for the
    // platform specific overlay_platform.$platform_name options
    if (options.show_overlay != undefined) {
        console.log("  Importing existing show_overlay key");
        const overlay_default = options.show_overlay;

        if (options.overlay_platform == undefined) {
            options.overlay_platform = {};
        }

        for(platform_name in tubeshift_default_options.overlay_platform) {
            if (! platform_name in options.overlay_platform || options.overlay_platform[platform_name] == undefined) {
                options.overlay_platform[platform_name] = overlay_default;
            }
        }

        delete options.show_overlay;
    }

    options.options_version = 1;

    return;
}

const tubeshift_bg_migrate_handlers = [
    tubeshift_bg_migrate_options_0,
];

function tubeshift_bg_migrate_options(options) {
    let changed = false;

    if (Object.keys(options).length == 0) {
        // empty options has nothing to migrate
        console.log("won't migrate empty options");
        return changed;
    }

    if (options.options_version == undefined) {
        options.options_version = 0;
        changed = true;
    }

    for(let i = 0; i < tubeshift_bg_options_version; i++) {
        const migrate_function = tubeshift_bg_migrate_handlers[i];

        if (migrate_function == undefined) {
            throw "migrate function was missing for options version: '" + i + "'";
        }

        migrate_function(options);
        changed = true;
    }

    return changed;
}

function tubeshift_bg_has_undefined_deep(object) {
    for(key in object) {
        if (object[key] == undefined) {
            return true;
        }

        if (typeof object[key] == 'object') {
            if (tubeshift_bg_has_undefined_deep(object[key])) {
                return true;
            }
        }
    }

    return false;
}

{
    let tubeshift_options = {};

    var tubeshift_bg_options_init = async function () {
        let changed = false;

        try {
            let loaded_options = await tubeshift_browser_storage_get("options");

            if (loaded_options == undefined) {
                loaded_options = tubeshift_bg_clone(tubeshift_default_options);
                changed = true;
            } else if (loaded_options.options_version == undefined || loaded_options.options_version < tubeshift_bg_options_version) {
                tubeshift_bg_migrate_options(loaded_options);
                changed = true;
            }

            if (tubeshift_bg_set_option_defaults(loaded_options, tubeshift_default_options)) {
                changed = true;
            }

            if (tubeshift_bg_has_undefined_deep(loaded_options)) {
                console.log("Options:", loaded_options);
                throw "Invalid options: undefined value found";
            }

            tubeshift_options = loaded_options;
        } catch (error) {
            console.log("Using default values because options init failed: " + error);
            tubeshift_options = tubeshift_bg_clone(tubeshift_default_options);
            changed = true;
        }

        if (changed) {
            await tubeshift_bg_options_save();
            tubeshift_browser_show_options();
        }
    }

    function tubeshift_bg_options_save() {
        return tubeshift_browser_storage_set("options", tubeshift_options);
    }

    function tubeshift_bg_options_get(option_name) {
        const option_parts = option_name.split('.');

        if (option_parts.length == 1) {
            return tubeshift_options[option_parts[0]];
        } else if (option_parts.length == 2) {
            return tubeshift_options[option_parts[0]][option_parts[1]];
        }
    }

    var tubeshift_bg_options_set = async function(option_name, option_value) {
        const option_parts = option_name.split('.');

        if (option_parts.length == 1) {
            tubeshift_options[option_parts[0]] = option_value;
        } else if (option_parts.length == 2) {
            tubeshift_options[option_parts[0]][option_parts[1]] = option_value;
        }

        await tubeshift_bg_options_save();
    }

    var tubeshift_bg_options_reset = function() {
        tubeshift_options = tubeshift_bg_clone(tubeshift_default_options);
        return tubeshift_bg_options_save();
    }
}

{
    let tubeshift_tab_info = {};

    function tubeshift_remove_tab_info(tab_id) {
        delete tubeshift_tab_info[tab_id];
    }

    function tubeshift_reset_tab_info(tab_id) {
        tubeshift_tab_info[tab_id] = {};
    }

    function tubeshift_bg_get_tab_info_platform_name(tab_id) {
        let info = tubeshift_tab_info[tab_id];

        if (info == undefined || info.platform_name == undefined) {
            return undefined;
        }

        return info.platform_name;
    }

    function tubeshift_bg_set_tab_info_platform_name(tab_id, platform_name) {
        tubeshift_tab_info[tab_id].platform_name = platform_name;
    }

    function tubeshift_bg_get_tab_info_url(tab_id) {
        let info = tubeshift_tab_info[tab_id];

        if (info == undefined || info.url == undefined) {
            return undefined;
        }

        return info.url;
    }

    function tubeshift_bg_set_tab_info_url(tab_id, url_string) {
        tubeshift_tab_info[tab_id].url = url_string;
    }

    function tubeshift_bg_get_tab_info_alternates(tab_id) {
        let info = tubeshift_tab_info[tab_id];

        if (info == undefined || info.alternates == undefined) {
            return undefined;
        }

        return info.alternates;
    }

    function tubeshift_bg_set_tab_info_alternates(tab_id, alternates_in) {
        tubeshift_tab_info[tab_id].alternates = alternates_in;
    }
}

function tubeshift_bg_handle_tab_close(tab_id) {
    tubeshift_remove_tab_info(tab_id);
}

function tubeshift_bg_handle_navigation_change(tab_id, url) {
    const found = tubeshift_module_call_platform_handlers(tab_id, url);

    if (found) {
        tubeshift_bg_handle_watch_event(tab_id, found.platform_name, found.platform_id);
    }
}

function tubeshift_bg_handle_reload_event(tab_id, url) {
    tubeshift_reset_tab_info(tab_id);
    tubeshift_bg_handle_navigation_event(tab_id, url);
}

function tubeshift_bg_handle_navigation_event(tab_id, url_string) {
    if (url_string == undefined || url_string == '') {
        return;
    }

    if (url_string != tubeshift_bg_get_tab_info_url(tab_id)) {
        tubeshift_reset_tab_info(tab_id);
        tubeshift_bg_set_tab_info_url(tab_id, url_string);
        tubeshift_bg_handle_navigation_change(tab_id, new URL(url_string));
    }

    tubeshift_bg_update_notification(tab_id);
}

function tubeshift_bg_handle_watch_event(tab_id, platform_name, platform_id) {
    if (! tubeshift_bg_policy_anon_data_collection()) {
        return;
    }

    if (! tubeshift_bg_options_get("lookup_platform." + platform_name)) {
        return;
    }

    tubeshift_bg_set_tab_info_platform_name(tab_id, platform_name);
    tubeshift_bg_update_notification(tab_id);

    tubeshift_bg_fetch_platform_info(platform_name, platform_id)
        .then(video => {
            if (video.known()) {
                tubeshift_bg_alternates_ready(tab_id, platform_name, video);
            }
        }).catch(error => { console.log("TubeShift platform info request failed: " + error) });
}

function tubeshift_bg_handle_message(tab_id, message) {
    if (message.name == "shift") {
        tubeshift_bg_handle_shift(tab_id);
    } else {
        throw "unknown message name: " + message.name;
    }
}

function tubeshift_bg_handle_shift(tab_id) {
    tubeshift_browser_create_tab('/popup.html?tab=' + tab_id);
}

function tubeshift_bg_policy_anon_data_collection() {
    if (tubeshift_bg_options_get("enable_anonymous_data_collection")) {
        return true;
    }

    return false;
}

function tubeshift_bg_fetch_platform_info(platform_name, platform_id) {
    return new Promise((resolve, error) => {
        if (! tubeshift_bg_policy_anon_data_collection()) {
            error("Network fetch denied: anonymous data collection is disabled");
        }

        tubeshift_api_get_alternates({ platform_name: platform_name, platform_id: platform_id })
            .then(resolve)
            .catch(error);
    });
}

function tubeshift_bg_fetch_platform_meta(name, id) {
    return new Promise((resolve, error) => {
        if (! tubeshift_bg_policy_anon_data_collection()) {
            error("Network fetch denied: anonymous data collection is disabled");
        }

        tubeshift_api_get_meta({ platform_name: name, platform_id: id })
            .then(resolve)
            .catch(error);
    });
}

{
    let extension_manifest;

    var tubeshift_bg_get_manifest = async function() {
        if (extension_manifest == undefined) {
            extension_manifest = await (await fetch('/manifest.json')).json();
        }

        return extension_manifest;
    }
}

function tubeshift_bg_filter_alternates_display(alternates) {
    const show_platform = tubeshift_bg_options_get("show_platform");
    var filtered = [];

    if (alternates == undefined) {
        return undefined;
    }

    for (const location of alternates) {
        const platform_name = location.get_name();
        const should_display = show_platform[platform_name];

        if (should_display) {
            filtered.push(location)
        };
    }

    return filtered;
}

function tubeshift_bg_alternates_ready(tab_id, platform_name, video) {
    const locations = video.get_locations();

    tubeshift_bg_set_tab_info_alternates(tab_id, locations);
    tubeshift_bg_update_notification(tab_id);
}

function tubeshift_bg_update_notification(tab_id) {
    const alternates = tubeshift_bg_get_tab_info_alternates(tab_id);
    const tab_platform_name = tubeshift_bg_get_tab_info_platform_name(tab_id);

    if (alternates != undefined) {
        const filtered_alternates = tubeshift_bg_filter_alternates_display(alternates);
        const num_alternates = filtered_alternates.length;

        if (num_alternates > 0) {
            tubeshift_browser_show_available(tab_id, num_alternates);

            if (tubeshift_bg_options_get("overlay_platform." + tab_platform_name)) {
                const overlay_config = tubeshift_bg_options_get("overlay_config");
                tubeshift_browser_send_tab_message(tab_id, { name: "available", count: num_alternates, config: overlay_config });
            }
        }
    } else if(tab_platform_name != undefined) {
        tubeshift_browser_show_active(tab_id);
        // always send message that causes the notification to go away
        tubeshift_browser_send_tab_message(tab_id, { name: "active" });
    } else {
        tubeshift_browser_show_inactive(tab_id);
        // always send message that causes notification to go away
        tubeshift_browser_send_tab_message(tab_id, { name: "inactive" });
    }
}

async function tubeshift_bg_init() {
    const manifest = await tubeshift_bg_get_manifest();
    console.log("Initializing TubeShift Extension version " + manifest.version);

    await tubeshift_bg_options_init();

    if (await tubeshift_bg_options_get('first_run')) {
        tubeshift_browser_show_options();
        tubeshift_bg_options_set("first_run", false);
    }

    tubeshift_browser_start_bg_page();
    console.log("TubeShift Extension started");
};

tubeshift_bg_init();
