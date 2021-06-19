let bg_page;

async function tubeshift_fr_enable_host_permissions(event) {
    let all_watch_patterns = [];

    for (const platform_name of bg_page.tubeshift_module_get_platform_names()) {
        const watch_patterns = bg_page.tubeshift_module_get_watch_patterns(platform_name);

        if (watch_patterns == undefined) {
            continue;
        }

        for(const watch_pattern of watch_patterns) {
            all_watch_patterns.push(watch_pattern);
        }
    }

    await tubeshift_browser_request_hosts(all_watch_patterns);

    if (await tubeshift_browser_contains_hosts(all_watch_patterns)) {
        $(event.target).stop();
        $(event.target).css('background-color', 'initial');
        $(event.target).prop('disabled', true);
        $(event.target).text("Enabled");
    }
}

function tubeshift_fr_pulseate(element, to_red) {
    const duration = 1000;
    let color;

    if (to_red) {
        color = jQuery.Color('#FA8072');
    } else {
        color = 'initial';
    }

    $(element).animate({ backgroundColor: color }, {
        duration: duration,
        done: () => {
            tubeshift_fr_pulseate(element, ! to_red);
        },
    });
}

async function tubeshift_fr_init() {
    bg_page = await tubeshift_browser_get_bg_page();
    const host_permissions_button = $("#enable-host-permissions")[0];

    $(host_permissions_button).on("click", tubeshift_fr_enable_host_permissions);
    tubeshift_fr_pulseate(host_permissions_button, true);
}

tubeshift_fr_init();
