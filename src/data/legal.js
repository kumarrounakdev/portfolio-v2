/**
 * The words behind the Settings app's legal panes.
 *
 * These are not boilerplate copied from a generator: every statement below
 * describes something this code actually does, and nothing claims more than the
 * implementation supports. That is also why they live in `src/data` next to the
 * rest of the content — if you fork this portfolio and add analytics, a contact
 * form or a CDN font, the privacy pane is wrong the moment you do, and it is
 * meant to be edited here rather than defended in a template.
 *
 * They are a plain-language notice written by the site's author, not advice from
 * a lawyer, and the interface says so rather than implying otherwise.
 */

/** Keys the interface writes. `Settings ▸ Storage` lists what is actually in
 *  `localStorage` at runtime, so this list is documentation, not the source. */
export const STORAGE_KEYS = [
  { key: 'portfolio.theme', what: 'Light, Dark or Auto, as chosen in  View ▸ Appearance.' },
  { key: 'portfolio.text-scale', what: 'The text-size step from View ▸ Zoom, so the page opens at the size you left it.' },
  { key: 'portfolio.window-layout.v1', what: 'Where each window was last placed, plus its minimised and zoomed state. Geometry only — nothing else is remembered.' },
  { key: 'portfolio.desktop-icons', what: 'Whether the desktop shortcuts are shown.' },
  { key: 'portfolio.welcome-dismissed', what: 'That the welcome notice was closed, so it does not open again.' },
];

export const termsOfUse = {
  id: 'terms',
  title: 'Terms of Use',
  eyebrow: 'The short version',
  intro:
    'This site is a portfolio: a description of work, written and built by its author. Using it means you have read these notes; they are deliberately short and say nothing the rest of the site contradicts.',
  groups: [
    {
      caption: 'What you may do',
      rows: [
        {
          label: 'Read and share',
          text: 'Read everything here, link to any page, and show it to whoever you like. There is no login, no consent wall and nothing to install.',
        },
        {
          label: 'Reuse the ideas',
          text: 'The interface is a personal project, not a product. Take the ideas; do not present the writing, the artwork or the design as your own work.',
        },
      ],
    },
    {
      caption: 'What the site is not',
      rows: [
        {
          label: 'Not a service offering',
          text: 'Nothing on these pages is an offer, a quotation or a statement of availability. Rates, timelines and capacity are agreed directly, in writing, per engagement.',
        },
        {
          label: 'Not a warranty',
          text: 'Code and descriptions are provided as-is, with no warranty of any kind, to the extent the law allows. The repositories linked from the Projects window are the source of truth for what any project actually does and under which licence.',
        },
        {
          label: 'Not a static guarantee',
          text: 'It is a set of files served by ordinary hosting. No uptime commitment, no support line, and the content changes as the work changes.',
        },
      ],
    },
    {
      caption: 'Third parties',
      rows: [
        {
          label: 'Links leave here',
          text: 'GitHub, LinkedIn and WhatsApp links are ordinary navigations. Once you are there, that service’s terms and privacy policy apply, not these notes.',
        },
        {
          label: 'Code you might copy',
          text: 'Snippets are not licensed for reuse unless the repository they come from says so. Check the licence next to the code, not this page.',
        },
      ],
    },
  ],
};

