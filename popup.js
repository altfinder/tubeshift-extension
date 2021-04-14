// This software is copyrighted by Tyler Riddle
// ALL RIGHTS RESERVED
// This is not open-source software. You may not use or distribute this software
// with out authorization.

console.log("Loading popup");

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
        console.log("front content script");
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
    const alt_content = background_page.tubeshift_get_tab_info_alternates(tab_id);
    const alternates_list = document.getElementById('alternate_list');

    if (alt_content == undefined) {
        return;
    }

    for (const content of alt_content) {
        const platform_name = background_page.tubeshift_get_tab_info_platform_name(tab_id);

        if (content.platform_name == platform_name) {
            continue;
        } else if (! background_page.tubeshift_extension_supported_platform(content.platform_name)) {
            continue;
        }

        const li_element = alternates_template.cloneNode(true);
        const a_element = li_element.querySelector('a');
        const init_img_element = li_element.querySelector('.alternate_init');
        const init_image_file = '/img/platform-' + content.platform_name + '.png';
        const poster_img_element = li_element.querySelector('.alternate_poster');
        const title_element = li_element.querySelector('.alternate_text');

        init_img_element.src = init_image_file;
        init_img_element.alt = content.platform_display;

        a_element.href = content.url;

        if (! from_content_script) {
            a_element.onclick = function() {
                tubeshift_browser_update_tab(tab_id, { url: content.url }).then(() => {
                    window.close();
                });

                return false;
            };
        }

        poster_img_element.onload = function() {
            init_img_element.remove();
            poster_img_element.classList.remove('hide');

            li_element.style.listStyleImage = "url(img/platform-" + content.platform_name + ".li.png)";
        }

        alternates_list.appendChild(li_element);

        if (background_page.tubeshift_policy_anon_data_collection()) {
            // FIXME Odysee links are total hacks right now and resolve to the wrong video page
            // which is fixed with a redirect via javascript after the page loads in a browser. This
            // provides the wrong metadata for the card service so Odysee is skipped for now
            if (content.platform_name != 'odysee') {
                background_page.tubeshift_fetch_json('tubeshift/' + content.platform_name + '/card/' + content.platform_id).then(data => {
                    if (data != undefined) {
                        title_element.textContent = data.title;
                        poster_img_element.src = data.thumbnail;
                    } else {
                        title_element.textContent = '';
                    }
                });
            } else {
                title_element.textContent = '';
            }
        }
    }
}

tubeshift_popup_start();
