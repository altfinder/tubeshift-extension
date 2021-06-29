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

const tubeshift_platform_dailymotion_name = "dailymotion";

tubeshift_module_add_platform_name(tubeshift_platform_dailymotion_name);

tubeshift_module_set_platform_handler(tubeshift_platform_dailymotion_name, (tab_id, url) => {
    if (url.hostname != 'www.dailymotion.com') {
        return undefined;
    }

    matched = url.pathname.match(/^\/video\/([0-9a-z]{6,7})/);

    if (matched == undefined || matched.length < 2) {
        return undefined;
    }

    return {
        platform_name: tubeshift_platform_dailymotion_name,
        platform_id: matched[1],
    };
});