export const privacyPolicy = {
  id: 'privacy',
  title: 'Privacy Policy',
  eyebrow: 'What happens to your data',
  intro:
    'There is no database, no account system and no analytics on this site. The honest summary is: nothing you read or do here is sent anywhere, and the few things the interface reads from your device stay in your browser.',
  groups: [
    {
      caption: 'Collected by the page',
      rows: [
        {
          label: 'Nothing is sent',
          text: 'No analytics script, no advertising pixel, no social embed, no cookie and no form. The page cannot see you: it has no way to report anything back.',
        },
        {
          label: 'Read locally, to draw the interface',
          text: 'The clock, the time zone, the battery level where a browser exposes it, whether the browser reports a network connection, the platform name for the system tile, and the viewport size for the layout. Every one of those is read in your browser to paint a widget or choose a breakpoint. None of it is transmitted.',
        },
        {
          label: 'Remembered on this device',
          text: 'Appearance, text size, window positions, whether the desktop icons are shown and whether the welcome notice was dismissed — five keys in localStorage, listed in the Storage pane of this app, all of them removable there.',
        },
      ],
    },
    {
      caption: 'The one request the page makes',
      rows: [
        {
          label: 'The weather tile',
          text: 'The weather widget calls the Open-Meteo forecast API with the city configured in the source, and nothing else: no name, no e-mail address, no identifier, no key and no account. There is no cookie and no persistent store behind it — the answer is kept in memory for ten minutes so navigating around the desktop does not re-request it.',
        },
        {
          label: 'No other outbound calls',
          text: 'Everything else on the page is drawn from files that came with the page. Opening the GitHub or LinkedIn window asks that service directly, from your browser, as any link would.',
        },
      ],
    },
    {
      caption: 'Getting in touch',
      rows: [
        {
          label: 'There is no form to fill',
          text: 'The Contact window opens your own mail client or WhatsApp with a message already composed. The message is between your mail provider, or WhatsApp, and the author; nothing is posted to this site.',
        },
      ],
    },
    {
      caption: 'Hosting',
      rows: [
        {
          label: 'Server logs',
          text: 'Whatever the static host records about a request — usually an IP address and a user agent, per its own policy — is outside this code. This site adds nothing to it, and there is no server component of the author’s to log to.',
        },
      ],
    },
  ],
};

export const accessibilityStatement = {
  id: 'accessibility',
  title: 'Accessibility',
  eyebrow: 'What is supported, and what is not',
  intro:
    'These are the accommodations this interface actually implements, each of them covered by the test suite rather than by an intention. Where something is only partly handled, it is listed under the limits.',
  groups: [
    {
      caption: 'Keyboard',
      rows: [
        { label: 'Everything reachable', text: 'Tab reaches every control, including inside a window; the menu bar takes the arrow keys and Escape; Return and Space activate.' },
        { label: 'Focus is returned', text: 'Closing a window, a menu or the phone hands focus back to the control that opened it, so the keyboard does not lose its place.' },
        { label: 'Escape', text: 'Closes the topmost window, then the open menu, and dismisses the phone presentation.' },
      ],
    },
    {
      caption: 'Sight and motion',
      rows: [
        { label: 'Text size', text: 'Six steps from 92 % to 120 %, kept in storage; layout is measured in rem so text grows without the geometry exploding. Pinch-zoom is never disabled.' },
        { label: 'prefers-reduced-motion', text: 'Every window and dock transition is gated on it, and the suite is run a second time with it forced on so the interface has to stay usable without a single tween.' },
        { label: 'prefers-reduced-transparency', text: 'Glass becomes a solid fill; nothing that depends on translucency disappears with it.' },
        { label: 'forced-colors', text: 'Boundaries that were carried by shadows and blur are drawn with CanvasText instead, and focus keeps a Highlight ring.' },
      ],
    },
    {
      caption: 'Touch',
      rows: [
        { label: 'Hit areas', text: '44 px minimum for primary buttons on a coarse pointer, with the traffic lights and switch rows keeping their size but gaining a padded target.' },
        { label: 'Long-press', text: 'On the phone screens, holding the wallpaper copies the site address — a real action behind a gesture that usually does nothing.' },
      ],
    },
    {
      caption: 'Its limits',
      rows: [
        { label: 'Dragging is pointer-only', text: 'Windows can be moved with a pointer but not with the arrow keys; the same windows are reachable from the menu, the Dock and the phone grid, so nothing depends on dragging.' },
        { label: 'No separate high-contrast theme', text: 'Contrast is handled by the system’s own forced-colours mode rather than by a second palette here.' },
        { label: 'Verified headlessly', text: 'The phone presentation is checked by assertions on its own CSS and DOM, not in a browser, so a rendering difference on a real device could still slip through.' },
      ],
    },
  ],
};

