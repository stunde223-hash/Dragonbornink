# Dragonbornink

A responsive tattoo artist website built with Vite, vanilla JavaScript, and CSS. The design uses charcoal, warm cream, copper, a locally hosted Barlow Condensed font, and the supplied tattoo photography and films.

## Run the finished website on Windows

The `downloads/dragonbornink-local-windows.zip` package contains the full built website, all media, and a local server. It requires Node.js but does not require npm installation or a build.

Download the ZIP using GitHub's **Download raw file** action, choose **Extract All** in Windows, then double-click `Start-Dragonbornink.cmd`. Keep its command window open. The browser opens the exact local address, normally `http://127.0.0.1:4173`. If that port is occupied, the server selects the next available port and saves the address in `LOCAL-ADDRESS.txt`.

The source files below are provided for further development. The website has not been deployed to public hosting.

## Develop

Requires Node.js 20.19+ or 22.12+; validated with Node 24.

```sh
npm ci
npm run dev
```

## Build and check

```sh
npm run build
npm test
npm run preview
```

The browser tests use the installed Chromium at `/usr/bin/chromium`. Set `CHROMIUM_PATH` if your browser is elsewhere. Tests cover portfolio filters, modal focus and dismissal, form validation and message generation, downloads, clipboard support, all five videos, responsive layouts, legal routes, and automated accessibility checks. Test screenshots are written to `/tmp/dragonbornink-review`.

## Booking

The site prepares an enquiry for **scottemmy717@gmail.com** or **+234 906 420 3870** on WhatsApp. Visitors review the brief, then send it using their email or WhatsApp account. Download and copy options are also provided. The website does not send email itself, store form data, take payments, or claim an appointment is confirmed.

The profile lists **Los Angeles, California**; the supplied phone number is Nigerian. The exact studio address and appointment details are confirmed directly. No street address or US phone number is invented.

## Content and assets

- `src/content.js`: profile details, portfolio entries, film descriptions, FAQs.
- `src/main.js`: layouts, footer, booking flow, privacy and terms content.
- `src/style.css`: responsive design.
- `public/media/`: five user-supplied MP4s, extracted poster frames, and two images from the supplied public profile.
- `public/fonts/`: Barlow Condensed and its SIL Open Font License.

The profile and user uploads are the source of portfolio media. Some archived video captions contain other prices or locations; the site explicitly distinguishes these from current booking terms. No current rates, testimonials, client counts, or artist identity beyond the supplied brand are invented.

The footer credit links to **https://northbridgelogic.com**.

## Deployment

Deploy `dist/` to a static host with SPA fallback for `/privacy/` and `/terms/`. A Netlify-compatible `_redirects` file is included. On other hosts, route unknown paths to `index.html`; the site renders its own missing-page view for unsupported paths. No secrets or backend services are required. Publication and domain connection have not been performed.

## Loading and video playback

The hero image is preloaded, other portfolio images load lazily, and the local font is a compressed WOFF2 subset. Images use WebP. The Windows launcher compresses text responses and caches assets with conditional revalidation support.

The main film starts muted when at least a quarter of the player is visible and pauses when it leaves that area, the tab is hidden, or a portfolio viewer opens. Native controls let visitors enable sound or pause. Reduced-motion and data-saving preferences disable automatic playback, but manual playback remains available. Browser autoplay restrictions are handled without breaking the controls. Finished films stay stopped until replayed.

Phones use 480px video versions for four films, reducing those downloads by 33–42%. The snake/floral film keeps its original, already smaller encode. No video data is requested on the initial page view. Original desktop video quality is retained. Tests cover both phone and desktop playback, all film choices, offscreen pausing, accessibility preferences, compression, caching, and video byte ranges.
