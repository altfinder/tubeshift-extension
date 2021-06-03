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

const keycode_esc = 27;

function TubeShiftTimeout(duration_in, callback_in) {
    if (callback_in == undefined) {
        throw "must specify a callback";
    }

    if (duration_in == undefined) {
        throw "must specify a timeout in seconds";
    }

    const callback = callback_in;
    this.duration = duration_in;
    this.timeout = undefined;
    this.started = undefined;
    this.paused = false;

    function _get_time() {
        return new Date().getTime();
    }

    this.start = function () {
        if (this.timeout != undefined) {
            throw "can't start a TubeShiftTimeout that has already been started";
        }

        const wrapper = function() {
            callback(this);
        };

        this.timeout = setTimeout(wrapper, this.duration);
        this.started = _get_time();

        return this;
    }

    this.stop = function() {
        if (this.timeout != undefined) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
            this.started = undefined;
        }

        return this;
    }

    this.reset = function() {
        this.stop();
        this.duration = duration_in;
        this.start();
    }

    this.pause = function() {
        const now = _get_time();

        // already paused
        if (this.paused) {
            return;
        }

        this.paused = true;

        if (this.timeout == undefined) {
            throw "missing timeout id";
        }

        if (this.started == undefined) {
            throw "missing start time";
        }

        const elapsed = now - this.started;
        this.duration = this.duration - elapsed;
        clearTimeout(this.timeout);
    }

    this.resume = function() {
        if (! this.paused) {
            throw "can't resume a timeout that is not paused";
        }

        this.started = _get_time();
        this.paused = false;
        this.timeout = setTimeout(callback, this.duration);
    }

    this.start();
}

function TubeShiftOverlayButton(config_in) {
    this.show_for = config_in.show_for;
    this.whipe_white = config_in.whipe_white;
    this.img_url = tubeshift_browser_get_asset_url('/icons/tubeshift-overlay.svg');
    this.stop_timer = undefined;
    this.element = undefined;
    this.svg_doc_promise = undefined;

    this._get_white_background = async function () {
        const svg_document = await this.svg_doc_promise;
        return svg_document.querySelector('#white-background');
    }

    this._hover_in = () => {
        if (this.stop_timer == undefined) {
            return;
        }

        this._get_white_background().then((white_background) => {
            this.stop_timer.pause();
            $(white_background).pause();
        });

        return true;
    };

    this._hover_out = () => {
        if (this.stop_timer == undefined) {
            return;
        }

        this._get_white_background().then((white_background) => {
            this.stop_timer.resume();
            $(white_background).resume();
        });

        return true;
    };

    this._close_clicked = (event) => {
        this.stop();
        return false;
    };

    this._make_element = () => {
        const div_e = document.createElement('div');
        const p_e = document.createElement('p');
        const obj_e = document.createElement('object');

        $(div_e).hide();
        $(div_e).css("display", "inline-block");
        $(div_e).css("height", "72px");
        $(div_e).hover(this._hover_in, this._hover_out);

        p_e.textContent = 'X';
        $(p_e).css("color", "black");
        $(p_e).css("font-weight", "bold");
        $(p_e).css("position", "absolute");
        $(p_e).css("left", "5px");
        $(p_e).css("top", "5px");
        $(p_e).css("z-index", 2);
        $(p_e).css('cursor', 'pointer');
        $(p_e).on("click", this._close_clicked);

        // https://www.chromestatus.com/feature/5776623743795200
        // https://bugs.chromium.org/p/chromium/issues/detail?id=79647
        // https://stackoverflow.com/questions/5719715/chrome-getsvgdocument-not-work-how-to-get-svg-document-in-a-html-file-in-chr
        // https://stackoverflow.com/questions/5333878/google-chrome-wont-accept-contentdocument-or-contentwindow
        // https://chrome-allow-file-access-from-file.com/
        //
        console.log("before promise");
        this.svg_doc_promise = new Promise(resolve => {
            console.log("before onload");
            $(obj_e).on("load", (event) => {
                console.log("before resolve", event);
                const svg_doc = obj_e.contentDocument;
                resolve(svg_doc);
                console.log("after resolve", svg_doc);
            });
            console.log("after onload");
        });
        console.log("after promise", this.img_url);

        obj_e.data = this.img_url;
        obj_e.type = "image/svg+xml";
        $(obj_e).css("height", "100%");
        $(obj_e).css("position", "absolute");
        $(obj_e).css("left", "0px");
        $(obj_e).css("top", "0px");
        $(obj_e).css("z-index", 1);

        div_e.appendChild(p_e);
        div_e.appendChild(obj_e);

        this.element = div_e;
    };

    this._show = function () {
        $(this.element).show();
    };

    this._hide = function() {
        $(this.element).hide();
    };

    this._key_handler = (event) => {
        if (event.which == keycode_esc) {
            this.stop();
            return false;
        }

        return true;
    };

    this.start = async function () {
        if (this.stop_timer != undefined) {
            throw "can't start an overlay that is already started";
        }

        const white_background = await this._get_white_background();
        const x_width = white_background.width.baseVal.value;
        let x_start;

        if (this.whipe_white) {
            x_start = white_background.x.baseVal.value;
        } else {
            x_start = white_background.x.baseVal.value + x_width;
        }

        white_background.x.baseVal.value = x_start - x_width;

        // there is no known obvious reason why the animation works
        $(white_background).animate(
            { translate: x_width },
            { duration: this.show_for }
        );

        this.stop_timer = new TubeShiftTimeout(this.show_for, () => {
            tubeshift_browser_send_bg_page_message({ name: "overlay-timeout" });
            this.stop();
        });

        $(document).on('keyup', this._key_handler);
        this._show();
        return false;
    };

    this.restart = function () {
        this.stop_timer.reset();
        this._show();
    }

    this.stop = function () {
        $(document).off('keyup', this._escape_handler);

        this.stop_timer.stop();
        this._hide();
        $(this.element).remove();

        return false;
    };

    this._make_element();
};

