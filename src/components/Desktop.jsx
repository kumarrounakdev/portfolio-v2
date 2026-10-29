import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Boxes, FolderOpen, Lock, ShieldOff, User, X } from 'lucide-react';
import { GithubGlyph } from '../components/icons.jsx';
import { MenuBar } from './MenuBar.jsx';
import { Dock } from './Dock.jsx';
import { DesktopIcon } from './DesktopIcon.jsx';
import { HomeWidgets } from './widgets.jsx';
import { WelcomeNotice } from './WelcomeNotice.jsx';
import { HomeIndicator, IphoneHome } from './IphoneHome.jsx';
import { WindowFrame } from './WindowFrame.jsx';
import { useWindowManager } from '../hooks/useWindowManager.jsx';
import { useInteractionGuards } from '../hooks/useInteractionGuards.js';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import { CommandPalette } from './CommandPalette.jsx';
import { COMPACT_QUERY, useHasWidgetRail, useIsCompact } from '../hooks/useMediaQuery.js';
import { usePersistentState } from '../hooks/usePersistentState.js';
import { windowRegistry } from '../windows/registry.jsx';
import { useWindowPreload } from '../hooks/useWindowPreload.js';
import { githubProfileUrl, isSet } from '../utils/links.js';
import { DESKTOP_ICONS_KEY } from '../utils/storage.js';
import { profile, site } from '../data/portfolio.js';


/* The device in the gutter is desktop furniture: nothing on a phone's first screen
   needs it, so it is not in the bundle that phone has to parse before it can draw
   its own home screen. On a desktop it arrives a moment after the desk, which is
   the right order anyway — the wallpaper is worth looking at first. */
const PhoneLauncher = lazy(() => import('./phone/PhoneLauncher.jsx'));

/** Catches a window chunk that failed to load, and names what to do about it. */

class WindowChunkError extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="window-error" role="status">
        <span>
          {this.props.title} could not be loaded — its code did not reach this device.
        </span>
        <button type="button" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </p>
    );
  }
}


/**
 * The desktop: wallpaper, menu bar, window layer, launcher fallback, Dock and
 * the polite live region that narrates window changes. Windows themselves are
 * rendered once each and mounted only while their state is open.
 */
