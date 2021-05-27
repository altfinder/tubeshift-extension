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

const anonymous_data_collection_div = document.querySelector("#extension_settings #setting-anonymous-data-collection");
let background_page;

async function tubeshift_options_start() {
    background_page = await tubeshift_browser_get_bg_page();

    let anonymous_data_collection_element =  document.querySelector("#extension_settings input.option-input[name=enable_anonymous_data_collection]");
    let read_privacy_policy_element = document.querySelector("#read_privacy_policy");
    let factory_reset_enable = document.querySelector("#factory-reset-enable");
    let factory_reset_button = document.querySelector("#factory-reset-button");

    read_privacy_policy_element.onclick = function(event) {
        tubeshift_browser_create_tab('/privacy.txt');
        return false;
    };

    factory_reset_enable.checked = false;
    factory_reset_button.disabled = true;

    factory_reset_enable.onchange = function(event) {
        factory_reset_button.disabled = ! factory_reset_enable.checked;
    };

    factory_reset_enable.disabled = false;

    factory_reset_button.onclick = function(event) {
        background_page.tubeshift_bg_options_reset().then((result) => {
            document.location.reload();
        });
    }

    for(let element of document.querySelectorAll("#extension_settings input.option-input[type=checkbox]")) {
        tubeshift_options_ui_init_boolean_element(element);
    }

    for(let element of document.querySelectorAll("#extension_settings input.host-permission-input[type=checkbox]")) {
        tubeshift_options_init_host_permission_element(element);
    }

    anonymous_data_collection_element.oninput = tubeshift_options_ui_handle_anonymous_data_collection_change;
    tubeshift_options_ui_handle_anonymous_data_collection_change({ target: anonymous_data_collection_element });

    tubeshift_options_ui_init_display_order();
}

function tubeshift_options_ui_save_display_order(element) {
    let display_order = Array();

    for (item of element.querySelectorAll('.platform-order-item')) {
        const platform_name = $(item).attr('data-platform-name');
        display_order.push(platform_name);
    }

    background_page.tubeshift_bg_options_set('platform_display_order', display_order);
}

function tubeshift_options_ui_init_display_order() {
    const override_element = $('#platform-order-override')[0];
    const default_element = $('#platform-order-default')[0];
    const saved_order = background_page.tubeshift_bg_options_get('platform_display_order');

    for (platform_name of saved_order) {
        const platform_selector = '[data-platform-name="' + platform_name + '"]';
        const item = default_element.querySelector('.platform-order-item' + platform_selector);
        $(default_element).remove(item);
        $(override_element).append(item);
    }

    $(override_element).sortable({
        connectWith: '#platform-order-default',
        cursor: 'move',
        placeholder: "platform-order-placeholder",
        items: "> li.platform-order-item",
        update: function() { tubeshift_options_ui_save_display_order(override_element) }
    });

    $(default_element).sortable({
        connectWith: '#platform-order-override',
        cursor: 'move',
        placeholder: "platform-order-placeholder",
        items: "> li.platform-order-item",
    });
}

function tubeshift_options_ui_handle_anonymous_data_collection_change(event) {
    let element = event.target;

    if (element.checked) {
        anonymous_data_collection_div.classList.remove("alert");
    } else {
        anonymous_data_collection_div.classList.add("alert");
    }
}

function tubeshift_options_update_permission_element(element, checked) {
    element.checked = checked;
    element.onchange(element);
}

function tubeshift_options_init_host_permission_element(element) {
    const platform_name = element.name;
    const watch_patterns = background_page.tubeshift_module_get_watch_patterns(platform_name);
    const setting_div = document.querySelector('#host-permission-div-' + platform_name);

    element.onchange = function() {
        if (element.checked) {
            setting_div.classList.remove("alert");
        } else {
            setting_div.classList.add("alert");
        }
    }

    element.onclick = function() {
        if (element.checked) {
            tubeshift_browser_request_hosts(watch_patterns)
                .then(result => tubeshift_options_update_permission_element(element, result));
        } else {
            tubeshift_browser_remove_hosts(watch_patterns)
                .then(result => tubeshift_options_update_permission_element(element, ! result));
        }
    }

    background_page.tubeshift_browser_contains_hosts(watch_patterns)
        .then(result => { tubeshift_options_update_permission_element(element, result) });

    element.disabled = false;
}

async function tubeshift_options_ui_init_boolean_element(element) {
    let option_name = element.name;
    let option_value = background_page.tubeshift_bg_options_get(option_name);

    element.checked = option_value;
    element.onchange = function() {
        background_page.tubeshift_bg_options_set(option_name, element.checked);
    }

    element.disabled = false;
}

tubeshift_options_start();
