/**
 * ---------------------------------------------------------------------------
 * PROJECTS
 * ---------------------------------------------------------------------------
 * One object per project; the Projects window and its detail view render
 * nothing but these keys. Every block is optional, so a small project can be
 * a name, a summary and a stack.
 *
 * Copy rules — the page has to be readable in one breath:
 *   summary   two sentences, no more
 *   parts     one short line per codebase, for projects that ship as several
 *   does      what it actually does, one clause each, under 12 words
 *   notes     the interesting decision, one sentence each, max three
 *   links     '' hides the button; never guess a URL
 * ---------------------------------------------------------------------------
 */

export const CATEGORIES = [
  { id: 'web', label: 'Web Apps' },
  { id: 'tools', label: 'Tools & Automation' },
];

export const featuredFilter = { id: 'featured', label: 'Featured' };

export const projects = [
  {
    id: 'inkheaven',
    name: 'InkHeaven',
    tagline: 'Tattoo studio system: booking site, dashboard, one n8n workflow as the backend.',
    categories: ['web', 'tools'],
    featured: true,
    art: 'ink',
    accent: '#e2577a',
    image: '',
    summary:
      'Three pieces, one webhook: a public booking site, the Inkdesk dashboard, and a single n8n workflow that stores bookings and emails the customer. No database, no API server, no subscription.',
    parts: [
      {
        name: 'inkheaven/',
        kind: 'Website',
        line: 'Studio site — styles, portfolio, process, FAQ — ending in a booking form that posts through a same-origin proxy.',
      },
      {
        name: 'inkdesk/',
        kind: 'Dashboard',
        line: 'Every appointment in one sortable list: confirm, reschedule, notes, walk-ins, CSV export.',
      },
      {
        name: 'n8n-automation/',
        kind: 'Backend',
        line: 'One workflow with a single Code node: routing, slot engine, validation and two email templates.',
      },
    ],
    does: [
      'One webhook for both apps — no `action` field means a booking',
      'Slot engine rejects closed, blocked, past or taken times',
      'An unbookable request still gets three real alternatives',
      'A reschedule waits for acceptance before the slot moves',
      'Bookings stored in workflow static data — no database',
      'Rate limit, body cap, honeypot, generic error messages',
    ],
    stack: ['React 19', 'Vite', 'GSAP', 'n8n', 'SMTP', 'Docker'],
    notes: [
      'Static data makes the whole thing free to run, and re-importing the workflow resets it — a Data Table or Postgres node is the documented upgrade path.',
      'The CORS response is sent before any SMTP work, and both Email nodes continue on error, so a bad mailbox can never fail a booking.',
      'A draft workflow answers only the editor test URL — that is why an unpublished import looks like it stops after one request.',
    ],
    links: { repo: 'https://github.com/kumarrounakdev/inkheaven', demo: '' },
  },
  {
    id: 'component-vault',
    name: 'Component Vault',
    tagline: 'Local-first vault for React components: Monaco editing, live preview, tags and collections.',
    categories: ['tools'],
    featured: false,
    art: 'vault',
    accent: '#8b5cf6',
    image: '',
    summary:
      'Store, organise, edit and live-preview reusable React components in the browser. Everything lives in localStorage, so there is no account, no backend and it keeps working offline.',
    does: [
      'Monaco editor with JSX and CSS tabs',
      'Preview re-renders as you type',
      'Colour-coded tags and named collections',
      'Debounced search with match highlighting',
      'Favourites, recent and trash views',
      'JSON import and export for backup',
    ],
    stack: ['React 19', 'Vite', 'React Router v7', 'Monaco', 'localStorage', 'Netlify'],
    notes: [
      'Deletion is soft and only the vault reset is permanent — that one asks twice.',
      'Monaco is lazy-loaded, so first paint stays a normal React app instead of a 5 MB editor.',
      'Seed components ship in the bundle, so a first launch is never an empty state.',
    ],
    links: {
      repo: 'https://github.com/kumarrounakdev/component-vault',
      demo: 'https://componentvault.netlify.app/',
    },
  },
  {
    id: 'desktop-portfolio',
    name: 'macOS Desktop Portfolio',
    tagline: 'This site — a developer portfolio built as a working macOS-style desktop.',
    categories: ['web'],
    featured: false,
    art: 'desk',
    accent: '#4f8dff',
    image: '',
    summary:
      'A window manager in the browser: open, close, minimise, zoom, drag and z-order, with a Finder-style project browser, light and dark appearances, and a phone layout that turns every window into a sheet.',
    does: [
      'No UI framework — nine CSS files on a token layer',
      'Window status machine with a settle watchdog',
      'Theme applied before first paint, so no flash',
      'One component per window; CSS drives the phone layout',
      'Unconfigured values hide their own button',
      'jsdom harness drives the real app, twice',
    ],
    stack: ['React 19', 'Vite', 'GSAP 3', 'CSS tokens', 'jsdom'],
    notes: [
      'Three runtime dependencies — react, react-dom, gsap. No router, no state library, no backend.',
      'A passing build proves nothing about runtime, which is why this grew a DOM harness instead of a screenshot habit.',
      'Colour is reserved for state: green means frontmost, amber means busy, and no metric is drawn as a bar because none was measured.',
    ],
    links: { repo: '', demo: '' },
  },
];

export function projectCategories(project) {
  return (project.categories || [])
    .map((id) => CATEGORIES.find((category) => category.id === id))
    .filter(Boolean);
}

export function countByCategory(id) {
  if (id === featuredFilter.id) return projects.filter((project) => project.featured).length;
  if (id === 'all') return projects.length;
  return projects.filter((project) => (project.categories || []).includes(id)).length;
}

/** How many codebases a project ships as — drives the "3 parts" label. */
export function partCount(project) {
  return project.parts?.length ?? 0;
}

export default projects;