{
    let bg_page_connection;

    function tubeshift_cs_set_bg_page_connection(connection) {
        bg_page_connection = connection;
    }

    function tubeshift_cs_get_bg_page_connection() {
        return bg_page_connection;
    }
}

{
    let tubeshift_overlay;

    function tubeshift_cs_handle_available(count, config) {
        const video_element = $("video")[0];
        const video_container = $(video_element).parent()[0];
        const old_overlay = tubeshift_overlay;

        tubeshift_overlay = new TubeShiftOverlayButton(config);
        var overlay_element = tubeshift_overlay.element;

        $(overlay_element).css("position", "absolute");
        $(overlay_element).css("left", "15px");
        $(overlay_element).css("top", "15px");
        $(overlay_element).css('cursor', 'pointer');

        $(overlay_element).on("click", () => {
            tubeshift_browser_send_bg_page_message({ name: "overlay-clicked" });
            tubeshift_overlay.stop();
            tubeshift_overlay = undefined;
            video_element.pause();
            return false;
        });

        video_container.appendChild(overlay_element);

        tubeshift_overlay.start();

        if (old_overlay != undefined) {
            old_overlay.stop();
        }

        return;
    }

    function tubeshift_cs_handle_active() {
        if (tubeshift_overlay != undefined) {
            tubeshift_overlay.stop();
        }
    }

    function tubeshift_cs_handle_inactive() {
        if (tubeshift_overlay != undefined) {
            tubeshift_overlay.stop();
        }
    }
}

function tubeshift_cs_handle_message(message) {
    try {
        if (message.name == 'available') {
            tubeshift_cs_handle_available(message.count, message.config);
        } else if (message.name == 'active') {
            tubeshift_cs_handle_active();
        } else if (message.name == 'inactive') {
            tubeshift_cs_handle_inactive();
        } else {
            console.error("unknown message in content script: " + message.name);
        }
    } catch(e) {
        // content scripts are eating exceptions on at least FireFox
        console.error("failure when handling message: ", e);
        throw e;
    };
}

function tubeshift_cs_handle_window_unload() {
    tubeshift_browser_reset_pg_page_port();
}

function tubeshift_cs_start() {
    $(window).on("unload", tubeshift_cs_handle_window_unload);
    tubeshift_browser_start_content_script();
    console.log("TubeShift content script started");
}

tubeshift_cs_start();
