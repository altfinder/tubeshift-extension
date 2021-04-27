# TubeShift - Same Video, Less YouTube

TubeShift is a browser extension that provides end users a visual
notification when the video they are watching on YouTube is known
available on an alternative video platform. The TubeShift browser
extension runs in the end users web browser and contacts the TubeShift
API servers for information related to the alternatives.

The website for TubeShift is at https://www.tubeshift.info/

This extension is known compatible with the most recent version of the following
browsers:

* Brave
* Chrome / Chromium
* Edge
* Firefox

This repository contains the browser extension source code and assets
required to build a release file that is distributed through the
official extension stores. This repository can also be used for development
work or for running the extension in a browser with out having to go through
an official extension store.

## Contributions

Contributions are welcome! But........

This is the repository for the official releases of TubeShift and mirrors
what is given to the [Chrome Web Store](https://chrome.google.com/webstore/detail/tubeshift/eapmmgdleobilfnmfandlhbcfdlaghkp),
[Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tubeshift/eoificgcpbeihdgbkgajefcjohegdieh),
and [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tubeshift/).
Because of this there are policies that have to be followed and lots of rules
about what the code can do and even how it is provided to the browser vendors.

Here's some warnings about contributions I can think of off the top of my head:

1. Not every contribution will be shippable either because of a policy violation
   for a browser vendor, excesive complications/overhead with fulfilling a requirement
   to meet policy because of the contribution, or even the contribution does not
   conform to code requirements that originate as a policy external to this project.

2. TubeShift isn't intended to do everything. For instance the browser vendors require
   each extension to implement a narrow and easy to understand set of features.

3. If a contribution uses a Javascript library then the library must be provided with
   the contribution and it must be unmodified. There is a hard requirement that a build
   ships with all resources required for operation (nothing can be loaded from the network)
   and that any 3rd party libraries are supplied unmodified and unminified.

4. There is a hard requirement that all code be easy to audit for compliance to browser
   vendor policies. The vendors themselves perform code review before updates to the
   official packages are approved and shipped out to end users. TubeShift is structured
   around demonstrating policy conformance such as the tubeshift\_policy\_anon\_data\_collection()
   function which guards all network requests and implements the browser vendor requirements
   for informed consent and offering the user control over the collection of anonymously
   identifying user information.

5. Be patient. Because of all the external requirements and policies applied to shipping
   a contribution it could be a while before it's incorporated. There may also be requests
   for the contribution to be further modified, refined or refactored before it can be accepted
   and shipped.

That's just the stuff off the top of my head. I've never done this before so I'm sure that
list will get bigger.

## TODO

This software is considered alpha quality at this time though it is out and in
use by endusers at this time. There are a number of user interface improvements
that need to be made before TubeShift is ready for a beta quality release and
user testing.

### Improve Modularity

The system was built to be modular but things didn't work out the way I expected
them to. This has lead to the modularity being clumsy and painful. The way modularity
is implemented needs to be revisted and the code refactored to handle multiple
video platforms better.

### User Controlled Alternatives Display Order

Currently the display order of alternatives is controlled by the API which returns
an ordered list of alternatives. The API default sort order will always be
alphabetical though a channel specific configuration may override the default
sort order and provide the channel owners preference for display order.

The user should be the ultimate authority over the final displayed order of
alternatives. By default the user should get the API provided display order
but with opt-in configuration by the user. The user would enable this feature then
specify their desired display order in the options UI.

### Overlay Timeout Indication

When the TubeShift logo shows up as an overlay on top of the YouTube video the
arrow should start out all grey and wipe from left to white while turning white.
The wipe duration is the timeout duration for the overlay being displayed so that
the color change acts as a progress bar for the overlay going away.

Progress has been made here: the overlay image is now an SVG built out of components
that can be animated by wiping left to right the white/grey color of the TubeShift
arrow.

### Automatic Redirect

As an opt-in option for the user TubeShift should automatically redirect the
browser tab the YouTube movie is present in to the first alternative video in
the available list.

If this feature is turned on then the redirect would happen after the overlay
display timeout.

Depends on:

* Overlay Timeout Indication

### Overlay With Out New Tab

When the video overlay is clicked a new tab is opened up. This is because the
API for allowing the extension pop-up to be displayed only functions in response
to a "user action" but that information is lost in the message passing from the
content script to the background script. The workaround for now is to open the
popup when the extension icon is clicked and to open a new tab with the same
contents as the popup if the overlay was clicked.

The specific goal is to not have to open a new tab. Either by finding a way to get
the extension popup to display as a response from a user click inside the content
script or through a change in the UI.

The change to the UI would be to show the popup inside the video display area in the
YouTube watch page. When the user hovers over the TubeShift icon overlay then the
popup contents would be shown over the top of the YouTube video element.

Once the user stops hovering over the YouTube video area the popup contents would fade
away and the YouTube watch page returns to the standard YouTube user experience.

## Architecture and Design

This is a browser extension targetting the [Chrome extension API](https://developer.chrome.com/docs/extensions/reference/)
but with a design intended for browser independence. The system is also intended
to be modular with YouTube acting as the first implementation of a video platform
that can be moved off of.

At the top level there are 4 different parts to the extension that interact with
each other to make up TubeShift:

* A [background script](https://developer.chrome.com/docs/extensions/mv3/background_pages/)
  acts as the main component of the rest of the system. This component filters web navigation
  events into video watch events, performs lookups using the TubeShift API, and manages
  configuration value storage and retrieval.

* A [popup](https://developer.chrome.com/docs/extensions/mv3/user_interface/#popup) which the
  user can click on to interact with the browser extension. This is the main user interface
  provided by the extension.

* A [content script](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
  which runs inside the video watch web page and exchanges messages with the background
  script. This part of the system is responsible for drawing the TubeShift overlay on top
  of the video and supplying user interaction events.

* An [options UI](https://developer.chrome.com/docs/extensions/mv3/options/) where the user
  can configure the extension behavior.

### File layout

This implementation is spread across many different files. Here's a roadmap:

* js/ contains javascript libraries. If a library comes from a third third parties
  then it must remain unmodified to meet extension store requirements. Internal
  libraries for the extension are also stored in here.

* js/tubeshift-module.js contains support for registering loadable components

* js/tubeshift-browser.js contains all the browser specific functions exposed in a
  browser independent way. Originally there was 2 implementations, one for FireFox
  and one for Chrome but the Chrome implementation works unmodified in FireFox.
  FireFox now uses the Chrome implementation for ease of development effort.

* platform/ contains the code that makes up a supported video platform.

* background.js contains the code and initialization procedure for the background script.

* browser.js

* content_script.js contains the implementation of the TubeShift video overlay and the
  initialization procedure for the content script fed into the video watch page.

* options.js contains the javascript implementation of the options UI and initialization logic
  for the extension options UI.

* popup.js contains the UI and initialization logic for the extension popup.

### Entry Points

* The background script is started first by the browser using the list of javascript
  files specified in the background section of the manifest.json file.

* The popup javascript is loaded from &lt;script&gt; elements at the bottom of the
  popup.html file.

* The options UI javascript is loaded from &lt;script&gt; elements at the bottom of the
  options.html file.

* The content script is injected into a tab on demand when a message is sent to a tab
  that does not have a content script running in it yet. This is handled by the
  tubeshift\_browser\_send\_tab\_message() and tubeshift\_browser\_init\_content\_script()
  functions.

The pattern used for loading and starting all of the components is the same:

1. Each component has dependent libraries that are loaded as a list specified at each
   of the individual entry points defined above.

2. The libraries, platform support modules, and other source files are loaded in
   order followed by the component specific file (i.e. background.js or popup.js) last.

3. The component specific file calls what ever function is needed to initialize the
   components subsystem.

### Browser Support / Independence

Originally there was a browser.js file that was specific to Firefox and one specific
to Chrome but the Chrome extension API appears to work fine in FireFox. As a part of
the content script message passing implementation FireFox specific support was retired
and FireFox now uses the Chrome browser support.

The FireFox specific implementation was removed from the master branch but remains
intact in the repository history as an artifact of initial import of this source code
into the new git repo.

The mechanism of achieving browser independence is by having the browser.js file implement
functions that provide high level features TubeShift needs in a browser independent way.
As an example sending a message to a content script is done with the tubeshift\_browser\_send\_tab\_message()
which itself hides all browser specific logic for message delivery.

## API

The TubeShift API is based on HTTP GET requests with URLs that serve as endpoints for performing
key lookups. It's not quite REST but it is using JSON for transporting the data structure provided
as a result for the key lookup.

### Simulator

Look at the contents of the mock/api/ directory inside this repository for a set of static JSON
files. This directory is suitable to be used as the document root for a webserver and will serve
as a basic simulator for api.tubeshift.info.

If you setup a simulator with this mockup data don't forget to set a CORS header or the browser
will reject the HTTP responses. You need something like this for Apache:

    Header set Access-Control-Allow-Origin "*"

### Endpoints

Each TubeShift end point will return a lookup result as a JSON object with the following keys:

* status - always present; must be one of "known" or "unknown"
* data - always present if status is "known"; content is defined per endpoint

Here is an example of a query for a YouTube video that is not known by the system:

    $ curl https://api.tubeshift.info/video/youtube/deadbeef
    {
        "status":"unknown"
    }
    $

#### Content Record: /content/

The TubeShift API is a way to find instances of and retrieve the information associated with a
piece of content known to the system. TubeShift content has a UUID acting as the content identifier
and is itself an ordered list of URLs and other information related to the video on the supported
video platforms.

A content record can be retrived via the /content/&lt;content_id&gt; endpoint like this:

    $ curl https://api.tubeshift.info/content/7fe6ca77-f337-470b-bcc4-7365fbc5af7c
    {
        "status": "known",
        "data": [
            {
                "url": "https://rumble.com/vfnbvp-arthur-macmurrough-kavanagh-a-most-remarkable-man.html",
                "platform_name": "rumble",
                "platform_display": "Rumble",
                "platform_id": "vfnbvp-arthur-macmurrough-kavanagh-a-most-remarkable-man.html"
            },
            {
                "url": "https://youtu.be/FqGlZdS_joU",
                "platform_name": "youtube",
                "platform_display": "YouTube",
                "platform_id": "FqGlZdS_joU"
            }
        ]
    }
    $

The data associated with a content record is an ordered list of objects that contain information about the
known alternatives for the video associated with the content. The list is ordered by the API to be rendered
correctly for the end user assuming the end user is not using any locally configured sorting. The sort order
defined by the API for results is as follows:

1. If the channel has a specific sort configuration it will be used.
2. Otherwise the order is sorted alphabetically by the platform name.

#### Video Platform Lookup: /video/

Content entries for videos can be found via the /video/&lt;platform\_name&gt;/&lt;platform\_id&gt; set
of endpoints. The second level directory contains the video platform name and the third level contains
the video platform unique identifier for the video.

The response includes the content\_id and data associated with the content record in the same format as
is described in "Content Record" endpoint documentation.

A lookup for a YouTube video looks like this:

    $ curl https://api.tubeshift.info/video/youtube/FqGlZdS_joU
    {
        "status": "known",
        "data": {
            "content_id": "7fe6ca77-f337-470b-bcc4-7365fbc5af7c",
            "content": [
                {
                    "url": "https://rumble.com/vfnbvp-arthur-macmurrough-kavanagh-a-most-remarkable-man.html",
                    "platform_name": "rumble",
                    "platform_display": "Rumble",
                    "platform_id": "vfnbvp-arthur-macmurrough-kavanagh-a-most-remarkable-man.html"
                },
                {
                    "url": "https://youtu.be/FqGlZdS_joU",
                    "platform_name": "youtube",
                    "platform_display": "YouTube",
                    "platform_id": "FqGlZdS_joU"
                }
            ]
        }
    }
    $

#### Card Data: /card/

This is information used for displaying a thumbnail and summary of a video like is often used in social
media posts. This endpoint takes the form of /card/&lt;platform\_name&gt;/&lt;platform\_id&gt; and has
a response that looks like this:

    $ curl https://api.tubeshift.info/card/rumble/vfnbvp-arthur-macmurrough-kavanagh-a-most-remarkable-man.html
    {
        "status": "known",
        "data": {
            "title": "Arthur MacMurrough Kavanagh: A Most Remarkable Man",
            "thumbnail": "https://i.rmbl.ws/s8/6/L/R/q/K/LRqKb.4Wpjb.1.jpg"
        }
    }
    $

Card lookups can only be performed for platform IDs that are known to the system otherwise an "unknown" response
will be provided.
