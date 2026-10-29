import { useCallback, useEffect, useState } from 'react';
import {
  Accessibility,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Info,
  LayoutGrid,
  Palette,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Type,
  X,
  Gauge,
} from 'lucide-react';
import { WindowPane } from '../components/WindowPane.jsx';
import { Button } from '../components/Button.jsx';
import { useBattery } from '../hooks/useBattery.js';
import { useHasFinePointer, useIsCompact, useMediaQuery } from '../hooks/useMediaQuery.js';
import { usePersistentState } from '../hooks/usePersistentState.js';
import {
  usePrefersReducedMotion,
  useMotionOverride,
  useSystemPrefersReducedMotion,
  setMotionOverride,
} from '../hooks/usePrefersReducedMotion.js';
import { useTextScale } from '../hooks/useTextScale.js';
import { useTheme } from '../hooks/useTheme.jsx';
import { useWindowManager } from '../hooks/useWindowManager.jsx';
import {
  STORAGE_KEYS,
  accessibilityStatement,
  colophon,
  licences,
  privacyPolicy,
  termsOfUse,
} from '../data/legal.js';
import { DESKTOP_ICONS_KEY, clearStoredEntries, storedEntries } from '../utils/storage.js';
import { externalLinkProps } from '../utils/links.js';

/**
 * The Settings app, built the way the operating system's own is built: panes on
 * the left, one pane of content on the right, and inside each pane either a
 * control that does something or a statement of what the machine reports.
 *
 * Two rules, and the second is the reason this window exists at all:
 *   · every switch here writes through the same hook the menu bar uses, so
 *     changing appearance in Settings and in View ▸ Appearance cannot diverge,
 *   · nothing here is a decorative preference. A row that cannot be changed in a
 *     browser — reduced motion, forced colours, the battery — is shown as a
 *     reading with the system named as its owner, never as a switch that lies.
 *
 * The legal panes read from `src/data/legal.js`. They describe this codebase, so
 * they belong beside the data files rather than buried in a footer nobody opens.
 */

const PANES = [
  { id: 'appearance', title: 'Appearance', icon: Palette, group: 'Interface' },
  { id: 'textsize', title: 'Text Size', icon: Type, group: 'Interface' },
  { id: 'desktop', title: 'Desktop & Windows', icon: LayoutGrid, group: 'Interface' },
  { id: 'device', title: 'This Device', icon: Gauge, group: 'Readings' },
  { id: 'storage', title: 'Storage', icon: Database, group: 'Readings' },
  { id: 'terms', title: 'Terms of Use', icon: ScrollText, group: 'Legal' },
  { id: 'privacy', title: 'Privacy Policy', icon: ShieldCheck, group: 'Legal' },
  { id: 'accessibility', title: 'Accessibility', icon: Accessibility, group: 'Legal' },
  { id: 'licences', title: 'Licences', icon: FileText, group: 'Legal' },
  { id: 'colophon', title: 'About this build', icon: Info, group: 'Legal' },
];

const LEGAL_PANES = { terms: termsOfUse, privacy: privacyPolicy, accessibility: accessibilityStatement, licences, colophon };

/** Written where it is shown, because it is about the words, not the data. */
const PLAIN_LANGUAGE_NOTE =
  'Written by the author of this site as a plain-language notice about how it behaves. It is not legal advice, and it has not been reviewed by a lawyer — if you need it to be a formal agreement, have it rewritten and keep it in sync with the code it describes.';

function Group({ caption, children }) {
  return (
    <section className="settings-group">
      {caption ? <p className="settings-group__caption">{caption}</p> : null}
      <div className="settings-group__rows">{children}</div>
    </section>
  );
}

function Row({ label, hint, value, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row__text">
        <p className="settings-row__label">{label}</p>
        {hint ? <p className="settings-row__hint">{hint}</p> : null}
      </div>
      <div className="settings-row__end">
        {value ? <p className="settings-row__value">{value}</p> : null}
        {children}
      </div>
    </div>
  );
}

/** A real switch: a button with `role="switch"`, so it announces its state and
 *  works with the keyboard exactly like the checkbox it replaces. */
