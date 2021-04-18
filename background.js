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

console.log("Loading TubeShift background page");

const tubeshift_supported_platforms = {
    bitchute: 1,
    dailymotion: 1,
    odysee: 1,
    rumble: 1,
}

const tubeshift_default_options = {
    first_run: true,
    enable_anonymous_data_collection: true,
    show_overlay: true,
};

{
    let tubeshift_options = {};

    var tubeshift_bg_options_init = async function () {
        let loaded_options = await tubeshift_browser_storage_get("options");
        let changed = false;

        if (loaded_options == undefined) {
            loaded_options = {};
        }

        for(option_name in tubeshift_default_options) {
            if(loaded_options[option_name] == undefined) {
                loaded_options[option_name] = tubeshift_default_options[option_name];;
                changed = true;
            }
        }

        tubeshift_options = loaded_options;

        if (changed) {
            await tubeshift_bg_options_save();
        }
    }

    async function tubeshift_bg_options_save() {
        await tubeshift_browser_storage_set("options", tubeshift_options);
    }

    function tubeshift_bg_options_get(option_name) {
        return tubeshift_options[option_name];
    }

    var tubeshift_bg_options_set = async function(option_name, option_value) {
        tubeshift_options[option_name] = option_value;
        await tubeshift_bg_options_save();
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

function tubeshift_bg_locations_remove_platform(platform_name, locations) {
    let result = [];

    for(item of locations) {
        if (item.get_name() != platform_name) {
            result.push(item);
        }
    }

    return result;
}


function tubeshift_bg_handle_tab_close(tab_id) {
    tubeshift_remove_tab_info(tab_id);
}

function tubeshift_bg_handle_navigation_change(tab_id, url) {
    tubeshift_module_call_platform_handlers(tab_id, url);
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
    tubeshift_bg_fetch_platform_info(platform_name, platform_id)
        .then(video => {
            if (video.known()) {
                const filtered_locations = tubeshift_bg_locations_remove_platform(platform_name, video.get_locations());
                tubeshift_bg_set_tab_info_platform_name(tab_id, platform_name);
                tubeshift_bg_alternates_ready(tab_id, filtered_locations);
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

        tubeshift_api_get_video({ platform_name: platform_name, platform_id: platform_id })
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

function tubeshift_bg_supported_platform(platform_name) {
    if (platform_name in tubeshift_supported_platforms) {
        return true;
    }

    return false;
}

function tubeshift_bg_alternates_ready(tab_id, alternates) {
    tubeshift_bg_set_tab_info_alternates(tab_id, alternates);
    tubeshift_bg_update_notification(tab_id);
}

function tubeshift_bg_update_notification(tab_id) {
    const alternates = tubeshift_bg_get_tab_info_alternates(tab_id);
    const tab_platform_name = tubeshift_bg_get_tab_info_platform_name(tab_id);

    if (alternates != undefined && alternates.length > 0) {
        tubeshift_browser_show_available(tab_id, alternates.length);

        if (tubeshift_bg_options_get('show_overlay')) {
            tubeshift_browser_send_tab_message(tab_id, { name: "available", count: alternates.length });
        }
    } else if(tab_platform_name != undefined) {
        tubeshift_browser_show_active(tab_id);
    } else {
        tubeshift_browser_show_inactive(tab_id);
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