export function Desktop() {
  const { windows, visibleIds, openWindow, closeAllWindows, announcement } = useWindowManager();
  const guards = useInteractionGuards();
  const reducedMotion = usePrefersReducedMotion();
  /* The one keyboard path through eleven applications. */
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isCompact = useIsCompact();
  useWindowPreload({ isCompact });
  const desktopRef = useRef(null);
  const [iconsVisible, setIconsVisible] = usePersistentState(DESKTOP_ICONS_KEY, true);

  /* Open windows, front-to-back, so the DOM order matches the visual stack. */
  const stack = useMemo(
    () =>
      windowRegistry
        .filter((definition) => windows[definition.id]?.open)
        .sort((a, b) => (windows[b.id].z ?? 0) - (windows[a.id].z ?? 0)),
    [windows],
  );

  /* The home window opens on first load — the site must never boot empty. On a
     phone the opposite is true: an iPhone comes back to its *home screen*, and
     that is where the widgets live, so opening an app over it on launch is how
     the tiles end up invisible. The grid, the dock and the search pill are all
     one tap away instead. */
  const bootRef = useRef(false);
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    if (bootRef.current) return undefined;
    // Short delay so the wallpaper, menu bar and Dock land before anything does.
    /* The effect is keyed to nothing that the viewport can change, on purpose.
       While it was keyed to `isCompact`, a phone rotated — or a browser window
       dragged across 767px — inside those 110ms re-ran the effect, cleared its
       own pending timer and found the boot already claimed, so the desktop stayed
       empty for the rest of the session: no home screen, no first window, nothing.
       Nothing is claimed until the timer has actually run. */
    const timer = window.setTimeout(() => {
      if (bootRef.current) return;
      bootRef.current = true;
      // Asked of the browser now, not remembered from a render.
      const compact =
        typeof window.matchMedia === 'function' && window.matchMedia(COMPACT_QUERY).matches;
      if (!compact) openWindow('home', { origin: 'auto' });
      setBooted(true);
    }, 110);
    return () => window.clearTimeout(timer);
  }, [openWindow]);

  /* ------------------------------------------------------ widget rail ---- */
  /* The window layer is inset by the rail's measured width rather than a number
     copied into two stylesheets, so a window can neither cover the widgets nor
     be dragged across them — and when the rail is not rendered, the desktop
     takes the space back for free. */
  const railRef = useRef(null);
  const hasWidgetRail = useHasWidgetRail();
  useEffect(() => {
    const rail = railRef.current;
    const desktop = desktopRef.current;
    if (!rail || !desktop) return undefined;
    const write = () => desktop.style.setProperty('--rail-space', `${Math.round(rail.offsetWidth)}px`);
    write();
    if (typeof ResizeObserver !== 'function') {
      return () => desktop.style.removeProperty('--rail-space');
    }
    const observer = new ResizeObserver(write);
    observer.observe(rail);
    return () => {
      observer.disconnect();
      desktop.style.removeProperty('--rail-space');
    };
  }, [hasWidgetRail, isCompact]);

  /* The config file owns the wording, so index.html and the DOM always agree — and
     everything a crawler reads without running JavaScript is a copy of the same two
     strings. The absolute URLs below are a separate matter: a share card that points
     at nobody's domain is worse than no share card, so `og:url`, `og:image`,
     `rel=canonical` and the JSON-LD `@id` appear only once SITE_URL names one. */
  useEffect(() => {
    document.title = site.title;
    document.documentElement.lang = site.lang;

    const meta = (name, content, { property = false } = {}) => {
      const attribute = property ? 'property' : 'name';
      let node = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!content) {
        node?.remove();
        return;
      }
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute(attribute, name);
        document.head.appendChild(node);
      }
      node.setAttribute('content', content);
    };
    const link = (rel, href) => {
      let node = document.head.querySelector(`link[rel="${rel}"]`);
      if (!href) {
        node?.remove();
        return;
      }
      if (!node) {
        node = document.createElement('link');
        node.setAttribute('rel', rel);
        document.head.appendChild(node);
      }
      node.setAttribute('href', href);
    };

    const origin = String(site.url ?? '').replace(/\/+$/, '');
    const absolute = (path) => (origin ? `${origin}${path}` : '');

    meta('description', site.description);
    meta('og:title', site.title, { property: true });
    meta('og:description', site.description, { property: true });
    meta('og:site_name', site.appLabel, { property: true });
    meta('og:url', absolute('/'), { property: true });
    meta('og:image', absolute('/og-cover.png'), { property: true });
    meta(
      'og:image:alt',
      origin ? `${profile.name} — ${profile.title}. Fronted by the site's own desktop interface.` : '',
      { property: true },
    );
    meta('twitter:card', origin ? 'summary_large_image' : 'summary');
    meta('twitter:title', site.title);
    meta('twitter:image', absolute('/og-cover.png'));
    link('canonical', absolute('/'));

    const SCHEMA_ID = 'portfolio-person-schema';
    let script = document.getElementById(SCHEMA_ID);
    if (!origin) {
      script?.remove();
      return;
    }
    if (!script) {
      script = document.createElement('script');
      script.id = SCHEMA_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${origin}/#person`,
      name: profile.name,
      jobTitle: profile.title,
      description: site.description,
      url: `${origin}/`,
      image: absolute('/og-cover.png'),
      email: isSet(profile.email) ? `mailto:${profile.email}` : undefined,
      sameAs: [profile.links?.github, profile.links?.linkedin].filter((href) => isSet(href)),
      knowsAbout: profile.techLabels,
    });
  }, []);

  /* ⌘K on a Mac, Ctrl-K everywhere else. Registered once, on the document, because
     the shortcut has to work while a window body holds the focus. */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key?.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey) return;
      event.preventDefault();
      setPaletteOpen((open) => !open);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* The switch in Settings has to reach the stylesheet too, and a parsed stylesheet
     cannot re-run a media query: one attribute on <html> carries the answer to the
     handful of rules that animate on `animation:` rather than on a duration token. */
  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) root.setAttribute('data-motion', 'calm');
    else root.removeAttribute('data-motion');
  }, [reducedMotion]);

  /* Entrance: desktop surfaces, then the window list settles into place. */
  useEffect(() => {
    if (reducedMotion) return undefined;
    const context = gsap.context(() => {
      gsap.from('.desktop__wallpaper', { autoAlpha: 0, duration: 0.5, ease: 'power1.out' });
      gsap.from('.menubar', { y: -12, autoAlpha: 0, duration: 0.4, ease: 'power2.out' });
      gsap.from('.dock-shell, .mobilebar', {
        y: 26,
        autoAlpha: 0,
        duration: 0.5,
        delay: 0.12,
        ease: 'power3.out',
      });
    }, desktopRef);
    return () => context.revert();
  }, [reducedMotion]);

  const windowIcons = [
    { id: 'projects', label: 'Projects', icon: FolderOpen, accent: '#2f9de0' },
    { id: 'about', label: 'About Me', icon: User, accent: '#8b5cf6' },
    { id: 'skills', label: 'Skills', icon: Boxes, accent: '#f2994a' },
  ].map((item) => ({
    ...item,
    kind: 'window',
    // The tile art comes from the registry, so a desktop shortcut and the Dock
    // entry for the same app cannot end up looking like two different apps.
    art: windowRegistry.find((definition) => definition.id === item.id)?.art,
    onClick: () => openWindow(item.id, { origin: 'desktop-icon' }),
  }));

  const linkIcons = [];
  if (isSet(githubProfileUrl())) {
    linkIcons.push({
      id: 'github-link',
      kind: 'link',
      label: 'GitHub',
      icon: GithubGlyph,
      accent: '#30363d',
      muted: true,
      href: githubProfileUrl(),
    });
  }

  const iconItems = [...windowIcons, ...linkIcons];

  return (
    <div className="desktop" ref={desktopRef}>
      <div className="desktop__wallpaper" aria-hidden="true">
        <span className="wallpaper__bloom" />
        <span className="wallpaper__grain" />
        <span className="wallpaper__vignette" />
      </div>

      <MenuBar
        desktopIconsVisible={iconsVisible}
        setDesktopIconsVisible={setIconsVisible}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {/* On a Mac the widgets belong to the desktop, not to a window: they stay
          put while windows open, close and cover each other. A tablet gets them
          at the top of the window, a phone gets its own home screen — and never
          two of the three at once. */}
      {hasWidgetRail && !isCompact ? (
        <div className="desktop__widgets" ref={railRef}>
          <HomeWidgets />
        </div>
      ) : null}

      {iconsVisible && !isCompact ? (
        <div className="desktop__icons" aria-label="Desktop items">
          {iconItems.map((item) => (
            <DesktopIcon key={item.id} item={item} />
          ))}
        </div>
      ) : null}

      {/* The phone. Rendered only when the desktop is wide enough to keep a
          gutter for it; below that it is not in the tree at all. */}
      <Suspense fallback={null}>
        <PhoneLauncher />
      </Suspense>

      <main className="desktop__surface">
        <div className="desktop__windows">
          {stack.map((definition) => {
            const Frame = definition.component;
            return (
              <WindowFrame key={definition.id} definition={definition}>
                {/* Deferring an application buys the first paint its size back, and
                    costs one thing that has to be answered: the chunk that cannot be
                    fetched — an offline visitor, or a redeploy that changed the hashed
                    names under an open tab. A window that says so is better than a
                    window that is quietly empty. */}
                <Suspense fallback={null}>
                  <WindowChunkError title={definition.title}>
                    <Frame />
                  </WindowChunkError>
                </Suspense>
              </WindowFrame>
            );
          })}
        </div>

        {/* Everything minimised or closed: never leave a dead desktop. A phone
            gets an iPhone home screen here; a desktop gets the launcher. */}
        {booted && visibleIds.length === 0
          ? isCompact
            ? <IphoneHome onOpen={openWindow} />
            : <DesktopLauncher onOpen={openWindow} />
          : null}
      </main>

      <Dock />

      {/* On a phone the indicator is how you leave an app, so it belongs to the
          device rather than to any one window. */}
      {isCompact ? <HomeIndicator canGoHome={visibleIds.length > 0} onHome={closeAllWindows} /> : null}

      <WelcomeNotice />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Explains a suppressed gesture instead of silently eating it. */}
      {guards.note ? (
        <div className="guard-note" role="status">
          {guards.note.key === 'devtools' ? <ShieldOff size={13} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
          <p className="guard-note__text">{guards.note.text}</p>
          <button type="button" className="guard-note__close" onClick={guards.dismiss} aria-label="Dismiss notice">
            <X size={11} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement ?? ''}
      </p>
    </div>
  );
}

/** Shown when every window is closed, so the desktop is never a dead end. */
function DesktopLauncher({ onOpen }) {
  const items = windowRegistry.filter((definition) => definition.id !== 'guide');
  return (
    <div className="desktop__launcher">
      <div>
        {/* No name here: this is the desktop at rest, not a business card, and the
            person it belongs to is already named by the tab, the menu bar and the
            window they are about to open. */}
        <h1 className="launcher__title">All windows are closed</h1>
        <p className="section-sub" style={{ marginTop: 'var(--space-2)' }}>
          Reopen one from the Dock, the File menu, or below.
        </p>
      </div>
      <div className="launcher__grid">
        {items.map((definition) => (
          <button
            key={definition.id}
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => onOpen(definition.id, { origin: 'launcher' })}
          >
            <definition.icon size={14} aria-hidden="true" />
            {definition.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Desktop;
