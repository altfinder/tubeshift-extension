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

function TubeShiftResult(response_in) {

    function _error_result(message) {
        return { status: "error", message: "message" };
    }

    function _make_result(api_response) {
        const response = api_response.response;
        const json = api_response.json;

        if (response == undefined || ! response.ok) {
            return _error_result("Network request failed");
        }

        if (json == undefined) {
            return _error_result("Invalid or missing JSON in response");
        }

        if (! "status" in json) {
            return _error_result("result was missing status");
        }

        if (json.status == "error" || json.status == "unknown") {
            let return_val = { status: json.status };

            if ("message" in json) {
                return_val.message = json.message;
            }

            return return_val;
        }

        if (json.status != "known") {
            return _error_result("unknown status in response");
        }

        if (! "data" in json) {
            return _error_result("known response was missing data");
        }

        return { status: json.status, data: json.data };
    }

    this.known = function () {
        return this.status == "known";
    };

    this.error = function() {
        return this.status == "error";
    }

    const request_result = _make_result(response_in);
    this.status = request_result.status;

    if ("message" in request_result) {
        this.message = request_result.message;
    }

    if (this.status == "known" && ! "data" in request_result) {
        this.status = "error";
        this.message = "known response was missing data";
    } else {
        this.data = request_result.data;
    }

    return;
}

function _validate_value(value) {
    if (value == undefined) {
        throw "value was not defined";
    }

    return value;
}

function TubeShiftLocation(api, data) {
    const name = _validate_value(data.platform_name);
    const id = _validate_value(data.platform_id);
    const display = _validate_value(data.platform_display);
    const watch = _validate_value(data.url);

    this.get_name = function() {
        return name;
    }

    this.get_id = function() {
        return id;
    }

    this.get_display = function() {
        return display;
    }

    this.get_watch = function() {
        return watch;
    }

    this.meta = function() {
        return new Promise((resolve, error) => {
            api.get_meta({ platform_name: this.name, platform_id: this.id })
                .then(resolve)
                .catch(error);
        });
    }
}

function TubeShiftVideo(api, result_in) {
    var cached_locations;

    this.api_result = result_in;

    this.status = function() {
        return this.api_result.status;
    }

    this.known = function() {
        return this.api_result.known();
    }

    this.error = function() {
        return this.api_result.error();
    }

    this.message = function() {
        return this.api_result.message;
    }

    this.get_id = function() {
        if (! this.known()) {
            return undefined;
        }

        return this.api_result.data.content_id;
    }


    this.remove_platform = function(platform_name) {
        // make sure cached_locations is defined
        this.get_locations();

        var new_locations = [];

        for(i of cached_locations) {
            if (i.get_name() != platform_name) {
                new_locations.push(i);
            }
        }

        cached_locations = new_locations;

        return;
    }

    function _make_locations(api, locations) {
        var location_objects = [];

        for(i of locations) {
            location_objects.push(new TubeShiftLocation(api, i));
        }

        return location_objects;
    }

    this.get_locations = function() {
        if (! this.known()) {
            return undefined;
        }

        if (cached_locations != undefined) {
            return cached_locations;
        }

        var migration_locations = this.api_result.data.content;
        migration_locations.locations = migration_locations.content;
        delete migration_locations.content;
        cached_locations = _make_locations(api, migration_locations);

        return cached_locations;
    }

    return;
}

function TubeShiftMeta(api, result_in) {
    this.api_result = result_in;

    this.status = function() {
        return this.api_result.status;
    }

    this.known = function() {
        return this.api_result.known();
    }

    this.error = function() {
        return this.api_result.error();
    }

    this.message = function() {
        return this.api_result.message;
    }

    this.get_title = function() {
        if (! this.known()) {
            return undefined;
        }

        return this.api_result.data.title;
    }

    this.get_thumbnail = function () {
        if (! this.known()) {
            return undefined;
        }

        return this.api_result.data.thumbnail;
    }

    return;
}

