import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Copy, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.jsx';
import { useWindowManager } from '../hooks/useWindowManager.jsx';
import { useClock } from '../hooks/useClock.js';
import { useBattery } from '../hooks/useBattery.js';
import { useIsCompact } from '../hooks/useMediaQuery.js';
import { useOnline } from '../hooks/useOnline.js';
import { useTextScale } from '../hooks/useTextScale.js';
import { profile, site } from '../data/portfolio.js';
import {
  copyText,
  email,
  externalLinkProps,
  githubProfileUrl,
  isSet,
  mailtoUrl,
  resumeUrl,
} from '../utils/links.js';
import { BatteryGauge } from './icons.jsx';
import { Tooltip } from './Tooltip.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

const MENU_ORDER = ['app', 'file', 'view', 'window', 'help'];
const MENU_LABELS = { file: 'File', view: 'View', window: 'Window', help: 'Help' };

/**
 * Menu contents are built from live state, so every row does something real:
 * open a window, change appearance, raise a window, copy an address. Rows that
 * depend on unconfigured data (résumé, email) are removed, never disabled-and-dead.
 */
function useMenuModel({ desktopIconsVisible, setDesktopIconsVisible, onOpenPalette }) {
  const {
    windows,
    definitions,
    frontmostId,
    openWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    closeAllWindows,
    bringAllToFront,
    resetLayout,
    announce,
  } = useWindowManager();
  const { theme, preference, setPreference } = useTheme();
  const zoom = useTextScale();

  const appWindows = definitions.filter((definition) => definition.id !== 'guide');
  const openCount = Object.values(windows).filter((entry) => entry.open).length;
  const open = (id) => () => openWindow(id, { origin: 'menu' });

  return {
    app: [
      { id: 'about', label: `About ${profile.name}`, onClick: open('home') },
      { id: 'guide', label: 'Manual', onClick: () => openWindow('guide', { origin: 'menu', payload: 'start' }) },
      { id: 'sep-0', type: 'sep' },
      { id: 'github', label: 'GitHub Profile', href: githubProfileUrl(), hidden: !isSet(githubProfileUrl()) },
      { id: 'email', label: 'Send Email', href: mailtoUrl(), hidden: !isSet(email()) },
      { id: 'contact', label: 'Contact Window', onClick: open('contact') },
      { id: 'sep-1', type: 'sep' },
      {
        id: 'appearance',
        label: `Appearance: ${preference === 'system' ? `Auto (${theme})` : theme === 'dark' ? 'Dark' : 'Light'}`,
        onClick: open('guide'),
      },
    ],
    file: [
      { id: 'group-open', type: 'label', label: 'Open Window' },
      ...appWindows.map((definition) => ({
        id: `open-${definition.id}`,
        label: definition.title,
        onClick: open(definition.id),
        checked: Boolean(windows[definition.id]?.open) && !windows[definition.id]?.minimized,
      })),
      { id: 'sep-1', type: 'sep' },
      { id: 'resume', label: 'Open Résumé', href: resumeUrl(), hidden: !isSet(resumeUrl()) },
      {
        id: 'copy-email',
        label: 'Copy Email Address',
        icon: Copy,
        hidden: !isSet(email()),
        onClick: () => {
          copyText(email()).then((ok) =>
            announce(ok ? 'Email address copied to the clipboard' : 'This browser blocked clipboard access'),
          );
        },
      },
      {
        id: 'close-all',
        label: 'Close All Windows',
        onClick: closeAllWindows,
        disabled: openCount === 0,
      },
    ],
    view: [
      { id: 'group-appearance', type: 'label', label: 'Appearance' },
      { id: 'light', label: 'Light', onClick: () => setPreference('light'), checked: preference === 'light' },
      { id: 'dark', label: 'Dark', onClick: () => setPreference('dark'), checked: preference === 'dark' },
      {
        id: 'system',
        label: 'Auto',
        keys: theme === 'dark' ? 'Dark now' : 'Light now',
        onClick: () => setPreference('system'),
        checked: preference === 'system',
      },
      { id: 'sep-1', type: 'sep' },
      { id: 'group-zoom', type: 'label', label: 'Text Size' },
      { id: 'zoom-in', label: 'Zoom In', keys: `${zoom.percent}%`, onClick: zoom.increase, disabled: !zoom.canIncrease },
      { id: 'zoom-out', label: 'Zoom Out', onClick: zoom.decrease, disabled: !zoom.canDecrease },
      { id: 'zoom-reset', label: 'Actual Size', onClick: zoom.reset, disabled: zoom.index === 2 },
      { id: 'sep-2', type: 'sep' },
      {
        id: 'icons',
        label: 'Show Desktop Icons',
        onClick: () => setDesktopIconsVisible((current) => !current),
        checked: desktopIconsVisible,
      },
      { id: 'reset-layout', label: 'Reset Window Layout', icon: RotateCcw, onClick: resetLayout },
    ],
    window: [
      { id: 'palette', label: 'Jump to an Application…', keys: '⌘K', onClick: onOpenPalette },
      { id: 'sep-palette', type: 'sep' },
      ...appWindows
        .filter((definition) => windows[definition.id]?.open)
        .map((definition) => ({
          id: `window-${definition.id}`,
          label: definition.title,
          dot: windows[definition.id]?.minimized ? 'minimised' : null,
          checked: frontmostId === definition.id,
          onClick: open(definition.id),
        })),
      {
        id: 'no-windows',
        label: 'No open windows',
        disabled: true,
        hidden: appWindows.some((definition) => windows[definition.id]?.open),
      },
      { id: 'sep-1', type: 'sep' },
      {
        id: 'minimise',
        label: 'Minimise Front',
        onClick: () => frontmostId && minimizeWindow(frontmostId),
        disabled: !frontmostId,
      },
      {
        id: 'zoom',
        label: 'Zoom Front',
        onClick: () => frontmostId && toggleMaximize(frontmostId),
        disabled: !frontmostId,
      },
      {
        id: 'close',
        label: 'Close Front',
        onClick: () => frontmostId && closeWindow(frontmostId),
        disabled: !frontmostId,
      },
      { id: 'sep-2', type: 'sep' },
      { id: 'arrange', label: 'Bring All to Front', onClick: bringAllToFront, disabled: openCount < 2 },
    ],
    help: [
      { id: 'guide', label: 'Manual', onClick: () => openWindow('guide', { origin: 'menu', payload: 'start' }) },
      {
        id: 'config',
        label: 'Editing This Portfolio',
        onClick: () => openWindow('guide', { origin: 'menu', payload: 'config' }),
      },
      { id: 'sep-1', type: 'sep' },
      { id: 'github', label: 'Source on GitHub', href: githubProfileUrl(), hidden: !isSet(githubProfileUrl()) },
    ],
  };
}