function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`settings-switch${checked ? ' settings-switch--on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-switch__knob" aria-hidden="true" />
    </button>
  );
}

/** The prose panes, rendered from data so the words live outside the component. */
function LegalPane({ pane }) {
  if (pane.packages) {
    return (
      <div className="settings-stack">
        <header className="settings-pane__head">
          <h3 className="window-title">{pane.title}</h3>
          <p className="window-lede">{pane.intro}</p>
        </header>
        <Group caption="Built from these packages">
          {pane.packages.map((pkg) => (
            <div className="settings-row" key={pkg.name}>
              <div className="settings-row__text">
                <p className="settings-row__label">
                  {pkg.name}
                  {pkg.note ? <span className="settings-row__tag">{pkg.note}</span> : null}
                </p>
                <p className="settings-row__hint">
                  version {pkg.version} · {pkg.licence}
                </p>
              </div>
              <div className="settings-row__end">
                <a className="settings-link" href={pkg.url} {...externalLinkProps(pkg.url)}>
                  Licence text
                  <ChevronRight size={12} strokeWidth={2.2} aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </Group>
        <Group caption="Also worth stating">
          {pane.notes.map((note) => (
            <div className="settings-note" key={note.label}>
              <p className="settings-note__title">{note.label}</p>
              <p className="settings-note__text">{note.text}</p>
            </div>
          ))}
        </Group>
      </div>
    );
  }

  return (
    <div className="settings-stack">
      <header className="settings-pane__head">
        <p className="eyebrow">{pane.eyebrow}</p>
        <h3 className="window-title">{pane.title}</h3>
        <p className="window-lede">{pane.intro}</p>
      </header>
      {pane.groups.map((group) => (
        <Group caption={group.caption} key={group.caption}>
          {group.rows.map((row) => (
            <div className="settings-note" key={row.label}>
              <p className="settings-note__title">{row.label}</p>
              <p className="settings-note__text">{row.text}</p>
            </div>
          ))}
        </Group>
      ))}
      {pane.id === 'terms' || pane.id === 'privacy' ? (
        <p className="settings-fine">{PLAIN_LANGUAGE_NOTE}</p>
      ) : null}
    </div>
  );
}

export function SettingsWindow() {
  const isCompact = useIsCompact();
  /* A Mac opens Settings with a pane already in front of you, the way System
     Settings does. A phone opens on the list of panes, because that is what the
     app looks like there — and one screen at a time leaves no room for a sidebar.
     Same component, same state, chosen by the layout it is standing in. */
  const [pane, setPane] = useState(() => (isCompact ? '' : 'appearance'));
  const { theme, preference, setPreference } = useTheme();
  const zoom = useTextScale();
  const battery = useBattery();
  const reducedMotion = usePrefersReducedMotion();
  /* The system's answer and the reader's answer are two different facts: one is
     what their machine asked for, the other is what they asked for here. */
  const systemReducedMotion = useSystemPrefersReducedMotion();
  const motionOverride = useMotionOverride();
  const reducedTransparency = useMediaQuery('(prefers-reduced-transparency: reduce)');
  const forcedColors = useMediaQuery('(forced-colors: active)');
  const finePointer = useHasFinePointer();
  const { openIds, visibleIds, closeAllWindows, resetLayout, announce } = useWindowManager();
  const [iconsVisible, setIconsVisible] = usePersistentState(DESKTOP_ICONS_KEY, true);
  const [entries, setEntries] = useState(() => storedEntries());

  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => setEntries(storedEntries()), [pane]);

  const clearStorage = useCallback(() => {
    const removed = clearStoredEntries();
    setEntries(storedEntries());
    announce(
      removed > 0
        ? `${removed} stored preference${removed === 1 ? '' : 's'} removed from this browser.`
        : removed === 0
          ? 'Nothing was stored under this site’s prefix.'
          : 'This browser would not let the page write to its storage.',
    );
  }, [announce]);

  const purposeByKey = new Map(STORAGE_KEYS.map((item) => [item.key, item.what]));
  const legal = LEGAL_PANES[pane];
  const selected = PANES.find((item) => item.id === pane) ?? PANES[0];

  return (
    <WindowPane bare className="settings-scroll">
      <div className="settings" data-open={pane}>
        <nav className="settings-sidebar" aria-label="Settings panes">
          {['Interface', 'Readings', 'Legal'].map((group) => (
            <div className="settings-sidebar__group" key={group}>
              <p className="settings-sidebar__caption">{group}</p>
              <ul className="settings-list">
                {PANES.filter((item) => item.group === group).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="settings-list__item"
                      aria-current={pane === item.id ? 'true' : undefined}
                      onClick={() => setPane(item.id)}
                    >
                      <span className="settings-list__icon" aria-hidden="true">
                        <item.icon size={14} strokeWidth={1.9} />
                      </span>
                      <span className="settings-list__label">{item.title}</span>
                      <ChevronRight className="settings-list__chevron" size={13} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="settings-detail scroll-area" tabIndex={-1}>
          <header className="settings-detail__bar">
            <button type="button" className="settings-back" onClick={() => setPane('')}>
              <ChevronLeft size={15} strokeWidth={2.2} aria-hidden="true" />
              Panes
            </button>
            <p className="settings-detail__title">{selected.title}</p>
          </header>

          {pane === 'appearance' ? (
            <div className="settings-stack">
              <header className="settings-pane__head">
                <h3 className="window-title">Appearance</h3>
                <p className="window-lede">
                  One setting for the whole desktop, kept in this browser. Nothing else on the page is
                  recomputed, so switching is instant and never reloads.
                </p>
              </header>
              <Group caption="Theme">
                <Row label="Look" hint="Auto follows your system’s light or dark setting.">
                  <div className="segmented" role="group" aria-label="Appearance">
                    {[
                      ['light', 'Light'],
                      ['dark', 'Dark'],
                      ['system', 'Auto'],
                    ].map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className="segmented__option"
                        aria-pressed={preference === value}
                        onClick={() => setPreference(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Row>
                <Row label="Currently drawn" value={theme === 'dark' ? 'Dark' : 'Light'} />
              </Group>
              <Group caption="Motion">
                <Row
                  label="Reduce motion"
                  hint={
                    systemReducedMotion
                      ? 'Your system already asks for this, so it stays on until you turn it off here.'
                      : 'Stops window, Dock and widget animation in this browser. Your system setting is the default.'
                  }
                >
                  <Switch
                    checked={reducedMotion}
                    onChange={(next) => setMotionOverride(next)}
                    label="Reduce motion"
                  />
                </Row>
                {motionOverride !== null ? (
                  <Row
                    label="Your system"
                    value={systemReducedMotion ? 'Asks for reduced motion' : 'Does not ask'}
                    hint="This switch overrides that, and only on this browser."
                  >
                    <button type="button" className="settings-link" onClick={() => setMotionOverride(null)}>
                      Follow my system
                    </button>
                  </Row>
                ) : null}
              </Group>
              <Group caption="Material">
                <Row
                  label="Reduce transparency"
                  value={reducedTransparency ? 'On — set by your system' : 'Off'}
                  hint="Glass becomes a solid fill. A browser cannot switch this for you, only report it."
                />
                <Row
                  label="Force high contrast"
                  value={forcedColors ? 'On — set by your system' : 'Off'}
                  hint="Boundaries drawn in CanvasText replace the shadows and blur."
                />
              </Group>
            </div>
          ) : null}

          {pane === 'textsize' ? (
            <div className="settings-stack">
              <header className="settings-pane__head">
                <h3 className="window-title">Text Size</h3>
                <p className="window-lede">
                  Every size in this interface is in rem, so text grows inside unchanged geometry instead of
                  scaling the whole page and pushing windows off screen.
                </p>
              </header>
              <Group>
                <Row label="Size" hint="Six steps, 92 % to 120 %, remembered on this device.">
                  <div className="settings-stepper">
                    <button type="button" onClick={zoom.decrease} disabled={!zoom.canDecrease} aria-label="Smaller text">
                      −
                    </button>
                    <span className="settings-stepper__value">{zoom.percent}%</span>
                    <button type="button" onClick={zoom.increase} disabled={!zoom.canIncrease} aria-label="Larger text">
                      +
                    </button>
                  </div>
                </Row>
                <Row label="Reset" hint="Back to 100 %.">
                  <Button variant="tinted" size="sm" icon={RotateCcw} onClick={zoom.reset} disabled={zoom.index === 2}>
                    Actual size
                  </Button>
                </Row>
              </Group>
              <p className="settings-fine">
                Pinch-zoom is never disabled by this site, and the viewport meta tag is checked in the test
                suite to keep it that way.
              </p>
            </div>
          ) : null}

          {pane === 'desktop' ? (
            <div className="settings-stack">
              <header className="settings-pane__head">
                <h3 className="window-title">Desktop &amp; Windows</h3>
                <p className="window-lede">
                  The same controls as the menu bar, on one page. Where a window is open it also appears in
                  the Dock, so nothing here is the only way to do a thing.
                </p>
              </header>
              <Group caption="Shortcuts">
                <Row label="Show desktop icons" hint="Secondary navigation only: every one of them is also in the Dock.">
                  <Switch
                    checked={iconsVisible !== false}
                    onChange={(next) => setIconsVisible(next)}
                    label="Show desktop icons"
                  />
                </Row>
              </Group>
              <Group caption="Windows">
                <Row
                  label="Open right now"
                  value={`${openIds.length} open · ${visibleIds.length} visible`}
                  hint="A phone shows one window at a time, so the two numbers differ by design there."
                />
                <Row label="Close every window">
                  <Button variant="tinted" size="sm" icon={X} onClick={() => closeAllWindows()} disabled={openIds.length === 0}>
                    Close all
                  </Button>
                </Row>
                <Row label="Window positions" hint="Forget where each window was left, including this device’s saved layout.">
                  <Button
                    variant="tinted"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => {
                      resetLayout();
                      announce('Window positions reset to their default placements.');
                    }}
                  >
                    Reset layout
                  </Button>
                </Row>
              </Group>
              {isCompact ? (
                <p className="settings-fine">
                  On this screen the desktop is an iPhone home screen, so there are no desktop icons to show
                  and window positions are not stored: an app takes the whole screen.
                </p>
              ) : null}
            </div>
          ) : null}

          {pane === 'device' ? (
            <div className="settings-stack">
              <header className="settings-pane__head">
                <h3 className="window-title">This Device</h3>
                <p className="window-lede">
                  Read from the browser as you watch it. These are the same values the widgets and the layout
                  queries use — nothing is stored, and nothing is sent anywhere.
                </p>
              </header>
              <Group caption="Layout">
                <Row label="Presentation" value={isCompact ? 'Phone (iPhone home screen)' : 'Desktop (macOS windows)'} />
                <Row label="Viewport" value={`${viewport.w} × ${viewport.h}px`} />
                <Row label="Pointer" value={finePointer ? 'Fine (mouse or trackpad)' : 'Coarse (touch)'} />
                <Row label="Reduced motion" value={reducedMotion ? 'Requested' : 'Not requested'} />
              </Group>
              <Group caption="Readings">
                <Row
                  label="Battery"
                  value={battery ? `${battery.level}%${battery.charging ? ' · charging' : ''}` : 'Not reported by this browser'}
                />
                <Row label="Network" value={navigator.onLine === false ? 'Browser reports no connection' : 'Browser reports a connection'} />
                <Row label="Time zone" value={Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown'} />
                <Row label="Language" value={Intl.DateTimeFormat().resolvedOptions().locale || 'Unknown'} />
                <Row label="Platform" value={navigator.userAgentData?.platform ?? navigator.platform ?? 'Not reported'} />
              </Group>
            </div>
          ) : null}

          {pane === 'storage' ? (
            <div className="settings-stack">
              <header className="settings-pane__head">
                <h3 className="window-title">Storage</h3>
                <p className="window-lede">
                  Preferences this site keeps in your browser, read live from <code>localStorage</code>. The
                  author of the site cannot see any of it: there is nowhere for it to be sent.
                </p>
              </header>
              <Group caption={entries.length ? `${entries.length} key${entries.length === 1 ? '' : 's'} on this device` : 'Nothing stored'}>
                {entries.length === 0 ? (
                  <div className="settings-note">
                    <p className="settings-note__title">No stored preferences</p>
                    <p className="settings-note__text">
                      Either nothing has been changed yet, or this browser blocks storage for this page — in
                      private browsing the interface keeps working for the visit and remembers none of it.
                    </p>
                  </div>
                ) : (
                  entries.map((entry) => (
                    <div className="settings-key" key={entry.key}>
                      <p className="settings-key__name">{entry.key}</p>
                      <p className="settings-key__what">{purposeByKey.get(entry.key) ?? 'Written by this interface; not documented in the source.'}</p>
                      <p className="settings-key__size">{entry.bytes} bytes</p>
                    </div>
                  ))
                )}
              </Group>
              <Group>
                <Row label="Clear stored preferences" hint="The settings you changed in this visit stay in memory until the page is reloaded — the files on your device go immediately.">
                  <Button variant="tinted" size="sm" icon={Database} onClick={clearStorage} disabled={entries.length === 0}>
                    Clear
                  </Button>
                </Row>
              </Group>
              <p className="settings-fine">
                Documented keys: {STORAGE_KEYS.length}. What the page reads but never stores is listed in the
                Privacy Policy pane.
              </p>
            </div>
          ) : null}

          {legal ? <LegalPane pane={legal} /> : null}
        </div>
      </div>
    </WindowPane>
  );
}

export default SettingsWindow;
