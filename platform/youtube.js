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

console.log("Loading YouTube platform support");

{
    const tubeshift_platform_youtube_urls = {
        "www.youtube.com": 1
    };

    function tubeshift_platform_youtube_known_url(url) {
        return tubeshift_platform_youtube_urls[url.hostname];
    }
}

function tubeshift_platform_youtube_get_video_id(url) {
    if (url.pathname != '/watch') {
        return undefined;
    }

    return url.searchParams.get('v');
}

function tubeshift_platform_youtube_handle_watch_page(tab_id, video_id) {
    tubeshift_set_tab_info_platform_name(tab_id, "youtube");

    tubeshift_fetch_platform_info("youtube", video_id).then(info => {
        if (info == undefined) {
            return;
        }

        if (info.content_id == undefined) {
            return;
        }

        tubeshift_content_id_ready(tab_id, info.content_id);
    });
}

function tubeshift_platform_youtube_navigation_handler(tab_id, url) {

    if (! tubeshift_platform_youtube_known_url(url)) {
        return false;
    }

    let video_id = tubeshift_platform_youtube_get_video_id(url);

    if (video_id != undefined) {
        tubeshift_platform_youtube_handle_watch_page(tab_id, video_id);
        return true;
    }

    return false;
}

tubeshift_set_platform_handler("youtube", tubeshift_platform_youtube_navigation_handler);
