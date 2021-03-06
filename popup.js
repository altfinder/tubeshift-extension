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

    await tubeshift_popup_populate_alternates(tab_id);

    return;
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

    if (alt_content == undefined) {
        return;
    }

    for (const location of alt_content) {
        if (location.platformName == platform_name) {
            continue;
        } else if (! background_page.tubeshift_module_is_platform_name(location.platformName)) {
            continue;
        } else if (location.watch == undefined) {
            continue;
        }

        const li_element = alternates_template.cloneNode(true);
        const a_element = li_element.querySelector('a');
        const init_img_element = li_element.querySelector('.alternate_init');
        const init_image_file = '/img/platform-' + location.platformName + '.png';
        const poster_img_element = document.createElement('img');

        init_img_element.src = init_image_file;
        init_img_element.alt = location.display;

        a_element.href = location.watch;

        if (! from_content_script) {
            a_element.onclick = function() {
                tubeshift_browser_update_tab(tab_id, { url: location.watch }).then(() => {
                    window.close();
                });

                return false;
            };
        }

        poster_img_element.onload = function() {
            li_element.style.listStyleImage = "url(img/platform-" + location.platformName + ".li.png)";
            init_img_element.replaceWith(poster_img_element);
        }

        alternates_list.appendChild(li_element);
    }

    return;
}

tubeshift_popup_start();