/* ---------------------------------------------------------- menu pieces --- */

function MenuEntry({ item, onSelect }) {
  const className = ['menu__item', item.danger ? 'menu__item--danger' : ''].filter(Boolean).join(' ');

  const inner = (
    <>
      {item.icon ? (
        <span className="icon-tile" aria-hidden="true">
          <item.icon size={13} strokeWidth={1.9} />
        </span>
      ) : null}
      <span className="menu__item-label">{item.label}</span>
      {item.dot ? <span className="menu__keys menu__keys--state">{item.dot}</span> : null}
      {item.keys ? <span className="menu__keys">{item.keys}</span> : null}
    </>
  );

  if (item.href) {
    return (
      <li role="none">
        <a className={className} role="menuitem" href={item.href} {...externalLinkProps(item.href)} onClick={onSelect}>
          {inner}
        </a>
      </li>
    );
  }

  return (
    <li role="none">
      <button
        type="button"
        className={className}
        role="menuitem"
        disabled={item.disabled}
        aria-checked={item.checked}
        onClick={() => {
          item.onClick?.();
          onSelect();
        }}
      >
        {inner}
      </button>
    </li>
  );
}

function MenuPopover({ items, label, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const focusFirst = () => element.querySelector('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true });
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      focusFirst();
      return undefined;
    }
    const tween = gsap.fromTo(
      element,
      { autoAlpha: 0, scale: 0.97, y: -3 },
      {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.15,
        ease: 'power2.out',
        onComplete: focusFirst,
      },
    );
    // Reduced-motion fallback: focus must still land inside the menu.
    const fallback = window.setTimeout(focusFirst, 120);
    return () => {
      window.clearTimeout(fallback);
      tween.kill();
      gsap.set(element, { clearProps: 'transform,opacity,visibility' });
    };
  }, []);

  const onKeyDown = (event) => {
    const nodes = Array.from(ref.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? []);
    if (nodes.length === 0) return;
    const current = nodes.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      nodes[(current + 1) % nodes.length].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      nodes[(current - 1 + nodes.length) % nodes.length].focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      nodes[0].focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      nodes[nodes.length - 1].focus();
    }
  };

  return (
    <ul
      className="menu__popover"
      role="menu"
      aria-label={label}
      ref={ref}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {items
        .filter((item) => !item.hidden)
        .map((item) => {
          if (item.type === 'sep') return <li role="none" className="menu__sep" key={item.id} />;
          if (item.type === 'label')
            return (
              <li role="presentation" className="menu__group-label" key={item.id}>
                {item.label}
              </li>
            );
          return <MenuEntry key={item.id} item={item} onSelect={onClose} />;
        })}
    </ul>
  );
}

