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

{
    let tubeshift_platform_names = { };

    function tubeshift_module_add_platform_name(platform_name) {
        if (tubeshift_platform_names[platform_name]) {
            throw "Attmept to add duplicate platform name: '" + platform_name + "'";
        }

        tubeshift_platform_names[platform_name] = true;
    }

    function tubeshift_module_get_platform_names() {
        return tubeshift_platform_names.keys();
    }

    function tubeshift_module_is_platform_name(platform_name) {
        return tubeshift_platform_names[platform_name] || false;
    }
}

{
    let platform_watch_patterns = { };

    function tubeshift_module_set_watch_patterns(platform_name, urls) {
        if (! tubeshift_module_is_platform_name(platform_name)) {
            throw "invalid platform name: '" + platform_name + "'";
        }

        if (platform_watch_patterns[platform_name] != undefined) {
            throw "platform watch urls already registered for platform: " + platform_name;
        }

        platform_watch_patterns[platform_name] = urls;
    }

    function tubeshift_module_get_watch_patterns(platform_name) {
        return platform_watch_patterns[platform_name];
    }
}

{
    let tubeshift_platform_handlers = [];

    function tubeshift_module_get_platform_handler(platform_name) {
        for (const i in tubeshift_platform_handlers) {
            let platform = tubeshift_platform_handlers[i];

            if (platform.name == platform_name) {
                return platform.handler;
            }
        }

        return undefined;
    }

    function tubeshift_module_set_platform_handler(platform_name, callback) {
        if (! tubeshift_module_is_platform_name(platform_name)) {
            throw "Attempt to register platform handler for unknown platform name: '" + platform_name + "'";
        }

        if (tubeshift_module_get_platform_handler(platform_name)) {
            throw "there is already a platform handler set for platform_name:'" + platform_name + "'";
        }

        tubeshift_platform_handlers.push({
            name: platform_name,
            handler: callback
        });

        return;
    }

    function tubeshift_module_call_platform_handlers(tab_id, url) {
        for(const i in tubeshift_platform_handlers) {
            let platform = tubeshift_platform_handlers[i];
            var returned;

            returned = platform.handler(tab_id, url);

            if (returned != undefined) {
                return returned;
            }
        }

        return undefined;
    }
}
