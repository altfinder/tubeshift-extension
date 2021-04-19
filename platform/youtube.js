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

const tubeshift_platform_youtube_name = "youtube";
const tubeshift_platform_youtube_watch_url = new URL("https://www.youtube.com/watch");

function tubeshift_platform_youtube_watch_patterns() {
    return [ tubeshift_platform_youtube_watch_url.href ];
}

function tubeshift_platform_youtube_get_video_id(url) {
    if (url.hostname != tubeshift_platform_youtube_watch_url.hostname) {
        return undefined;
    }

    if (url.pathname != tubeshift_platform_youtube_watch_url.pathname) {
        return undefined;
    }

    return url.searchParams.get('v');
}

function tubeshift_platform_youtube_navigation_handler(tab_id, url) {
    const platform_id = tubeshift_platform_youtube_get_video_id(url);

    if (platform_id == undefined) {
        return undefined;
    }

    return {
        platform_name: tubeshift_platform_youtube_name,
        platform_id: tubeshift_platform_youtube_get_video_id(url)
    };
}

tubeshift_module_add_platform_name(tubeshift_platform_youtube_name);
tubeshift_module_set_watch_patterns(tubeshift_platform_youtube_name, tubeshift_platform_youtube_watch_patterns());
tubeshift_module_set_platform_handler(tubeshift_platform_youtube_name, tubeshift_platform_youtube_navigation_handler);
