# macOS-Inspired Developer Portfolio

An interactive, desktop-style portfolio for **Rounak Kumar** — built with React 19, Vite, plain JSX and
traditional CSS (no UI framework, no CSS-in-JS, no Tailwind), with GSAP driving the window, Dock and
desktop motion.

The site behaves like a small macOS desktop: a menu bar with working dropdowns, a wallpaper, floating
application windows, a Dock with magnification, a Finder-style project browser, and two complete
appearances that are deliberately colourless — black glass over graphite in the dark, white glass over ash in
the light. There is one hue in the whole interface, the accent, and it is spent only on things a reader can
act on: a link, a focus ring, the selected item, the status dot, a charging battery. On a phone the same content is presented the way an iPhone presents apps: a home screen of app
icons, full-screen apps under a status bar that is blank until you open one, and a home indicator to leave by.
A phone's home screen carries no readings — the live ones stay in the desktop's rail and in
Settings ▸ This Device, where a small screen can show them at a size worth reading.

On a wide desktop that phone is also there *as an object*: a small iPhone standing in the left gutter, showing
its own lock screen and running seven real apps. Tap it and the device opens larger over the desktop; every
screen inside it reads the same `src/data/*` the windows read, and its controls write the same settings
(appearance, text size) the menu bar writes. It is a second presentation, not a second site — below 1240px it
is simply not rendered, and the desktop keeps its full width.

```bash
npm install
npm run dev      # http://5173-… — the module graph, unminified, for editing
npm run build    # production bundle in dist/
npm run serve    # the built bundle over http://localhost:4173
npm test         # static checks + headless functional tests (desktop and reduced-motion passes)

`npm run dev` and `npm run serve` both want 5173 in this sandbox, so only one of them
runs at a time. Speed is judged on `serve` — `npm run serve -- --port 5173` — because a
dev server answers one request per module, which is not what a visitor receives.
```

## 1. Fill in your details

Everything personal lives in `src/data/`. The components never hard-code content.

| Value | File | What it controls |
| --- | --- | --- |
| `name`, `title`, `headline`, `description` | `src/data/portfolio.js` | Menu-bar label, page title, and the hero's text — where `headline` is the `<h1>`. `name` is *not* painted into the Portfolio window and not printed on the desktop at all: a profile that opens with its own name in display type spends its first line on a label instead of a claim. It survives as one row of the window's Details column, in the tab title and in the menu bar |
| `availability` (`status`: `available` \| `busy` \| `away`) | `src/data/portfolio.js` | Whether the dot is filled and pulsing or flat, its label, and the tint of the Contact window's status card |
| `EMAIL` | `src/data/portfolio.js` | Filled in: `kumarrounak.dev@gmail.com` → the address line in the Portfolio window's Reach column (which *is* the `mailto:`), the Contact window's email card, File ▸ Send Email and File ▸ Copy Email |
| `GITHUB_USERNAME`, `LINKEDIN_URL` | `src/data/portfolio.js` | Filled in: `kumarrounakdev`, `linkedin.com/in/kumar-rounak-dev` |
| `WHATSAPP_PHONE` | `src/data/portfolio.js` | Filled in: `+918178782184` → `https://wa.me/918178782184`. Digits are derived from whatever you type; `+`, spaces and brackets are stripped |
| `CITY` | `src/data/portfolio.js` | Filled in: `Delhi` → the weather widget's location, which is what makes that tile a reading instead of a drawing. `''` leaves the tile on its "not set" line |
| `CITY_COORDS` | `src/data/portfolio.js` | `{ lat, lon }` for that city, filled in for Delhi. With both numbers set the widget skips Open-Meteo's geocoding call: one request instead of two. `null` (or a city nobody has looked up) makes it geocode the name again |
| `SITE_URL` | `src/data/portfolio.js` | Empty until the site has an address. Set it to the deployed origin and `og:url`, `og:image`, `rel=canonical` and a JSON-LD `Person` appear, built from it; left empty, none of them are emitted |
| `RESUME_URL` | `src/data/portfolio.js` | The Résumé app and its `public/` PDF, e.g. `'/resume-rounak-frontend.pdf'` — the file itself is what the Download button asks for, so the window is only there when the document is |
| `AVATAR_URL` | `src/data/portfolio.js` | Portrait in the Portfolio window's masthead row, next to the availability line; without it nothing is painted there — there is no initials tile to stand in for one |
| `guards` (`contextMenu`, `devtools`) | `src/data/portfolio.js` | Suppress the right-click menu and the devtools/view-source chords; `false` hands either back to the browser |
| `actions` (`projects`, `contact`, `email`) | `src/data/portfolio.js` | Hero and Contact buttons — one source for the labels |
| `about`, `contact` | `src/data/portfolio.js` | About copy, principles, goals, contact intro |
| `projects`, `CATEGORIES` | `src/data/projects.js` | Finder sidebar, cards, detail views — see §1.1 |
| `skillGroups`, `primaryStack` | `src/data/skills.js` | Skills window |
| `education` | `src/data/education.js` | Education timeline — qualification, institution, years, optional status chip |
| `termsOfUse`, `privacyPolicy`, `accessibilityStatement`, `licences`, `colophon` | `src/data/legal.js` | The Settings app’s five text panes. They describe *this build*, so a test checks the licence versions against `package.json`: change what the site does and these have to change with it |

**Nothing is invented for you.** An unconfigured value hides its button and shows a short note in the
Help window's checklist instead of a dead link or a fake metric. `education.js` holds exactly what you
gave — the BCA at Manipal University Online (2026 — 2029, expected) and the Full Stack Web Development
course at Dice Academy, Delhi — with no grades, percentages or ranking invented around them. Add or edit
entries using the documented shape and the timeline updates.

