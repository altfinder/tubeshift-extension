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

async function tubeshift_options_ui_init() {
    background_page = await tubeshift_browser_get_bg_page();
    let anonymous_data_collection_element =  document.querySelector("#extension_settings input[name=enable_anonymous_data_collection]");
    let read_privacy_policy_element = document.querySelector("#extension_settings #read_privacy_policy");

    for(let element of document.querySelectorAll("#extension_settings input[type=checkbox]")) {
        tubeshift_options_ui_init_boolean_element(element);
    }

    read_privacy_policy_element.onclick = function(element) {
        tubeshift_browser_create_tab('/privacy.txt');
        return false;
    };

    anonymous_data_collection_element.oninput = tubeshift_options_ui_handle_anonymous_data_collection_change;
    tubeshift_options_ui_handle_anonymous_data_collection_change({ target: anonymous_data_collection_element });
}

function tubeshift_options_ui_handle_anonymous_data_collection_change(event) {
    let element = event.target;

    if (element.checked) {
        anonymous_data_collection_div.classList.remove("alert");
    } else {
        anonymous_data_collection_div.classList.add("alert");
    }
}

async function tubeshift_options_ui_init_boolean_element(element) {
    let option_name = element.name;
    let option_value = background_page.tubeshift_options_get(option_name);

    element.checked = option_value;
    element.onchange = function() {
        background_page.tubeshift_options_set(option_name, element.checked);
    }

    element.disabled = false;
}

tubeshift_options_ui_init();
