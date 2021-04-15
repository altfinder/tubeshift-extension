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

### Add BitChute Notifications

Right now only the user is only informed about alternates for YouTube videos
even though alternatives are known for any of the platforms the API supports.

BitChute only provides videos in low resolution so it makes sense to prioritize
adding BitChute as a platform that can notify users about an alternative since
there is a high likelyhood that the video is available another place with
a higher quality.

### Enable/Disable Video Platforms

The user should be able to select if a video platform is going to be ignored
or not. For instance if the user never wants to see alternatives on the BitChute
platform then the user should be able to disable BitChute by unchecking an entry
in the options UI.

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

* js/ contains javascript libraries that come from third parties and must remain unmodified
  to meet extension store requirements.

* platform/ contains the code that makes up a supported video platform.

* background.js contains the initialization procedure for the background script.

* browser.js contains all the browser specific functions exposed in a browser independent way.
  Originally there was 2 implementations, one for FireFox and one for Chrome but the Chrome
  implementation works unmodified in FireFox. FireFox now uses the Chrome implementation for
  ease of development effort.

* content_script.js contains the implementation of the TubeShift video overlay and the
  initialization procedure for the content script fed into the video watch page.

* options.js contains the javascript implementation of the options UI and initialization logic
  for the extension options UI.

* popup.js contains the UI and initialization logic for the extension popup.

* tubeshift.js contains the majority of the TubeShift logic.

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
