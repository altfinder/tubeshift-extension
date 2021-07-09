// TubeShift is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// TubeShift is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

/*

TubeShiftAPI

Properties

    config - API client configuration

Async Methods

    fetchAlternates(platformName, platformId) - Fetch a TubeShiftVideo object then remove the location entry for the lookup from the results.
    fetchCard(platformName, platformId) - Fetch a TubeShiftCard object
    fetch(apiPath) - Perform a GET request on the API web service
    fetchLocation(platformName, platformId) - Fetch a TubeShiftLocation object
    fetchStats() - Fetch a TubeShiftStats object
    fetchStatus() - Fetch a TubeShiftStatus object
    fetchVideo(lookupSpec) - Fetch a TubeShiftVideo object using a dictionary
    fetchVideoById(videoId) - Fetch a TubeShiftVideo object using a TubeShift video id
    fetchVideoByPlatform(platformName, platformId) - Fetch a TubeShiftVideo object using a location

TubeShiftLocation

Properties

    platformDisplay - The name of the platform that should be shown to the user
    platformName - The name of the platform in the TubeShift API
    platformId - The id for the video at the platform
    watch - url to a page on the platform to watch the video with a normal user experience
    embed - url to the video on the platform that is suitable for putting into an iframe

Async Methods

    fetchCard() - Fetch a TubeShiftCard object for this location

TubeShiftVideo

Properties

    videoId - tubeshift video id
    channelId - tubeshift channel id
    locations - list of TubeShiftLocation objects

Methods

    removePlatform(platformName) - remove all instances of a platfrom from the locations
    removeLocation(platformName, platformId) - remove a specific location from the list of locations

TubeShiftCard

Properties

    title - Title of the video hosted at the platform
    thumbnail - URL to a thumbnail image hosted at the video platform

TubeShiftResponse

Properties

    status - The status of the result: error, known, unknown
    message - An optional human readable message about the request
    data - The data associated with the response. Always present if the status is known. Never present if status is unknown.

Methods

    ok() - Returns true if the request was successful and false otherwise
    error() - Returns true if the request could not be completed and false otherwise
*/

function TubeShiftAPI() {
    this._init = function() {
        this.config = {
            hostname: 'api.tubeshift.info',
            version: 1,
            requestTimeout: 5000,
        };

        return;
    }

    this.fetch = function (apiPath) {
        if (apiPath == undefined) {
            throw "apiPath is a required argument";
        }

        const apiUrl = "https://" + this.config.hostname + '/' + this.config.version + '/' + apiPath;
        let timeout = undefined;
        let didTimeout = false;
        let cancel = undefined;
        let config = {
            requestTimeout: 2000,
        };

        if (config.requestTimeout > 0) {
            try {
                cancel = new AbortController();
                config.signal = cancel.signal;
            } catch (error) { }

            timeout = setTimeout(() => {
                didTimeout = true;

                if (cancel != undefined) {
                    cancel.abort();
                }
            }, config.requestTimeout);
        }

        return new Promise((resolve, reject) => {
            fetch(apiUrl, config)
                .then(response => {
                    if (didTimeout) {
                        return;
                    }

                    if (! response.ok) {
                        throw "HTTP response was not ok";
                    }
                    return response.json();
                }).then(json => {
                    resolve(new TubeShiftAPIResponse(json));
                }).catch(reject)
                .finally(() => {
                    if (! didTimeout) {
                        clearTimeout(timeout);
                    }
                });
        });
    }

    this.fetchAlternates = function(platformName, platformId) {
        return new Promise((resolve, reject) => {
            _TubeShiftAPIGetSingleton().fetchVideoByPlatform(platformName, platformId)
                .then(video => {
                    video.removeLocation(platformName, platformId);
                    resolve(video);
                }).catch(reject);
        });
    }

    this.fetchCard = function(platformName, platformId) {
        return new Promise((resolve, reject) => {
            this.fetch('card/' + encodeURIComponent(platformName) + '/' + platformId)
                .then(result => resolve(new TubeShiftCard(result.data)))
                .catch(reject);
            });
    }

    this.fetchStats = function() {
        return new Promise((resolve, reject) => {
            this.fetch('system/stats')
                    .then(result => { resolve(new TubeShiftStats(result.data)); })
                    .catch(reject)
            });
        }

    this.fetchStatus = function() {
        return new Promise((resolve, reject) => {
            this.fetch('system/status')
                .then(result => resolve(new TubeShiftStatus(result.data)))
                .catch(reject);
            });
    }

    this.fetchVideo = function(lookupSpec) {
        if (lookupSpec.videoId != undefined && lookupSpec.platformId != undefined) {
            throw "only one of videoId or platformId can be specified";
        }

        if (lookupSpec.videoId == undefined && lookupSpec.platformId == undefined) {
            throw "must specify one of videoId or platformId"
        }

        if (lookupSpec.platformId == undefined && lookupSpec.platformName == undefined) {
            throw "platformName is required when a platformId is specified";
        }

        let path;

        if (lookupSpec.videoId != undefined) {
            path = 'video/' + encodeURIComponent(lookupSpec.videoId);
        } else {
            path = 'video/' + encodeURIComponent(lookupSpec.platformName) + '/' + lookupSpec.platformId;
        }

        return new Promise((resolve, reject) => {
            this.fetch(path)
                .then(result => resolve(new TubeShiftVideo(result.data)))
                .catch(reject);
        });
    }

    this.fetchVideoById = function(videoId) {
        return this.fetchVideo({ videoId });
    }

    this.fetchVideoByPlatform = function(platformName, platformId) {
        return this.fetchVideo({ platformName, platformId });
    }

    this._init();

    return;
}

