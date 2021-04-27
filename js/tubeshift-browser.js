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

// Chrome browser implementation
// Also works with Firefox

{
    const content_script_js_files = [
        '/js/jquery-3.6.0.js',
        '/js/tubeshift-browser.js',
        '/content_script.js',
    ];

    var tubeshift_browser_init_content_script = async function (tab_id) {
        for (const js_file of content_script_js_files) {
            await tubeshift_browser_run_tab_script(tab_id, js_file);
        }

        return;
    }
}

function tubeshift_browser_run_tab_script(tab_id, path) {
    return new Promise((resolve, error) => {
        chrome.tabs.executeScript(tab_id, { file: path, runAt: "document_idle" }, (result) => {
            const last_error = chrome.runtime.lastError;

            if (last_error) {
                error(chrome.runtime.lastError);
            }

            resolve(result);
        });
    });
}

function tubeshift_browser_storage_get(key) {
    return new Promise(resolve => {
        chrome.storage.local.get(key, result => {
            resolve(result[key]);
        });
    });
};

function tubeshift_browser_storage_set(key, value) {
    let to_store = {};
    to_store[key] = value;
    return new Promise(resolve => chrome.storage.local.set(to_store, resolve));
}

function tubeshift_browser_get_asset_url(path) {
    return chrome.runtime.getURL(path);
}

function tubeshift_browser_show_available(tab_id, badge_text) {
    chrome.browserAction.setIcon({
        tabId: tab_id,
        path: {
            "16": "icons/buttonbar.available-16.png",
            "32": "icons/buttonbar.available-32.png"
        }
    });

    if (badge_text != undefined) {
        const badge_string = String(badge_text);

        chrome.browserAction.setBadgeBackgroundColor({ tabId: tab_id, color: "blue" });
        chrome.browserAction.setBadgeText({ tabId: tab_id, text: badge_string });
    }
}

function tubeshift_browser_show_active(tab_id) {
    chrome.browserAction.setIcon({
        tabId: tab_id,
        path: {
            "16": "icons/buttonbar.active-16.png",
            "32": "icons/buttonbar.active-32.png"
        }
    });

    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
    }

    chrome.browserAction.setBadgeText({ tabId: tab_id, text: "" });

    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
    }

    return;
}

function tubeshift_browser_show_inactive(tab_id) {
    chrome.browserAction.setIcon({
        tabId: tab_id,
        path: {
            "16": "icons/buttonbar.inactive-16.png",
            "32": "icons/buttonbar.inactive-32.png"
        }
    });

    chrome.browserAction.setBadgeText({ tabId: tab_id, text: "" });
};

function tubeshift_browser_show_options() {
    chrome.runtime.openOptionsPage();
}

async function tubeshift_browser_create_tab(url) {
    return await new Promise((resolve, reject) => {
        let tab_options = { active: true };

        if (url != undefined) {
            tab_options.url = url;
        }

        chrome.tabs.create(tab_options, result => {
            resolve(result);
        })
    });
}

async function tubeshift_browser_update_tab(tab_id, new_value) {
    return await new Promise((resolve, reject) => {
        chrome.tabs.update(tab_id, new_value, resolve);
    });
}

async function tubeshift_browser_get_active_tab() {
    return await new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, tabs => {
            if (tabs.length != 1) {
                resolve(undefined);
            }

            resolve(tabs[0].id);
        });
    });
}

async function tubeshift_browser_get_bg_page() {
    return await new Promise((resolve, reject) => {
        chrome.runtime.getBackgroundPage(bg_page => {
            resolve(bg_page);
        });
    });
}

{
    let bg_page_port;

    function tubeshift_browser_reset_pg_page_port() {
        if (bg_page_port != undefined) {
            bg_page_port.disconnect();
            bg_page_port = undefined;
        }
    }

    function tubeshift_browser_connect_bg_page() {
        const port = chrome.runtime.connect();

        port.onMessage.addListener(message => {
            tubeshift_cs_handle_message(message);
        });

        port.onDisconnect.addListener(() => {
            bg_page_port = undefined;
        });

        bg_page_port = port;
    }

    function tubeshift_browser_send_bg_page_message(message) {
        if (bg_page_port == undefined) {
            throw "pg_page_port was not set";
        }

        bg_page_port.postMessage(message);
    }
}