### 1.1 Writing a project entry

`src/data/projects.js` holds three projects and every word on the project pages. A detail view is one centred
reading column — summary, part tiles, capability points, stack and notes — and nothing else: no setup
commands, no retrospective, no section the data cannot fill.

| Key | Renders as | Budget |
| --- | --- | --- |
| `name`, `tagline` | Masthead under the thumbnail | tagline ≤ 14 words |
| `categories` | Sidebar filter + eyebrow line | pick from `CATEGORIES`, which holds two: `web`, `tools` |
| `summary` | The single paragraph at the top | 2 sentences |
| `parts` | One tile per codebase (`inkheaven/`, `inkdesk/`, `n8n-automation/`) | one line each |
| `does` | Diamond-bulleted list, two columns at wide sizes | 6 lines, one clause each |
| `stack` | Chips on the card and in "Built with" | 4–6 |
| `notes` | Points under "Notes", beside the stack | ≤ 3 sentences |
| `art`, `accent`, `image` | Thumbnail motif, the accent stripe and rules, optional screenshot | `image: ''` means none exists |
| `links.repo`, `links.demo` | Footer buttons | `''` prints a note instead of a dead link |

Backticks in any string become inline `<code>`, so an identifier like `action` reads as code while the data
file stays plain text. Nothing else is allowed on the page: no metrics that were not
measured, no learning-outcome essay, no section the data cannot fill.

## 2. Structure

```
src/
  components/   MenuBar, Dock, Desktop, DesktopIcon, WindowFrame, AppIcon (the macOS
                app tile: squircle, the app's colour mixed down to a shade under a
                sheet of glass, optional plate),
                ThemeToggle, Tooltip, Button (+ Chip/Kbd), ConfigNote, WindowPane,
                WelcomeNotice, IphoneHome (the phone's app grid + search pill + home indicator),
                widgets (greeting, analog clock, live weather, machine status),
                icons (custom GitHub/WhatsApp/LinkedIn marks, the battery gauge)
    phone/      PhoneLauncher (gutter preview + modal), PhoneDevice (frame, island,
                status bar, screen switch), PhoneLockScreen, PhoneHomeScreen,
                parts.jsx (icon/dock/app-shell/card/row/fact), apps.jsx (the seven
                apps and the registry that lists them), phone.css
  windows/      registry.jsx (the single window manifest) + Home, Projects,
                ProjectDetails, About, Skills, Education, GitHub, Contact, Settings,
                Terminal, Guide
  data/         portfolio.js, projects.js, skills.js, education.js, legal.js
  hooks/        useTheme.jsx, useWindowManager.jsx, useMediaQuery, usePrefersReducedMotion,
                useClock, useBattery, useOnline, useTextScale, usePersistentState
  styles/       themes, global, desktop, widgets, menu-bar, dock, windows, projects,
                contact, settings, responsive, ios (the phone presentation, imported last)
  utils/        links.js (mailto / wa.me / external-link builders + config guards),
                storage.js (the `portfolio.*` keys, listed and cleared as one set),
                weather.js (Open-Meteo geocode + current conditions, no API key)
```

`useTheme`/`useWindowManager` are `.jsx` rather than `.js` because they define the providers.
`Tooltip`, `Button` and `AppIcon` are shared primitives rather than duplicated per window.

## 3. How the pieces work

- **Window manager** (`useWindowManager.jsx`) owns state only: `open / minimized / maximized / z-order /
  x,y`, plus `status` (`opening → open`, `closing → closed`, `minimizing → minimized → restoring`).
  `WindowFrame` plays the matching GSAP transition and calls `settle()`. A watchdog force-settles if a
  tween never completes, and re-opening a window mid-animation interrupts the animation instead of
  losing the window.
- **The phone** (`src/components/phone/`) is one component at two sizes. `.phone-device` sets the size with a
  single `font-size` (15px opened, 9.5px in the gutter) and every measurement inside it — bezel, Dynamic
  Island, tile, status bar, home indicator — is in `em`, so the preview cannot drift into a cartoon of the
  real thing. Screens are `lock → home → app`, driven by one piece of state (`{ app, id?, backTo? }`);
  `apps.jsx` exports the list the home grid draws *and* the components it opens, so an app cannot exist in one
  and be missing from the other. Only one of its two screens carries tiles, the way an iPhone's does: the lock
  screen gets the greeting and the machine tile, the home screen gets the apps and nothing else. Those two
  tiles are the same `widgets.jsx` components, re-scaled by one `.phone-widgets` block (`font-size: 0.78em` on
  the tile, no `rem` floors) so they shrink with the preview instead of overflowing it; inside the device the
  lock inherits its ink from the appearance rather than pinning it to white. Two of its affordances would otherwise be decoration: iOS's torch switches
  the light/dark appearance and its camera copies the page link, because a phone that only *looks* interactive
  is a prop. `usePhoneGutter()` and the `--phone-space` reservation in `phone.css` use the same media-query
  string, so the desktop either gives up the gutter and shows the device, or keeps both its padding and none
  of it.
- **No duplicate windows**: windows are keyed by id in the registry, so the Dock, the menus, the hero
  buttons and the desktop icons all raise the same instance. A file the registry does not know about is linked
  instead of framed — that is how the résumé used to work, and why the Résumé tile now opens a window that
  offers the same PDF rather than pretending to be one.
- **Nothing to memorise**: there are no application keyboard shortcuts — every action lives on a button, a
  menu row or the Dock, so the interface cannot hide its own features.
