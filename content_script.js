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
    this.remaining = undefined;

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
            this.remaining = undefined;
            this.started = undefined;
        }

        return this;
    }

    this.reset = function() {
        this.stop();
        this.start();
    }

    this.pause = function() {
        const now = _get_time();

        // already paused
        if (this.remaining != undefined) {
            return;
        }

        if (this.timeout == undefined) {
            throw "missing timeout id";
        }

        if (this.started == undefined) {
            throw "missing start time";
        }

        const elapsed = now - this.started;
        clearTimeout(this.timeout);
        this.remaining = this.duration - elapsed;
    }

    this.resume = function() {
        if (this.remaining == undefined) {
            throw "can't resume a timeout that is not paused";
        }

        if (this.remaining < 0) {
            this.remaining = 0;
        }

        this.timeout = setTimeout(callback, this.remaining);
        this.remaining = undefined;
    }

    this.start();
}

function TubeShiftOverlayButton(config_in) {
    this.show_for = config_in.show_for;
    this.img_url = tubeshift_browser_get_asset_url('/icons/tubeshift-overlay.svg');
    this.stop_timer = undefined;
    this.element = undefined;

    this._hover_in = () => {
        if (this.stop_timer == undefined) {
            return;
        }

        this.stop_timer.pause();
        return true;
    };

    this._hover_out = () => {
        if (this.stop_timer == undefined) {
            return;
        }

        this.stop_timer.reset();
        return true;
    };

    this._close_clicked = (event) => {
        this.stop();
        return false;
    };

    this._make_element = () => {
        const div_e = document.createElement('div');
        const p_e = document.createElement('p');
        const img_e = document.createElement('img');

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

        img_e.src = this.img_url;
        $(img_e).css("height", "100%");
        $(img_e).css("position", "absolute");
        $(img_e).css("left", "0px");
        $(img_e).css("top", "0px");
        $(img_e).css("z-index", 1);

        div_e.appendChild(p_e);
        div_e.appendChild(img_e);

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

    this.start = function () {
        if (this.stop_timer != undefined) {
            throw "can't start an overlay that is already started";
        }

        this.stop_timer = new TubeShiftTimeout(this.show_for, () => {
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
    var tubeshift_overlay;

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
            tubeshift_browser_send_bg_page_message({ name: "shift" });
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
    if (message.name == 'available') {
        tubeshift_cs_handle_available(message.count, message.config);
    } else if (message.name == 'active') {
        tubeshift_cs_handle_active();
    } else if (message.name == 'inactive') {
        tubeshift_cs_handle_inactive();
    } else {
        console.error("unknown message in content script: " + message.name);
    }
}

function tubeshift_cs_start() {
    tubeshift_browser_start_content_script();
    console.log("TubeShift content script started");
}

tubeshift_cs_start();
