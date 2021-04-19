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

const tubeshift_platform_bitchute_name = "bitchute";
const tubeshift_platform_bitchute_patterns = [ "https://www.bitchute.com/video/*/" ];
const tubeshift_platform_bitchute_hostname = "www.bitchute.com";

function tubeshift_platform_bitchute_watch_patterns() {
    return tubeshift_platform_bitchute_patterns;
}

function tubeshift_platform_bitchute_get_video_id(url) {
    if (url.hostname != tubeshift_platform_bitchute_hostname) {
        return undefined;
    }

    const parts = url.pathname.split('/');

    if (parts.length <= 3) {
        return undefined;
    } else if (parts[0] != '') {
        return undefined;
    } else if (parts[1] != "video") {
        return undefined;
    } else if (parts[2] == '') {
        return undefined;
    }

    return parts[2];
}

function tubeshift_platform_bitchute_navigation_handler(tab_id, url) {
    const platform_id = tubeshift_platform_bitchute_get_video_id(url);

    if (! platform_id) {
        return undefined;
    }

    return {
        platform_name: tubeshift_platform_bitchute_name,
        platform_id: platform_id,
    };
}

tubeshift_module_add_platform_name(tubeshift_platform_bitchute_name);
tubeshift_module_set_watch_patterns(tubeshift_platform_bitchute_name, tubeshift_platform_bitchute_watch_patterns());
tubeshift_module_set_platform_handler(tubeshift_platform_bitchute_name, tubeshift_platform_bitchute_navigation_handler);
