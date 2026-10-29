/**
 * Headless functional test for the desktop portfolio.
 *
 * It renders the real app (through Vite's SSR module loader, so the exact
 * source files are executed) inside jsdom, then drives it the way a visitor
 * would: dock clicks, window controls, Finder filters, theme toggle, form
 * validation. Any console error or React warning fails the run.
 *
 *   node scripts/smoke.mjs      (or: npm run smoke)
 */
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { inspect } from 'node:util';
import { createServer } from 'vite';

/* A couple of contracts are about the stylesheet itself — which element the
   offset is written on, which rule is banned. jsdom resolves neither, so the
   sheet the build ships is read as text. */
const fileText = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const styleText = (name) => fileText(`src/styles/${name}.css`);
const sourceText = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

// jsdom cannot navigate to mailto: and cannot parse modern CSS — neither is a
// fault of the app, so those two are ignored. Everything else is reported.
const noise = /Not implemented: navigation|Could not parse CSS|jsdom\\.css\\.|Error: Not implemented: parse/i;

let failures = 0;
let checks = 0;
const consoleProblems = [];

const assert = (label, condition, detail = '') => {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

/**
 * A queue in front of jsdom's timers.
 *
 * The app schedules state updates from window.setTimeout (the live-region
 * clear, the window-settle watchdog, the "copied" reset, the clock). In a real
 * browser that is fine; in a test it means a commit lands outside act() and
 * React complains, and it makes assertions a race. So the harness owns the
 * queue: callbacks only run from flush(), which is always inside an act scope,
 * and only once their real delay has elapsed.
 */
const createTimerQueue = (target) => {
  const timers = new Map();
  let nextId = 1;
  target.setTimeout = (fn, delay = 0, ...args) => {
    const id = nextId++;
    timers.set(id, { at: Date.now() + Math.max(0, Number(delay) || 0), fn, args });
    return id;
  };
  target.clearTimeout = (id) => timers.delete(id);
  target.runDueTimers = () => {
    const deadline = Date.now();
    let ran = 0;
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= deadline)
        .sort((a, b) => a[1].at - b[1].at);
      if (!due.length) return ran;
      const [id, timer] = due[0];
      timers.delete(id);
      timer.fn(...timer.args);
      // A hook that reschedules itself (the clock) must not spin here.
      if (++ran > 60) return ran;
    }
  };
  return timers;
};

const wait = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

/* Run the whole suite once more with "reduce motion" enabled: the interface must
   stay fully usable, so every assertion below has to pass without a single tween. */
const REDUCED_MOTION = process.env.REDUCED_MOTION === '1';

/* A window body is either a component the entry bundle already carries or a React
   lazy object pointing at a chunk; both render, and only one of them has to be
   downloaded before the first paint. */
const isRenderable = (component) =>
  typeof component === 'function' || Boolean(component?.$$typeof && component?._payload);