- **Portfolio window**: set like a page rather than stacked like a form. A full-width band carries the
  availability line, the headline (the `<h1>`, sized in `cqw` so it stays a poster when the window is dragged
  narrow), the role and city, one paragraph at 58 characters, and the actions; a hairline closes the band and
  three columns of equal weight sit under it — what the work is done with, the facts, and the ways to reach
  me, divided by a rule between them. `.hero` is a `container-type: inline-size` context and the columns switch
  at `@container (min-width: 600px)`, because a window in this app is resized freely and a viewport media query
  would reflow it at the wrong moment. Nothing is written twice: the email address appears once, as the line
  you can already click, and the résumé row opens the Résumé window instead of dropping the visitor out of the
  page for a file. Its Résumé *action* in the band is the same `size="lg" variant="neutral"` button as
  "Get in touch", because it asks for the same thing — a window, not a download. There is no widget band, no summary panel and no name in display type — those are the
  desktop rail's, Contact's and the title bar's.
- **Terminal**: click anywhere in the window and type. Five commands — `help`, `projects`, `skills`,
  `contact`, `clear` — plus `open projects`, which raises the Finder window. Each one prints from
  `src/data`, so it cannot contradict the windows; an unknown command says so instead of inventing output.
  `↑`/`↓` walk the commands you typed this session.
