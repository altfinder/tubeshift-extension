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
