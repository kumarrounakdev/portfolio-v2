/**
 * ---------------------------------------------------------------------------
 * CENTRAL PORTFOLIO CONFIGURATION
 * ---------------------------------------------------------------------------
 * Everything on the website that is personal lives in this file (plus
 * projects.js, skills.js and education.js). Change the values below and the
 * whole interface updates — no component edits required.
 *
 * Honesty rule used throughout the app: a link/phone/email that is an empty
 * string is treated as "not configured", and the matching button is hidden
 * instead of pointing at a placeholder. Fill a value in and it appears.
 * ---------------------------------------------------------------------------
 */

/** The deployed origin, e.g. 'https://rounak.dev' — no trailing slash. It is what
 *  `og:url`, `og:image` and `<link rel=canonical>` are built from, because a share
 *  card needs absolute URLs and a wrong one is worse than none: leave '' and those
 *  tags are simply not emitted, instead of pointing at a domain nobody owns. */
const SITE_URL = '';

/** Your GitHub username only, e.g. 'octocat'. Leave '' to hide all GitHub UI. */
const GITHUB_USERNAME = 'kumarrounakdev';

/** Full LinkedIn profile URL, e.g. 'https://www.linkedin.com/in/your-handle'. */
const LINKEDIN_URL = 'https://www.linkedin.com/in/kumar-rounak-dev/';

/** Where every mailto: link points. Leave '' to hide the email channel and action. */
const EMAIL = 'kumarrounak.dev@gmail.com';

/** International format with country code, e.g. '+919876543210'. Only digits and a leading '+'. */
const WHATSAPP_PHONE = '+918178782184';

/** Optional pre-filled first message. Left empty so the button opens the chat
 *  exactly as https://wa.me/<number> would; set it to prepend a line of text. */
const WHATSAPP_MESSAGE = '';

/** The CV itself, served from `public/`. The Résumé app embeds this file and the
 * File menu opens it directly; leave '' and both hide themselves rather than
 * pointing at a document that is not there. */
const RESUME_URL = '/resume-rounak-frontend.pdf';

/** The weather widget's location, e.g. 'Delhi' — set it and that tile becomes a
 * reading of a real forecast; leave '' and the tile says so instead of guessing. */
const CITY = 'Delhi';

/** Optional: the latitude/longitude of that city. When both are set the widget skips
 *  Open-Meteo's geocoding call and asks for the forecast directly — one request to one
 *  origin at load instead of two to two. Leave them null (or point CITY at a city you
 *  have not looked up) and the widget geocodes the name, as it always did. Values are
 *  the coordinates of New Delhi, from any map. */
const CITY_COORDS = { lat: 28.6139, lon: 77.2090 };

/** Optional portrait, e.g. '/avatar.jpg'. Left empty, the card prints the name
and draws nothing in its place — no initials tile and no grey box standing in for
a face that does not exist yet. */
const AVATAR_URL = '';

export const site = {
  /* The tab, the share card and the search snippet. Lead with what this site
     actually shows: the two live projects on it are React front ends, and the CV
     says Frontend Developer — so that is the headline, and the wider stack stays
     where it can be read as prose rather than as a claim. */
  title: 'Rounak Kumar — Frontend Developer',
  description:
    'An interactive, desktop-style portfolio by Rounak Kumar: React projects, a printable résumé, skills, education, live widgets and direct contact.',
  appLabel: 'Rounak Kumar',
  lang: 'en',
  /** Absolute origin of the deployed site, or '' when it is not published yet. */
  url: SITE_URL,
};