{
    let port_by_tab_id = {};
    let promise_by_tab_id = {};
    let resolve_by_tab_id = {};

    function tubeshift_browser_handle_connection(port) {
        const tab_id = port.sender.tab.id;
        const resolve = resolve_by_tab_id[tab_id];

        if (! resolve) {
            throw "there was no resolve stored for tab " + tab_id;
        }

        port.onDisconnect.addListener(port => {
            delete port_by_tab_id[tab_id];
            delete promise_by_tab_id[tab_id];
        });

        port.onMessage.addListener(message => {
            tubeshift_bg_handle_message(tab_id, message);
        });

        port_by_tab_id[tab_id] = port;
        delete promise_by_tab_id[tab_id];
        delete resolve_by_tab_id[tab_id];

        resolve();
    }

    var tubeshift_browser_can_send_tab_message = async function(tab_id) {
        const platform_name = tubeshift_bg_get_tab_info_platform_name(tab_id);

        if (platform_name == undefined) {
            return false;
        }

        const patterns = tubeshift_module_get_watch_patterns(platform_name);

        if (patterns == undefined) {
            return false;
        }

        return await tubeshift_browser_contains_hosts(patterns);
    }

    var tubeshift_browser_send_tab_message = async (tab_id, message) => {
        if (! await tubeshift_browser_can_send_tab_message(tab_id)) {
            return;
        }

        if (! port_by_tab_id[tab_id]) {
            if (! promise_by_tab_id[tab_id]) {
                promise_by_tab_id[tab_id] = new Promise((resolve, error) => {
                    resolve_by_tab_id[tab_id] = resolve;
                    tubeshift_browser_init_content_script(tab_id)
                        .catch(error);
                });
            }

            try {
                await promise_by_tab_id[tab_id];
            } catch (e) {
            }
        }

        if (! port_by_tab_id[tab_id]) {
            return;
        }

        const returned = port_by_tab_id[tab_id].postMessage(message);
    };
}

function tubeshift_browser_request_hosts(patterns) {
    return new Promise((resolve, error) => {
        const permissions = { origins: patterns };
        chrome.permissions.request(permissions, result => {
            if (chrome.runtime.lastError) {
                error(chrome.runtime.lastError);
            }

            resolve(result);
        });
    });
}

function tubeshift_browser_remove_hosts(patterns) {
    return new Promise((resolve, error) => {
        const permissions = { origins: patterns };
        chrome.permissions.remove(permissions, result => {
            if (chrome.runtime.lastError) {
                error(chrome.runtime.lastError);
            }

            resolve(result);
        });
    });
}

function tubeshift_browser_contains_hosts(patterns) {
    return new Promise((resolve, error) => {
        const permissions = { origins: patterns };
        return chrome.permissions.contains(permissions, result => {
            if (chrome.runtime.lastError) {
                error(chrome.runtime.lastError);
            }

            resolve(result);
        });
    });
}

function tubeshift_browser_start_bg_page() {
    chrome.runtime.onConnect.addListener(tubeshift_browser_handle_connection);

    chrome.tabs.onRemoved.addListener(function(tab_id, details) {
        tubeshift_bg_handle_tab_close(tab_id);
    });

    chrome.tabs.onActivated.addListener(function(details) {
        chrome.tabs.get(details.tabId, tab => {
            if (! chrome.runtime.lastError) {
                tubeshift_bg_handle_navigation_event(tab.id, tab.url);
            }
        });
    });

    chrome.tabs.onUpdated.addListener(function(tab_id, details, tab_info) {
        if (details.url) {
            tubeshift_bg_handle_navigation_event(tab_id, details.url);
        }
    });

    chrome.webNavigation.onCommitted.addListener(details => {
        if (details.transitionType == "reload") {
            tubeshift_bg_handle_reload_event(details.tabId, details.url);
        }
    });
}

function tubeshift_browser_start_content_script() {
    tubeshift_browser_connect_bg_page();
}
