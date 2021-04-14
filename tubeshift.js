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

console.log("Loading TubeShift core");

const tubeshift_api_prefix = 'https://api.tubeshift.info/';

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

    var tubeshift_options_init = async function () {
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
            await tubeshift_options_save();
        }
    }

    async function tubeshift_options_save() {
        await tubeshift_browser_storage_set("options", tubeshift_options);
    }

    function tubeshift_options_get(option_name) {
        return tubeshift_options[option_name];
    }

    var tubeshift_options_set = async function(option_name, option_value) {
        tubeshift_options[option_name] = option_value;
        await tubeshift_options_save();
    }
}

{
    let tubeshift_platform_handlers = [];

    function tubeshift_get_platform_handler(platform_name) {
        for (const i in tubeshift_platform_handlers) {
            let platform = tubeshift_platform_handlers[i];

            if (platform.name == platform_name) {
                return platform.handler;
            }
        }

        return undefined;
    }

    function tubeshift_set_platform_handler(platform_name, callback) {
        if (tubeshift_get_platform_handler(platform_name)) {
            return undefined;
        }

        tubeshift_platform_handlers.push({
            name: platform_name,
            handler: callback
        });

        return;
    }

    function tubeshift_call_platform_handlers(tab_id, url) {
        for(const i in tubeshift_platform_handlers) {
            let platform = tubeshift_platform_handlers[i];

            if (platform.handler(tab_id, url)) {
                return true;
            }
        }

        return false;
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

    function tubeshift_get_tab_info_platform_name(tab_id) {
        let info = tubeshift_tab_info[tab_id];

        if (info == undefined || info.platform_name == undefined) {
            return undefined;
        }

        return info.platform_name;
    }

    function tubeshift_set_tab_info_platform_name(tab_id, platform_name) {
        tubeshift_tab_info[tab_id].platform_name = platform_name;
    }

    function tubeshift_get_tab_info_url(tab_id) {
        let info = tubeshift_tab_info[tab_id];

        if (info == undefined || info.url == undefined) {
            return undefined;
        }

        return info.url;
    }

    function tubeshift_set_tab_info_url(tab_id, url_string) {
        tubeshift_tab_info[tab_id].url = url_string;
    }

    function tubeshift_get_tab_info_alternates(tab_id) {
        let info = tubeshift_tab_info[tab_id];

        if (info == undefined || info.alternates == undefined) {
            return undefined;
        }

        return info.alternates;
    }

    function tubeshift_set_tab_info_alternates(tab_id, alternates_in) {
        tubeshift_tab_info[tab_id].alternates = alternates_in;
    }
}

function tubeshift_handle_tab_close(tab_id) {
    tubeshift_remove_tab_info(tab_id);
}

function tubeshift_handle_navigation_change(tab_id, url) {
    tubeshift_call_platform_handlers(tab_id, url);
}

function tubeshift_handle_reload_event(tab_id, url) {
    tubeshift_reset_tab_info(tab_id);
    tubeshift_handle_navigation_event(tab_id, url);
}

function tubeshift_handle_navigation_event(tab_id, url_string) {
    if (url_string == undefined || url_string == '') {
        return;
    }

    if (url_string != tubeshift_get_tab_info_url(tab_id)) {
        tubeshift_reset_tab_info(tab_id);
        tubeshift_set_tab_info_url(tab_id, url_string);

        tubeshift_handle_navigation_change(tab_id, new URL(url_string));
    }

    tubeshift_extension_update_notification(tab_id);
}

function tubeshift_extension_handle_message(tab_id, message) {
    if (message.name == "shift") {
        tubeshift_extension_handle_shift(tab_id);
    } else {
        throw "unknown message name: " + message.name;
    }
}

function tubeshift_extension_handle_shift(tab_id) {
    tubeshift_browser_create_tab('/popup.html?tab=' + tab_id);
}

function tubeshift_policy_anon_data_collection() {
    if (tubeshift_options_get("enable_anonymous_data_collection")) {
        return true;
    }

    return false;
}

async function tubeshift_fetch_json(path) {
    let url = tubeshift_api_prefix + path;

    let response = await fetch(url, { mode: "cors" });

    if (! response.ok) {
        return undefined;
    }

    let json_result = await response.json();

    if (json_result.status != "known") {
        return undefined;
    } else if (! "data" in json_result) {
        return undefined;
    }

    return json_result.data;
}

async function tubeshift_fetch_platform_info(platform_name, platform_id) {
    if (! tubeshift_policy_anon_data_collection()) {
        return undefined;
    }

    let path = "video/" + encodeURI(platform_name) + '/' + encodeURI(platform_id);
    let response = await tubeshift_fetch_json(path);

    return response;
}

async function tubeshift_fetch_content_info(content_id) {
    if (! tubeshift_policy_anon_data_collection()) {
        return undefined;
    }

    let path = "content/" + encodeURI(content_id);
    let response = await tubeshift_fetch_json(path);

    return response;
}

function tubeshift_content_id_ready(tab_id, content_id) {
    tubeshift_fetch_content_info(content_id).then(response => {
        tubeshift_set_tab_info_alternates(tab_id, response);
        tubeshift_extension_update_notification(tab_id);
    });
}

function tubeshift_extension_update_notification(tab_id) {
    const alternates = tubeshift_get_tab_info_alternates(tab_id);
    const tab_platform_name = tubeshift_get_tab_info_platform_name(tab_id);
    let num_alternates = 0;

    if (alternates != undefined) {
        for(const content of alternates) {
            if (content.platform_name != tab_platform_name) {
                num_alternates++;
            }
        }
    }

    if (num_alternates) {
        tubeshift_browser_show_available(tab_id, num_alternates);

        if (tubeshift_options_get('show_overlay')) {
            tubeshift_browser_send_tab_message(tab_id, { name: "available", count: num_alternates });
        }
    } else if(tab_platform_name != undefined) {
        tubeshift_browser_show_active(tab_id);
    } else {
        tubeshift_browser_show_inactive(tab_id);
    }
}

{
    let extension_manifest;

    var tubeshift_extension_get_manifest = async function() {
        if (extension_manifest == undefined) {
            extension_manifest = await (await fetch('/manifest.json')).json();
        }

        return extension_manifest;
    }
}

function tubeshift_extension_supported_platform(platform_name) {
    if (platform_name in tubeshift_supported_platforms) {
        return true;
    }

    return false;
}

async function tubeshift_extension_init() {
    const manifest = await tubeshift_extension_get_manifest();

    await tubeshift_options_init();

    if (await tubeshift_options_get('first_run')) {
        tubeshift_browser_show_options();
        tubeshift_options_set("first_run", false);
    }
}