export const profile = {
  name: 'Rounak Kumar',
  /* The line under the name in the hero, the About window and the phone card.
     One role, spelled the way the résumé spells it. */
  title: 'Frontend Developer',
  headline: 'Building useful digital products and intelligent workflows.',
  description:
    'I build responsive web applications, practical developer tools, and automation workflows using modern JavaScript technologies.',
  // status: 'available' | 'busy' | 'unavailable' — the dot is filled and pulses for
  // 'available' and sits flat for anything else; the word beside it is the reading.
  availability: { status: 'available', label: 'Open to opportunities' },
  // Button wording lives here too, so the hero and the Contact window always say
  // the same thing.
  actions: {
    projects: 'Explore Projects',
    contact: 'Contact Me',
    email: 'Send an email',
  },
  city: CITY,
  coords: CITY_COORDS,
  email: EMAIL,
  /* Interface guards. Cosmetic deterrence only — a page cannot prevent
     inspection — but they keep the desktop reading as an application. Set a
     flag to false and the browser gets that behaviour back. */
  guards: { contextMenu: true, devtools: true },
  phone: WHATSAPP_PHONE,
  whatsappMessage: WHATSAPP_MESSAGE,
  avatarUrl: AVATAR_URL,
  resumeUrl: RESUME_URL,
  links: {
    github: GITHUB_USERNAME ? `https://github.com/${GITHUB_USERNAME}` : '',
    githubUsername: GITHUB_USERNAME,
    linkedin: LINKEDIN_URL,
  },
  // Small chips under the hero description.
  techLabels: ['React', 'JavaScript', 'Node.js', 'Express', 'MongoDB', 'n8n', 'Vite'],
  // Shown in the hero side panel. Keep these factual.
  focus: [
    'Full-stack web applications with React on the front end and Node.js/Express on the back end',
    'Browser-based developer tools that remove friction from everyday work',
    'Workflow automation with n8n: webhooks, form routing and email notifications',
  ],
};

export const about = {
  intro: [
    'I am a full-stack developer working mainly with the MERN stack. Most of my time goes into front-end structure and back-end wiring: clear component boundaries, readable CSS, honest API contracts and interfaces that stay usable on a phone.',
    'Alongside application work I build automation. A lot of repetitive studio and admin busywork — booking requests, notifications, spreadsheet syncing — is better handled by a workflow than by a human copy-pasting between tabs, so I design those flows in n8n and keep them documented.',
  ],
  principles: [
    {
      title: 'Ship something usable',
      text: 'A feature is only finished when a real person can complete the task without explanation.',
    },
    {
      title: 'Small, boring, readable code',
      text: 'Short functions, plain CSS, no framework for the sake of it. The next reader matters more than the clever one-liner.',
    },
    {
      title: 'Debug from the evidence',
      text: 'Reproduce it, isolate it, then fix the cause — network tab, console, logs, in that order.',
    },
    {
      title: 'Automate the repeatable part',
      text: 'If a task happens more than a few times a week, it becomes a workflow with a fallback for when it fails.',
    },
  ],
  building: [
    'React applications with Vite',
    'REST APIs with Node.js and Express',
    'MongoDB schemas with Mongoose',
    'n8n workflows and webhook integrations',
  ],
  goals: [
    'Grow into a developer who owns features end to end — interface, API, deployment and the automation around them.',
    'Keep production-quality habits: version control discipline, testing the paths that matter, and measurable accessibility instead of guesses.',
  ],
  // Rendered as a compact list in the About window; leave '' to hide an item.
  facts: [
    { label: 'Based in', value: 'Delhi, India' },
    { label: 'Working with', value: 'JavaScript, React, Node.js, n8n' },
    { label: 'Preferred stack', value: 'MERN' },
  ],
};

export const contact = {
  intro:
    'Available for full-stack and automation work — freelance projects, internships and junior developer roles. Email or WhatsApp is fastest; a call works well once there is a brief to talk through.',
  responseTime: '',
};

export const terminal = {
  host: 'rounak-dev',
  shell: 'zsh',
  // Each entry becomes a selectable command in the Terminal window.
  // Output lines are generated from the same config data as the rest of the site.
};

export default { site, profile, about, contact, terminal };