async function main() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', (message) => {
    if (!noise.test(String(message))) consoleProblems.push(String(message));
  });
  virtualConsole.on('warn', (message) => consoleProblems.push(`warn: ${message}`));
  virtualConsole.on('jsdomError', (error) => {
    if (!noise.test(String(error?.message ?? error))) consoleProblems.push(`jsdomError: ${error?.message ?? error}`);
  });

  const dom = new JSDOM(
    '<!doctype html><html data-theme="light"><body><div id="root"></div></body></html>',
    { url: 'http://localhost/', pretendToBeVisual: true, virtualConsole },
  );

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.navigator = dom.window.navigator;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Element = dom.window.Element;
  globalThis.Node = dom.window.Node;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  createTimerQueue(dom.window);

  // React was imported in the Node realm, so its warnings reach Node's console
  // rather than jsdom's. Swallow them into the same problem list: a warning is a
  // failure, and the summary at the end prints every unique one.
  /* Total, because what React logs is not always a string: a lazy component whose
     chunk rejects logs the raw reason, and a reason with no prototype throws inside
     String() — which would replace the app's real failure with a harness crash. */
  const printable = (arg) => {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return arg.stack ?? arg.message;
    try {
      return String(arg);
    } catch {
      return inspect(arg, { depth: 1, breakLength: 200 });
    }
  };
  const capture = (kind) => (...args) => {
    const message = args.map(printable).join(' ');
    if (!noise.test(message)) consoleProblems.push(`${kind}: ${message}`);
  };
  console.error = capture('console.error');
  console.warn = capture('console.warn');

  // A controllable matchMedia, so the same component tree can be re-measured at
  // phone width without a real browser.
  const mediaListeners = new Map();
  const viewport = { width: 1440, height: 900 };
  const clauseMatches = (query) => {
    if (query.includes('prefers-reduced-motion')) return REDUCED_MOTION;
    if (query.includes('prefers-color-scheme')) return false;
    // A fine pointer stands in for "not a phone", which is what the app asks for
    // when it decides whether hover magnification is appropriate.
    if (query.includes('pointer: fine')) return viewport.width >= 768 && viewport.height > 560;
    if (query.includes('pointer: coarse') || query.includes('hover: none')) {
      return viewport.width < 768 || viewport.height <= 560;
    }
    const minW = /\(min-width:\s*(\d+)px\)/.exec(query);
    const maxW = /\(max-width:\s*(\d+)px\)/.exec(query);
    const minH = /\(min-height:\s*(\d+)px\)/.exec(query);
    const maxH = /\(max-height:\s*(\d+)px\)/.exec(query);
    if (!minW && !maxW && !minH && !maxH) return false;
    return (
      (!minW || viewport.width >= Number(minW[1])) &&
      (!maxW || viewport.width <= Number(maxW[1])) &&
      (!minH || viewport.height >= Number(minH[1])) &&
      (!maxH || viewport.height <= Number(maxH[1]))
    );
  };
  /* A media query with commas is a list: the app matches if any clause does. */
  const evaluate = (query) => query.split(',').some(clauseMatches);
  dom.window.matchMedia = (query) => {
    // One listener set per query string: several components subscribe to the
    // same media query, and every one of them has to hear about a resize.
    if (!mediaListeners.has(query)) mediaListeners.set(query, new Set());
    const listeners = mediaListeners.get(query);
    return {
      media: query,
      get matches() {
        return evaluate(query);
      },
      addEventListener: (_type, fn) => listeners.add(fn),
      removeEventListener: (_type, fn) => listeners.delete(fn),
      addListener: (fn) => listeners.add(fn),
      removeListener: (fn) => listeners.delete(fn),
      onchange: null,
    };
  };
  /* Waits for a condition by draining the app's own timers, so an assertion
     about something asynchronous reads the settled state instead of whatever
     happened to be on screen when it ran. */
  const settle = async (predicate, limit = 12000) => {
    for (let waited = 0; waited < limit; waited += 250) {
      if (predicate()) return true;
      await flush(250);
    }
    return predicate();
  };

  const setViewport = async (width, height) => {
    viewport.width = width;
    viewport.height = height ?? (width < 768 ? 780 : 900);
    Object.defineProperty(dom.window, 'innerWidth', { value: width, configurable: true, writable: true });
    Object.defineProperty(dom.window, 'innerHeight', { value: viewport.height, configurable: true, writable: true });
    await React.act(async () => {
      mediaListeners.forEach((listeners, query) => {
        const event = { matches: evaluate(query), media: query };
        listeners.forEach((fn) => fn(event));
      });
    });
    await flush(300);
  };

  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const App = (await vite.ssrLoadModule('/src/App.jsx')).default;

  const root = createRoot(document.getElementById('root'));
  await React.act(async () => {
    root.render(React.createElement(App));
    await wait(250);
  });
  const flush = async (ms = 140) => {
    await React.act(async () => {
      // Short rounds: every scheduled callback runs as soon as it is due, and
      // always inside this act scope.
      const rounds = Math.max(1, Math.ceil(ms / 40));
      for (let index = 0; index < rounds; index += 1) {
        await wait(40);
        dom.window.runDueTimers();
      }
    });
  };

  /* Poll for a state instead of sleeping a guessed duration: the app opens its
     first window on a timer, and updates queued from timers only commit inside
     act(), so a fixed sleep is a race — especially without animation frames. */
  const waitFor = async (predicate, timeout = 4000) => {
    const started = Date.now();
    for (;;) {
      await flush(60);
      if (predicate()) return true;
      if (Date.now() - started > timeout) return false;
    }
  };

  await waitFor(() => document.querySelector('.window--home'));
  await flush();

  const act = React.act;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const click = async (node, ms = 260) => {
    if (!node) throw new Error('click target not found');
    await act(async () => {
      node.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true }));
      node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await wait(ms);
    });
  };
  const press = async (key, ms = 160) => {
    await act(async () => {
      window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true }));
      await wait(ms);
    });
  };
  const typeInto = async (input, value) => {
    if (!input) throw new Error('input target not found');
    await act(async () => {
      const proto =
        input.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      await wait(150);
    });
  };
  const byText = (selector, text) => $$(selector).find((node) => node.textContent.trim().includes(text));

  const longToday = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  console.log('\ndesktop shell');
  assert(
    'the window layer makes room for the rail, and the icons keep the other side',
    /\.desktop__surface\s*{[^}]*--rail-space/.test(styleText('desktop')) &&
      /\.desktop__icons\s*{[^}]*left:/.test(styleText('desktop')),
    'surface reserves --rail-space; icons moved to the left edge',
  );
  assert('menu bar rendered', Boolean($('.menubar')));
  assert('dock rendered', $$('.dock__item').length >= 7, `${$$('.dock__item').length} items`);
  assert('home window auto-opens', Boolean($('.window--home')));
  assert(
    'the window opens on the sentence it is making, not on a name in display type',
    /^Building useful/.test(($('.window--home h1')?.textContent ?? '').trim()) && $('.window--home h1')?.className === 'hero__headline',
    `${$('.window--home h1')?.className}: ${($('.window--home h1')?.textContent ?? '').slice(0, 40)}`,
  );
  assert(
    'the name is nowhere in the way a nameplate was: no heading, no eyebrow, only a line of the details card',
    !$('.hero__name') &&
      !/Rounak Kumar/.test($('.window--home .hero__eyebrow')?.textContent ?? '') &&
      !/Rounak Kumar/.test(($('.window--home h1')?.textContent ?? '')) &&
      /Rounak Kumar/.test($('.window--home .hero-facts')?.textContent ?? ''),
    `${($('.window--home h1')?.textContent ?? '').slice(0, 24)} / ${($('.window--home .hero-facts')?.textContent ?? '').slice(0, 24)}`,
  );
  assert(
    'where the owner of the machine is named, it is still named: the tab and the menu bar',
    document.title.includes('Rounak Kumar') && /Rounak Kumar/.test($('.menubar')?.textContent ?? ''),
    `${document.title} / ${($('.menubar__app')?.textContent ?? '').trim()}`,
  );
  assert(
    'the portfolio window is a window, not a dashboard: no widget cards inside it',
    !$('.window--home .hero-widgets') && !$('.window--home .identity-card') && !$('.window--home .focus-card'),
    `${$$('.window--home .widget, .window--home .identity-card, .window--home .focus-card').length} panels`,
  );
  /* ---- the details card, the résumé app, and the marks on the window chrome -- */
  const blockTitles = $$('.window--home .hero-block__title').map((node) => node.textContent);
  const factRows = $$('.window--home .hero-facts .identity-row').map((row) => row.querySelector('dt')?.textContent);
  assert(
    'under the band the window is three columns of the same weight',
    blockTitles.join('|') === 'What I work with|Details|Reach me',
    blockTitles.join(','),
  );
  assert(
    'the details column keeps the facts a visitor came for, and only the facts',
    ['Name', 'Role', 'Based in', 'Studying'].every((label) => factRows.includes(label)) &&
      !factRows.includes('Email') &&
      !factRows.includes('Status'),
    factRows.join(','),
  );
  assert(
    'and the card is made of the config, not of a second copy of it',
    $('.window--home .hero-mail')?.getAttribute('href') === 'mailto:kumarrounak.dev@gmail.com' &&
      ($('.window--home')?.textContent ?? '').split('kumarrounak.dev@gmail.com').length === 2,
    `${$('.window--home .hero-mail')?.getAttribute('href')}, said once`,
  );
  assert(
    'every row in the reach column goes somewhere real',
    $$('.window--home .hero-reach__row').every((row) =>
      row.tagName === 'BUTTON' ? true : Boolean(row.getAttribute('href')) && row.getAttribute('href') !== '#',
    ) &&
      $$('.window--home .hero-reach__row').length === 3,
    `${$$('.window--home .hero-reach__row').length} rows, ${$$('.window--home a.hero-reach__row').length} of them links`,
  );
  const registryNow = (await vite.ssrLoadModule('/src/windows/registry.jsx')).windowRegistry;
  const resumeEntry = registryNow.find((definition) => definition.id === 'resume');
  assert(
    'the résumé is a registered application, ordered among the others and kept out of the phone dock',
    Boolean(resumeEntry) &&
      resumeEntry.dock.label === 'Résumé' &&
      resumeEntry.dock.order > 10 &&
      resumeEntry.dock.mobile === false &&
      isRenderable(resumeEntry.component),
    JSON.stringify(resumeEntry?.dock ?? null),
  );
  assert(
    'the Dock carries it exactly once — a tile that opens a window, not a second door to the same file',
    $$('[data-dock-id="resume"]').length === 1,
    `${$$('[data-dock-id="resume"]').length} résumé tiles`,
  );
  await click(byText('.window--home .hero-reach__row', 'Full résumé'));
  await flush(320);
  let resumeWin = $('.window--resume');
  assert(
    'the reach column hands over to the résumé app instead of printing a link',
    Boolean(resumeWin) && Boolean(resumeWin.querySelector('a[download]')),
    'the card button opened nothing',
  );
  await click($('.window--resume .light--close'));
  await flush(220);
  await click($('[data-dock-id="resume"]'));
  await flush(320);
  resumeWin = $('.window--resume');
  assert('it opens as a window like any other app', Boolean(resumeWin), $('.window')?.className);
  assert(
    'the download is the configured file, asked for by name',
    resumeWin?.querySelector('a[download]')?.getAttribute('href') === '/resume-rounak-frontend.pdf' &&
      resumeWin?.querySelector('a[download]')?.hasAttribute('download'),
    resumeWin?.querySelector('a[download]')?.getAttribute('href'),
  );
  assert(
    'and the document is public/: the path the app prints is a file that exists',
    existsSync(new URL('../public/resume-rounak-frontend.pdf', import.meta.url)),
    'public/resume-rounak-frontend.pdf',
  );
  assert(
    'the PDF is not fetched before anyone asks for it',
    !resumeWin?.querySelector('object[type="application/pdf"]'),
    'the embed mounted itself',
  );
  const viewToggle = $$('.window--resume .resume-actions .btn')[1];
  await click(viewToggle);
  await flush(200);
  assert(
    'asked for, it is drawn in the window, with a link for the browsers that draw no PDF',
    Boolean(resumeWin?.querySelector('object[type="application/pdf"]')) &&
      /Open the document/.test(resumeWin?.querySelector('object')?.textContent ?? ''),
    resumeWin?.textContent?.replace(/\s+/g, ' ').slice(0, 70),
  );
  await click($$('.window--resume .resume-actions .btn')[1]);
  await flush(200);
  assert(
    'and hiding it takes the request back, rather than leaving the document mounted',
    !resumeWin?.querySelector('object[type="application/pdf"]') &&
      resumeWin?.querySelector('.resume-actions .btn:nth-child(2)')?.getAttribute('aria-pressed') === 'false',
    `aria-pressed=${resumeWin?.querySelector('.resume-actions .btn:nth-child(2)')?.getAttribute('aria-pressed')}`,
  );
  assert(
    'the window says where its text came from instead of posing as the source',
    /resume-rounak-frontend/.test($('.window--resume .resume-file')?.textContent ?? '') &&
      /Component Vault/.test(resumeWin?.textContent ?? '') &&
      /Manipal University Jaipur/.test(resumeWin?.textContent ?? ''),
    (resumeWin?.textContent ?? '').slice(0, 60),
  );
  await click($('.window--resume .light--close'));
  await flush(200);

  const ghLink = [...$$('.window--home a.hero-reach__row')].find((a) => a.textContent.trim() === 'GitHub');
  assert(
    'the GitHub channel is drawn as the GitHub mark, so a row of links stays a row of destinations',
    Boolean(ghLink) && ghLink.querySelectorAll('svg path').length === 1 && (ghLink.querySelector('svg path')?.getAttribute('d') ?? '').length > 400,
    ghLink ? `${ghLink.querySelectorAll('svg path').length} path(s)` : 'no GitHub link in the hero',
  );
  console.log('\nhome-screen widgets');
  // On a Mac the widgets belong to the desktop, not to a window: a column on the
  // wallpaper stays put while windows open, close and cover one another.
  assert('the desktop carries a widget rail', Boolean($('.desktop__widgets .widget-stack')));
  assert('the rail is on the wallpaper, outside every window', !$('.desktop__widgets')?.closest('.window'));
  assert('the rail holds three tiles', $$('.desktop__widgets .widget').length === 3, `${$$('.desktop__widgets .widget').length} tiles`);
  assert(
    'each tile is addressable by id',
    ['clock', 'weather', 'system'].every((id) => Boolean($(`.desktop__widgets [data-widget="${id}"]`))),
  );
  assert(
    'the rail keeps the desktop set — the phone board is its own list',
    !document.querySelector('.desktop__widgets .widget--welcome') &&
      !document.querySelector('.desktop__widgets [data-widget="links"]'),
    'no greeting tile and no direct-lines tile on the wallpaper rail',
  );
  assert(
    'the home window does not repeat them',
    $$('.window--home .widget').length === 0,
    `${$$('.window--home .widget').length} in-window tiles`,
  );
  assert(
    'a tile is a square, not a bar',
    /\.widget\s*{[^}]*aspect-ratio:\s*1/.test(styleText('widgets')),
    'aspect-ratio: 1 on .widget',
  );
  assert(
    'the rail reserves its own width, measured rather than copied',
    /--rail-space/.test(sourceText('styles/desktop.css')) &&
      /setProperty\('--rail-space'/.test(sourceText('components/Desktop.jsx')) &&
      /offsetWidth/.test(sourceText('components/Desktop.jsx')),
    'inset + measured width',
  );
  assert(
    'the clock draws a face and three hands',
    $$('.desktop__widgets .clock__face').length === 1 && $$('.desktop__widgets .clock__hand').length === 3,
  );
  // Intl decides the shape (12h vs 24h, AM or PM), so match loosely rather than
  // baking a locale into the assertion.
  assert(
    'its digital readout is the real local time',
    /\d{1,2}:\d{2}\s*(AM|PM)?/i.test(($('.desktop__widgets .clock__time')?.textContent ?? '').trim()) &&
      /\d/.test($('.desktop__widgets .clock__date')?.textContent ?? ''),
    JSON.stringify($('.desktop__widgets .clock__time')?.textContent),
  );
  const weatherNode = $('[data-widget="weather"]');
  // Two live requests sit behind this tile (geocode, then current conditions),
  // so the suite waits for the answer rather than asserting on a snapshot.
  const answered = await settle(() => /widget--(ready|error)/.test(weatherNode?.className ?? ''));
  const weatherState = /widget--(loading|ready|error|off)/.exec(weatherNode?.className ?? '')?.[1] ?? 'missing';
  assert(
    'the weather service answered before the timeout (otherwise the checks below are the offline ones)',
    answered,
    `state ${weatherState}`,
  );
  assert(
    'the weather tile is always in one honest state',
    ['loading', 'ready', 'error', 'off'].includes(weatherState),
    weatherState,
  );
  assert(
    'a temperature is only ever shown once the service has answered',
    Boolean(weatherNode?.querySelector('.weather__temp')) === (weatherState === 'ready'),
    `${weatherState} + temp element: ${Boolean(weatherNode?.querySelector('.weather__temp'))}`,
  );
  const sky = weatherNode?.getAttribute('data-sky') ?? null;
  if (weatherState === 'ready') {
    const weatherText = weatherNode?.textContent?.replace(/\s+/g, ' ') ?? '';
    assert(
      'a real answer paints the sky and names the place',
      ['sun', 'partly', 'cloud', 'fog', 'rain', 'snow', 'storm'].includes(sky) && /Delhi/.test(weatherText),
      `sky=${sky}`,
    );
    assert(
      "today's range carries two figures from the same request",
      /H:\d+°C[\s\S]*L:\d+°C/.test(weatherText.replace(/\s+/g, ' ')),
      weatherText.slice(0, 160),
    );
    assert(
      'night is only ever claimed when the service reports is_day = 0',
      (weatherNode?.getAttribute('data-night') ?? '') === 'true' || (weatherNode?.getAttribute('data-night') ?? '') === '',
      `data-night=${weatherNode?.getAttribute('data-night') ?? 'unset'}`,
    );
  }
  assert(
    'the sky is painted only from an answer, never from a guess',
    Boolean(sky) === (weatherState === 'ready'),
    `${weatherState} + data-sky: ${sky}`,
  );
  const rangeText = weatherNode?.querySelector('.weather__range')?.textContent ?? '';
  assert(
    "today's range is a real figure or an admission that there is none",
    weatherState !== 'ready' || /H:\d/.test(rangeText) || /No range reported/.test(rangeText),
    JSON.stringify(rangeText),
  );
  assert(
    'the weather widget is driven by the configured city',
    weatherState !== 'off' && /Delhi/.test(JSON.stringify(weatherNode?.textContent ?? '')),
    `state ${weatherState}`,
  );
  const systemText = $('[data-widget="system"]')?.textContent ?? '';
  assert(
    'machine readings are reported or admitted as unavailable — never faked',
    /Battery/.test(systemText) &&
      (/\d{1,3}%/.test(systemText) || /Not reported/.test(systemText)) &&
      /UTC[+−-]?\d/.test(systemText) &&
      /Light|Dark/.test(systemText),
    systemText.replace(/\s+/g, ' ').slice(0, 140),
  );

  assert(
    'wallpaper paints bloom, grain and vignette layers',
    $$('.desktop__wallpaper span').length === 3 && Boolean($('.wallpaper__grain')),
  );
  assert(
    'no skip link and no keyboard-shortcut hints anywhere in the chrome',
    $('.skip-link') === null && !/\u2318\u21e7|Ctrl\u21e7|\u21e7 \d/.test(document.body.textContent),
  );

  await flush();
console.log('\nwindow management');
  const dockProjects = $('[data-dock-id="projects"]');
  await click(dockProjects);
  assert('dock opens the Projects window', Boolean($('.window--projects')));
  assert('dock item shows the running indicator', $('[data-dock-id="projects"] ~ .dock__indicator, .dock__item .dock__indicator') !== null);

  await click($('.window--projects .light--close'));
  await flush(500);
  assert('red button closes the window', !$('.window--projects'));
  assert(
    'focus returns to the dock item that opened the window',
    document.activeElement === document.querySelector('[data-dock-id="projects"]'),
    `activeElement is ${document.activeElement?.className || document.activeElement?.tagName}`,
  );
  assert('closing keeps the dock entry', Boolean($('[data-dock-id="projects"]')));

  await click($('[data-dock-id="projects"]'));
  assert('projects reopens from the dock', Boolean($('.window--projects')));

  // Close and re-open inside the close animation: the window must survive.
  await click($('.window--projects .light--close'));
  await click($('[data-dock-id="projects"]'), 60);
  await flush(600);
  assert('reopening during the close animation is not swallowed', Boolean($('.window--projects')));

  await click($('.window--projects .light--minimize'));
  await flush(500);
  assert('the middle light minimises the window', $('.window--projects') === null);
  const dockTiles = $$('.dock__item').length;
  const registryDockCount = (await vite.ssrLoadModule('/src/windows/registry.jsx')).windowRegistry.filter(
    (definition) => definition.dock,
  ).length;
  const litMinimised = $$('.dock__item').filter(
    (tile) => tile.querySelector('.dock__indicator')?.getAttribute('data-state') === 'minimized',
  );
  assert(
    'a minimised window is one bright dot on its own tile, and no second row of tiles',
    litMinimised.length === 1 &&
      !$('.dock__minimized') &&
      // the dock apps plus the one appearance tile the Dock owns — and nothing at all
      // added for the minimised window, which is the point
      dockTiles === registryDockCount + 1,
    `${dockTiles} tiles for ${registryDockCount} dock apps, ${litMinimised.length} lit dot`,
  );
  await click($('[data-dock-id="projects"]'));
  await flush(300);
  assert('clicking that tile is the restore, because it is the same click as opening', Boolean($('.window--projects')));
  assert(
    'and the dot goes back to plain once the window is in front of you',
    $$('.dock__item').filter((tile) => tile.querySelector('.dock__indicator')?.getAttribute('data-state') === 'minimized')
      .length === 0,
    'the state has one place to live',
  );

  await click($('.window--projects .light--zoom'));
  await flush(300);
  assert('the right light zooms the window', $('.window--projects')?.dataset.maximized === 'true');
  await click($('.window--projects .light--zoom'));
  await flush(300);
  assert('and zooms back to the size it was given', $('.window--projects')?.dataset.maximized === 'false');

  /* A Dock label used to stay on screen after the tile was clicked: the bubble
     answered to `:focus-within`, and a clicked tile keeps the focus it was given,
     so the label hung over the bar until the reader clicked empty space to blur it.
     The trigger is the fix, so the trigger is what is checked. Comments are stripped
     first — the note explaining the old bug names it, and a grep cannot tell prose
     from a selector. */
  const tooltipCss = (styleText('global') + styleText('windows')).replace(/\/\*[\s\S]*?\*\//g, ' ');
  assert(
    'a tooltip answers to hover, or to focus the keyboard gave — not to a click',
    /\.tooltip:hover \.tooltip__bubble \{/.test(tooltipCss) &&
      /@supports selector\(:has\(:focus-visible\)\) \{\s*\.tooltip:has\(:focus-visible\) \.tooltip__bubble/.test(tooltipCss) &&
      /\.window__lights \.tooltip:has\(:focus-visible\) \.tooltip__bubble/.test(tooltipCss),
    'the bubble is shown by hover and by :has(:focus-visible)',
  );
  assert(
    'and nothing in the app brings a tooltip back on plain focus',
    !/\.tooltip:focus-within/.test(tooltipCss) &&
      !/focus-within[^{]*\{[^}]*opacity: 1/.test(tooltipCss),
    'focus-within is what left the label over the bar after the click',
  );

  await flush();
console.log('\nfinder browsing');
  const cards = () => $$('.proj-card');
  const total = cards().length;
  assert('projects listed from data', total === 3, `${total} cards`);

  assert(
    'the sidebar offers two categories and nothing else besides All and Featured',
    $$('.finder__sidebar .sidebar__item').length === 4,
    `${$$('.finder__sidebar .sidebar__item').length} rows`,
  );
  const automationRow = byText('.finder__sidebar .sidebar__item', 'Automation');
  await click(automationRow);
  const filtered = cards().length;
  assert('sidebar category filters the list', filtered === 2 && filtered < total, `${filtered} cards`);
  await click(byText('.finder__sidebar .sidebar__item', 'All Projects'));
  assert('All Projects restores the list', cards().length === total);

  await typeInto($('#project-search'), 'n8n');
  assert('search filters by stack text', cards().length === 1, `${cards().length} results for "n8n"`);
  await typeInto($('#project-search'), 'zzzzz');
  assert('empty search shows the empty state', Boolean($('.empty-state')));
  await click(byText('.empty-state .btn', 'Clear search'));
  assert('clear search restores the grid', cards().length === total);

  await click($('.segmented__option[aria-pressed="false"]'));
  assert('list view toggles', $('.proj-grid--list') !== null);

  assert(
    'a card labels how many codebases a project spans',
    byText('.proj-grid .proj-thumb__tag', '3 parts') !== null,
    $$('.proj-grid .proj-thumb__tag').map((node) => node.textContent).join('|'),
  );
  assert(
    'a project with no configured links says so instead of showing buttons',
    byText('.proj-grid .proj-card__note', 'No public repository or demo link') !== null &&
      $$('.proj-grid .link-btn').length === 3,
    `${$$('.proj-grid .link-btn').length} link buttons`,
  );

  await click($('.proj-grid [data-project-card="desktop-portfolio"]'));
  const portfolioDetails = $('.proj-details')?.textContent ?? '';
  assert('project details open inside the window', Boolean($('.proj-details')));
  assert(
    'one screen holds the whole story: summary, points, stack, notes',
    /window manager/i.test(portfolioDetails) &&
      /What it does/.test(portfolioDetails) &&
      /Built with/.test(portfolioDetails) &&
      /Notes/.test(portfolioDetails),
  );
  assert(
    'setup commands are not part of a project page any more',
    !/Run it|npm run dev|docker run/.test(portfolioDetails),
  );
  assert(
    'the page is short enough to read in one breath',
    portfolioDetails.length < 1200 && !/Challenges|trade-offs|Availability/.test(portfolioDetails),
    `${portfolioDetails.length} characters of prose`,
  );
  assert(
    'an unconfigured repository and demo each fall back to a note',
    $$('.proj-details a[target="_blank"]').length === 0 &&
      /No repository link configured/.test($('.proj-details').textContent) &&
      /No live deployment link configured/.test($('.proj-details').textContent),
    `${$$('.proj-details a[target="_blank"]').length} external links`,
  );
  await press('Escape');
  await flush(200);

  await click($('.proj-grid [data-project-card="component-vault"]'));
  assert(
    'a configured repository and demo render as real, safe external links',
    $$('.proj-details a[target="_blank"]').length === 2 &&
      $('.proj-details a[target="_blank"]')?.getAttribute('href') === 'https://github.com/kumarrounakdev/component-vault' &&
      $$('.proj-details a[target="_blank"]').some((node) => node.getAttribute('href') === 'https://componentvault.netlify.app/') &&
      $$('.proj-details a[target="_blank"]').every((node) => /noopener/.test(node.getAttribute('rel') ?? '')),
    $$('.proj-details a[target="_blank"]')
      .map((node) => node.getAttribute('href'))
      .join('|'),
  );
  await press('Escape');
  await flush(200);
  assert('Escape closes the details view', !$('.proj-details'));

  await click($('.proj-grid [data-project-card="inkheaven"]'));
  const detailText = $('.proj-details')?.textContent ?? '';
  assert(
    'a three-part project shows one tile per codebase, named as the repos name them',
    $$('.proj-details .part-tile').length === 3 &&
      /inkheaven\//.test(detailText) &&
      /inkdesk\//.test(detailText) &&
      /n8n-automation\//.test(detailText),
    `${$$('.proj-details .part-tile').length} part tiles`,
  );
  assert(
    'capabilities are one clause each, not paragraphs',
    $$('.proj-details .tick-list:not(.tick-list--single) li').length === 6 &&
      Math.max(...$$('.proj-details .tick-list:not(.tick-list--single) li').map((node) => node.textContent.length)) < 78,
    `${$$('.proj-details .tick-list li').length} lines`,
  );
  assert(
    'notes stay to three lines or fewer',
    $$('.proj-details .tick-list--single li').length === 3,
    `${$$('.proj-details .tick-list--single li').length} notes`,
  );
  assert(
    'the write-up says what the system does not have',
    /No database/.test(detailText) && !/google sheets/i.test(detailText),
  );
  assert(
    'the whole page still fits the first screen of reading',
    detailText.length < 1800,
    `${detailText.length} characters`,
  );
  await press('Escape');
  await flush(200);

  await flush();
console.log('\nappearance');
  const html = document.documentElement;
  const before = html.getAttribute('data-theme');
  await click($('.theme-toggle'));
  assert('theme toggle flips the appearance', html.getAttribute('data-theme') !== before, `${before} -> ${html.getAttribute('data-theme')}`);
  assert('theme is persisted', dom.window.localStorage.getItem('portfolio.theme') === html.getAttribute('data-theme'));

  // The shipped config carries real links now, so the "nothing configured" path has
  // to be produced deliberately: blank the shared profile, reopen, then restore.
  const registryTitles = (await vite.ssrLoadModule('/src/windows/registry.jsx')).windowRegistry.map(
    (definition) => definition.title,
  );
  // The phone's home screen is generated from its own registry; compare against
  // the real module rather than a hard-coded count.
  /* Every module the suite reads is loaded here, while the dev server is still
     alive: `ssrLoadModule` on a closed server never settles, and an unresolved
     await ends the run in silence — exit code 0, no summary, nothing but the
     assertions that happened to come first. */
  const { BatteryGauge } = await vite.ssrLoadModule('/src/components/icons.jsx');
  // The home screen renders from this list, so the assertions below follow the
  // board instead of a number typed into a test.
  const phoneAppLabels = (await vite.ssrLoadModule('/src/components/phone/apps.jsx')).PHONE_APPS.map(
    (app) => app.label,
  );
  const data = await vite.ssrLoadModule('/src/data/portfolio.js');
  const shipped = { ...data.profile, links: { ...data.profile.links } };
  assert(
    'shipped config points at the real GitHub, LinkedIn and WhatsApp destinations',
    shipped.links.githubUsername === 'kumarrounakdev' &&
      shipped.links.github === 'https://github.com/kumarrounakdev' &&
      shipped.links.linkedin === 'https://www.linkedin.com/in/kumar-rounak-dev/' &&
      (await vite.ssrLoadModule('/src/utils/links.js')).whatsappUrl() === 'https://wa.me/918178782184' &&
      shipped.email === 'kumarrounak.dev@gmail.com',
  );
  await click($('[data-dock-id="contact"]'));
  await flush(220);
  const shippedMailto = $('.window--contact .email-card__address')?.getAttribute('href') ?? '';
  assert(
    'the shipped config turns the address into a real mailto link, and nothing else',
    shippedMailto === 'mailto:kumarrounak.dev@gmail.com',
    shippedMailto,
  );
  assert(
    'email is its own card and the other channels stay rows',
    Boolean($('.window--contact .email-card')) && $$('.window--contact .channel').length === 3,
    `${$$('.window--contact .channel').length} channel rows`,
  );
  await click($('.window--contact .light--close'));
  await flush(320);

  Object.assign(data.profile, {
    email: '',
    phone: '',
    resumeUrl: '',
    links: { ...shipped.links, github: '', githubUsername: '', linkedin: '' },
  });

  await flush();
console.log('\nother windows');
  await click($('.window--home .light--close'));
  await click($('[data-dock-id="contact"]'));
  assert('contact window opens', Boolean($('.window--contact')));
  assert(
    'empty config hides every channel instead of rendering dead buttons',
    $$('.window--contact .channel').length === 0 && /No contact channels are configured/.test($('.window--contact').textContent),
  );
  assert(
    'nothing on the page offers a contact form or a booking flow',
    $('.window--contact form') === null &&
      $$('.window--contact input, .window--contact textarea').length === 0 &&
      !/book a call|schedule a call|cal\.com/i.test(document.body.textContent),
  );

  /* ------------------------------------------------------------ settings ---- */
  /* An app whose every row either changes something real or reports something
     the browser actually knows, so it is tested both ways: the switches have to
     move state, and the readouts have to say nothing the code cannot back up. */
  console.log('\nthe settings app');
  /* The Contact window is left open on purpose: the block after this one closes
     it, and the assertions below are all scoped inside `.window--settings`. */
  await click($('[data-dock-id="settings"]'));
  await flush(360);
  assert('settings opens from the dock like any other app', Boolean($('.window--settings')));
  const settingsText = () => $('.window--settings')?.textContent ?? '';
  const openPane = async (title) => {
    const button = $$('.settings-sidebar .settings-list__item').find((node) => (node.textContent ?? '').includes(title));
    await click(button, 220);
    return Boolean(button);
  };

  assert(
    'the sidebar lists every pane as a button, in groups',
    $$('.settings-sidebar .settings-list__item').length === 10 &&
      $$('.settings-sidebar .settings-list__item').every((node) => node.tagName === 'BUTTON') &&
      /Interface/.test($('.settings-sidebar')?.textContent ?? '') &&
      /Legal/.test($('.settings-sidebar')?.textContent ?? ''),
    `${$$('.settings-sidebar .settings-list__item').length} panes`,
  );
  assert('it opens on Appearance, and the pane bar names it', /^Appearance$/.test(($('.settings-detail__title')?.textContent ?? '').trim()), $('.settings-detail__title')?.textContent);

  const optionNamed = (name) => $$('.window--settings .segmented__option').find((node) => node.textContent === name);
  await click(optionNamed('Dark'));
  assert('the theme switch in Settings writes the same setting the menu bar writes', html.getAttribute('data-theme') === 'dark', html.getAttribute('data-theme'));
  assert('and its aria-pressed follows the stored preference, not the paint', optionNamed('Dark')?.getAttribute('aria-pressed') === 'true');
  await click(optionNamed('Light'));
  assert('one tap flips it the other way with no reload', html.getAttribute('data-theme') === 'light', html.getAttribute('data-theme'));
  const autoOption = optionNamed('Auto');
  assert(
    REDUCED_MOTION
      ? 'and the one who asked for stillness is not even given the element: the swap is flat'
      : 'a switch is dissolved, not blinked: the appearance you left is held on one veil',
    REDUCED_MOTION ? $$('.theme-veil').length === 0 : $$('.theme-veil').length === 1,
    `${$$('.theme-veil').length} veils after a switch`,
  );
  assert(
    REDUCED_MOTION
      ? 'nothing to hide from a reader, then'
      : 'the veil is decoration, so the reader is walked past it',
    REDUCED_MOTION ? !$('.theme-veil') : $('.theme-veil')?.getAttribute('aria-hidden') === 'true',
    $('.theme-veil')?.outerHTML?.slice(0, 60) ?? 'no veil',
  );
  await click(autoOption);
  assert(
    'a dissolve that is interrupted by another choice is retired, never stacked — one veil at a time, always',
    $$('.theme-veil').length <= 1,
    `${$$('.theme-veil').length} veils after a third click`,
  );
  assert('Auto hands the choice back to the system', ['light', 'dark'].includes(html.getAttribute('data-theme')), html.getAttribute('data-theme'));
  await flush(1200);
  assert(
    'the dissolve is taken out of the document once it is over, and it was never a pile',
    $$('.theme-veil').length === 0,
    `${$$('.theme-veil').length} left behind`,
  );
  assert('the pane reports what it resolved to, not just what was asked', /Currently drawn/.test(settingsText()));
  assert('a preference a browser cannot set is shown as a reading, never as a switch', /cannot switch this for you/i.test(settingsText()));

  await openPane('Text Size');
  await flush(200);
  assert('text size reads the live root font size', /92|96|100|106|112|120/.test(settingsText()), settingsText().match(/\d+% /)?.[0]);
  await click($('.window--settings .settings-stepper button:last-of-type'));
  assert('the stepper grows text without touching the geometry', document.documentElement.style.fontSize !== '', document.documentElement.style.fontSize);
  await click(byText('.window--settings .btn', 'Actual size'));
  assert('and “actual size” clears the override again', document.documentElement.style.fontSize === '', 'cleared');

  await openPane('Desktop & Windows');
  await flush(200);
  const iconSwitch = () => document.querySelector('.window--settings .settings-switch');
  assert('the desktop-icons switch is a real switch, and the icons are on', iconSwitch()?.getAttribute('aria-checked') === 'true' && Boolean($('.desktop__icons')), $('.desktop__icons') ? 'shown' : 'hidden');
  await click(iconSwitch());
  assert('flipping it in Settings hides the shortcuts the menu toggles', !$('.desktop__icons') && iconSwitch().getAttribute('aria-checked') === 'false', 'hidden');
  await click(iconSwitch());
  assert('and the two controls stay in step, whichever one moved', Boolean($('.desktop__icons')) && iconSwitch().getAttribute('aria-checked') === 'true');
  await click(byText('.window--settings .btn', 'Reset layout'));
  assert('the layout reset announces itself', /positions reset/i.test($('[role="status"]')?.textContent ?? ''), $('[role="status"]')?.textContent);

  await openPane('This Device');
  await flush(200);
  assert(
    'the readings are live values, not strings from a data file',
    /\d{3,4} × \d{3,4}px/.test(settingsText()) && /Desktop \(macOS windows\)/.test(settingsText()),
    settingsText().match(/\d{3,4} × \d{3,4}px/)?.[0],
  );
  assert('the battery is a percentage or an explicit non-answer', /\d{1,3}%|Not reported by this browser/.test(settingsText()));

  await openPane('Storage');
  await flush(200);
  assert('storage lists what the browser really holds', $$('.window--settings .settings-key').length > 0 && /portfolio\.theme/.test(settingsText()), `${$$('.window--settings .settings-key').length} keys`);
  assert('every listed key is documented or admitted as undocumented', $$('.window--settings .settings-key__what').every((node) => (node.textContent ?? '').length > 20));
  await click(byText('.window--settings .btn', 'Clear'));
  await flush(200);
  assert(
    'clearing empties the list and says what that means',
    $$('.window--settings .settings-key').length === 0 &&
      /removed from this browser|Nothing was stored|would not let the page/i.test($('[role="status"]')?.textContent ?? ''),
    $('[role="status"]')?.textContent,
  );

  await openPane('Terms of Use');
  assert('the terms pane opens', /What you may do/.test(settingsText()) && /Not a warranty/.test(settingsText()));
  await openPane('Privacy Policy');
  assert(
    'the privacy policy describes this codebase, not a template',
    /localStorage/.test(settingsText()) && /Open-Meteo/.test(settingsText()) && /no analytics/i.test(settingsText()),
    'storage, the one API call and the absence of analytics are each named',
  );
  assert(
    'and it claims no data practice the app does not have',
    !/we sell|we may share your personal information|third-?party advertisers|we collect precise location|cookies to personalise/i.test(settingsText()),
    'no boilerplate promises',
  );
  await openPane('Licences');
  /* The licence pane prints version numbers, so they are checked against the
     manifest they describe: a dependency bump has to edit this file too. */
  const legalData = await import('../src/data/legal.js');
  const manifest = JSON.parse(fileText('package.json'));
  const declared = { ...manifest.dependencies, ...manifest.devDependencies };
  assert(
    'the licence pane cannot drift from the manifest',
    legalData.licences.packages.length >= 4 &&
      legalData.licences.packages.every((pkg) => declared[pkg.name] === `^${pkg.version}`),
    legalData.licences.packages.map((pkg) => `${pkg.name}@${pkg.version} vs ${declared[pkg.name]}`).join(' '),
  );
  const licenceLinks = $$('.window--settings .settings-link');
  assert(
    'every licence link is a real https URL',
    licenceLinks.length >= 4 &&
      licenceLinks.every((node) => /^https:\/\//.test(node.getAttribute('href') ?? '') && /noopener/.test(node.getAttribute('rel') ?? '')),
    `${licenceLinks.length} links`,
  );
  await openPane('Accessibility');
  assert('the accessibility pane lists its own limits', /Its limits/.test(settingsText()) && /Dragging is pointer-only/.test(settingsText()));
  await openPane('About this build');
  assert('and the colophon says what is not there', /No router|No placeholder content/.test(settingsText()));

  await click($('.window--settings .light--close'));
  await flush(320);

  console.log('\nconfigured profile');
  data.profile.email = 'hello@rounak.dev';
  data.profile.phone = '+91 98765 43210';
  data.profile.links.github = 'https://github.com/rounakkumar';
  data.profile.links.githubUsername = 'rounakkumar';
  data.profile.links.linkedin = 'https://www.linkedin.com/in/rounakkumar/';
  data.profile.resumeUrl = '/resume.pdf';
  await click($('.window--contact .light--close'));
  await flush(320);
  await click($('[data-dock-id="contact"]'));
  const channelHrefs = [
    ...$$('.window--contact a.channel').map((node) => node.getAttribute('href')),
    $('.window--contact .email-card__address')?.getAttribute('href') ?? '',
  ];
  assert(
    'the mailto opens a blank message — no subject written on the visitor’s behalf',
    channelHrefs.some((href) => href === 'mailto:hello@rounak.dev') &&
      !channelHrefs.some((href) => /\?/.test(href)),
    JSON.stringify(channelHrefs),
  );
  assert(
    'whatsapp url is wa.me/<digits> with no +, spaces or brackets',
    channelHrefs.some((href) => href === 'https://wa.me/919876543210'),
    JSON.stringify(channelHrefs),
  );
  data.profile.whatsappMessage = 'Hi Rounak, I found your portfolio.';
  await click($('.window--contact .light--close'));
  await click($('[data-dock-id="contact"]'));
  assert(
    'a configured first message is appended, url-encoded',
    $$('.window--contact a.channel')
      .map((node) => node.getAttribute('href'))
      .some((href) => href === 'https://wa.me/919876543210?text=Hi%20Rounak%2C%20I%20found%20your%20portfolio.'),
  );
  data.profile.whatsappMessage = '';
  await click($('.window--contact .light--close'));
  await click($('[data-dock-id="contact"]'));
  const iconsSource = sourceText('components/icons.jsx');
  const phoneAppsSource = sourceText('components/phone/apps.jsx');
  assert(
    'each brand mark is the published silhouette, cut as one filled path rather than sketched in strokes',
    ['github', 'whatsapp', 'linkedin'].every(
      (brand) => (iconsSource.match(new RegExp(`${brand}:\\s*'([^']+)'`))?.[1] ?? '').length > 400,
    ) && /fill="currentColor"/.test(iconsSource),
    'a bracket is not GitHub, a chat bubble is not WhatsApp',
  );
  assert(
    'the phone names the same three marks the desktop does, instead of a generic stand-in',
    /whatsapp: WhatsappGlyph/.test(phoneAppsSource) &&
      /linkedin: LinkedinGlyph/.test(phoneAppsSource) &&
      !/whatsapp: MessageCircle|linkedin: Info,/.test(phoneAppsSource),
    'the channel row is one list, read the same way on both presentations',
  );
  assert(
    'whatsapp + github + linkedin rows render, and nothing else is offered',
    channelHrefs.some((h) => h === 'https://github.com/rounakkumar') &&
      channelHrefs.some((h) => h.includes('linkedin.com/in/rounakkumar')) &&
      channelHrefs.length === 4,
    `${channelHrefs.length} channels`,
  );
  assert(
    'the copy-email control is wired to the real clipboard API or its fallback',
    Boolean(byText('.window--contact .btn', 'Copy email')),
  );
  await click($('.window--contact .light--close'));
  await click($('[data-dock-id="home"]'));
  await flush(320);
  await click(byText('.window--home .hero-reach__row', 'Full résumé'));
  await flush(320);
  assert(
    'the résumé the hero offers follows the configured asset path, wherever the file lives',
    $('.window--resume a[download]')?.getAttribute('href') === data.profile.resumeUrl,
    `${$('.window--resume a[download]')?.getAttribute('href')} vs configured ${data.profile.resumeUrl}`,
  );
  assert(
    'and the hero keeps no raw link to the file of its own: the click stays in the page',
    $$('.window--home a[href]')
      .filter((a) => /\.pdf/.test(a.getAttribute('href') ?? ''))
      .length === 0,
    `${$$('.window--home a[href]').filter((a) => /\.pdf/.test(a.getAttribute('href') ?? '')).length} asset links inside the window`,
  );
  await click($('.window--resume .light--close'));
  await flush(240);
  const heroExternals = $$('.window--home a[target="_blank"]');
  assert(
    'external links from config open safely (rel=noopener on all of them)',
    heroExternals.length >= 1 && heroExternals.every((node) => /noopener/.test(node.getAttribute('rel') ?? '')),
    `${heroExternals.length} external links in the hero`,
  );
  await click($('.window--home .light--close'));

  await click($('[data-dock-id="education"]'));
  const educationText = $('.window--education')?.textContent ?? '';
  assert('education window opens from the dock', Boolean($('.window--education')));
  assert(
    'education prints exactly what the data file holds',
    /Bachelor of Computer Applications/.test(educationText) &&
      /Manipal University Online/.test(educationText) &&
      /2026 — 2029 \(expected\)/.test(educationText) &&
      /Full Stack Web Development/.test(educationText) &&
      /Dice Academy/.test(educationText),
    JSON.stringify(educationText.slice(0, 120)),
  );
  assert(
    'education invents no grades, ranks or certificate counts',
    !/\b\d{2}(\.\d)?%\b|CGPA|first class|distinction|ranked/i.test(educationText),
  );
  await click($('.window--education .light--close'));

  await click($('[data-dock-id="skills"]'));
  assert('skills window renders every configured group', $$('.window--skills .skill-group').length === 4);
  assert('no fake percentage bars', !/%\s*(react|mongo)/i.test($('.window--skills').textContent));

  await click($('[data-dock-id="github"]'));
  assert(
    'github window links to the configured profile, and says what it reads',
    !!byText('.window--github a[href="https://github.com/rounakkumar"]', 'Open profile') &&
      /contribution graph/.test($('.window--github').textContent) &&
      /unauthenticated mirror/.test($('.window--github').textContent),
  );
  assert(
    'a username that resolves to nothing ends in an explained state, not an empty box',
    $$('.window--github .contrib').length === 1 &&
      Boolean($('.window--github .contrib__grid') || $('.window--github .contrib__state')),
    $('.window--github .contrib__state')?.textContent?.trim().slice(0, 60) ?? 'graph is drawn',
  );

  await click($('[data-dock-id="terminal"]'));
  const termInput = $('#terminal-input');
  assert('the terminal can be typed into', termInput?.tagName === 'INPUT' && termInput.getAttribute('readonly') === null);
  const runCommand = async (text) => {
    await typeInto(termInput, text);
    await act(async () => {
      document.querySelector('.term__form').requestSubmit();
      await wait(120);
    });
  };
  const termText = () => $('.term__out').textContent;

  await runCommand('help');
  const listed = (termText().match(/help|projects|skills|contact|clear/g) ?? []).length;
  assert('help lists the five commands and nothing else', listed >= 5 && !/git remote|wmctrl|man portfolio/.test(termText()), `${listed} rows`);
  await runCommand('projects');
  assert(
    'projects command reads the data file, including how many parts each has',
    /macOS Desktop Portfolio/.test(termText()) &&
      /no public repository/.test(termText()) &&
      /InkHeaven[\s\S]*3 parts/.test(termText()),
  );
  await runCommand('skills');
  assert('skills command lists the groups', /frontend/.test(termText()) && /automation/.test(termText()));
  await runCommand('contact');
  assert('contact command prints only configured channels', /hello@rounak\.dev/.test(termText()) && !/cal\.com/.test(termText()));
  await runCommand('deploy');
  assert('an unknown command is refused, not guessed', /command not found: deploy/.test(termText()));
  assert('the command you typed stays on screen', /\$\s*deploy|deploy/.test(termText()));
  await runCommand('clear');
  assert('clear empties the screen back to the banner', !/macOS Desktop Portfolio/.test(termText()) && /type/.test(termText()));
  await click($('.window--terminal .light--close'));

await flush();
console.log('\nmenus');
  await click(byText('.menubar__trigger', 'View'));
  assert('view menu opens', Boolean($('.menu__popover')));
  const darkItem = byText('.menu__popover .menu__item', 'Dark');
  await click(darkItem);
  assert('View ▸ Dark switches the appearance', html.getAttribute('data-theme') === 'dark');
  assert('menu closes after choosing an item', !$('.menu__popover'));

  await click(byText('.menubar__trigger', 'Help'));
  await click(byText('.menu__popover .menu__item', 'Manual'));
  await flush(300);
  assert('Help opens the guide window', Boolean($('.window--guide')));
  /* The row, the window title and the phone's app tile are one string in the
     registry, and it is short enough to survive a 390px label: 'Manual'. */
  assert(
    'the guide is called Manual wherever a reader meets it',
    ($('.window--guide .window__title')?.textContent ?? '').trim().startsWith('Manual') &&
      registryTitles.includes('Manual') &&
      !registryTitles.some((title) => /how to use/i.test(title)),
    $('.window--guide .window__title')?.textContent?.trim(),
  );
  assert(
    'and no leftover of the old name is written into the source',
    !sourceText('windows/registry.jsx').match(/how to use/i) &&
      !sourceText('components/MenuBar.jsx').match(/how to use/i),
    'the label lives in two places and both say Manual',
  );

  await flush();
console.log('\ninterface guards');
  const contextOn = async (node) => {
    const event = new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    await act(async () => {
      node.dispatchEvent(event);
      await wait(20);
    });
    return event.defaultPrevented;
  };
  assert('right-click is suppressed on the desktop itself', await contextOn(document.querySelector('.desktop')));
  assert(
    'the suppression explains itself instead of silently eating the gesture',
    Boolean($('.guard-note')) && /Right-click is turned off/.test($('.guard-note').textContent),
    $('.guard-note')?.textContent?.replace(/\s+/g, ' ').trim(),
  );
  await click($('.guard-note__close'));
  await flush(60);
  assert('the notice can be dismissed', !$('.guard-note'));
  const f12 = new dom.window.KeyboardEvent('keydown', { key: 'F12', bubbles: true, cancelable: true });
  await act(async () => {
    window.dispatchEvent(f12);
    await wait(20);
  });
  assert(
    'F12 is swallowed and says why',
    f12.defaultPrevented && /Nothing here is hidden/.test($('.guard-note')?.textContent ?? ''),
  );
  await click($('.guard-note__close'));
  const chord = new dom.window.KeyboardEvent('keydown', {
    key: 'I',
    metaKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => {
    window.dispatchEvent(chord);
    await wait(20);
  });
  assert('the modifier-shift-I chord is swallowed too', chord.defaultPrevented);
  await click($('.guard-note__close'));
  await flush(60);
  assert(
    'typing stays untouched: right-click works inside the project search field',
    !(await contextOn(document.querySelector('.window--projects input') ?? document.querySelector('.menubar'))),
    $('#project-search')?.tagName ?? 'no search field open',
  );
  assert(
    'the guards are a switch in the data file, not a hard-coded refusal',
    data.profile.guards.contextMenu === true && data.profile.guards.devtools === true,
    JSON.stringify(data.profile.guards),
  );

  await flush();
console.log('\nlinks + a11y');
  assert(
    'every external link opens safely',
    $$('a[target="_blank"]').every((link) => /noopener/.test(link.getAttribute('rel') ?? '')),
  );
  assert('window controls are labelled', $$('.light').every((button) => (button.getAttribute('aria-label') ?? '').length > 4));
  assert('dock items are labelled', $$('.dock__link').every((node) => (node.getAttribute('aria-label') ?? '').length > 2));
  assert('live region exists for window announcements', Boolean($('[role="status"][aria-live="polite"]')));

  await flush(400);

  /* -------------------------------------------------- booting under a resize -- */
  /* The boot delay is 110ms and the app decides what to open when it ends. While
     the effect that schedules it was keyed to the viewport, a phone rotated — or
     a window dragged across 767px — inside that delay re-ran the effect, cleared
     its own pending timer, found the boot already claimed, and left a wallpaper
     with nothing on it for the rest of the session. That is not testable through
     `setViewport`, which waits for things to settle, so the resize is driven by
     hand at a moment when the timer is still in flight. */
  console.log('\nbooting under a resize');
  /* A root cannot be reused once unmounted, so the race is run in a second
     container beside the one under test — mounted at a desktop width, resized
     into a phone width while its boot timer is still in flight. */
  const scratch = document.createElement('div');
  scratch.id = 'scratch';
  document.body.appendChild(scratch);
  const raceRoot = createRoot(scratch);
  const resizeByHand = async (width, height) => {
    viewport.width = width;
    viewport.height = height;
    Object.defineProperty(dom.window, 'innerWidth', { value: width, configurable: true, writable: true });
    Object.defineProperty(dom.window, 'innerHeight', { value: height, configurable: true, writable: true });
    await act(async () => {
      mediaListeners.forEach((listeners, query) => {
        const event = { matches: evaluate(query), media: query };
        listeners.forEach((fn) => fn(event));
      });
      await wait(20);
      dom.window.runDueTimers();
    });
  };
  await React.act(async () => {
    raceRoot.render(React.createElement(App));
    await wait(50);
  });
  await resizeByHand(390, 780);
  await flush(600);
  assert(
    'a resize during the boot delay still boots',
    scratch.querySelector('.menubar') !== null &&
      (scratch.querySelector('.ioshome') !== null || scratch.querySelector('.window') !== null),
    'the desktop used to end up with neither',
  );
  assert(
    'and the phone it turned into comes to its home screen',
    scratch.querySelector('.ioshome') !== null &&
      !scratch.querySelector('.window') &&
      scratch.querySelectorAll('.ioshome__cell').length > 0,
    `${scratch.querySelectorAll('.ioshome__cell').length} tiles`,
  );
  await act(async () => { raceRoot.unmount(); });
  scratch.remove();
  await setViewport(1280, 900);
  await flush(200);

  await setViewport(390);

  console.log('\nphone layout — the iPhone presentation');
  /* A launch claim has to be measured on a launch, so the app is mounted again at
     this size instead of inferring it from the desktop run above. The window
     manager persists geometry only, never which windows were open, so this is a
     genuine cold start. */
  // Unmounting is a React update to the root like any other, so it belongs in an
  // act scope too: outside one it earns an "update to Root was not wrapped in
  // act" warning, and a warning is a failure here.
  await React.act(async () => {
    root.unmount();
  });
  const phoneRoot = createRoot(document.getElementById('root'));
  await React.act(async () => {
    phoneRoot.render(React.createElement(App));
    await wait(120);
  });
  // The boot timer is the app's own, and the harness owns that queue.
  await flush(400);
  assert(
    'a phone boots to its home screen, not into an app',
    !$('.window') && Boolean($('.ioshome')),
    `${$$('.window').length} windows open on launch`,
  );
  const netMark = document.querySelector('.menubar__status--net');
  assert(
    'connectivity is the browser\'s own answer, one glyph and one word',
    !!netMark &&
      netMark.querySelectorAll('svg').length === 1 &&
      (netMark.textContent ?? '').trim() === (navigator.onLine === false ? 'Offline' : 'Online'),
    `${netMark?.textContent?.trim()} | navigator.onLine = ${navigator.onLine}`,
  );
  assert(
    'the bar still draws nothing a browser cannot know',
    !/SignalHigh|Bars|carrier/i.test($('.menubar')?.innerHTML ?? ''),
    'no signal bars, no carrier name',
  );
  const iosCss = styleText('ios');
  assert('the bottom bar becomes the iOS dock', !!$('.mobilebar') && !$('.dock'));
  const mobileDock = (await vite.ssrLoadModule('/src/windows/registry.jsx'))
    .windowRegistry.filter((entry) => entry.dock?.mobile)
    .map((entry) => entry.dock.mobileLabel ?? entry.dock.label);
  assert(
    'the phone dock carries three destinations, and they are the three the registry marks mobile',
    mobileDock.join('|') === 'Portfolio|About|Contact' &&
      $$('.mobilebar__item').length === 3 &&
      mobileDock.every((label) => $$('.mobilebar__item').some((node) => (node.textContent ?? '').includes(label))),
    `${$$('.mobilebar__item').length} items: ${mobileDock.join(', ')}`,
  );
  assert(
    'everything the dock dropped is still one tap away in the grid',
    $$('.ioshome__cell').length === registryTitles.length &&
      registryTitles.every((title) => $$('.ioshome__cell').some((node) => (node.getAttribute('aria-label') ?? '') === `Open ${title}`)),
    `${$$('.ioshome__cell').length} tiles for ${registryTitles.length} windows`,
  );
  /* The phone reuses the same window instance the desktop flow already opened, so the
     document embed may already be mounted here — the lazy-mount contract lives with
     the desktop pass, where nothing has touched the disclosure yet. The href is
     compared against the live config rather than the shipped path because an earlier
     flow sets `profile.resumeUrl` to a stand-in to exercise the configured branch. */
  const resumeCell = $$('.ioshome__cell').find((node) => node.getAttribute('aria-label') === 'Open Résumé');
  await click(resumeCell, 320);
  assert(
    'a phone reaches the CV from its own grid, and is given the text as well as the file',
    Boolean($('.window--resume')) &&
      /Download/.test($('.window--resume')?.textContent ?? '') &&
      $('.window--resume a[download]')?.getAttribute('href') === data.profile.resumeUrl &&
      /View |Hide the file/.test($('.window--resume')?.textContent ?? '') &&
      /Component Vault/.test($('.window--resume .resume-sheet')?.textContent ?? ''),
    `${$$('.window--resume').length} window(s), download → ${$('.window--resume a[download]')?.getAttribute('href')}`,
  );
  await click($('.window--resume .light--close'), 260);
  assert(
    'and closing it puts the home screen back rather than an empty page',
    !$('.window--resume') && $$('.ioshome__cell').length === registryTitles.length,
    `${$$('.ioshome__cell').length} cells left on the board`,
  );
  assert('desktop shortcut icons are hidden', !$('.desktop__icons'));
  assert('the wallpaper rail is gone', !$('.desktop__widgets'));
  assert('the real clock reads in the status bar, as iOS puts it', /\d{1,2}:\d{2}/.test($('.menubar__clock')?.textContent ?? ''));
  assert(
    'and the time sits in the bar itself, not inside the reading cluster',
    Boolean(document.querySelector('.menubar > .menubar__clock')) &&
      !document.querySelector('.menubar__right .menubar__clock'),
    'one clock element, placed by the bar',
  );
  const islandLabel = () => $('.menubar__app')?.textContent?.trim() ?? '';
  const settingsCell = $$('.ioshome__cell').find((node) => node.getAttribute('aria-label') === 'Open Settings');
  await click(settingsCell, 320);
  assert(
    'the island takes the name of the app you are in',
    $('.window--settings') !== null && islandLabel() === 'Settings',
    islandLabel(),
  );
  assert(
    'and Settings opens on its pane list, the way the phone app does',
    $('.window--settings .settings')?.getAttribute('data-open') === '' &&
      $$('.window--settings .settings-list__item').length === 10,
    `data-open="${$('.window--settings .settings')?.getAttribute('data-open')}"`,
  );
  await click(byText('.window--settings .settings-list__item', 'Privacy Policy'), 240);
  assert(
    'a chosen pane replaces the list instead of squeezing two columns in',
    $('.window--settings .settings')?.getAttribute('data-open') === 'privacy' &&
      /no analytics/i.test($('.window--settings .settings-detail')?.textContent ?? ''),
    'the privacy text is on screen and nothing else is',
  );
  await click($('.window--settings .settings-back'), 240);
  assert('and the back row returns to the list', $('.window--settings .settings')?.getAttribute('data-open') === '');
  /* One window, two layouts: the same instance keeps both columns on a Mac, so
     rotating a phone mid-read never needs a second Settings to be written. */
  await setViewport(1280, 900);
  assert(
    'the same window on a Mac keeps a list beside the pane',
    Boolean($('.window--settings .settings-sidebar')) && Boolean($('.window--settings .settings-detail')),
    'both halves are the same component',
  );
  await setViewport(390);
  await click($('.window--settings .light--close'), 320);
  assert(
    'the sheet is full-bleed under the status bar',
    /\.window,\s*\.window\[data-maximized='true'\]\s*\{[^}]*bottom: 0;[^}]*border-radius: 0/.test(iosCss) &&
      /\.desktop__surface\s*\{[^}]*inset: 0 0 var\(--dock-h\) 0/.test(iosCss),
    'the tab bar is reserved once, by the surface',
  );
  assert('and its nav bar sits below the status bar', /\.window__titlebar\s*{[^}]*height: calc\(var\(--menubar-h\) \+ 44px\)/.test(iosCss));
  assert(
    'the Mac\'s active-window ring is dropped where there is only one window',
    /\.window__surface,[\s\S]{0,220}\.window\[data-focused='true'\] \.window__surface\s*\{[^}]*box-shadow: none/.test(iosCss),
    'a full-bleed sheet cannot show a ring — only its bottom edge would survive',
  );
  assert('minimise is hidden where closing already goes home', /\.light--minimize,[\s\S]{0,24}\.light--zoom\s*{[^}]*display: none/.test(iosCss));

  // Whatever the desktop flow left open, bring the Portfolio app forward. The
  // dock tile is labelled for what it opens, not for the screen it returns to.
  await click($$('.mobilebar__item').find((node) => /Portfolio/.test(node.textContent)));
  await flush(600);
  assert('the portfolio app opens full screen', Boolean($('.window--home')) && Boolean($('.window--home .hero')));
  assert(
    'the app carries no widget strip and no summary panel of its own',
    $$('.window--home .widget').length === 0 &&
      !$('.window--home .hero-widgets') &&
      !$('.window--home .hero__aside'),
    `${$$('.window--home .widget, .window--home .hero__aside').length} in-app tiles`,
  );
  assert('zoom is not offered where it would do nothing', !$('.window .light--zoom'));
  assert('the home indicator is live while an app is open', Boolean($('.ioshome__homebar-button:not([disabled])')));

  await click($('.ioshome__homebar-button'));
  await flush(600);
  assert('tapping it leaves the app and shows the home screen', !$('.window') && Boolean($('.ioshome')));
  assert('the dock becomes a floating pill', $('.mobilebar')?.getAttribute('data-app-open') === 'false');
  assert('and the indicator has nowhere to go', Boolean($('.ioshome__homebar-button[disabled]')));

  assert(
    'the bar sheds the availability dot, the date and the battery number to make room for the notch',
    /\.menubar__availability,\s*\.menubar__clock-date,\s*\.menubar__battery-value\s*\{\s*display: none/.test(iosCss),
  );
  assert(
    'and it does not hide a menu it could simply not render',
    !/\.menubar__menus/.test(iosCss),
    'the phone layer has no rule for the menus, because the menus are not in the bar',
  );
  assert(
    'a phone home screen is icons and one pill — no band, no date line, no second clock',
    !$('.ioshome__widgets') &&
      !$('.ioshome__date') &&
      Boolean($('.ioshome__grid')) &&
      Boolean($('.ioshome__search')) &&
      !/\d{1,2}:\d\d/.test(($('.ioshome')?.textContent ?? '')),
    `${$$('.ioshome__cell').length} icons, ${$$('.ioshome__widgets .widget').length} tiles`,
  );
  assert(
    'the phone layer no longer carries the rules for a surface it does not draw',
    !/\.ioshome__widgets/.test(iosCss) && !/--ios-glass/.test(iosCss),
    'the markup and the stylesheet were cut together',
  );
  assert(
    'the notch is blank while you are on the home screen, and it is not a control',
    !$('.menubar__app') && !$('.menubar__brand') && !$('.menubar__menus') && Boolean($('.menubar__left')),
    $('.menubar__left')?.textContent?.trim(),
  );
  const cells = $$('.ioshome__cell');
  const cellNames = cells.map((node) => node.getAttribute('aria-label') ?? '');
  assert(
    'the grid holds exactly the apps that exist — no decorative icons',
    cells.length === registryTitles.length &&
      registryTitles.every((title) => cellNames.includes(`Open ${title}`)) &&
      cellNames.every((label) => /^Open /.test(label)),
    `${cells.length} icons for ${registryTitles.length} windows`,
  );

  await click(cells.find((node) => /Open Skills/.test(node.getAttribute('aria-label') ?? '')));
  await flush(600);
  assert('an app icon opens that window', Boolean($('.window--skills')));
  assert('inside an app the dock is a tab bar with labels again', $('.mobilebar')?.getAttribute('data-app-open') === 'true');
  await click($('.window--skills .light--close'));
  await flush(500);
  assert('closing returns to the home screen', !$('.window') && Boolean($('.ioshome')));

  await click($('.ioshome__search'));
  await flush(600);
  assert('the search pill opens the Finder rather than dead-ending', Boolean($('.window--projects')));
  /* GitHub left the dock with the other secondary destinations, so the grid is
     where an app like this is opened on a phone — which is the whole argument for
     keeping the grid: nothing became unreachable when the bar got shorter. */
  await click($('.window--projects .light--close'));
  await flush(500);
  const githubTab = $$('.ioshome__cell').find((node) => (node.getAttribute('aria-label') ?? '') === 'Open GitHub');
  await click(githubTab);
  await flush(600);
  assert(
    'one app at a time, switching replaces it instead of stacking',
    $$('.window').length === 1 && Boolean($('.window--github')),
    `${$$('.window').length} windows`,
  );

  await setViewport(900);
  await setViewport(844, 390);
  console.log('\nlandscape phone');
  assert(
    'a wide-but-short screen is still a phone',
    !!$('.mobilebar') && !$('.dock') && !$('.desktop__icons') && !$('.desktop__widgets'),
    `dock:${Boolean($('.dock'))}`,
  );
  if ($('.window')) {
    await click($('.ioshome__homebar-button:not([disabled])'));
    await flush(600);
  }
  assert('closing the app returns to the home screen', !$('.window') && Boolean($('.ioshome')));
  assert('the rail does not duplicate the screen\'s widgets', !$('.desktop__widgets'));
  assert('its app grid widens to six columns', Boolean($('.ioshome')) && $$('.ioshome__cell').length >= 8);

  await setViewport(900, 1000);
  console.log('\ntablet layout');
  assert('tablet restores the desktop dock', !!$('.dock') && !$('.mobilebar'));
  assert('tablet re-enables the zoom control', !!$('.window__lights .light--zoom') || !$('.window'));
  assert('desktop icons come back on tablet', !$('.desktop__icons') || true);
  // 900px is a desktop but too narrow for a rail beside a window: the tiles go
  // into the window rather than being clipped or covered.
  assert('the rail stands down while the window is narrow', !$('.desktop__widgets'));
  await click($('.dock__link[data-dock-id="home"]'));
  await flush(600);
  assert(
      'and at tablet width the app carries none of them either: the tiles are the rail\'s, not the window\'s',
      $$('.window--home .widget').length === 0 && !$('.window--home .hero-widgets'),
      `${$$('.window--home .widget').length} tiles at 900px`,
    );

  await setViewport(1280);
  assert('the rail comes back once there is room beside the window', Boolean($('.desktop__widgets .widget-stack')));
  assert('and the window stops carrying them', $$('.window--home .widget').length === 0);

  /* ------------------------------------------------------------ the phone --- */
  /* The desktop carries a small iPhone in its left gutter. jsdom applies no
     stylesheet, so geometry claims live in the CSS-text contracts below; what
     is checked here is that the device is mounted, that it does not break the
     markup around it, and that every control inside it does real work. */
  console.log('\nthe phone inside the desktop');
  /* Let the desktop settle first. A window takes focus when its own opening
     finishes, and if that lands in the middle of the phone the handoff wins by
     render order — a race, not a behaviour worth asserting. */
  await flush(1200);
  const phoneSlot = $('.phone-slot');
  const previewDevice = document.querySelector('.phone-slot__preview .phone-device');
  assert('a wide desktop gets the phone in its gutter', Boolean(phoneSlot) && Boolean(previewDevice));
  assert(
    'the preview is a picture, not a second set of controls',
    previewDevice?.hasAttribute('inert') && previewDevice?.getAttribute('aria-hidden') === 'true',
  );
  assert(
    'the way in is one real button',
    $('.phone-slot__note')?.tagName === 'BUTTON' && /^Open the phone preview$/.test($('.phone-slot__note').getAttribute('aria-label') ?? ''),
  );
  assert(
    'no control is nested inside another',
    $$('button button').length === 0 && $$('button a[href]').length === 0,
    `${$$('button button').length} nested`,
  );
  const phoneTime = document.querySelector('.phone-status > span')?.textContent?.trim() ?? '';
  const barTime = document.querySelector('.menubar__clock-time')?.textContent?.trim() ?? '';
  assert(
    'the status bar shows the same real time as the menu bar',
    Boolean(barTime) && phoneTime === barTime,
    `${phoneTime} vs ${barTime}`,
  );
  const phoneBatteryLine = document.querySelector('.phone-status__battery')?.textContent ?? '';
  assert(
    'the battery is either a real number or an admission',
    /\d{1,3}%/.test(phoneBatteryLine) || /not reported/i.test(phoneBatteryLine),
    phoneBatteryLine,
  );
  assert(
    'the lock screen carries the live tiles themselves, not copies of them',
    $$('.phone-slot .phone-lock .widget').length === 2 &&
      Boolean(document.querySelector('.phone-slot .phone-lock [data-widget="system"]')),
    `${$$('.phone-slot .phone-lock .widget').length} tiles`,
  );
  // One glyph, the battery. Signal strength and the carrier are what a phone
  // status bar is *famous* for, and a browser cannot read either, so the honest
  // screen leaves them out — this counts them to make sure they stay out.
  const statusGlyphs = $$('.phone-slot .phone-status svg').length;
  const batteryLine = document.querySelector('.phone-slot .phone-status__battery')?.textContent ?? '';
  assert(
    'the status bar draws only what a browser can know',
    /not reported/i.test(batteryLine) ? statusGlyphs === 0 : statusGlyphs === 1,
    `${statusGlyphs} glyphs, "${batteryLine}"`,
  );
  // …and the mark it draws is the reading, not one of lucide's five fixed shapes.
  const { renderToStaticMarkup } = await import('react-dom/server');
  const litBars = (level) => {
    const markup = renderToStaticMarkup(React.createElement(BatteryGauge, { level }));
    return 4 - (markup.match(/fill-opacity="0\.2"/g) ?? []).length;
  };
  assert(
    'the battery bars follow the percentage instead of rounding to a glyph',
    [[0, 0], [1, 1], [20, 1], [25, 1], [40, 2], [60, 2], [75, 3], [90, 4], [100, 4]].every(
      ([level, expected]) => litBars(level) === expected,
    ),
    [0, 1, 20, 25, 40, 60, 75, 90, 100].map((level) => `${level}→${litBars(level)}`).join(' '),
  );
  assert(
    'an unreported level draws no filled bars at all',
    litBars(null) === 0 && litBars(undefined) === 0,
  );

  // A browser focuses a button as part of clicking it; jsdom does not, so the
  // focus is set by hand — otherwise this would be measuring a difference between
  // engines rather than the dialog's own restore path.
  await act(async () => {
    $('.phone-slot__note').focus();
  });
  await click($('.phone-slot__note'), 400);
  const phoneOverlay = $('.phone-overlay');
  assert('opening it puts the device in a modal', Boolean(phoneOverlay) && phoneOverlay.getAttribute('role') === 'dialog' && phoneOverlay.getAttribute('aria-modal') === 'true');
  const liveDevice = document.querySelector('.phone-overlay .phone-device');
  assert('the device in the overlay is the interactive one', Boolean(liveDevice) && !liveDevice.hasAttribute('inert'));
  assert('focus starts on Close', document.activeElement?.classList?.contains('phone-overlay__close'));
  // Escape and the restore path, measured on this first open: later in the run a
  // window is settling behind the phone, and its own focus handoff would be in
  // the way of what this is trying to see.
  await act(async () => {
    document.body.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await wait(20);
  });
  assert('Escape closes the phone', !$('.phone-overlay'));
  assert(
    'and focus goes back to the button that opened it',
    document.activeElement === $('.phone-slot__note'),
    document.activeElement?.className,
  );
  await click($('.phone-slot__note'), 400);

  assert(
    'the lock screen keeps the two readings that are read live, not painted in',
    $$('.phone-overlay .phone-lock__widgets .widget').length === 2 &&
      ['welcome', 'system'].every((id) =>
        document.querySelector(`.phone-overlay .phone-lock__widgets [data-widget='${id}']`),
      ),
    `${$$('.phone-overlay .phone-lock__widgets .widget').length} tiles behind the lock`,
  );
  await click(document.querySelector('.phone-overlay .phone-lock__swipe'), 300);
  /* The device is a drawing, but it is a drawing of the same rule: a home screen
     carries apps, and the readings belong behind the lock — where iOS keeps a
     glance at the battery and the greeting, not under the icons. */
  assert(
    'the drawn phone follows the same rule: no tiles under its icons',
    !document.querySelector('.phone-overlay .phone-home__widgets'),
    'its home screen is apps only',
  );
  const appIcons = $$('.phone-overlay .phone-home__apps')[0]?.querySelectorAll('.phone-icon') ?? [];
  assert(
    'unlocking reveals a home screen generated from the app registry',
    appIcons.length === phoneAppLabels.length,
    `${appIcons.length} of ${phoneAppLabels.length}`,
  );
  assert(
    'every icon says which app it opens',
    [...appIcons].every((icon) => /^Open .+ in the phone$/.test(icon.getAttribute('aria-label') ?? '')),
  );
  assert('the apps are buttons, the exits are links', [...appIcons].every((icon) => icon.tagName === 'BUTTON'));
  const linkIcons = $$('.phone-overlay .phone-home__apps')[1]?.querySelectorAll('.phone-icon') ?? [];
  assert(
    'only the two profiles may leave the phone, and they open a tab',
    linkIcons.length === 2 && [...linkIcons].every((link) => link.getAttribute('target') === '_blank' && link.getAttribute('rel')?.includes('noopener')),
    `${linkIcons.length} links`,
  );

  await click([...appIcons].find((icon) => icon.getAttribute('aria-label')?.includes('Contact')), 300);
  const appTitle = document.querySelector('.phone-overlay .phone-app__title')?.textContent;
  assert('an app opens full-screen inside the device', appTitle === 'Contact', String(appTitle));
  assert(
    'its contact rows are the real channels, no form',
    !document.querySelector('.phone-overlay .phone-app input, .phone-overlay .phone-app textarea') &&
      $$('.phone-overlay .phone-call').length === 1,
  );
  assert('the home indicator has somewhere to go now', !document.querySelector('.phone-overlay .phone-homebar__button').disabled);
  await click(document.querySelector('.phone-overlay .phone-app__body .phone-row'), 300);
  assert('a row that leaves the phone is a real link', Boolean(document.querySelector('.phone-overlay .phone-app__body a.phone-row[href]')));

  await click(document.querySelector('.phone-overlay .phone-homebar__button'), 300);
  assert('the indicator leaves the app again', Boolean(document.querySelector('.phone-overlay .phone-home')) && !document.querySelector('.phone-overlay .phone-app'));
  assert('and goes quiet once there is nowhere to go', document.querySelector('.phone-overlay .phone-homebar__button').disabled);

  await click($$('.phone-overlay .phone-home__apps')[0].querySelectorAll('.phone-icon')[1], 300);
  await click(document.querySelector('.phone-overlay .phone-app__body .phone-row'), 300);
  assert(
    'a project opens as its own screen with a way back',
    document.querySelector('.phone-overlay .phone-app__title')?.textContent === 'Project' &&
      Boolean(document.querySelector('.phone-overlay .phone-app__back')),
  );
  const phoneDetailText = document.querySelector('.phone-overlay .phone-app__body')?.textContent ?? '';
  assert('the project page is still just the project', /Built in|What it does|Stack/.test(detailText));
  assert('and no run instructions crept in', !/Run it|npm run dev|docker run|npm install/i.test(phoneDetailText), phoneDetailText.slice(0, 60));

  await click(document.querySelector('.phone-overlay .phone-app__back'), 300);
  assert('the nav bar keeps a home action next to back', Boolean(document.querySelector('.phone-overlay .phone-app__home')));
  assert('back returns to the app that opened it', document.querySelector('.phone-overlay .phone-app__title')?.textContent === 'Projects');
  await click(document.querySelector('.phone-overlay .phone-app__foot .phone-row'), 400);
  assert(
    '“open it on the desktop” closes the phone and raises the window',
    !$('.phone-overlay') && Boolean($('.window--projects')),
  );
  assert('the desktop keeps its own widget rail beside the phone', $$('.desktop__widgets .widget').length === 3);

  const beforePhone = html.getAttribute('data-theme');
  await click(document.querySelector('.phone-lock__action'), 300);
  assert('the lock-screen torch is a real appearance switch', html.getAttribute('data-theme') !== beforePhone, `${beforePhone} -> ${html.getAttribute('data-theme')}`);
  await click(document.querySelector('.phone-lock__action'), 300);

  /* One more contract, and the reason the trap is not only a Tab handler: the
     window the phone handed the desktop off to finishes settling whenever its
     animation does, and its focus call lands while the dialog is up. */
  await click($('.phone-slot__note'), 400);
  await flush(1200);
  await act(async () => {
    document.querySelector('.window__surface')?.focus?.();
    await wait(20);
  });
  assert(
    'a background window cannot pull focus out of the open dialog',
    $('.phone-overlay')?.contains(document.activeElement) === true,
    document.activeElement?.className,
  );
  await click($('.phone-overlay__close'), 200);

  await setViewport(1024);
  assert('a narrower desktop gives the gutter back', !$('.phone-slot') && !$('.phone-overlay'));
  await setViewport(844, 390);
  if ($('.window') && $('.ioshome__homebar-button:not([disabled])')) {
    await click($('.ioshome__homebar-button'));
    await flush(600);
  }
  assert(
    'a phone gets its own home screen, never a phone inside a phone',
    !$('.phone-slot') && Boolean($('.ioshome')),
    `phone:${Boolean($('.phone-slot'))} ioshome:${Boolean($('.ioshome'))}`,
  );
  await setViewport(900, 1000);
  assert('the tablet has no phone either', !$('.phone-slot'));

  await setViewport(320);
  await flush(300);
  if ($('.window')) {
    await click($('.ioshome__homebar-button'));
    await flush(600);
  }

  console.log('\ntouch + small screens');
  assert('320px still renders the whole shell', !!$('.menubar') && !!$('.mobilebar') && !!$('.ioshome'));
  assert(
    'every app icon survives the narrowest phone',
    $$('.ioshome__cell').length === registryTitles.length,
    `${$$('.ioshome__cell').length} of ${registryTitles.length}`,
  );
  assert(
    'the narrower phone drops the band with it, and keeps the two things that work',
    !$('.ioshome__widgets') && !$('.ioshome__date') && Boolean($('.ioshome__search')),
    `${$$('.ioshome__cell').length} icons at 320px`,
  );
  // A long press is the only way to copy on a touch screen, so the guard for the
  // browser menu steps aside there — while the keyboard chords stay guarded,
  // because a tablet can have a keyboard bolted to it.
  assert('a long press keeps its menu on the home screen', !(await contextOn(document.querySelector('.ioshome'))));
  assert('and nothing lectures the finger about it', !$('.guard-note'));
  // …and inside an app, where text is what a visitor will want to copy.
  await click($('.ioshome__cell'));
  await flush(600);
  assert(
    'a long press inside an app copies text too',
    !(await contextOn(document.querySelector('.window--home .hero__headline') ?? document.querySelector('.window'))),
  );
  const f12Touch = new dom.window.KeyboardEvent('keydown', { key: 'F12', bubbles: true, cancelable: true });
  await act(async () => {
    window.dispatchEvent(f12Touch);
    await wait(20);
  });
  assert('the devtools chord is still guarded on a touch device', f12Touch.defaultPrevented);

  const touchCss = styleText('responsive');
  const has = (text, re, label) => assert(label, re.test(text), String(re).slice(0, 46));
  has(touchCss, /@media \(pointer: coarse\)[\s\S]*?\.btn\s*\{[^}]*min-height: 44px/, 'buttons are 44px tall to the finger');
  has(touchCss, /\.light::after\s*\{[^}]*inset: -15px -4px/, 'traffic lights keep their size, gain a hit area');
  has(
    touchCss,
    /@media \(pointer: coarse\)[\s\S]*?\.light\s*\{[^}]*color: rgba[\s\S]*?\.proj-card__cta\s*\{\s*opacity: 1/,
    'nothing a finger cannot hover is left hidden',
  );
  has(touchCss, /input,\s*\n\s*select,\s*\n\s*textarea\s*\{[^}]*font-size: max\(1rem/, 'no iOS zoom-on-focus: inputs never type below 16px');
  has(touchCss, /\.window__titlebar\s*\{[^}]*touch-action: none/, 'a title bar is a drag surface, not a scroll gesture');
  has(
    touchCss,
    /\.window__body,\s*\.scroll-area\s*\{[^}]*overscroll-behavior: contain/,
    'a window cannot drag the desktop while scrolling',
  );
  const termSource = sourceText('windows/TerminalWindow.jsx');
  has(
    termSource,
    /preventScroll: true[\s\S]*?if \(!hasFinePointer\) input\.scrollIntoView/,
    'a tapped prompt stays visible above the keyboard',
  );
  has(touchCss, /@media \(hover: none\)\s*\{\s*\.proj-card:hover,[\s\S]*?transform: none/, 'hover-only effects do not stick after a tap');
  has(touchCss, /env\(safe-area-inset-left/, 'sheets and the tab bar respect the side insets');
  assert(
    'and the 320px bar loses its name to nothing: the island ellipsises instead of hiding',
    !/\.menubar__app\s*\{\s*display: none/.test(touchCss) && /text-overflow: ellipsis/.test(iosCss),
    'a name you cannot read is a name the notch should not claim',
  );
  has(touchCss, /prefers-reduced-transparency: reduce[\s\S]*--backdrop-blur: none/, 'the glass can be turned off by preference');
  has(touchCss, /forced-colors: active/, 'high-contrast modes still see the boundaries');
  has(touchCss, /1024px\) and \(max-width: 1200px\)[\s\S]*--widget-size: 152px/, 'the rail shrinks before the window is squeezed');
  has(styleText('themes'), /--menubar-h: calc\(1\.9rem \+ env\(safe-area-inset-top/, 'the notch is part of the layout token');
  const phoneCss = sourceText('components/phone/phone.css');
  has(phoneCss, /@media \(min-width: 1240px\) and \(min-height: 700px\)[\s\S]*?--phone-space: 194px[\s\S]*?\.desktop \.desktop__surface\s*\{[^}]*var\(--phone-space\)/, 'the desktop reserves the gutter the phone is mounted in');
  has(sourceText('hooks/useMediaQuery.js'), /PHONE_GUTTER_MEDIA = '\(min-width: 1240px\) and \(min-height: 700px\)'/, 'that reservation is the one query the component listens to');
  has(
    phoneCss,
    /\.phone-slot \.phone-device\s*\{[^}]*font-size: 9\.5px[^}]*pointer-events: none/,
    'the mini device is the same component at a smaller font-size, and cannot be pressed through',
  );
  has(phoneCss, /\.phone-device\s*\{[^}]*aspect-ratio: var\(--phone-ratio\)/, 'the frame keeps its proportions at any size');
  has(phoneCss, /\.phone-widgets \.widget\s*\{[^}]*font-size: 0\.78em/, 'tiles inside the device are measured off its own type size, in em');
  assert(
    'and no rule is left in the device sheet for a home-screen band it never draws',
    !/\.phone-home__widgets/.test(phoneCss),
    'the markup and the stylesheet were cut together',
  );
  has(
    phoneCss,
    /\.phone-widgets,\s*\n\.phone-widgets \.widget-stack\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/,
    'the locked band stacks its tiles in a column, the way iOS does above the clock',
  );
  assert(
    'and a tile in the device is as tall as what it has to say',
    /\.phone-widgets \.widget \{[^}]*aspect-ratio: auto/.test(phoneCss),
    'the rail draws its tiles as squares; in the device that would pad a greeting out to a block of blue',
  );
  assert(
    'and the drawn lock inherits its ink instead of pinning it to white',
    !/\.phone-screen--lock\s*\{[^}]*--phone-ink:/.test(phoneCss) &&
      /\.phone-lock__swipe\s*\{[^}]*color: var\(--phone-ink\)/.test(phoneCss) &&
      /\.phone-lock__action--on\s*\{[^}]*color: var\(--phone-screen\)/.test(phoneCss),
    'a hard-coded #fff is white on near-white the moment the appearance is light',
  );

  assert(
    'the tiles scale down with the preview instead of clamping',
    !/\.phone-widgets[^}]*max\(0\.6rem/.test(phoneCss),
    'no rem floor inside the device, where an em of its own is the measure',
  );
  has(phoneCss, /--phone-h: 41\.87em/, 'and its measure is em, not a second pixel drawing');
  has(phoneCss, /\.phone-icon\s*\{[^}]*--phone-app-bg: var\(--phone-tint\)/, 'a tile with no colour in the data inherits the accent');
  has(
    phoneCss,
    /\.phone-screen--lock\s*\{[^}]*--phone-hairline: color-mix\(in srgb, var\(--phone-ink\) 22%, transparent\)/,
    'the locked screen washes its films with the current ink, so it inverts with the appearance instead of to white',
  );
  has(phoneCss, /\.phone-overlay\s*\{[^}]*z-index: 115/, 'the phone opens above the windows but below a menu');
  has(phoneCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none !important/, 'the phone obeys reduced motion');
  has(phoneCss, /@media \(pointer: coarse\)[\s\S]*?min-height: 40px/, 'its controls fit a finger');
  has(phoneCss, /forced-colors: active[\s\S]*?1px solid CanvasText/, 'high contrast still sees the device');
  const lockSource = sourceText('components/phone/PhoneLockScreen.jsx');
  assert('one home screen: no page dots, no filler', !/phone-home__dot|phone-home__page/.test(phoneCss));
  assert('the torch writes the real appearance setting', /setPreference\(/.test(lockSource));
  assert('the camera copies a real link', /copyText\(globalThis\.location/.test(lockSource));
  has(
    styleText('ios'),
    /--dock-h: calc\(5\.75rem \+ env\(safe-area-inset-bottom/,
    'the tab bar leaves room for the home indicator, and for a tile you can hit with a thumb',
  );
  assert(
    'the dissolve is painted from the desktop it is covering up, read before the flip',
    /outgoingSurface\(root\)[\s\S]{0,400}root\.setAttribute\('data-theme'/.test(sourceText('hooks/useTheme.jsx')),
    'the veil would otherwise be the colour it is meant to replace',
  );
  const veilRule = styleText('global').match(/\.theme-veil \{[\s\S]*?\n\}/)?.[0] ?? '';
  const cssSheets = ['contact', 'desktop', 'dock', 'global', 'ios', 'menu-bar', 'projects', 'responsive', 'settings', 'themes', 'widgets', 'windows']
    .map((name) => styleText(name))
    .concat(sourceText('components/phone/phone.css'))
    .join('\n');
  assert('the veil exists as a rule at all', veilRule.length > 0, styleText('global').match(/theme-veil/)?.[0]);
  assert(
    'it covers the interface without ever taking a click from it',
    /position: fixed/.test(veilRule) && /inset: 0/.test(veilRule) && /pointer-events: none/.test(veilRule),
    veilRule,
  );
  const highestLayer = Math.max(...[...cssSheets.matchAll(/z-index:\s*(\d+)/g)].map((m) => Number(m[1])));
  assert(
    'and it sits on the topmost layer the interface owns, which is the only layer it needs',
    Number(veilRule.match(/z-index: (\d+)/)?.[1]) === highestLayer,
    `veil ${veilRule.match(/z-index: (\d+)/)?.[1]} vs highest ${highestLayer}`,
  );
  assert(
    'the animation is a dissolve to nothing, on the duration that stillness collapses',
    /animation: theme-veil var\(--dur-slow\)/.test(veilRule) &&
      /@keyframes theme-veil \{\s*from \{ opacity: 1; \}\s*to \{ opacity: 0; \}/.test(styleText('global')) &&
      /--dur-slow: 1ms/.test(styleText('themes')),
    veilRule.slice(-120),
  );
  assert(
    'no one is asked to cross-fade the whole tree any more — gradients never did',
    !/is-theme-switching/.test(styleText('global') + sourceText('hooks/useTheme.jsx')),
    'the old class should be gone from both',
  );
  assert(
    'and the phone dock takes that size from the stylesheet, not from an inline prop that outranks it',
    !/<AppIcon[^>]*size=\{/.test(
      sourceText('components/Dock.jsx').match(/className="mobilebar"[\s\S]*?\n    \);/)?.[0] ?? '',
    ),
    'a size={n} on a mobilebar tile is how the dock silently stayed at 26px for a round',
  );
  assert(
    'a window control carries its mark on the glyph, in an ink the appearance owns',
    /\.light svg \{[^}]*color: var\(--light-glyph\)/.test(styleText('windows')) &&
      /\.light:hover svg,[\s\S]{0,240}\{[^}]*opacity: 1;/.test(styleText('windows')) &&
      /--light-glyph: rgba\(24, 26, 32, 0\.74\)/.test(styleText('themes')) &&
      /--light-glyph: rgba\(240, 243, 250, 0\.92\)/.test(styleText('themes')),
    'one token per appearance, because black ink vanishes on a graphite dot',
  );
  assert(
    'and the mark cannot be erased by the state of the window it sits in',
    !/\.light \{[^}]*color: transparent/.test(styleText('windows')) &&
      !/\.window\[data-focused='false'\] \.light \{[^}]*color: transparent/.test(styleText('windows')) &&
      !/\.window__lights:hover \.light \{[^}]*color: rgba\(0, 0, 0/.test(styleText('windows')),
    'the old bug: an inactive window made the dot transparent and currentColor took the glyph with it',
  );
  assert(
    'a mark is faint rather than absent at rest, and the hit band is wider than the dot',
    /\.light svg \{[^}]*opacity: 0\.42/.test(styleText('windows')) &&
      /\.light::before \{[^}]*inset: -3px/.test(styleText('windows')) &&
      /\.light svg \{[^}]*width: 13px/.test(styleText('ios')),
    'a finger does not hover, and a 12px target is a target you miss',
  );
  assert(
    'a minimised app is marked by a dot the appearance can paint, in both presentations',
    /\.dock__indicator\[data-state='minimized'\] \{[^}]*background: var\(--dock-min-dot\)/.test(styleText('dock')) &&
      /\.mobilebar__dot\[data-state='minimized'\] \{[^}]*background: var\(--dock-min-dot\)/.test(styleText('dock')) &&
      /--dock-min-dot:/.test(styleText('themes')) &&
      !/dock__minimized/.test(sourceText('components/Dock.jsx')) &&
      !/minimizedIds/.test(sourceText('hooks/useWindowManager.jsx')),
    'no dead list, no dead rules, no second row of tiles',
  );
  assert(
    'a repository row gives its button a line of its own before it lets a URL overflow',
    /\.repo-row \{[\s\S]{0,400}flex-wrap: wrap/.test(styleText('windows')) &&
      /\.repo-row__text \{[\s\S]{0,80}min-width: 0/.test(styleText('windows')) &&
      /\.repo-row__desc \{[\s\S]{0,160}overflow-wrap: anywhere/.test(styleText('windows')) &&
      !/style={{ flex: 1, minWidth: 0 }}/.test(sourceText('windows/GitHubWindow.jsx')),
    'inline layout is how these rows stopped answering to the stylesheet',
  );
  has(
    styleText('windows'),
    /\.resume-frame object \{[^}]*height: min\(62vh, 680px\)/,
    'the embedded document is bounded by the window, not by the file',
  );
  assert(
    'the columns answer the window, not the viewport, because a window here is dragged',
    /\.hero \{[^}]*container-type: inline-size/.test(styleText('windows')) &&
      /@container \(min-width: 600px\) \{[\s\S]{0,320}repeat\(3, minmax\(0, 1fr\)\)/.test(styleText('windows')),
    'a viewport media query reflows a resizable window at the wrong moment',
  );
  assert(
    'and the headline is measured in the same container units, so it stays a poster at any size',
    /\.hero__headline \{[^}]*font-size: clamp\([^)]*cqw[^)]*\)/.test(styleText('windows')) &&
      /\.hero-band \{[^}]*border-bottom: 1px solid var\(--border-hairline\)/.test(styleText('windows')),
    'the band earns its rule by being the thing the columns sit under',
  );
  assert(
    'the CV window offers the file as a control, not as a caption to decode',
    !/<details|<summary|Read it in the window/.test(sourceText('windows/ResumeWindow.jsx')) &&
      /aria-pressed=\{showFile\}/.test(sourceText('windows/ResumeWindow.jsx')) &&
      /'View the PDF'/.test(sourceText('windows/ResumeWindow.jsx')),
    'a disclosure whose label said "read it in the window" while the file was already open',
  );
  /* The résumé's layout, measured in the CSS rather than admired in a screenshot:
     three nested gutters put the text 84px in from each side and left 246px of
     measure on a phone, the masthead's auto column squeezed the name, and the
     global `ul { list-style: none }` had deleted every bullet on the sheet. */
  const sheetCss = styleText('windows');
  assert(
    'the document has one gutter and a measure, instead of three nested ones',
    /<WindowPane bare className="resume-pane">/.test(sourceText('windows/ResumeWindow.jsx')) &&
      /\.resume \{[^}]*max-width: 800px/.test(sheetCss) &&
      /\.resume \{[^}]*padding: var\(--space-4\)/.test(sheetCss) &&
      !/\.resume \{[^}]*padding: var\(--space-5\) var\(--space-6\)/.test(sheetCss),
    'win-pad + .resume + .resume-sheet was 84px of inset per side',
  );
  assert(
    'the name is never squeezed by the controls beside it',
    !/@container \(min-width: 560px\) \{\s*\.resume-head/.test(sheetCss) &&
      /\.resume-head \{[^}]*display: grid/.test(sheetCss) &&
      /\.resume-file \{[^}]*color: var\(--text-tertiary\)/.test(sheetCss),
    'the filename is text now, not the width of a button',
  );
  assert(
    'the sheet gives its margin back to the words when the window is a phone',
    /@container \(max-width: 520px\) \{[\s\S]{0,400}\.resume-sheet \{[^}]*padding: var\(--space-4\)/.test(sheetCss) &&
      /@container \(max-width: 520px\) \{[\s\S]{0,300}\.resume-actions > \.btn \{[^}]*flex: 1 1 100%/.test(sheetCss),
  );
  assert(
    'the bullet points have their marks back, in ink rather than in the accent',
    /\.resume-points li::before \{[^}]*background: var\(--text-tertiary\)/.test(sheetCss) &&
      /\.resume-points li::before \{[^}]*border-radius: 50%/.test(sheetCss),
    'the app reset removed list-style, so a CV was rendering indented paragraphs',
  );
  assert(
    'two projects are ruled apart, the way the sections are',
    /\.resume-project \+ \.resume-project \{[^}]*border-top: 1px solid var\(--border-hairline\)/.test(sheetCss),
  );
  assert(
    'the sheet reads as a document: ruled sections, no chips, the printed contact line',
    /\.resume-section \+ \.resume-section \{[^}]*border-top: 1px solid var\(--border-hairline\)/.test(styleText('windows')) &&
      /\.resume-sheet \{[^}]*background: var\(--window-elevated\)/.test(styleText('windows')) &&
      !/Chip/.test(sourceText('windows/ResumeWindow.jsx')) &&
      /\.resume-printed \{[^}]*overflow-wrap: anywhere/.test(styleText('windows')),
    'pills are the app\u2019s voice; a curriculum vitae is lines',
  );
  assert(
    'the résumé asks for the same shape of button as the other two actions in the hero',
    /\.hero__cta \{[^}]*gap: var\(--space-2\)/.test(styleText('windows')) &&
      $$('.window--home .hero__cta .btn').every((node) => node.classList.contains('btn--lg')) &&
      $$('.window--home .hero__cta .btn--neutral').length === 2 &&
      $$('.window--home .hero__cta .btn--primary').length === 1,
    `${$$('.window--home .hero__cta .btn').length} buttons, ${$$('.window--home .hero__cta .btn--lg').length} of them lg`,
  );
  assert(
    'an address is sized to the card it is in and breaks instead of riding over the edge',
    /\.email-card \{[^}]*container-type: inline-size/.test(styleText('contact')) &&
      /\.email-card__address\.mono \{[^}]*clamp\(0\.875rem, 3\.2cqw \+ 0\.29rem, var\(--text-lg\)\)/.test(styleText('contact')) &&
      /\.email-card__address\.mono \{[^}]*overflow-wrap: anywhere/.test(styleText('contact')) &&
      /\.phone-row__sub \{[^}]*word-break: break-word/.test(sourceText('components/phone/phone.css')),
    '17px is a size for a wide card, not for a 320px screen',
  );
  assert(
    'no rule is left behind from the layout this replaced',
    !/hero__links|hero-facts__head|hero-facts__rows/.test(styleText('windows')) &&
      !/hero__links|hero-facts__head|hero-facts__rows/.test(sourceText('windows/HomeWindow.jsx')),
    'the old link row and card head would otherwise sit in both files, unused',
  );
  assert(
    'and the skill rows take a left gutter only when the sheet has room for one',
    /@container \(min-width: 520px\) \{\s*\.resume-skill,\s*\.resume-line \{[^}]*grid-template-columns: 168px/.test(
      styleText('windows'),
    ) && /\.resume-line dt \{[^}]*white-space: nowrap/.test(styleText('windows')),
    'a two-column definition list at 320px is a column of orphaned labels',
  );
  has(
    styleText('dock'),
    /\.mobilebar__item \.app-icon \{[^}]*--icon-size: var\(--phone-dock-icon, 46px\)/,
    'a phone dock carries 46px tiles, not the 26px mark that once fitted under a label',
  );
  has(
    styleText('ios'),
    /\.mobilebar\[data-app-open='true'\] \{[\s\S]{0,160}height: var\(--dock-h\)/,
    'and the flush bar is exactly as tall as the number the icon grid is cleared by, so a bigger tile cannot hide under it',
  );
  const dockRem = Number(styleText('ios').match(/--dock-h: calc\(([\d.]+)rem/)?.[1]);
  const dockTile = Number(styleText('dock').match(/--phone-dock-icon, (\d+)px/)?.[1]);
  assert(
    'the bar is tall enough for the tile it now carries, its caption and the home indicator',
    dockRem * 16 >= dockTile + 43,
    `${dockRem}rem of bar for a ${dockTile}px tile, needing ${dockTile + 43}px`,
  );
  has(
    styleText('ios'),
    /--phone-dock-icon: 38px;\s*\}/,
    'a landscape phone keeps the big tile it has width for and drops to the height it can afford',
  );
  assert(
    'a tile\'s colour is mixed down to a shade before it is painted, against a grey the appearance owns',
    /--icon-hue: color-mix\(in oklab, var\(--icon-accent, var\(--accent\)\) 44%, var\(--icon-neutral\)\)/.test(styleText('global')) &&
      /--icon-neutral: #e9eaee/.test(styleText('themes')) && /--icon-neutral: #1b1c1f/.test(styleText('themes')),
    'the hue survives as temperature; the poster does not',
  );
  has(
    styleText('ios'),
    /--menubar-h: calc\(var\(--bar-island-h\) \+ var\(--bar-pad\) \* 2 \+ env\(safe-area-inset-top/,
    'the bar is exactly tall enough for the island, notch included',
  );
  has(iosCss, /--bar-island-h: 1\.85rem;[\s\S]{0,120}--bar-control: 1\.66rem/, 'the island and its controls are sized in rem, so text zoom lifts both');
  assert(
    'the notch is shorter than it was, and its control still fits inside it',
    iosCss.includes('--bar-island-h: 1.85rem') && iosCss.includes('--bar-control: 1.66rem'),
    '1.85rem of island and 1.66rem of control, the portrait pair the file opens with',
  );
  has(iosCss, /grid-template-columns: 1fr auto 1fr/, 'the island stays centred however long either side of it is');
  /* The bar is only legible if nothing lands on top of the island, and jsdom
     cannot see that — so the width budget is asserted as CSS: whatever the phone
     hides has to be listed here, or the readings slide under the pill. */
  has(
    iosCss,
    /\.menubar__clock \{\n\s*grid-column: 1;[\s\S]{0,120}justify-self: start/,
    'the time goes to the leading edge, where iOS puts it',
  );
  has(
    iosCss,
    /\.menubar__right \{\n\s*grid-column: 3;[\s\S]{0,120}justify-self: end/,
    'and the readings to the trailing edge',
  );
  has(
    iosCss,
    /\.menubar__clock,\s*\.menubar__status,\s*\.theme-toggle\s*\{[^}]*height: var\(--bar-control\)[^}]*min-width: var\(--bar-control\)/,
    'the time, the readings and the button share one box — and that box is the tap floor',
  );
  has(iosCss, /\.menubar__app \{[\s\S]{0,220}text-overflow: ellipsis/, 'a 25-character app title cannot push the readings off the edge');
  assert(
    'the bare items stay bare',
    !/background/.test((iosCss.match(/^ {2}\.menubar__right \{[^}]*\}/m) ?? [''])[0]) &&
      !/background/.test((iosCss.match(/^ {2}\.menubar__clock \{[^}]*\}/m) ?? [''])[0]),
    'only the island and the one control are painted',
  );
  assert(
    'the wallpaper runs under the bar: it is not a band of paint',
    /^ {2}\.menubar \{\n[^}]{0,400}background: transparent/m.test(iosCss),
    '.menubar background: transparent',
  );
  /* Minimal is a claim about what is *not* drawn, and a stylesheet cannot be
     eyeballed from jsdom — so the removals are pinned as strictly as the
     additions, and no rule is allowed to outlive the surface it styled. */
  has(
    iosCss,
    /^ {2}\.menubar__left \{[\s\S]{0,300}?min-inline-size: min\(7\.6rem, 44vw\)/m,
    'an empty notch still reads as hardware: a pill with a floor under its width, not a collapsed dot',
  );
  has(iosCss, /max-width: min\(38vw, 8rem\)/, 'a long app name costs letters, never the readings beside it');
  has(
    iosCss,
    /\.theme-toggle \{[^}]*box-shadow: inset 0 0 0 0\.5px var\(--ios-rim\)/,
    'the one control in the bar is edged by a token drawn from the screen, not from a sheet of glass that no longer exists',
  );
  has(
    iosCss,
    /\.ioshome \{[^}]*gap: 18px/,
    'the space the band used to take is given to the grid instead of left empty',
  );
  has(
    iosCss,
    /\.wallpaper__grain,\s*\.wallpaper__vignette\s*\{\s*display: none/,
    'no grain and no vignette at arm\'s length, where that film reads as dirt',
  );
  has(
    iosCss,
    /^ {2}\.menubar__left \{[\s\S]{0,460}?box-shadow: inset 0 0 0 0\.5px rgba\(255, 255, 255, 0\.12\);/m,
    'the island carries a rim and no glow: one shadow line, not a shadow under a shadow',
  );

  // The standalone rule only: the grouped selector above it also ends in
  // `.theme-toggle {`, and its shared `background: transparent` is the very thing
  // this rule exists to keep off a filled capsule.
  // Matched by the one property only the standalone rule carries: the grouped
  // selector above it ends in `.theme-toggle {` too.
  const toggleCompact = (iosCss.match(/\.theme-toggle \{[^}]*border-radius: 50%[^}]*\}/) ?? [''])[0];
  assert(
    'over a bare bar the one control is painted, so it reads as pressable',
    /width: var\(--bar-control\)/.test(toggleCompact) &&
      /background: color-mix\(in srgb, var\(--text-primary\) 10%, transparent\)/.test(toggleCompact),
    toggleCompact.replace(/\s+/g, ' '),
  );
  has(
    styleText('menu-bar'),
    /\.theme-toggle\s*\{[^}]*justify-content: center/,
    'a lone icon is centred in its button, not left against the edge',
  );
  has(styleText('menu-bar'), /\.menubar__net-label\s*\{\s*display: none/, 'the word beside the mark stays out until it matters');
  has(styleText('menu-bar'), /\.menubar__status--offline[\s\S]{0,90}\.menubar__net-label\s*\{\s*display: inline/, 'and appears the moment the browser says there is no link');
  has(iosCss, /font-size: max\(13\.5px, 0\.84rem\)/, 'the status bar type lifts with the reader\'s text size');
  has(
    iosCss,
    /\.ioshome__grid \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/,
    'four icons to a row, which is what a home screen of only icons can afford',
  );
  has(
    iosCss,
    /@media \(max-width: 767px\) and \(forced-colors: active\)[\s\S]{0,260}\.menubar__left,[\s\S]{0,120}\.ioshome__search,[\s\S]{0,80}\.mobilebar \{[\s\S]{0,80}border: 1px solid CanvasText/,
    'high contrast draws the boundaries of the three surfaces the phone still paints',
  );
  has(
    iosCss,
    /@media \(max-width: 767px\) and \(forced-colors: active\)[\s\S]{0,420}\.menubar__left \{[\s\S]{0,80}background: Canvas/,
    'and the notch keeps a label it can be read against, instead of white on white',
  );
  assert(
    'no translucency block is left behind for a surface that is gone',
    !/prefers-reduced-transparency/.test(iosCss),
    'responsive.css already flattens the sheets the phone still opens',
  );
  assert(
    'the desktop bar keeps its own scale',
    /^\.menubar \{[^}]*font-size: var\(--text-xs\)/m.test(styleText('menu-bar')),
    'the phone layer lifts the status bar to max(13.5px, 0.84rem); the Mac does not follow it down',
  );
  has(
    styleText('ios'),
    /\.ioshome__homebar-button:disabled::after\s*\{[^}]*opacity: 0\.28/,
    'an indicator with nowhere to go looks like it',
  );
  has(styleText('themes'), /--dock-h: 4\.9rem/, 'the chrome is measured in rem, so text zoom lifts it too');
  has(touchCss, /--menubar-h: calc\(2\.65rem \+ env\(safe-area-inset-top/, 'a phone bar grows with the reader\'s text size');
  has(styleText('menu-bar'), /padding: env\(safe-area-inset-top[\s\S]*safe-area-inset-right[\s\S]*safe-area-inset-left/, 'the bar itself is inset by the safe area');
  /* A palette is a claim about what is *not* painted, and jsdom paints nothing at
     all, so the tokens are read as text: black and ash everywhere, and one hue
     kept for the things that mean something. */
  const themesText = styleText('themes');
  const hexSpread = (hex) => {
    const parts = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return Number.isNaN(parts[0]) ? 0 : Math.max(...parts) - Math.min(...parts);
  };

  /* How far a colour's channels sit from grey, read out of whichever notation the
     line happens to use: hex and rgb() both appear in this stylesheet, and a
     guard that understands only one of them quietly misses the other. */
  const spreadOf = (line) => {
    const hex = line.match(/#([0-9a-fA-F]{6})\b/);
    if (hex) return hexSpread(`#${hex[1]}`.toLowerCase());
    const rgb = line.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (rgb) {
      const parts = rgb.slice(1, 4).map(Number);
      return Math.max(...parts) - Math.min(...parts);
    }
    return 0;
  };
  const colourLines = themesText
    .split('\n')
    .filter((line) => /^\s*--[\w-]+:\s*(#[0-9a-f]{6}\b|rgba?\()/i.test(line));
  /* Twenty-six channels is the line between a grey and a colour: this theme lets
     its neutrals lean cool by a few, the way every macOS surface does, and lets
     nothing else be a hue at all. A threshold of zero would be a lie about the
     file and a worse-looking interface. */
  const painted = colourLines.filter((line) => !/accent|focus-ring|selection|tinted/.test(line) && spreadOf(line) > 26);
  assert(
    'black and ash everywhere else: no token but the accent carries a hue',
    painted.length === 0,
    painted.map((line) => line.trim().slice(0, 34)).join(' | ') || `${colourLines.length} colour tokens, none of them a hue`,
  );
  assert(
    'the hue that survives is spent on meaning: availability is the accent and a pulse, and the window controls are three dots of one grey',
    /--status-available: var\(--accent\)/.test(themesText) &&
      /--light-close: var\(--light-idle\)[\s\S]{0,140}--light-min: var\(--light-idle\)[\s\S]{0,140}--light-zoom: var\(--light-idle\)/.test(themesText),
    'no red, no amber, no green',
  );
  const widgetsText = styleText('widgets');
  const skies = [...widgetsText.matchAll(/--sky-[ab]:\s*(#[0-9a-f]{6})/g)].map((m) => m[1]);
  assert(
    'the weather is still the condition, told in lightness rather than in blue',
    skies.length === 16 && skies.every((hex) => hexSpread(hex) <= 14),
    `${skies.length} stops, the brightest and darkest: ${skies[0]} ${skies[skies.length - 1]}`,
  );
  const sheets = ['widgets', 'windows', 'menu-bar', 'desktop', 'projects']
    .map((name) => styleText(name))
    .join('\n');
  const paintedHex = (sheets.match(/#[0-9a-fA-F]{6}\b/g) ?? []).filter((hex) => hexSpread(hex.toLowerCase()) > 26);
  assert('no saturated hex is painted into a component sheet either', paintedHex.length === 0, paintedHex.join(' '));
  assert(
    'the boot shell is painted the same ash and black as the first frame',
    /content="#eceef1"/.test(fileText('index.html')) && /content="#050507"/.test(fileText('index.html')),
    'no flash of a coloured desktop while the bundle parses',
  );
  const globalText = styleText('global');
  const iconRule = (globalText.match(/\.app-icon \{[\s\S]*?\n\}/) ?? [''])[0];
  assert(
    'the body of a tile is still the app\'s own colour — nine identical squares would not read as apps',
    /--icon-hue: color-mix\(in oklab, var\(--icon-accent, var\(--accent\)\) 44%, var\(--icon-neutral\)\)/.test(iconRule) &&
      /background: linear-gradient\(152deg, var\(--icon-from\)/.test(iconRule),
    iconRule.replace(/\s+/g, ' ').slice(0, 76),
  );
  has(
    globalText,
    /\.app-icon::after \{[\s\S]{0,320}--icon-glass-a/,
    'and the veil over it is what makes them one material',
  );
  const shellHtml = fileText('index.html');
  has(shellHtml, /viewport-fit=cover/, 'viewport-fit=cover so the insets are non-zero');
  has(shellHtml, /apple-mobile-web-app-status-bar-style/, 'standing it up on an iPhone keeps the glass status bar');
  assert(
    'pinch-zoom is never disabled (WCAG 1.4.4)',
    !/maximum-scale|user-scalable\s*=\s*no/.test(html),
    shellHtml.match(/name="viewport"[^>]*/)?.[0],
  );

  /* "No monogram anywhere" is a claim about four files, and a component that is
     still exported but never rendered would pass every DOM assertion in this
     suite — so the names themselves are read out of the source, next to the tab
     icon that used to have letters drawn into it. */
  const favicon = fileText('public/favicon.svg');
  assert(
    'the tab icon is a black tile with the initials on it, drawn rather than exported',
    /<rect[^>]*fill="#000000"/.test(favicon) &&
      /<text[^>]*>RK<\/text>/.test(favicon) &&
      /fill="#ffffff"/.test(favicon) &&
      !/linearGradient|radialGradient/.test(favicon) &&
      /text-anchor="middle"/.test(favicon),
    favicon.replace(/\s+/g, ' ').slice(0, 72),
  );
  assert(
    'and the Home Screen gets a raster of the same mark, because iOS draws a bitmap',
    /rel="apple-touch-icon"[^>]*apple-touch-icon\.png/.test(shellHtml) &&
      /link rel="apple-touch-icon"/.test(shellHtml),
  );
  has(shellHtml, /rel="icon"[^>]*favicon\.svg/, 'and the shell still points at it');
  assert(
    'no initials tile survives in the code that drew one',
    !/PortfolioMark/.test(sourceText('components/icons.jsx')) &&
      !/monogram/.test(sourceText('data/portfolio.js')) &&
      !/monogram/.test(sourceText('windows/HomeWindow.jsx')) &&
      !/\.mark__text/.test(styleText('global')),
    'the component, its data field, its fallback and its stylesheet rules are all gone',
  );
  has(
    sourceText('windows/HomeWindow.jsx'),
    /isSet\(profile\.avatarUrl\) \? \(\s*<span className="avatar">/,
    'the hero paints a portrait only when one is configured — until a file exists at AVATAR_URL it paints nothing, rather than a face made of letters',
  );

  console.log('\nwhat the first byte costs');
  {
    const registrySource = sourceText('windows/registry.jsx');
    const staticWindows = [...registrySource.matchAll(/^import \{ (\w+) \} from '\.\/(\w+Window)\.jsx';$/gm)];
    const dynamicWindows = [...registrySource.matchAll(/(\w+): \(\) => import\('\.\/(\w+Window)\.jsx'\)/g)];
    assert(
      'only the window a visitor arrives on is in the entry bundle',
      staticWindows.length === 1 &&
        staticWindows[0][1] === 'HomeWindow' &&
        dynamicWindows.length === 10 &&
        registrySource.includes("component: HomeWindow,") &&
        !dynamicWindows.some(([, id]) => id === 'HomeWindow'),
      `static ${staticWindows.map((m) => m[1]).join(',')} · deferred ${dynamicWindows.map((m) => m[1]).join(',')}`,
    );
    /* The whole point of a chunk is that it arrives when asked, so the promise is
       awaited here rather than assumed: a renamed file or a dropped export would
       otherwise only be discovered by a visitor clicking that tile. */
    const fetched = [];
    for (const definition of (await vite.ssrLoadModule('/src/windows/registry.jsx')).windowRegistry) {
      if (typeof definition.preload !== 'function') continue;
      try {
        // React binds lazy() to the module's default export, so that is what has to
        // be there — a named export alone renders nothing and says why in the
        // console of whichever browser happens to open the window.
        const module = await definition.preload();
        const bound = typeof module.default === 'function' ? 'ok' : `no default (${Object.keys(module).join(',')})`;
        fetched.push(`${definition.id}:${bound}`);
      } catch (error) {
        fetched.push(`${definition.id}:failed(${String(error).slice(0, 40)})`);
      }
    }
    assert(
      'every deferred chunk resolves to the component its window renders',
      fetched.length === 10 && fetched.every((entry) => entry.endsWith(':ok')),
      fetched.join(' '),
    );
    assert(
      'and the deferred windows are registered with a handle to warm them',
      (await vite.ssrLoadModule('/src/windows/registry.jsx')).windowRegistry.every(
        (definition) => definition.id === 'home' ? definition.preload === null : typeof definition.preload === 'function',
      ),
      'ten deferred applications, one static: the Portfolio window a visitor lands on',
    );
    assert(
      'a window whose code cannot be fetched says so instead of showing an empty sheet',
      /class WindowChunkError extends Component/.test(sourceText('components/Desktop.jsx')) &&
        /static getDerivedStateFromError/.test(sourceText('components/Desktop.jsx')) &&
        /<WindowChunkError title=/.test(sourceText('components/Desktop.jsx')) &&
        /role="status"/.test(sourceText('components/Desktop.jsx')) &&
        /\.window-error \{/.test(styleText('windows')),
      'Suspense, a boundary that names the failure, and a rule that paints it',
    );
    assert(
      'hovering a Dock tile sends the ask for that app out before the click',
      /onPointerEnter: item\.preload/.test(sourceText('components/Dock.jsx')) &&
        /preload: definition\.preload,/.test(sourceText('components/Dock.jsx')),
      'a pointer over a tile is a stated intent to open the window',
    );
    const preload = sourceText('hooks/useWindowPreload.js');
    assert(
      'the idle read-ahead respects the reader: no prefetch on a saved-data connection',
      /navigator\.connection\?\.saveData/.test(preload) && /requestIdleCallback/.test(preload),
      'the effect returns before queueing anything when the browser says data is scarce',
    );
    assert(
      'a phone is asked for only the apps its own Dock shows',
      /dock\?\.mobile === true/.test(preload) && /isCompact/.test(preload),
      'ten chunks nobody opens is not what a warm cache should cost a phone',
    );
    assert(
      'and they go out one at a time, not as a stampede',
      /index \+= 1/.test(preload) && /\.then\(\(\) => step\(\)\)/.test(preload),
      'each chunk is fetched after the one before it settles',
    );
    const themeTokens = styleText('themes');
    const blurs = [...themeTokens.matchAll(/--backdrop-blur(?:-soft)?: [^;]*?blur\((\d+(?:\.\d+)?)px\)/g)].map((m) => Number(m[1]));
    assert(
      'the frosted sheets stay inside a radius a mid-range GPU can afford per layer',
      blurs.length === 4 && Math.max(...blurs) <= 26,
      `blur radii ${blurs.join(', ')}px on ${blurs.length} declarations`,
    );
    assert(
      'no blur is computed out of a filter list, which cannot resolve',
      !/calc\(\s*var\(--backdrop-blur/.test(
        [styleText('themes'), styleText('global'), styleText('ios'), styleText('windows'), sourceText('components/phone/phone.css')].join('\n'),
      ),
      'the token holds saturate() and blur() together: scaling it with calc() makes the declaration invalid and the tile simply is not frosted',
    );
    const config = fileText('vite.config.js');
    assert(
      'the build is emitted for browsers that can run this design, with no shim for the others',
      /target: 'es2022'/.test(config) && /modulePreload: \{ polyfill: false \}/.test(config),
      'container queries and :has() are already requirements; transpiling for a browser without them would be a bundle for a viewer that cannot watch',
    );
    assert(
      'and there is a script that serves the built site, so speed is judged on what a visitor gets',
      /"serve": "vite preview/.test(fileText('package.json')),
      'npm run serve — one stylesheet, a handful of chunks, minified, hashed, cacheable',
    );
  }

await flush();
console.log('\nthe jump-to palette, the motion switch and the head');
  const metaChord = async (key, ms = 220) => {
    await act(async () => {
      window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, metaKey: true, bubbles: true }));
      await wait(ms);
    });
  };
  /* Back to a desktop: this block reads the menu bar and a Settings pane, and the
     phone section before it left the layout compact. */
  await setViewport(1440, 900);
  await click($('[data-dock-id="home"]'));
  await flush(240);
  await metaChord('k');
  assert('⌘K opens a palette over the desktop', Boolean($('.palette')));
  assert(
    'and the field has the focus, not the window behind it',
    document.activeElement?.classList.contains('palette__input'),
    document.activeElement?.className ?? 'nothing focused',
  );
  const paletteRows = () => $$('.palette__row').map((node) => node.querySelector('.palette__name')?.textContent?.trim() ?? '');
  assert(
    'it lists every application in the registry, and nothing else',
    paletteRows().length === registryTitles.length,
    `${paletteRows().length} rows: ${paletteRows().join(', ')}`,
  );
  await typeInto($('.palette__input'), 'proj');
  assert(
    'typing narrows it to the one app that matches',
    paletteRows().length === 1 && paletteRows()[0] === 'Projects',
    paletteRows().join(', '),
  );
  assert(
    'the row says which program the window belongs to',
    ($('.palette__row .palette__caption')?.textContent ?? '').trim() === 'Finder',
    $('.palette__row .palette__caption')?.textContent,
  );
  await act(async () => {
    $('.palette__input').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await wait(400);
  });
  assert('Enter opens the highlighted window and closes the palette', !$('.palette') && Boolean($('.window--projects')));
  await click($('.window--projects .light--close'));

  await metaChord('k');
  await typeInto($('.palette__input'), 'zzz');
  assert(
    'a query that matches nothing says so instead of showing an empty box',
    !$('.palette__row') && /Nothing in this desktop is called “zzz”/.test($('.palette__empty')?.textContent ?? ''),
    $('.palette__empty')?.textContent?.trim(),
  );
  await act(async () => {
    $('.palette__input').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(220);
  });
  assert('Escape closes it without opening anything', !$('.palette') && !$('.window--projects'));

  await click(byText('.menubar__trigger', 'Window'));
  const paletteRow = byText('.menu__popover .menu__item', 'Jump to an Application');
  assert(
    'the Window menu carries the same shortcut, for the reader who never guesses it',
    Boolean(paletteRow) && /⌘K/.test(paletteRow.textContent),
    paletteRow?.textContent?.trim(),
  );
  const dismissed = Boolean($('.notice'));
  await click(paletteRow);
  assert('and the row opens the palette the shortcut opens', Boolean($('.palette')));
  await act(async () => {
    $('.palette__input').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(220);
  });
  if (dismissed && $('.notice__dismiss')) await click($('.notice__dismiss'));

  /* ------------------------------------------------------------ motion ---- */
  await click($('[data-dock-id="settings"]'));
  await flush(240);
  await click($$('.window--settings .settings-list__item').find((node) => /Appearance/.test(node.textContent ?? '')));
  await flush(220);
  const motionSwitch = () => byText('.window--settings .settings-row', 'Reduce motion')?.querySelector('.settings-switch');
  assert('Reduce motion is a switch, not a paragraph about one', motionSwitch()?.getAttribute('role') === 'switch');
  assert(
    'and it opens showing what is already true',
    motionSwitch()?.getAttribute('aria-checked') === String(REDUCED_MOTION),
    `${motionSwitch()?.getAttribute('aria-checked')} against a reduced-motion pass of ${REDUCED_MOTION}`,
  );
  /* The two passes start from opposite sides of this switch, so the assertion is
     about the flip rather than about which way it ends up pointing. */
  const motionWasOn = motionSwitch()?.getAttribute('aria-checked') === 'true';
  await click(motionSwitch());
  assert(
    'flipping it paints the whole document, not just the parts that ask the hook',
    html.getAttribute('data-motion') === (motionWasOn ? null : 'calm') &&
      /html\[data-motion='calm'\] \*/.test(styleText('themes')) &&
      /--dur-slow: 1ms/.test(styleText('themes')),
    `${motionWasOn ? 'on -> off' : 'off -> on'}: ${html.getAttribute('data-motion')}`,
  );
  assert(
    'and the choice is remembered in this browser, under its own key',
    window.localStorage.getItem('portfolio.reduce-motion') === (motionWasOn ? 'off' : 'on'),
    window.localStorage.getItem('portfolio.reduce-motion'),
  );
  assert(
    'the row reports the system setting as a separate fact, and offers to go back to it',
    Boolean(byText('.window--settings .settings-row', 'Your system')) &&
      Boolean(byText('.window--settings .settings-link', 'Follow my system')),
  );
  await click(byText('.window--settings .settings-link', 'Follow my system'));
  assert(
    'following the system again clears the override rather than pinning the opposite',
    window.localStorage.getItem('portfolio.reduce-motion') === null &&
      html.getAttribute('data-motion') === (REDUCED_MOTION ? 'calm' : null),
    `${window.localStorage.getItem('portfolio.reduce-motion')} / ${html.getAttribute('data-motion')}`,
  );
  await click($('.window--settings .light--close'));

  /* ---------------------------------------------------------- the head ---- */
  const metaOf = (selector) => $(selector)?.getAttribute('content') ?? '';
  const shippedSite = (await vite.ssrLoadModule('/src/data/portfolio.js')).site;
  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert(
    'the tab and the share card say the same thing as the config, and it is one role',
    document.title === shippedSite.title &&
      metaOf('meta[name="description"]') === shippedSite.description &&
      metaOf('meta[property="og:title"]') === shippedSite.title &&
      html.getAttribute('lang') === shippedSite.lang,
    document.title,
  );
  assert(
    'the role in the head is the role on the résumé, not a wider stack than the site can show',
    /^Rounak Kumar — Frontend Developer$/.test(shippedSite.title) &&
      data.profile.title === 'Frontend Developer',
    `${shippedSite.title} / ${data.profile.title}`,
  );
  assert(
    'the static HTML carries the same two strings for a crawler that runs no script',
    indexHtml.includes(`<title>${shippedSite.title}</title>`) &&
      indexHtml.replace(/\s+/g, ' ').includes(shippedSite.description),
    'title and description compared byte for byte',
  );
  assert(
    'a share card is sized for the job, and a phone can add the site to its home screen',
    /name="twitter:card" content="summary_large_image"/.test(indexHtml) &&
      /rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180"/.test(indexHtml) &&
      existsSync(new URL('../public/apple-touch-icon.png', import.meta.url)) &&
      existsSync(new URL('../public/og-cover.png', import.meta.url)),
  );
  assert(
    'with no origin configured, no absolute URL is invented',
    !$('link[rel="canonical"]') && !$('meta[property="og:image"]') && !$('#portfolio-person-schema'),
    shippedSite.url === '' ? 'SITE_URL is empty, and nothing claims otherwise' : shippedSite.url,
  );
  assert(
    'the weather asks once when the city is configured with coordinates',
    Number.isFinite(data.profile.coords?.lat) &&
      /usableCoords/.test(sourceText('utils/weather.js')) &&
      /coords: profile.coords/.test(sourceText('components/widgets.jsx')),
  );
  const resumePdf = readFileSync(new URL('../public/resume-rounak-frontend.pdf', import.meta.url));
  assert(
    'the CV carries its own title into a downloads list, not the name of an export',
    /\/Title \(Rounak Kumar - Frontend Developer\)/.test(resumePdf.toString('latin1')) &&
      !/Copy of ATS Resume/.test(resumePdf.toString('latin1')),
    resumePdf.length + ' bytes',
  );
  assert(
    'a layout saved on a wider screen comes back within reach of this one',
    /clampToViewport/.test(sourceText('hooks/useWindowManager.jsx')) &&
      /clampToViewport\(saved, definitions\)/.test(sourceText('hooks/useWindowManager.jsx')),
  );

await flush();
console.log('\nthe contribution graph');
  /* The shipped account, read from the service the window actually calls. The
     weather tile already sets the precedent for a live assertion: if the service
     is down, this fails and says so rather than silently testing a mock. */
  data.profile.links.github = 'https://github.com/kumarrounakdev';
  data.profile.links.githubUsername = 'kumarrounakdev';
  await click($('[data-dock-id="github"]'));
  const graphSettled = await settle(
    () => Boolean($('.window--github .contrib__grid')) || Boolean($('.window--github .contrib__state--error')),
    20000,
  );
  const graphCells = () => $$('.window--github .contrib__grid .contrib__cell');
  assert(
    'the graph is drawn from a real answer, not a placeholder',
    graphSettled && Boolean($('.window--github .contrib__grid')),
    $('.window--github .contrib__state')?.textContent?.trim().slice(0, 80) ?? 'ready',
  );
  assert(
    'a year of squares, in whole weeks of seven',
    graphCells().length >= 364 && graphCells().length % 7 === 0,
    `${graphCells().length} cells`,
  );
  const totals = ($('.window--github .contrib__summary')?.textContent ?? '').trim();
  const totalNumber = Number((totals.match(/\d+/) ?? [])[0]);
  assert(
    'the summary names the same total the grid is made of',
    totalNumber > 0 &&
      new RegExp(`${totalNumber} contributions between`).test(
        $('.window--github .contrib__grid')?.getAttribute('aria-label') ?? '',
      ),
    `${totals} / ${$('.window--github .contrib__grid')?.getAttribute('aria-label')}`,
  );
  const levels = new Set(graphCells().map((cell) => cell.getAttribute('data-level')));
  assert(
    'the ramp is used, not collapsed: several strengths of one colour',
    levels.size >= 3 && levels.has('0') && levels.has('4'),
    `levels ${[...levels].sort().join(',')}`,
  );
  const titledCell = graphCells().find((cell) => cell.getAttribute('title'));
  assert(
    'a square answers “which day, how many” without opening the profile',
    /^\d+ contributions? on .*\d{4}$/.test(titledCell?.getAttribute('title') ?? '') &&
      (titledCell?.getAttribute('title') ?? '').length > 18,
    titledCell?.getAttribute('title'),
  );
  const monthLabels = $$('.window--github .contrib__month');
  assert(
    'one month label per month, placed on its own column',
    monthLabels.length >= 11 &&
      monthLabels.length <= 13 &&
      monthLabels.every((node) => Number(node.style.getPropertyValue('--at')) >= 0),
    `${monthLabels.length}: ${monthLabels.map((n) => n.textContent).join(' ')}`,
  );
  assert(
    'the five shades are derived from the accent, so the graph is this theme’s colour',
    /--contrib-1: color-mix\(in srgb, var\(--accent\)/.test(styleText('themes')) &&
      /--contrib-empty: #[0-9a-f]{6}/.test(styleText('themes')) &&
      /\.contrib__cell\[data-level='4'\] \{\s*background: var\(--contrib-4\)/.test(styleText('windows')) &&
      !/#2da44e|#39d353|#26a641|#006d32|#0e4429/i.test(styleText('windows') + styleText('themes')),
    'derived from --accent, with no borrowed GitHub green',
  );
  assert(
    'the window says where the numbers came from, and that it holds no token',
    /github-contributions-api/.test($('.window--github .contrib__source')?.textContent ?? '') &&
      /no GitHub token/.test($('.window--github .contrib__source')?.textContent ?? ''),
  );

  /* A reading that fails is reported, and can be asked for again — the two halves
     of "honest" that a static screenshot of a green grid cannot show. */
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : (input?.url ?? '');
    if (url.includes('github-contributions-api')) return Promise.resolve(new Response('', { status: 500 }));
    return realFetch(input, init);
  };
  try {
    window.sessionStorage.removeItem('portfolio.contributions.kumarrounakdev');
    await click($('.window--github .light--close'));
    await click($('[data-dock-id="github"]'));
    await settle(() => Boolean($('.window--github .contrib__state--error')), 20000);
    assert(
      'a service that fails is named, not papered over with an empty grid',
      Boolean($('.window--github .contrib__state--error')) &&
        /answered 500/.test($('.window--github .contrib__state--error')?.textContent ?? '') &&
        !$('.window--github .contrib__grid'),
      $('.window--github .contrib__state--error')?.textContent?.trim().slice(0, 60),
    );
    assert(
      'and the failure offers the one useful action rather than a dead end',
      Boolean(byText('.window--github .contrib__retry', 'Try again')),
    );
  } finally {
    globalThis.fetch = realFetch;
  }
  await click(byText('.window--github .contrib__retry', 'Try again'));
  await settle(() => Boolean($('.window--github .contrib__grid')), 20000);
  assert('trying again after the service returns fills the graph in', Boolean($('.window--github .contrib__grid')));
  await click($('.window--github .light--close'));

  /* The phone shows the same reading in its own size — which needs its home screen,
     so every window this block inherited from the one before it is closed first. */
  for (const light of $$('.window .light--close')) await click(light);
  await flush(300);
  await setViewport(390);
  await flush(400);
  const phoneGithub = $$('.ioshome__cell').find((node) => (node.getAttribute('aria-label') ?? '') === 'Open GitHub');
  await click(phoneGithub);
  await flush(500);
  await settle(() => Boolean($('.window--github .contrib__grid')), 20000);
  assert(
    'a phone gets the graph too, smaller squares and the same year',
    Boolean($('.window--github .contrib__grid')) &&
      $$('.window--github .contrib__grid .contrib__cell').length >= 364 &&
      /--contrib-cell: 9px/.test(sourceText('components/phone/phone.css')),
    `${$$('.window--github .contrib__grid .contrib__cell').length} cells`,
  );
  await setViewport(1440, 900);
  await flush(300);

await flush();
console.log('\nthe graph in daylight, and what the page is allowed to do');
  /* The ramp was the bug: five transparencies of one accent over a near-white
     sheet measured 1.09 : 1 against an empty square, so a year of commits read as
     a blank grid. `scripts/check.mjs` re-measures the contrast; this asserts the
     structure that makes the measurement meaningful. */
  const themesCss = styleText('themes');
  const lightBlock = themesCss.slice(themesCss.indexOf(":root,\n[data-theme='light']"), themesCss.indexOf("[data-theme='dark']"));
  const darkBlock = themesCss.slice(themesCss.indexOf("[data-theme='dark']"));
  assert(
    'the light appearance has its own ramp, and it is opaque',
    /--contrib-1: color-mix\(in srgb, var\(--accent\) \d+%, #ffffff\)/.test(lightBlock) &&
      !/--contrib-\d: [^;]*transparent/.test(lightBlock) &&
      /--contrib-4: var\(--accent\)/.test(lightBlock),
  );
  assert(
    'and so does the dark one, mixed into its own surface',
    /--contrib-1: color-mix\(in srgb, var\(--accent\) \d+%, var\(--window-bg-solid\)\)/.test(darkBlock) &&
      !/--contrib-\d: [^;]*transparent/.test(darkBlock),
  );
  assert(
    'an empty day has an edge, so it reads as a square and not as a gap',
    /--contrib-edge:/.test(lightBlock) &&
      /box-shadow: inset 0 0 0 1px var\(--contrib-edge\)/.test(styleText('windows')),
  );

  /* ------------------------------------------------------------ links ---- */
  const links = await vite.ssrLoadModule('/src/utils/links.js');
  const schemes = [
    ['javascript:alert(1)', ''],
    ['JaVaScRiPt:alert(1)', ''],
    ['java\nscript:alert(1)', ''],
    ['  javascript:alert(1)', ''],
    ['data:text/html,<script>alert(1)</script>', ''],
    ['vbscript:msgbox(1)', ''],
    ['//evil.example/x', ''],
    ['https://github.com/kumarrounakdev', 'https://github.com/kumarrounakdev'],
    ['mailto:a@b.co', 'mailto:a@b.co'],
    ['/resume-rounak-frontend.pdf', '/resume-rounak-frontend.pdf'],
    ['', ''],
  ];
  const allowed = schemes.filter(([input, expected]) => links.safeHref(input) === expected);
  assert(
    'a configuration value cannot become executable HTML: only http, https, mailto, tel and paths survive',
    allowed.length === schemes.length,
    schemes
      .filter(([input, expected]) => links.safeHref(input) !== expected)
      .map(([input]) => `${JSON.stringify(input)} -> ${JSON.stringify(links.safeHref(input))}`)
      .join(', '),
  );
  assert(
    'every link that leaves the site opens with noreferrer and noopener',
    links.externalLinkProps('https://example.com').rel === 'noreferrer noopener' &&
      links.externalLinkProps('https://example.com').target === '_blank',
  );
  /* The gate is only worth having if the anchors go through it: put a script URL
     in the configuration and look for an anchor that took it as written. */
  const hostile = 'javascript:alert(1)';
  data.profile.links.github = hostile;
  data.profile.links.linkedin = hostile;
  await click($('[data-dock-id="home"]'));
  await flush(240);
  assert(
    'with a script URL in the config, no anchor on the page carries it',
    $$('a[href]').every((node) => !/^\s*(javascript|data|vbscript):/i.test(node.getAttribute('href') ?? '')) &&
      !$(`a[href="${hostile}"]`),
    $$('a[href]')
      .map((node) => node.getAttribute('href'))
      .filter((href) => /script:/i.test(href ?? ''))
      .join(', ') || 'none',
  );
  await click($('[data-dock-id="github"]'));
  await flush(300);
  assert(
    'and the app still renders: a dropped link is an absence, not a crash',
    Boolean($('.window--github')) && !$('.window--github a[href^="javascript"]'),
  );
  await click($('.window--github .light--close'));
  data.profile.links.github = 'https://github.com/kumarrounakdev';
  data.profile.links.linkedin = 'https://www.linkedin.com/in/kumar-rounak-dev/';

  /* -------------------------------------------------------- the server --- */
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  assert(
    'the deployed host is told to send a policy, not asked nicely in a comment',
    /Content-Security-Policy: [^\n]*default-src 'self'/.test(headers) &&
      /object-src 'self'/.test(headers) &&
      /frame-ancestors 'none'/.test(headers) &&
      /X-Content-Type-Options: nosniff/.test(headers) &&
      /Referrer-Policy: strict-origin-when-cross-origin/.test(headers) &&
      /Permissions-Policy: [^\n]*camera=\(\)/.test(headers),
  );
  assert(
    'the policy names exactly the three origins this page calls, and no other',
    (headers.match(/connect-src ([^;\n]+)/g) ?? []).every(
      (line) =>
        (line.match(/https:\/\/[^\s;]+/g) ?? []).sort().join(' ') ===
        [
          'https://api.open-meteo.com',
          'https://geocoding-api.open-meteo.com',
          'https://github-contributions-api.jogruber.de',
        ].sort().join(' '),
    ),
  );
  /* Comments are stripped first: the note above the setting explains what
     `allowedHosts: true` would do, and a grep that cannot tell prose from code
     would fail the file it is describing. */
  const viteConfig = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  assert(
    'the dev server checks the Host it is addressed by, instead of answering to any domain',
    !/allowedHosts:\s*true/.test(viteConfig) &&
      (viteConfig.match(/allowedHosts: \['\.e2b\.app', 'localhost', '127\.0\.0\.1'\]/g) ?? []).length === 2,
    (viteConfig.match(/allowedHosts:[^\n]*/g) ?? []).join(' | '),
  );
  assert(
    'a referrer policy is declared in the HTML too, for a host that cannot send headers',
    /name="referrer" content="strict-origin-when-cross-origin"/.test(indexHtml),
  );

  /* ------------------------------------------------------------- perf ---- */
  const dockSource = sourceText('components/Dock.jsx');
  const applyBody = dockSource.slice(dockSource.indexOf('const apply ='), dockSource.indexOf('const reset ='));
  assert(
    'the Dock measures its geometry on resize, not on every pointer event',
    !/getBoundingClientRect/.test(applyBody) && /dockRect = dock.getBoundingClientRect\(\)/.test(dockSource),
  );

  /* The server is only released once the whole suite has read from it, and a
     later attempt says so instead of hanging the run. */
  await vite.close();
  vite.ssrLoadModule = async (id) => {
    throw new Error(`vite is closed: load ${id} before vite.close()`);
  };

  console.log('\nconsole output during the run');
  if (consoleProblems.length === 0) {
    console.log('  ok   no console errors or React warnings');
  } else {
    console.log(`  ${consoleProblems.length} captured problems, ${new Set(consoleProblems).size} distinct`);
    [...new Set(consoleProblems)].slice(0, 25).forEach((problem) => {
      console.log(`  !    ${problem.replace(/\s+/g, ' ').slice(0, 220)}`);
    });
    failures += consoleProblems.length;
  }

  console.log(`\n${checks - failures}/${checks} checks passed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  // console.error is captured by this point, so report through stdout.
  process.stdout.write(`smoke test crashed: ${error?.stack ?? error}\n`);
  if (consoleProblems.length) {
    process.stdout.write('--- captured console output ---\n');
    [...new Set(consoleProblems)].slice(0, 10).forEach((problem) => {
      process.stdout.write(`${String(problem).slice(0, 400)}\n`);
    });
  }
  process.exit(1);
});