- **Settings** (`[data-dock-id="settings"]`, the app grid on a phone, System ▸ Settings): ten panes in
  three groups. Interface panes *do* things — appearance, text size, desktop shortcuts, closing and resetting
  windows — and they write through the same hooks the menu bar uses, so the two can never disagree (a test
  flips the switch in Settings and watches the menu bar's checkmark follow). The Readings panes report only
  what a browser knows: viewport, pointer type, whether reduced motion or forced colours are asked for,
  battery, `navigator.onLine`, time zone, locale, platform, and the contents of `localStorage` — listed from
  the store itself, with a Clear button that says what clearing does and does not undo. Nothing in this app is
  a decorative preference: a value you cannot set from a browser is shown as a reading with its owner named.
- **Résumé** (`[data-dock-id="resume"]`, the Reach column's résumé row, File ▸ Open Résumé): the CV set as
  the document it stands for — a masthead (role, name, the contact line exactly as printed) with the two
  actions beside it, then one sheet whose sections are ruled apart the way the page rules them. `Download the
  PDF` is a real `download` link to the configured file; `View resume-…pdf` is a pressed button, not a
  `<details>` with a floating caption, and it mounts the `<object>` only while it is held on and takes the
  request back when it is switched off. Below the actions is the same text laid out by the app
  (`src/data/resume.js`), because a PDF is an image of a page on a phone and a page of no choices at all. That data file is a transcription of the
  document, not a second story: the PDF keeps its own contact line inside itself and the window says so, while
  every link the app writes comes from `profile`. Where the two disagree — the CV's role is narrower than the
  configured title — the difference is shown rather than averaged away.
- **The small print lives there too**: Terms of Use, the Privacy Policy, the accessibility notes (including
  this interface's *limits*), the dependency licences and a colophon, all written from what the codebase
  actually does — no analytics, no cookies, no form, one weather request, five stored keys. A test holds the
  licence versions against `package.json` and rejects boilerplate promises the app does not keep.
- **Dragging** is pointer-based, bounded so a title bar can never leave the desktop, positions persist in
  `localStorage` (View ▸ Reset Window Layout clears them), and it is disabled below 768px and while zoomed.
- **Compact screens** show one window at a time as a sheet with a bottom bar; the Dock, its magnification
  and the zoom control disappear where they would be useless.
- **Guards** (`useInteractionGuards`): the browser context menu and the F12 / ⌘⇧I / ⌘⇧C / Ctrl+U chords are
  swallowed, and each suppression explains itself in a transient pill under the menu bar instead of eating the
  gesture silently. Text fields keep their native menu, so selecting and pasting still work. It is
  `profile.guards` in the data file, not a hard-coded refusal — and it is honestly labelled for what it is:
  a deterrence for reflexes, not a lock. Nothing on a web page can prevent inspection, and this one has no
  intention of hiding anything (the copy, the config and the tests are all in the open).
- **Appearance**: `data-theme` on `<html>` plus tokens in `themes.css`. An inline script in `index.html`
  applies the stored (or system) preference before first paint, so there is no theme flash; the preference
  is persisted and Auto keeps following the OS, and a switch is *dissolved* rather than blinked: the provider
  reads the outgoing `--desk-*` off the root, holds them on one fixed veil above the interface for
  `--dur-slow` and fades it out — a veil, because the desktop and every sheet in it are gradients, and a
  gradient does not transition. Reduced motion is given no element at all, and only one veil can exist, so
  switching twice fast never stacks. Both appearances are the same material at the other end of
  the lightness ramp: `--desk-*` is a graphite or an ash gradient with no hue in it, every sheet is a
  translucent fill plus `--backdrop-blur` and a rim on its top edge, and `--accent` / `--focus-ring` are the
  only tokens in the file that carry chroma — a test reads the stylesheet and fails if another one starts to.
  The window controls are three dots of one grey whose glyph is faint at rest and full under the pointer,
  rather than red, amber and green, and the weather tile tells its condition by how much light its glass
  holds instead of by a sky.
- **Reduced motion**: every GSAP transition is gated on `prefers-reduced-motion`, motion-dependent CSS
  durations collapse to ~0, and the interface stays fully operable (verified by a dedicated test pass).
- **The phone presentation (`src/styles/ios.css` + `IphoneHome.jsx`)**: below 768px — *or* whenever the
  screen is both short (`≤ 560px`) and touched — the desktop metaphor is replaced, not shrunk.
  - **Status bar**: the iPhone 14 arrangement, not a shrunken menu bar. The time sits at the leading edge,
    the readings and the appearance toggle at the trailing edge, and between them a black pill — the island —
    naming the app you are actually in (`Projects`, `Settings`, `Manual`) and holding nothing at all while
    you are on the home screen, because a notch is hardware rather than a label. Its height is
    `--bar-island-h: 1.85rem` — deliberately shorter than a real island, since it carries one line of text
    and no controls — and `--bar-control` is kept inside it. `grid-template-columns: 1fr auto 1fr` keeps the
    pill centred no matter how long either side gets, and the label clamps with an ellipsis because
    a 25-character title exists in this registry. Nothing else is filled: the wallpaper is
    the app's own gradient and the type colour is chosen with it, so bare type stays legible and no band of
    paint crosses the home screen. Every item is one box (`--bar-control`) carrying the tap floor, all in rem,
    so View ▸ Zoom lifts the bar with the text; the island and its `--bar-island-h` are what `--menubar-h` is
    derived from, so the sheet below it can never overlap. There are no menus on a phone and no brand button to
    open them — the bar renders neither rather than hiding both — and the island is empty on the home screen,
    holding only the name of the app you are in. What a Mac keeps under File and View lives here as windows:
    About, GitHub, Contact, Settings, reachable from the grid and from the three-item dock. Connectivity is
    `navigator.onLine` and nothing more: a plain glyph when the browser reports a link, a crossed one with the
    word `Offline` when it reports none, no signal bars and no carrier because no browser can read either.
  - **App tiles**: the home grid, the Dock and the desktop shortcuts all draw the same `AppIcon` as the Mac.
    A tile is three layers: the app's own colour as the body, that body mixed down to a shade against
    `--icon-neutral` (44 % hue in `oklab`, so lightness survives and poster does not), and a sheet of the
    desktop's glass over both. The registry still carries each tile's `art` — the two gradient stops and
    whether the mark sits on a plate — so the same app is the same object in both metaphors, and a row of
    ten tiles reads as one material with ten faint differences rather than as ten stickers.
  - **Home screen**: an app grid and one search pill, which is exactly what an iPhone's home screen is. The
    grid holds one icon per real window, generated from the registry rather than from a second list, so no
    decorative icon can creep in and no app can be missing; the pill opens the Finder because that is where
    the search actually is. There is deliberately no widget band and no date line: the clock is in the bar
    once, and the readings that used to sit under the icons are answered by the desktop's rail and by
    Settings ▸ This Device, both of which read the same live sources.
  - **Dock**: three destinations on a phone — Portfolio, About and Contact — the only three the registry marks
    `dock.mobile` (each with its own `dock.mobileLabel`), because a bar of seven on a 390px screen is a list,
    not a dock. Their tiles are 46px — `--phone-dock-icon`, sized in `dock.css` and never inline, because an
    inline size outranks every rule and quietly held the bar at a 26px mark for a round — and the row is
    `--dock-h: calc(5.75rem + env(safe-area-inset-bottom))`: the tile, its caption, and the 20px the home
    indicator is owed. A landscape phone has the width for those tiles and not the height for their captions,
    so it sets `--phone-dock-icon: 38px` and drops the labels. Everything the bar dropped is still in the grid,
    which is what the grid is for.
  - **Apps**: full-bleed, no frame and no traffic lights; a nav bar that sits *under* the status bar with the
    title centred and a single action top-right. Minimise and Zoom are dropped, because closing already
    returns you to the home screen — the same destination, one control.
  - **Dock ↔ tab bar**: the same bar floats as a glass pill with labels hidden on the home screen (`data-app-open='false'`)
    and turns flush, labelled and square-cornered inside an app, where it is a tab bar. It reserves its height
    through `--dock-h` on the surface only, so an app ends exactly where the bar begins.
  - **Home indicator**: the pill at the bottom edge is the way out of an app; when the home screen is already
    showing it stays put and is `disabled`, because a control with nothing to do is worse than none.
  - **Landscape** (844×390 and friends) keeps the same presentation, packed: six icon columns, and the dock
    keeps its tiles while losing their captions to `--phone-dock-icon: 38px`, because a landscape phone has
    the width for a thumb-sized bar and not the height for the label under it.
- **Tablet (`768–1023px`)**: keeps the desktop, drops the window caption, wraps the Finder toolbar and narrows
  the sidebar; `≥ 1024px` adds the widget rail, and `1024–1200px` shrinks the tiles before they can squeeze
  the window. Window heights are `min()`-capped against the desktop area, so a 1024×768 iPad never gets a
  window taller than its screen, and `env(safe-area-inset-*)` make the notch, the rounded corners and the home
  indicator part of the layout instead of an accident.
- **Touch**: the pointer is trusted for size, not for capability — under `(pointer: coarse)` every control
  carries a hit area of at least 44px (a traffic light stays a 14px dot and gets a 44px band that tiles into
  the gap between the three, so no button steals its neighbour), inputs type at no less than 16px because iOS
  zooms a page on focus below that and leaves it zoomed, a title bar claims `touch-action: none` so dragging
  a window is not mistaken for scrolling, scroll regions use `overscroll-behavior: contain` so a sheet never
  drags the desktop with it, hover-only effects are switched off under `(hover: none)` so a tapped card does
  not stay pressed, and the context-menu guard steps aside entirely — on a phone a long press *is* the copy
  command. The two things macOS only shows under a cursor (the glyph inside a traffic light, the line on a
  project card that says it opens) never wait for one: the marks in the lights are painted faintly at rest and
  full under the pointer, and on a phone the close mark is simply drawn full-size, because a finger does not
  hover. Two rules that were tried before and are worth keeping: the light answers to a pointer over *its own*
  dot rather than anywhere in the cluster, and the ink is a token of the appearance — black ink on a graphite
  dot is how a rule that says "visible on hover" ends up invisible, and setting `color: transparent` on the
  dot for an inactive window once took a `currentColor` glyph away with it, which is why the mark is now
  painted on the SVG. The keyboard chords stay guarded, because a tablet can have a keyboard.
- **Chrome scales with the reader**: the menu bar and Dock heights are tokens in `rem`, so raising the
  browser's text size grows the bars instead of clipping their labels (WCAG 1.4.4). Pinch-zoom is never
  disabled anywhere. `prefers-reduced-transparency: reduce` swaps every glass surface for solid fills, and
  `forced-colors: active` draws the window and tile boundaries that the shadows would otherwise carry.
- **Project pages**: the card labels how many codebases a project spans and states plainly when it has no
  public repository. The detail view is one reading column — summary, part tiles, what it does, stack,
  notes — sized to be read once, not skimmed for the useful lines. A block with no data is not
  rendered at all, so nothing looks like a stub.
- **Home-screen widgets**: three macOS-style tiles on the wallpaper — a column of frosted squares in the
  top-right corner, which is where a Mac puts them, so they stay put while windows open, close and cover
  one another. They are the desktop's and never a window's: the Portfolio window carries no widget band and
  no summary panel of its own (at `768–1239px`, where there is no rail, it used to take them inside itself —
  it now simply has none), because the readings it held are the rail's, About's and Contact's, and repeating
  them made the first screen a dashboard that pushed the actual sentence below the fold. Each tile is a 2×2 square (`aspect-ratio: 1`, 26px corners, `backdrop-filter` material with
  a hairline rim and a highlight along the top edge) and carries no title bar: the small line of text at
  the top is the place or the day, the way macOS captions a clock or a weather tile.
  - **Clock** — always a dark pane, whatever the appearance is: tick marks, white hands, a seconds hand in
    the accent, the city above the dial and the real local time below it.
  - **Weather** — the condition *is* the background, told in lightness: eight WMO families map to a ladder of
    greys from sun (`#3b3e45 → #16171a`) down to a storm (`#191a1f → #060608`), and night flattens every one
    of them to the same black — only when the service itself reports `is_day = 0`. Big light-weight
    temperature, condition, and today's `H:` / `L:` from the same request.
  - **System** — a list of the machine's own readings (battery, region and UTC offset, appearance).
  The window layer is inset by the rail's *measured* width (`ResizeObserver`, no number copied into two
  stylesheets), so a window can neither cover the tiles nor be dragged across them, and the desktop icons
  keep the left edge rather than fighting them for the corner. Below 1024px there is no room for a rail
  beside a window, and the Portfolio window does not take the tiles into itself to fill the gap: they are the
  rail's, so at that width the window simply carries none, exactly as on a phone, where the lock screen has its
  own pair and the home screen has apps only. One instance at a time, never both, and the small phone in the
  gutter is the only second surface, because it is meant to read as a separate device.
  Every number comes from the browser (`Date`, `navigator.getBattery()`, `Intl`) or from Open-Meteo — no API
  key, no backend, nothing to provision, nothing written into a data file that could go stale. A reading that
  cannot be had is stated as unavailable: no battery API says "Not reported", a failed fetch says why and
  shows no temperature, and an empty `profile.city` names the key to set. `fetchWeather` keeps the last
  reading for ten minutes per city, since the phone remounts its whole screen on every swipe and an
  uncached tile would make two round trips again each time; successes only, so a failure never sticks.
- **Contact**: one primary email card (address, a bare `mailto:`, copy button) plus a row per other
  channel, with availability and a short brief-aid rail beside it. No `mailto:` anywhere writes a subject or a
  body: a prefilled line is the applicant's words inside the visitor's draft, so the link hands over an empty
  message and the address instead. The address is sized to the *card* — `.email-card` is a
  `container-type: inline-size` context and the type is a `clamp()` in `cqw`, 17px while the card has room
  and about 14px when it does not — with `overflow-wrap: anywhere` and `word-break: break-word` under it, so a
  long address breaks onto a second line instead of riding past the edge of a small screen; the phone's channel
  rows carry the same two break rules. Each channel is drawn with its own mark —
  the Octocat, the WhatsApp bubble, the LinkedIn plate in `components/icons.jsx`, one filled path each, since
  a chat bubble standing in for WhatsApp says nothing about where the row goes; the phone's Contact app reads
  the same three so a row means the same thing on both presentations. Channels are rows only when the config
  supplies them, and the email row disappears into its card rather than being listed twice.
- **GitHub**: real links only. A repository row gives its `Open` button a line of its own when the window is
  narrow and lets a long URL break rather than ellipsis it, because a row that cuts off "…/rounakkumar" says
  nothing about where it goes. No GitHub API call, no counters, no contribution graph, and no
  contact form — a form with no backend can only pretend to send, so the Contact window offers mailto,
  WhatsApp and profile links and says plainly that nothing is collected on the page. There is no "Book a
  Call" button anywhere, because there is no scheduler to send people to.

### What the first byte pays for

An application that has not been asked for is not downloaded. `src/windows/registry.jsx`
imports only `HomeWindow.jsx` — the window a visitor arrives on — and gives every other
window a `component: lazy(() => import('./XWindow.jsx'))` plus the same `import()` as a
`preload` handle. `vite build` therefore emits one entry chunk plus a chunk per
application: 72.6 kB of the app's own code is in the first payload (25.2 kB gzipped) and
the eleven others — Settings with its legal prose, the résumé sheet, the project browser,
the phone's own device furniture — are 0.25 kB to 7.9 kB gzipped each, fetched only when
their window is opened. React and GSAP are hoisted into `vendor-framework` and
`vendor-gsap`, whose filenames do not move when only the app changes, so a redeploy costs
a returning visitor the 72 kB that changed and nothing else. Measured on this tree: first
paint pays 153.5 kB gzipped across five requests, against 176.7 kB across four before the
split, with the whole app in one 490 kB file.

Warm-up is deliberate and small. `useWindowPreload` queues the deferred chunks in a
`requestIdleCallback`, one at a time, only when the browser has not asked to save data
(`navigator.connection.saveData`), and only for the apps a phone's Dock actually shows —
on a phone the other eight stay unbought until they are opened. A desktop reads all of
them ahead. `Dock.jsx` also calls `preload()` on `pointerenter`, because a hovered tile is
a stated intent and the click should then never wait on the network.

The cost of deferring is a new failure, and it is answered rather than hidden: a chunk
that cannot be fetched — an offline visitor, a redeploy that changed the hashed names under
an open tab — is caught by `WindowChunkError` in `Desktop.jsx`, which fills the window with
one plain sentence and a reload, instead of leaving an empty sheet of glass.

The stylesheet stays a single blocking file on purpose: 118.7 kB raw / 21.9 kB gzipped for
twelve sheets. Splitting CSS per chunk would move `ios.css` and `phone.css` — 44% of it —
out of the phone's first paint, which is the one screen that cannot afford a flash of
unstyled home icons.

Two paint decisions belong here too. `--backdrop-blur` is 24px (22px in the light
appearance) rather than 34/32: every open window, the Dock, the menu bar and each rail tile
re-filters the desktop under it, so the radius is the one number this design pays for
continuously, and behind these fills 24px is indistinguishable from 34px. And no blur is
ever computed out of that token — `blur(calc(var(--backdrop-blur) * 0.5))` looks reasonable
and is invalid, because the token holds a filter *list*; the browser drops the whole
declaration and the tile is simply not frosted. `npm run check` now fails if that shape
comes back. Twenty `backdrop-filter` declarations survive across the sheets (forty lines
with the `-webkit-` twins); two were deleted outright because they were the invalid shape.

### The contribution graph, and what it is allowed to claim

The GitHub window (and the phone's GitHub screen) draws a year of contributions in this
site's own colours. It is a real reading, and the one place in this project that depends on
a service which is neither GitHub's nor mine:

- **Why not the official API.** Contribution counts only exist in GitHub's GraphQL API, and
  that needs a token. A token cannot ship in a static site. Scraping
  `github.com/users/<login>/contributions` is blocked by CORS, so a browser cannot read it
  directly. `src/utils/contributions.js` therefore reads an unauthenticated JSON mirror of
  that same page — `github-contributions-api.jogruber.de`, which answers with
  `access-control-allow-origin: *`.
- **What that costs.** A third-party dependency for one panel. If it is down the panel says
  so, offers *Try again*, and leaves the profile link right above it — nothing else in the
  window degrades, and no number is ever invented to fill the space.
- **The theme.** The five shades are not borrowed from github.com's greens. They are one
  accent mixed into the surface at a rising strength, so the grid is the same colour as
  every link in both appearances and follows a change to `--accent` without a second edit.
  The first version of this got the maths wrong in a way no code review caught: the ramp was
  `color-mix(accent X%, transparent)`, which is not a colour but a transparency, and 18% of
  a blue over a near-white sheet measured **1.09 : 1** against the empty square beside it —
  a year of commits that reads as a blank grid in the light appearance. The ramp is now
  **opaque and per appearance**: in light, the accent mixed with white at 60 / 74 / 88 /
  100% (measured 2.1 : 1, 2.7 : 1, 3.5 : 1 and 4.5 : 1 against an empty day); in dark, the
  accent mixed into `--window-bg-solid` at 40 / 55 / 70 / 90% (2.2 / 3.2 / 4.6 / 7.0 : 1).
  The palest step was raised twice — 1.09 : 1 in the first version, 1.5 : 1 in the second,
  which still read as "nothing happened that day". Empty days carry a hairline edge, and the
  squares are 10px with a 2px gutter, so a year of light activity is visible at a glance.
  `scripts/check.mjs` parses both blocks, resolves the mixes and re-measures the contrast on
  every run — a step under 1.3 : 1 against an empty day fails the build, and so does a ramp
  that goes back to mixing with `transparent`.
- **Reading it without sight of it.** The grid is one `role="img"` with a sentence:
  *"Contribution graph: 235 contributions between 26 Oct 2025 and 26 Oct 2026."* Each square
  carries its own day and count as a tooltip for a mouse.
- **Cost.** 5,950 B raw / 2,381 B gzipped, in its own chunk shared by the desktop window and
  the phone screen, fetched only when one of them opens. Answers are cached in
  `sessionStorage` for ten minutes, so reopening the window is free and a commit made this
  morning still appears in the same session.
- **If the service disappears** the honest fallback is a bigger window on the profile link:
  delete the `<ContributionGraph />` call in `src/windows/GitHubWindow.jsx`, or point
  `ENDPOINT` at your own deployment — the normaliser takes the same `{ total, contributions:
  [{ date, count, level }] }` shape that GitHub's own page is built from.

## 4. Accessibility notes

Semantic `header`/`main`/`nav`/`section` landmarks, labelled icon-only controls (window lights, Dock
items), full keyboard menu bar (`←`/`→` move, `↓` enters, `Esc` leaves), roving arrow-key navigation in the
project grid, Escape to dismiss the menu
or the project detail view, focus returned to the trigger that opened a window, a polite live region that
announces window changes, visible focus rings in both appearances, and no state communicated by colour
alone (dots carry text, filters carry `aria-current`).

On a touch device the same list has to survive without a keyboard, so the additions are deliberate: 44px hit
areas, a 16px floor on every field, text that stays selectable (the guard for the browser menu is switched
off on coarse pointers, where long-press is the only way to copy), a tapped terminal prompt scrolled above
the on-screen keyboard, `-webkit-tap-highlight-color` and callout suppressed on the glass, `:focus-visible`
rather than `:focus` so a tap never leaves a ring behind, and no affordance that only appears on hover.

The phone adds the modal contracts: it is a `role="dialog"` with `aria-modal`, opened from one real button (the
device itself is `inert` and `aria-hidden`, so the preview never duplicates a tab stop or nests a control inside
a control), closed by Escape, the scrim or its own Close button. While it is open, Tab is kept inside it *and*
so is focus — a window finishing its opening animation behind the scrim cannot pull the keyboard out of a
dialog the visitor cannot see — and on close, focus returns to the control that opened it.

### The favicon

A black tile with **RK** on it, as an SVG (`public/favicon.svg`) and a 180px raster
(`public/apple-touch-icon.png`) for the iOS Home Screen, which draws a bitmap rather than a
document. Both are drawn by hand, not exported from a design tool, so the letters are white
on `#000` with no gradient: at 16px a gradient tile reads as a grey smudge and two letters
read as two letters. The corners are rounded once, in the art, because every surface that
shows a favicon rounds them again.


## 5. Checks

```bash
npm run check   # scripts/check.mjs  – lucide exports, relative-import resolution, unused
                #                      imports, exports used without an import, every static
                #                      CSS class and every var(--token) being defined, and the
                #                      three one-way streets: an export nothing imports, a rule
                #                      for a class no element carries, a token nobody reads.
                #                      A module fetched by `import()` must also exist and must
                #                      default-export the component React will bind to.
npm run smoke   # scripts/smoke.mjs  – renders the real app in jsdom and drives it:
                #                      window open/close/minimise/zoom, the minimised dot on a tile,
                #                      Finder search + category filter + sort + view toggle,
                #                      home widgets (clock hands, honest weather state, machine rows),
                #                      project details (part tiles, capability lines, no setup block) + Escape,
                #                      theme switch + persistence, mailto hand-off, wa.me URL shape,
                #                      hidden links when unconfigured, phone/tablet layout,
                #                      ⌘K palette (focus, filtering, Enter, Escape, the Window menu row),
                #                      the Reduce-motion switch and the attribute it sets,
                #                      the head matching the config, and the deferred windows' chunks,
                #                      the contribution graph read live (a year of cells, the total, the
                #                      ramp, the month labels, the day tooltips), the failure state and
                #                      its retry — and the same graph on a phone,
                #                      the link whitelist against eleven URL shapes (and a hostile config put
                #                      in front of the real anchors), the ramp's structure per appearance,
                #                      the headers file, the Host check, and the Dock measuring once,
                #                      and fails on any console error or React warning — including the
                #                      ones React prints to Node's console, which jsdom cannot see
npm test        # both, plus the smoke suite re-run with reduced motion forced on
```

`jsdom` and Vite are the only dev dependencies of the test harness; the app itself depends on
`react`, `react-dom`, `gsap` and `lucide-react`.

The harness owns the app's timers: `window.setTimeout` is queued and drained inside `act()`, so a
live-region clear or a settle watchdog can never commit between two test steps. That removes both the
"not wrapped in act" noise and the fixed-sleep races — assertions wait for a state, not for a duration.
Every run ends with its own count and verdict (`N/N checks passed`), and the suite runs twice: once
normally and once with reduced motion forced on. Two assertions measure the length of a rendered project
page and hold that setup commands never come back, so the copy cannot quietly creep into an essay again;
others drive the guards, check that every widget reading is real or admitted as unavailable, and drive the
phone presentation — the grid must hold exactly as many icons as the registry has windows, the tab bar must
report the app state, the home indicator must dismiss and then disable itself. The phone's own home screen
must cold-start on its icons with no window over them, and the screen it cold-starts on must be icons and the
search pill only — no band, no date line, no second clock. The dock must equal the registry's own list of
mobile destinations (three of them) while every window stays one tap away in the grid, the island must be
blank on the home screen and name the open app inside one, and the phone may not keep a stylesheet rule for a
surface it does not draw.
The Settings app is tested as an interface, not as a screenshot: the theme buttons write the same stored
preference the menu bar writes, the desktop-icons switch hides the shortcuts the menu toggles, the stepper
changes the root font size and clears it again, the storage list is read live from `localStorage` and empties
when cleared, every licence row links to a real https licence text whose version equals the manifest, and the
legal panes are refused any claim this code does not support. On a phone the island must name the open app, and
the Settings window must start on its pane list, replace it with the chosen pane, and come back on the one
back control. The
phone inside the desktop must agree with the menu bar about the time, must render the battery as bars that
follow the reported percentage (four at 90, one at twenty, none at all when no level is reported), must
unlock to as many icons as `apps.jsx` lists, must open a project with a way back, must hand the desktop a
window and close itself from the footer, must give Escape its focus back, must never nest a control in a
control, and must keep its two live tiles behind the lock while its home screen stays empty of them — a
drawing of a phone whose readings are painted in is a screenshot, so the tiles it does show have to be the
real components. The CSS layer is held to its promises as text, since jsdom loads no stylesheet: the bar's
controls share one box and one tap floor, the island is edged by a token rather than a sheet of glass, and
`background` appears nowhere in the
button's own rule (a filled control inside a filled capsule reads as a smudge), the boundaries reappear as
`CanvasText` under forced colours, the material goes solid under reduced transparency, and the phone keeps
its safe-area insets, its `overscroll-behavior` on every scroll region and the ban on `maximum-scale` /
`user-scalable=no`, so zooming cannot be switched off by a future edit.

One rule about the harness itself, learned the hard way: every module the suite reads is loaded *before*
`vite.close()`. `ssrLoadModule` on a closed server never settles, an `await` on it parks the whole run, and
Node then exits **0 with no summary** — so a suite that stops halfway looks exactly like a suite that
passed. The server is closed at the end for that reason, and `ssrLoadModule` afterwards throws rather than
hanging.

## 6. Keyboard, motion and what a crawler reads

**⌘K** (Ctrl-K elsewhere), or Window ▸ Jump to an Application…, opens a palette over the
desktop with eleven apps in it. It is built from `windowRegistry`, so a new window is
listed without being added anywhere; the field keeps focus, the arrows move a highlight
and Enter opens. `src/components/CommandPalette.jsx`.

**Reduce motion** is in Settings ▸ Appearance. The OS setting is the default; the switch
overrides it for this browser, and a "Follow my system" row hands the decision back. GSAP
transitions read `usePrefersReducedMotion()`, which now answers with the reader's choice
or the system's, and the few rules that animate on `animation:` instead of a duration
token follow `html[data-motion='calm']`. Nothing else has to know either exists.

**The head** is written twice on purpose. `index.html` carries a literal title,
description, `og:*` and `twitter:*` block for crawlers that run no script, and
`Desktop.jsx` re-writes the same strings from `src/data/portfolio.js` on mount for
everything that does — so `npm run smoke` compares both against the config and fails if
they drift apart. Absolute URLs (`og:url`, `og:image`, `rel=canonical`, the JSON-LD
`Person`) are emitted **only** when `site.url` names an origin: a share card pointing at
a domain nobody owns is worse than no share card. Set `SITE_URL` in
`src/data/portfolio.js` to turn them on; `/og-cover.png` and `/apple-touch-icon.png` are
already in `public/`.

The weather tile asks Open-Meteo for a forecast. `CITY_COORDS` in the config skips the
geocoding step it would otherwise need — one request instead of two, to one origin
instead of two. Clear it and the widget looks the city up by name again.

## 7. Security posture

A static site has a small attack surface, which is exactly why the parts of it that do exist
should be deliberate. What this build does, and why:

**A link cannot become code.** Every URL on the page comes from `src/data/`. That makes a
pasted `javascript:…` one typo away from an executable `href`, so `safeHref()` in
`src/utils/links.js` is a whitelist — `http`, `https`, `mailto`, `tel` and relative paths —
and it strips the control characters a browser ignores before parsing, so `java\nscript:`
does not slip past it. It is applied at the sinks: `Button`, `externalLinkProps`, the phone's
icons and rows, the desktop icons, the résumé window and the hero's three links. A dropped
link renders as nothing rather than as an anchor pointing at nothing, and a smoke check puts
`javascript:alert(1)` into the config and then looks for any anchor that took it as written.

**Nothing leaves the page that was not asked for.** No analytics, no fonts, no CDN, no
third-party script. Three origins are contacted, all of them by feature: the two Open-Meteo
hosts for the weather tile and the contributions mirror for the graph, all from
`useEffect`, never from the first paint. The policy in `public/_headers` names exactly those
three and nothing else.

**Headers.** `public/_headers` (Netlify format; Vercel and Cloudflare Pages take the same
rules in their own spelling) sends:

| Header | Value | Why |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'self'` + the three API origins, `object-src 'self'`, `base-uri 'self'`, `form-action 'none'`, `frame-ancestors 'none'` | an injected script has nowhere to load from and nowhere to send anything; `object-src 'self'` is what the résumé's `<object>` needs and nothing more |
| `X-Content-Type-Options` | `nosniff` | no content-type guessing on the PDF |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | other people's sites learn the origin, not the path. Also declared as a `<meta>` in `index.html`, because it is the one policy that works on a host that cannot set headers |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | the page never asks, so it should not be able to |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | with `frame-ancestors`/`X-Frame-Options: DENY`, it cannot be framed by someone else either |

The CSP is a **header and not a `<meta>` tag** on purpose: a meta tag applies in
`npm run dev` too, where Vite needs inline scripts, `eval` and a websocket, and a policy
loose enough to allow that is not worth shipping.

**The dev and preview servers check their Host.** `allowedHosts` was `true`, which switches
the check off — a dev server that answers to any domain a DNS record can point at this
machine is how a localhost server gets read by a page somewhere else (DNS rebinding). It is
now `['.e2b.app', 'localhost', '127.0.0.1']` in both blocks; verified with `curl`, which gets
`200` for a preview host and `403` for `evil.example`, `localtest.me` and `127.0.0.1.nip.io`.
If you serve the dev server through a tunnel, add that origin there.

**What is deliberately not done.** No SRI tags (every script is same-origin and hashed by
filename, so an `integrity` attribute would only add a maintenance chore). No CSP `nonce`
(that needs a server-rendered header per request; this build has no server). No
`risky-inline` exceptions beyond the one inline theme script in `index.html` — that script
reads `localStorage` and sets an attribute, and it has to run before first paint.

## 8. Deploying

`npm run build` produces a static `dist/` — host it on GitHub Pages, Netlify or Vercel with no server
configuration. Set an absolute base path in `vite.config.js` only if you serve from a sub-directory.

There is one HTML file and no client router, so no rewrite rules are needed: any host that
serves files will do. (A 404 rewrite to `index.html` is harmless, not required.)

Every file in `dist/assets/` carries a content hash in its name, so the cache headers are worth
one line of configuration: `Cache-Control: public, max-age=31536000, immutable` for
`/assets/*` and `no-cache` for `index.html`. On Netlify that is `public/_headers`:

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/index.html
  Cache-Control: no-cache
```

Without it a returning visitor re-requests the HTML and, depending on the host, the
stylesheet too — the cheapest part of a fast site is the part never fetched again.