/* ------------------------------------------------------------- menu bar --- */
export function MenuBar({ desktopIconsVisible, setDesktopIconsVisible, onOpenPalette }) {
  const [openMenu, setOpenMenu] = useState(null);
  const { openWindow, frontmostId, definitions } = useWindowManager();
  const isCompact = useIsCompact();
  const clock = useClock();
  const battery = useBattery();
  /* The one network fact a browser reports — see useOnline. */
  const online = useOnline();
  /* The label beside the brand mark means two things in two places. On a Mac it
     is the site's own name, where the bold first item belongs. On a phone it is
     the name of the app you are inside, which is what the black pill is for —
     and with nothing open there is no app to name, so it renders nothing rather
     than repeating the mark. That also keeps the readings clear of the pill at
     320px, where the bar has about 100px per side. */
  const activeTitle = frontmostId
    ? definitions.find((definition) => definition.id === frontmostId)?.title ?? null
    : null;
  /* On a phone the black pill is hardware before it is interface: when nothing
     is open it holds nothing at all, and when an app is open it holds that app's
     name and nothing else. A Mac prints the running app's name in bold as the
     first item of its menu bar, which is what the brand button does here — one
     name, no monogram beside it, because initials repeat what the name already
     says. The app menu a Mac keeps under that name is not moved onto the phone:
     its rows live in Settings (appearance, text size, layout, storage) and in
     Contact (email, links), which is where a phone reader looks for them. */
  const barContext = isCompact ? activeTitle : null;

  const triggersRef = useRef([]);
  const menus = useMenuModel({ desktopIconsVisible, setDesktopIconsVisible, onOpenPalette });

  const closeMenu = useCallback(
    (returnFocus = true) => {
      setOpenMenu((current) => {
        if (current && returnFocus) {
          triggersRef.current[MENU_ORDER.indexOf(current)]?.focus({ preventScroll: true });
        }
        return null;
      });
    },
    [],
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && openMenu) {
        event.preventDefault();
        closeMenu();
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openMenu, closeMenu]);

  const onMenuBarKeyDown = (event) => {
    const index = openMenu ? MENU_ORDER.indexOf(openMenu) : -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const base = index >= 0 ? index : triggersRef.current.indexOf(document.activeElement);
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (((base + direction) % MENU_ORDER.length) + MENU_ORDER.length) % MENU_ORDER.length;
      triggersRef.current[nextIndex]?.focus({ preventScroll: true });
      if (openMenu) setOpenMenu(MENU_ORDER[nextIndex]);
    } else if ((event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') && index === -1) {
      event.preventDefault();
      const triggerIndex = Math.max(0, triggersRef.current.indexOf(document.activeElement));
      setOpenMenu(MENU_ORDER[triggerIndex]);
    }
  };

  const trigger = (menuId, index, content, extraClass = '', key = undefined) => (
    <div className="menu" key={key} onMouseEnter={() => openMenu && setOpenMenu(menuId)}>
      <button
        type="button"
        ref={(node) => {
          triggersRef.current[index] = node;
        }}
        className={`menubar__trigger ${extraClass}`.trim()}
        aria-haspopup="menu"
        aria-expanded={openMenu === menuId}
        aria-label={menuId === 'app' ? 'Application menu' : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setOpenMenu(openMenu === menuId ? null : menuId);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={onMenuBarKeyDown}
      >
        {content}
      </button>
      {openMenu === menuId ? (
        <MenuPopover label={`${menuId === 'app' ? 'Application' : MENU_LABELS[menuId]} menu`} items={menus[menuId]} onClose={() => closeMenu()} />
      ) : null}
    </div>
  );

  return (
    <header className="menubar" data-menu-open={openMenu ? 'true' : 'false'}>
      {openMenu ? (
        <div className="menu-scrim" onPointerDown={() => closeMenu(false)} aria-hidden="true" />
      ) : null}

      <div className="menubar__left">
        {isCompact ? (
          barContext ? <span className="menubar__app">{barContext}</span> : null
        ) : (
          trigger('app', 0, site.appLabel, 'menubar__brand')
        )}
        {/* A phone gets no menu bar: the rows a Mac finds under File ▸ View ▸
            Window ▸ Help live in Settings and Contact here, where a thumb can
            reach them — so the phone renders no menus at all rather than
            rendering them and hiding them. */}
        {isCompact ? null : (
          <nav className="menubar__menus" aria-label="Application menus" onKeyDown={onMenuBarKeyDown}>
            {MENU_ORDER.slice(1).map((menuId, offset) =>
              trigger(menuId, offset + 1, MENU_LABELS[menuId], '', menuId),
            )}
          </nav>
        )}
      </div>

      <div className="menubar__right">
        {profile.availability?.label ? (
          <Tooltip label="Open contact options">
            <button
              type="button"
              className="menubar__availability"
              onClick={() => openWindow('contact', { origin: 'menu' })}
            >
              <span
                className={`status-dot ${profile.availability.status === 'available' ? 'status-dot--pulse' : 'status-dot--busy'}`}
                aria-hidden="true"
              />
              <span className="menubar__availability-label">{profile.availability.label}</span>
            </button>
          </Tooltip>
        ) : null}

        {/* Connectivity, and only connectivity. `navigator.onLine` is the sole
            network fact a browser reports, so the mark is that fact: a plain
            glyph when it says there is a link, a crossed one with the word
            beside it when it says there is none. Signal bars, a carrier name
            and a link speed stay out, because nothing here could know them. */}
        <span
          className={`menubar__status menubar__status--net${online === false ? ' menubar__status--offline' : ''}`}
          title={
            online === false
              ? 'This browser reports no network connection'
              : online === true
                ? 'This browser reports a connection'
                : 'This browser does not report a connection state'
          }
        >
          {online === false ? (
            <WifiOff size={14} strokeWidth={1.9} aria-hidden="true" />
          ) : (
            <Wifi size={14} strokeWidth={1.9} aria-hidden="true" />
          )}
          <span className="menubar__net-label">
            {online === false ? 'Offline' : online === true ? 'Online' : 'No network report'}
          </span>
        </span>

        {/* Four bars, lit by the real level — see BatteryGauge. The cluster is
            left out entirely when the browser reports nothing, rather than
            drawing a shell that would read as "empty". */}
        {battery ? (
          <span className="menubar__status" title={`Battery ${battery.level}%${battery.charging ? ', charging' : ''}`}>
            <BatteryGauge level={battery.level} charging={battery.charging} />
            <span className="menubar__battery-value">{battery.level}%</span>
          </span>
        ) : null}

        <ThemeToggle />
      </div>

      {/* On a Mac the clock is the last thing in the right-hand cluster, the way
          the system menu bar ends with it; on a phone it moves to the leading
          edge, which is where iOS puts the time. One element, two placements, so
          the same `useClock` instance is never rendered twice. */}
      <p className="menubar__clock">
        <span className="menubar__clock-time">{clock.time}</span>
        <span className="menubar__clock-date">{clock.date}</span>
      </p>
    </header>
  );
}

export default MenuBar;
