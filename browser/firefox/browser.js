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

console.log("Loading Firefox browser support");

var tubeshift_browser_storage_get = async function(key) {
    const result = await browser.storage.local.get(key);
    return result[key];
}

var tubeshift_browser_storage_set = async function(key, value) {
    const to_store = {};

    to_store[key] = value;
    await browser.storage.local.set(to_store);
}

function tubeshift_browser_show_available(tab_id, badge_text) {
    browser.browserAction.setIcon({
        tabId: tab_id,
        path: {
            "16": "icons/buttonbar.available-16.png",
            "32": "icons/buttonbar.available-32.png"
        }
    });

    if (badge_text != undefined) {
        const badge_string = String(badge_text);

        browser.browserAction.setBadgeBackgroundColor({ tabId: tab_id, color: "blue" });
        browser.browserAction.setBadgeText({ tabId: tab_id, text: badge_string });
    }
}

function tubeshift_browser_show_active(tab_id) {
    browser.browserAction.setIcon({
        tabId: tab_id,
        path: {
            "16": "icons/buttonbar.active-16.png",
            "32": "icons/buttonbar.active-32.png"
        }
    });

    browser.browserAction.setBadgeText({ tabId: tab_id, text: "" });
}

function tubeshift_browser_show_inactive(tab_id) {
    browser.browserAction.setBadgeText({ tabId: tab_id, text: "" });
    browser.browserAction.setIcon({
        tabId: tab_id,
        path: {
            "16": "icons/buttonbar.inactive-16.png",
            "32": "icons/buttonbar.inactive-32.png"
        }
    });
};

function tubeshift_browser_show_options() {
    browser.runtime.openOptionsPage();
}

async function tubeshift_browser_get_current_tab() {
    const tab_list = await browser.tabs.query({ active: true });

    if (tab_list.length != 1) {
         return undefined;
    }

    return tab_list[0].id;
}

async function tubeshift_browser_create_tab(url) {
    let tab_options = { active: true };

    if (url != undefined) {
        tab_options.url = url;
    }

    let result = await browser.tabs.create(tab_options);
    return result.id;
}

async function tubeshift_browser_update_tab(tab_id, new_value) {
    chrome.tabs.update(tab_id, new_value);
}

async function tubeshift_browser_get_bg_page() {
    return await browser.runtime.getBackgroundPage();
}

function tubeshift_browser_init_listeners() {
    browser.tabs.onRemoved.addListener(function(tab_id, details) {
        tubeshift_handle_tab_close(tab_id);
    });

    browser.tabs.onActivated.addListener(function(details) {
        browser.tabs.get(details.tabId).then(tab => {
            tubeshift_handle_navigation_event(tab.id, tab.url);
        });
    });

    browser.tabs.onUpdated.addListener(function(tab_id, details, tab_info) {
        if (details.url) {
            tubeshift_handle_navigation_event(tab_id, details.url);
        }
    });

    browser.webNavigation.onCommitted.addListener(details => {
        if (details.transitionType == "reload") {
            tubeshift_handle_reload_event(details.tabId, details.url);
        }
    });
}
