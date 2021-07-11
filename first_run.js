let bg_page;

async function tubeshift_fr_enable_host_permissions() {
    const enable_button = $("#enable-host-permissions")[0];
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
        $("#enable-permissions").removeClass("alert");
        $("#enable-host-permissions").text("Enabled").prop("disabled", true);
    }
}

async function tubeshift_fr_init() {
    bg_page = await tubeshift_browser_get_bg_page();
    const host_permissions_button = $("#enable-host-permissions")[0];
    const host_permissions_image = $('#permissions-exclamation')[0];

    $(host_permissions_button).on("click", tubeshift_fr_enable_host_permissions);

    $(host_permissions_image).on("click", tubeshift_fr_enable_host_permissions);
    $(host_permissions_image).css("cursor", "pointer");
}

tubeshift_fr_init();
