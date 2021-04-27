// This software is copyrighted by Tyler Riddle
// ALL RIGHTS RESERVED
// This is not open-source software. You may not use or distribute this software
// with out authorization.

let alternates_template;
let background_page;
let from_content_script = false;

function tubeshift_popup_get_alternates_template() {
    const alternates_template = document.getElementById('alternate_template');

    alternates_template.remove();
    alternates_template.id = '';
    return alternates_template;
}

async function tubeshift_popup_start() {
    const window_url = new URL(window.location.href);
    let tab_id;

    alternates_template = tubeshift_popup_get_alternates_template();
    background_page = await tubeshift_browser_get_bg_page();

    if (window_url.searchParams.get('tab')) {
        tab_id = window_url.searchParams.get('tab');
        from_content_script = true;
    } else {
        tab_id = await tubeshift_browser_get_active_tab();
    }

    document.getElementById('settings_link').onclick = function(event) {
        tubeshift_browser_show_options();
        window.close();

        return false;
    };

    document.getElementById('help_link').onclick = function() {
        const tab_id = tubeshift_browser_create_tab('/help.html').then(() => {
            window.close();
        });

        return false;
    }

    document.getElementById('donate_link').onclick = function() {
        const tab_id = tubeshift_browser_create_tab('https://www.tubeshift.info/#support').then(() => {
            window.close();
        });

        return false;
    }

    document.getElementById('home_link').onclick = function() {
        const tab_id = tubeshift_browser_create_tab('https://www.tubeshift.info/').then(() => {
            window.close();
        });

        return false;
    }

    background_page.tubeshift_api_get_stats().then(response => {
        const num_videos = response.content;
        const num_alternates = response.alternates;

        var stats_text = num_videos.toLocaleString("en-US") + ' videos';
        stats_text += ' and ' + num_alternates.toLocaleString("en-US");
        stats_text += ' alternates';

        p_element = document.createElement('p');
        p_element.textContent = stats_text;

        $('#video-stats-text').replaceWith(p_element);
    });

    await tubeshift_popup_populate_alternates(tab_id);

    return;
}

function tubeshift_popup_get_platform_name_element() {
    return document.getElementById('platform_name');
}

function tubeshift_popup_reset_alternates() {
    let alternates = tubeshift_popup_get_alternates_element();
    alternates.innerHTML = '';
}

function tubeshift_popup_get_alternates_element() {
    return document.getElementById('alternate_list');
}

async function tubeshift_popup_populate_alternates(tab_id) {
    const alt_content = background_page.tubeshift_bg_get_tab_info_alternates(tab_id);
    const platform_name = background_page.tubeshift_bg_get_tab_info_platform_name(tab_id);
    const alternates_list = document.getElementById('alternate_list');
    const filtered_content = background_page.tubeshift_bg_filter_alternates_display(alt_content);

    if (alt_content == undefined) {
        return;
    }

    for (const location of filtered_content) {
        if (location.get_name() == platform_name) {
            continue;
        } else if (! background_page.tubeshift_module_is_platform_name(location.get_name())) {
            continue;
        }

        const li_element = alternates_template.cloneNode(true);
        const a_element = li_element.querySelector('a');
        const init_img_element = li_element.querySelector('.alternate_init');
        const init_image_file = '/img/platform-' + location.get_name() + '.png';
        const poster_img_element = li_element.querySelector('.alternate_poster');
        const title_element = li_element.querySelector('.alternate_text');

        init_img_element.src = init_image_file;
        init_img_element.alt = location.display;

        a_element.href = location.get_watch();

        if (! from_content_script) {
            a_element.onclick = function() {
                tubeshift_browser_update_tab(tab_id, { url: location.get_watch() }).then(() => {
                    window.close();
                });

                return false;
            };
        }

        poster_img_element.onload = function() {
            init_img_element.remove();
            poster_img_element.classList.remove('hide');

            li_element.style.listStyleImage = "url(img/platform-" + location.get_name() + ".li.png)";
        }

        alternates_list.appendChild(li_element);

        if (background_page.tubeshift_bg_policy_anon_data_collection()) {
            // FIXME Odysee links are total hacks right now and resolve to the wrong video page
            // which is fixed with a redirect via javascript after the page loads in a browser. This
            // provides the wrong metadata for the card service so Odysee is skipped for now
            background_page.tubeshift_bg_fetch_platform_meta(location.get_name(), location.get_id())
                .then(meta => {
                    if (! meta.known()) {
                        throw "result was not known";
                    }

                    title_element.textContent = meta.get_title();
                    poster_img_element.src = meta.get_thumbnail();
                }).catch(error => {
                    title_element.textContent = '';
                });
        }
    }
}

tubeshift_popup_start();
