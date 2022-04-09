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

    platformName - The name of the platform in the TubeShift API
    platformId - The id for the video at the platform
    display - The name of the platform that should be shown to the user
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

{
    let apiSingleton;
    let globalConfig;

    var TubeShiftAPISetConfig = function(newConfig_in) {
        if (globalConfig != undefined) {
            throw "TubeShift API global configuration has already been set";
        }

        if (newConfig_in == undefined) {
            globalConfig = { };
        } else {
            globalConfig = newConfig_in;
        }
    };

    function _TubeShiftAPIGetSingleton() {
        if (apiSingleton == undefined) {
            if (globalConfig == undefined) {
                TubeShiftAPISetConfig();
            }

            apiSingleton = new TubeShiftAPI(globalConfig);
        }

        return apiSingleton;
    }

    var TubeShiftAPIDiscover = function(platformName, platformId) {
        return _TubeShiftAPIGetSingleton().discover(platformName, platformId);
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

    var TubeShiftAPIFetchLocation = function(platformName, platformId) {
        return _TubeShiftAPIGetSingleton().fetchLocation(platformName, platformId);
    }

    var TubeShiftAPIFetchStatus = function() {
        return _TubeShiftAPIGetSingleton().fetchStatus();
    }

    var TubeShiftAPIFetchStats = function() {
        return _TubeShiftAPIGetSingleton().fetchStats();
    }

    var TubeShiftAPIFetchVideo = function(lookupSpec) {
        return _TubeShiftAPIGetSingleton().fetchVideo(lookupSpec);
    }

    var TubeShiftAPIFetchVideoById = function(videoId) {
        return _TubeShiftAPIGetSingleton().fetchVideoById(videoId);
    }

    var TubeShiftAPIFetchVideoByPlatform = function(platformName, platformId) {
        return _TubeShiftAPIGetSingleton().fetchVideoByPlatform(platformName, platformId);
    }
}

function TubeShiftAPI(newConfig_in) {
    let fallbackLocationConstructors = {
        bitchute: _TubeShiftMakeBitChuteLocation,
        odysee: _TubeShiftMakeOdyseeLocation,
        youtube: _TubeShiftMakeYouTubeLocation,
    };

    this._init = function() {
        newConfig = {
            hostName: 'api.tubeshift.info',
            version: 1,
            requestTimeout: 10000,
            enableFallback: true,
            enableBitChute: false,
            enableOdysee: false,
            enableTubeShift: false,
            enableYouTube: false,
        };

        if (newConfig_in != undefined) {
            for (var name in newConfig_in) {
                newConfig[name] = newConfig_in[name];
            }
        }

        this.config = newConfig;
        this.http = new TubeShiftFetch({ requestTimeout: newConfig.requestTimeout });

        return;
    }

    this.fetch = function (apiPath, requestConfig) {
        if (! this.config.enableTubeShift) {
            throw "TubeShift API is not enabled";
        }

        if (apiPath == undefined) {
            throw "apiPath is a required argument";
        }

        const apiUrl = "https://" + this.config.hostName + '/' + this.config.version + '/' + apiPath;

        return new Promise((resolve, reject) => {
            this.http.fetch(apiUrl, requestConfig)
                .then(response => { return response.json(); })
                .then(json => { resolve(new TubeShiftAPIResponse(json)) })
                .catch(reject);
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

    this.fetchLocation = function(platformName, platformId) {
        return new Promise((resolve, reject) => {
            this.fetch('location/' + encodeURIComponent(platformName) + '/' + platformId)
                .then(result => resolve(new TubeShiftLocation(result.data)))
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
                .then(result => {
                    if (result.data == undefined) {
                        resolve(undefined);
                    }

                    resolve(new TubeShiftVideo(result.data, true));
                })
                .catch(reject);
        });
    }

    this.fetchVideoById = function(videoId) {
        return this.fetchVideo({ videoId });
    }

    this.fetchVideoByPlatform = function(platformName, platformId) {
        return this.fetchVideo({ platformName, platformId });
    }

    this._makeFallbackVideo = function(info) {
        if (! this.config.enableFallback) {
            throw "enableFallback is not true";
        }

        if (info.platformName == undefined || info.platformId == undefined) {
            throw "Can only make a fallback video if platformName and platformId are known";
        }

        let constructor = fallbackLocationConstructors[info.platformName];

        if (constructor == undefined) {
            throw "No fallback video constructor for platformName:" + info.platformName;
        }

        newLocation = constructor(info.platformId);
        newVideo = new TubeShiftVideo({ locations: [ newLocation ] });

        return newVideo;
    }

    this.discover = function(platformName, platformId) {
        return new Promise((resolve, reject) => {
            this.fetchVideoByPlatform(platformName, platformId).then(video => {
                resolve(video);
            }).catch(error => {
                this._discover(platformName, platformId).then(video => {
                    resolve(video);
                }).catch(reject);
            })
        });
    }

    this._discover = function(platformName, platformId) {
        return new Promise((resolve, reject) => {
            if (platformName != "youtube") {
                throw "discovery is only available for YouTube videos";
            }

            discoveryPromises = [];
            const toDiscover = {
                enableBitChute: () => { return this._discoverBitchute(platformId) },
                enableOdysee: () => { return this._discoverOdysee(platformId) },
                enableYouTube: () => { return this._discoverYouTube(platformId) },
            };

            for(configName in toDiscover) {
                try {
                    if (this.config[configName]) {
                        discoveryPromises.push(toDiscover[configName]());
                    }
                } catch (error) {
                    console.error("got error from discovery function", error);
                }
            }

            Promise.all(discoveryPromises)
                .then(locations => {
                    goodLocations = locations.filter(loc => loc != undefined);

                    if (goodLocations.length == 0) {
                        if (this.config.enableFallback) {
                            return;
                        }

                        resolve(undefined);
                    } else {
                        newVideo = new TubeShiftVideo({ locations: goodLocations });
                        resolve(newVideo);
                    }
                })
                .then(() => resolve(this._makeFallbackVideo({ platformName, platformId })))
                .catch(reject);
        });
    }

    // BitChute ids are 13 characters long, a youtube id is max 11 characters,
    // and when BitChute imports a video from YouTube it uses the YouTube id.
    // If the YouTube video id exists inside BitChute it's considered to be a
    // perfect clone
    this._discoverBitchute = function(platformId) {
        if (! this.config.enableBitChute) {
            throw "BitChute API is not enabled";
        }

        return new Promise((resolve, reject) => {
            const oembedUrl = "https://www.bitchute.com/oembed/?format=json&url=https://www.bitchute.com/video/" + encodeURIComponent(platformId) + "/";
            this.http.fetch(oembedUrl, { method: "get" })
                .then(response => {
                    if (! response.ok) {
                        resolve(undefined);
                    }

                    return response.json();
                })
                .then(json => {
                    if (json.html == undefined) {
                        throw "expected oembed html";
                    }

                    resolve(_TubeShiftMakeBitChuteLocation(platformId));
                })
                .catch(error => {
                    if (error != "HTTP response was not ok") {
                        console.error("Got unknown error during BitChute discovery:", error);
                    }
                    resolve(undefined)
                });
        });
    }

    // https://api.lbry.com/yt/resolve?video_ids=8onqBc5iTB4
    this._discoverOdysee = function(platformId) {
        if (! this.config.enableOdysee) {
            throw "Odysee API is not enabled";
        }

        return new Promise((resolve, reject) => {
            const lookupUrl = "https://api.lbry.com/yt/resolve?video_ids=" + encodeURIComponent(platformId);

            this.http.fetch(lookupUrl, { method: "get" })
                .then(response => {
                    if (! response.ok) {
                        resolve(undefined);
                    }

                    return response.json();
                })
                .then(json => {
                    if (json.data == undefined) {
                        resolve(undefined);
                    } else if (json.data.videos == undefined) {
                        resolve(undefined);
                    } else if (json.data.videos[platformId] == undefined) {
                        resolve(undefined);
                    } else {
                        odyseeUrl = json.data.videos[platformId].replaceAll("#", ":");
                        resolve(_TubeShiftMakeOdyseeLocation(undefined, "https://www.odysee.com/" + odyseeUrl));
                    }
                })
                .catch(error => {
                    console.error("Got error during Odysee discovery:", error);
                    resolve(undefined)
                });
        });
    }

    this._discoverYouTube = function(platformId) {
        if (! this.config.enableYouTube) {
            throw "YouTube API is not enabled";
        }

        return new Promise((resolve, reject) => {
            const oembedUrl = "https://www.youtube.com/oembed/?format=json&url=https://www.youtube.com/watch?v=" + encodeURIComponent(platformId);
            this.http.fetch(oembedUrl, { method: "get" })
                .then(response => {
                    if (! response.ok) {
                        resolve(undefined);
                    }

                    return response.json();
                })
                .then(json => {
                    if (json.html == undefined) {
                        throw "expected oembed html";
                    }

                    resolve(_TubeShiftMakeYouTubeLocation(platformId));
                })
                .catch(error => {
                    console.error("Got error during YouTube discovery:", error);
                    resolve(undefined)
                });
        });
    }

    this._init();

    return;
}

function TubeShiftFetch(_requestConfig) {
    this._init = function() {
        let requestConfig = {};

        Object.assign(requestConfig, _requestConfig);

        if (requestConfig.requestTimeout == undefined) {
            requestConfig.requestTimeout = 0;
        }

        this.requestConfig = requestConfig;
    }

    this.fetch = function(url, config) {
        let timeout = undefined;
        let didTimeout = false;
        let cancel = undefined;
        let requestConfig = Object.assign({ }, this.requestConfig);

        if (config != undefined) {
            for (const name in config) {
                requestConfig[name] = config[name];
            }
        }

        if (requestConfig.requestTimeout > 0) {
            try {
                cancel = new AbortController();
                requestConfig.signal = cancel.signal;
            } catch (error) { }

            timeout = setTimeout(() => {
                didTimeout = true;

                if (cancel != undefined) {
                    cancel.abort();
                }
            }, requestConfig.requestTimeout);
        }

        delete requestConfig.requestTimeout;

        return new Promise((resolve, reject) => {
            fetch(url, requestConfig)
                .then(response => {
                    if (didTimeout) throw "HTTP request timed out";
                    if (! response.ok) throw "HTTP response was not ok";
                    resolve(response);
                }).catch(reject)
                .finally(() => {
                    if (! didTimeout) {
                        clearTimeout(timeout);
                    }
                });
        });
    }

    this._init();
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
    this.channels = apiData.channels;
    this.locations = apiData.locations;
    this.videos = apiData.videos;

    return;
}

function TubeShiftStatus(apiData) {
    this.announcement = apiData.announcement;
    this.statistics = new TubeShiftStats(apiData.statistics);

    return;
}

function TubeShiftLocation(apiData) {
    this.display = apiData.platform_display;
    this.embed = apiData.platform_embed;
    this.platformId = apiData.platform_id;
    this.platformName = apiData.platform_name;
    this.watch = apiData.platform_watch;

    return;
}

function TubeShiftVideo(apiData, isKnown) {
    if (isKnown) {
        this.known = true;
    } else {
        this.known = false;
    }

    this.videoId = apiData.video_id;
    this.channelId = apiData.channel_id;
    this.locations = apiData.locations.map(locationData => {
        return new TubeShiftLocation({
            platform_display: locationData.platform_display,
            platform_name: locationData.platform_name,
            platform_id: locationData.platform_id,
            platform_watch: locationData.platform_watch,
            platform_embed: locationData.platform_embed,
        });
    });

    this.removePlatform = function(platformName) {
        newLocations = this.locations.filter(loc => loc.platformName != platformName);
        this.locations = newLocations;
    }

    this.removeLocation = function(platformName, platformId) {
        newLocations = this.locations.filter(loc => {
            if (loc.platformName == platformName && loc.platformId == platformId) {
                return false;
            }

            return true;
        });

        this.locations = newLocations
    }

    return;
}

function _TubeShiftMakeYouTubeLocation(platformId_in) {
    if (! new RegExp("^[0-9A-Za-z_-]{6,11}$").test(platformId_in)) {
        throw "Invalid YouTube id: '" + platformId_in + "'";
    }

    return {
            platform_display: "YouTube",
            platform_name: "youtube",
            platform_id: platformId_in,
            platform_embed: "https://www.youtube.com/embed/" + encodeURIComponent(platformId_in),
            platform_watch: "https://youtu.be/" + encodeURIComponent(platformId_in),
    };
}

function _TubeShiftMakeBitChuteLocation(platformId_in) {
    if (! new RegExp("^[0-9A-Za-z_-]{6,13}$").test(platformId_in)) {
        throw "Invalid BitChute id: '" + platformId_in + "'";
    }

    return {
            platform_display: "BitChute",
            platform_name: "bitchute",
            platform_id: platformId_in,
            platform_embed: "https://bitchute.com/embed/" + encodeURIComponent(platformId_in) + "/",
            platform_watch: "https://bitchute.com/video/" + encodeURIComponent(platformId_in) + "/",
    };
}

function _TubeShiftMakeOdyseeLocation(claimId_in, platformWatch_in) {
    if (claimId_in != undefined && ! new RegExp("^[0-9a-f]{40}$").test(claimId_in)) {
        throw "Invalid Odysee claim: '" + claimId_in + "'";
    }

    return {
            platform_display: "Odysee",
            platform_name: "odysee",
            platform_id: claimId_in,
            platform_embed: "https://odysee.com/$/embed/_/" + encodeURIComponent(claimId_in),
            platform_watch: platformWatch_in,
    };
}

function TubeShiftCard(apiData) {
    if (apiData == undefined) {
        this.known = false;
        return;
    }

    for (property of ["title", "thumbnail"]) {
        this[property] = apiData[property];
    }

    return;
}

function TubeShiftEmbed(config) {
    this.init = async function() {
        this._validateConfig();

        if (config.platformName != undefined) {
            this.platformName = config.platformName;
            this.platformId = config.platformId;
        } else if (config.videoId != undefined) {
            this.videoId = config.videoId;
        } else {
            throw "expected a platformName/platformId or videoId";
        }

        this.tubeshift = new TubeShiftAPI({
            enableFallback: true,
        });

        if (config.platformId != undefined) {
            video = await this.tubeshift.discover(this.platformName, this.platformId);
        } else {
            video = await this.tubeshift.fetchVideoById(this.videoId);
        }

        video.locations = video.locations.filter(loc => loc.embed != undefined);

        this.currentLocationNum = 0;
        this.video = video;

        return this;
    }

    this._validateConfig = function() {
        if (config.platformName != undefined && config.videoId != undefined) {
            throw "only one of platformName/platformId or videoId can be provided";
        }

        if (config.platformName != undefined && config.platformId == undefined) {
            throw "if platformName is defined then platformId must also be defined";
        }

        return;
    }

    this.setLocationNum = function(locationNum) {
        if (locationNum < 0 || locationNum > this.video.locations.length -1) {
            throw "Invalid location number: " + locationNum;
        }

        this.currentLocationNum = locationNum;
        return this.current();
    }

    this.current = function() {
        return this.video.locations[this.currentLocationNum];
    }

    this.next = function() {
        nextNum = this.currentLocationNum + 1;

        if (nextNum > this.video.locations.length - 1) {
            nextNum = 0;
        }

        this.currentLocationNum = nextNum;
        return this.current();
    }

    this.prev = function() {
        prevNum = this.currentLocationNum - 1;

        if (prevNum < 0) {
            prevNum = this.video.locations.length - 1;
        }

        this.currentLocationNum = prevNum;
        return this.current();
    }
}