function TubeShiftAPI(user_config) {
    const config_defaults = {
        hostname: 'api.tubeshift.info',
    };

    function _make_config(config) {
        var result = {};

        for(key in config_defaults) {
            if (config != undefined && key in config) {
                result[key] = config[key];
            } else if (key in config_defaults) {
                result[key] = config_defaults[key];
            }
        }

        return result;
    }

    this.config = _make_config(user_config);

    this._request = function(path, request_config) {
        const url = "https://" + this.config.hostname + path;
        let result = { };

        return new Promise((resolve, error) => {
            fetch(url, request_config)
                .then(response => {
                    result.response = response;
                    response.json()
                        .then(decoded => {
                            result.json = decoded;
                            resolve(new TubeShiftResult(result)); })
                        .catch(error); })
                .catch(error);
        });
    }

    function _make_video_by_id_path(video_id) {
        return "/content/" + encodeURIComponent(video_id);
    }

    function _make_video_by_platform_path(platform_name, platform_id) {
        let buffer = "/video/" + encodeURIComponent(platform_name);
        buffer += "/" + encodeURIComponent(platform_id);
        return buffer;
    }

    this.get_video = function (lookup_spec) {
        let request_path;

        if ("video_id" in lookup_spec) {
            request_path = _make_video_by_id_path(lookup_spec.video_id);
        } else if ("platform_id" in lookup_spec && "platform_name" in lookup_spec) {
            request_path = _make_video_by_platform_path(lookup_spec.platform_name, lookup_spec.platform_id);
        } else {
            throw "Invalid video lookup spec";
        }

        return new Promise((resolve, error) => {
            this._request(request_path)
                .then(response => {
                    resolve(new TubeShiftVideo(this, response));
                }).catch(error);
        });
    }

    this.get_alternates = function(lookup_spec) {
        return new Promise((resolve, error) => {
            if (! "platform_name" in lookup_spec || ! "platform_id" in lookup_spec) {
                error("invalid lookup_spec");
                return;
            }

            this.get_video(lookup_spec).then(video => {
                video.remove_platform(lookup_spec.platform_name);
                resolve(video);
            });
        });
    }

    function _make_meta_by_platform_path(platform_name, platform_id) {
        let buffer = "/card/" + encodeURIComponent(platform_name);
        buffer += '/' + encodeURIComponent(platform_id);
        return buffer;
    }

    this.get_meta = function (lookup_spec) {
        if (! "platform_id" in lookup_spec || ! "platform_name" in lookup_spec) {
            throw "Invalid video lookup spec";
        }

        const request_path = _make_meta_by_platform_path(lookup_spec.platform_name, lookup_spec.platform_id);

        return new Promise((resolve, error) => {
            this._request(request_path)
                .then(response => {
                    resolve(new TubeShiftMeta(this, response));
                }).catch(error);
        });
    }

    return;
}

{
    let api_singleton;
    let global_config;

    var tubeshift_api_set_config = function(config) {
        if (global_config != undefined) {
            throw "TubeShift API global configuration is already set";
        }

        if (config == undefined) {
            config = { };
        }

        global_config = config;
    }

    function tubeshift_api__get_singleton() {
        if (api_singleton == undefined) {
            if (global_config == undefined) {
                tubeshift_api_set_config();
            }

            api_singleton = new TubeShiftAPI(global_config);
        }

        return api_singleton;
    }

    var tubeshift_api_get_video = function(lookup_spec) {
        return tubeshift_api__get_singleton().get_video(lookup_spec);
    }

    var tubeshift_api_get_alternates = function(lookup_spec) {
        return tubeshift_api__get_singleton().get_alternates(lookup_spec);
    }

    var tubeshift_api_get_meta = function(lookup_spec) {
        return tubeshift_api__get_singleton().get_meta(lookup_spec);
    }
}