function TubeShiftAPIResponse(apiResponse) {
    if (! apiResponse) throw "apiResponse is a required argument";

    this._init = function () {
        if (apiResponse == undefined) {
            this._errorResponse("CLIENT Response from server was missing JSON");
            return;
        }

        const responseStatus = apiResponse.status;

        if (responseStatus == undefined) {
            this._error_response("CLIENT Response from server had no status");
            return;
        } else if (responseStatus == 'known' && ! apiResponse.data == undefined) {
            this._error_response("CLIENT Response from server was missing data");
            return;
        }

        for (property_name of [ "status", "message",  "data" ]) {
            this[property_name] = apiResponse[property_name];
        }

        return;
    }

    this._init();

    return;
}

function TubeShiftStats(apiData) {
    if (apiData == undefined) {
        this.known = false;
        return;
    }

    this.known = true;
    this.channels = apiData.channels;
    this.locations = apiData.locations;
    this.videos = apiData.videos;

    return;
}

function TubeShiftStatus(apiData) {
    if (apiData == undefined) {
        this.known = false;
        return;
    }

    this.known = true;
    this.announcement = apiData.announcement;
    this.statistics = new TubeShiftStats(apiData.statistics);

    return;
}

function TubeShiftLocation(apiData) {
    if (apiData == undefined) {
        this.known = false;
        return;
    }

    this.known = true;

    for(property of ["platformName", "platformId", "platformDisplay", "watch", "embed" ]) {
        this[property] = apiData[property];
    }

    return;
}

function TubeShiftVideo(apiData) {
    if (apiData == undefined) {
        this.known = false;
        return;
    }

    this.known = true;

    this.videoId = apiData.video_id;
    this.channelId = apiData.channel_id;
    this.locations = apiData.locations.map(locationData => {
        return new TubeShiftLocation({
            platformDisplay: locationData.platform_display,
            platformName: locationData.platform_name,
            platformId: locationData.platform_id,
            watch: locationData.platform_watch,
        });
    });

    this.removePlatform = function(platformName) {
        newLocations = this.locations.filter(location => location.platformName != platformName);
        this.locations = newLocations;
    }

    this.removeLocation = function(platformName, platformId) {
        newLocations = this.locations.filter(location => {
            if (location.platformName == platformName && location.platformId == platformId) {
                return false;
            }

            return true;
        });

        this.locations = newLocations
    }

    return;
}

function TubeShiftCard(apiData) {
    if (apiData == undefined) {
        this.known = false;
        return;
    }

    this.known = true;

    for (property of ["title", "thumbnail"]) {
        this[property] = apiData[property];
    }

    return;
}

{
    let apiSingleton;

    function _TubeShiftAPIGetSingleton() {
        if (apiSingleton == undefined) {
            // if (global_config == undefined) {
            //     tubeshift_api_set_config();
            // }

            apiSingleton = new TubeShiftAPI();
        }

        return apiSingleton;
    }

    var TubeShiftAPIFetch = function(apiPath) {
        return _TubeShiftAPIGetSingleton().fetch(apiPath);
    }

    var TubeShiftAPIFetchAlternates = function(platformName, platformId) {
        return _TubeShiftAPIGetSingleton().fetchAlternates(platformName, platformId);
    }

    var TubeShiftAPIFetchCard = function(platformName, platformId) {
        return _TubeShiftAPIGetSingleton().fetchCard(platformName, platformId);
    }

    var TubeShiftAPIFetchStatus = function() {
        return _TubeShiftAPIGetSingleton().fetchStatus();
    }

    var TubeShiftAPIFetchStats = function() {
        return _TubeShiftAPIGetSingleton().fetchStats();
    }

    var TubeShiftAPIFetchVideoById = function(videoId) {
        return _TubeShiftAPIGetSingleton().fetchVideoById(videoId);
    }

    var TubeShiftAPIFetchVideoByPlatform = function(platformName, platformId) {
        return _TubeShiftAPIGetSingleton().fetchVideoByPlatform(platformName, platformId);
    }
}