/**
 * Dependencies and their licences. The versions are checked against
 * `package.json` by the test suite, so this list cannot quietly fall behind the
 * manifest it describes.
 */
export const licences = {
  id: 'licences',
  title: 'Licences',
  eyebrow: 'What this is built from',
  intro:
    'The interface is written by hand — no component library, no CSS framework, no UI kit. These are the packages underneath it, and the icons drawn for it.',
  packages: [
    { name: 'react', version: '19.3.1', licence: 'MIT', url: 'https://github.com/facebook/react/blob/main/LICENSE' },
    { name: 'react-dom', version: '19.3.1', licence: 'MIT', url: 'https://github.com/facebook/react/blob/main/LICENSE' },
    { name: 'gsap', version: '3.15.0', licence: 'GreenSock standard “no-charge” licence', url: 'https://gsap.com/community/standard-license/' },
    { name: 'lucide-react', version: '1.59.0', licence: 'ISC', url: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE' },
    { name: 'vite', version: '6.4.4', licence: 'MIT', url: 'https://github.com/vitejs/vite/blob/main/LICENSE', note: 'build only' },
    { name: 'jsdom', version: '29.1.1', licence: 'MIT', url: 'https://github.com/jsdom/jsdom/blob/main/LICENSE.md', note: 'test only' },
  ],
  notes: [
    {
      label: 'Icons',
      text: 'Outline icons come from Lucide (ISC). The brand mark, the GitHub, WhatsApp and LinkedIn glyphs and the battery gauge are drawn in src/components/icons.jsx for this project, and are not licensed to anyone else’s marks beyond identifying them.',
    },
    {
      label: 'Typefaces',
      text: 'None are loaded. The interface uses the system stack — SF Pro on Apple platforms, Segoe UI on Windows — so no font request leaves your browser and no webfont licence is implicated.',
    },
    {
      label: 'Project code',
      text: 'The work described in the Projects window lives in its own repositories, under whatever licence each of them carries. Nothing here re-licenses it.',
    },
  ],
};

export const colophon = {
  id: 'colophon',
  title: 'About this build',
  eyebrow: 'Colophon',
  intro:
    'What the thing you are looking at is, stated in the same way the rest of this app states things: from the data it can read.',
  groups: [
    {
      caption: 'Built with',
      rows: [
        { label: 'Stack', text: 'React 19 with a single context-driven window manager, GSAP for the window and dock transitions, Vite for the build, and hand-written CSS — the interface has no component library behind it.' },
        { label: 'Testing', text: 'A headless harness renders the real app in jsdom and drives it: window, Finder, contact, guards, phone presentation and the settings app, run twice, once with reduced motion forced on. Console errors and React warnings fail the run.' },
        { label: 'Served as', text: 'Static files. `npm run build` produces a `dist/` folder that needs no server, no database and no runtime environment variables.' },
      ],
    },
    {
      caption: 'Deliberate omissions',
      rows: [
        { label: 'No router', text: 'Views are windows, not URLs, so there is no history stack to break and no route to keep in sync with the desktop.' },
        { label: 'No dark-mode library', text: 'The theme is one attribute on the document element and a set of custom properties, so a system preference and a manual choice share the same code path.' },
        { label: 'No placeholder content', text: 'A section with no data is not rendered, and a reading that is unavailable is stated as unavailable rather than filled in with something plausible.' },
      ],
    },
  ],
};

/** The panes that carry text, in sidebar order. Interactive panes are composed
 *  in the window itself, because they read live state. */
const legalPanes = [termsOfUse, privacyPolicy, accessibilityStatement, licences, colophon];

export default legalPanes;
