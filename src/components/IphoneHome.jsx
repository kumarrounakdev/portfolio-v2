import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { AppIcon } from './AppIcon.jsx';
import { windowRegistry } from '../windows/registry.jsx';

/**
 * The phone presentation: an iPhone home screen rather than a small Mac.
 *
 * Same data, same window manager, different furniture — the status bar above is
 * the menu bar with its chrome taken away, every icon opens a real window, and
 * that is all there is: a grid of apps, the pill that searches them, and the dock
 * below. An iPhone's home screen carries no readings, so this one does not
 * either; the numbers that used to sit in a widget band are still read live, but
 * where they belong on a small screen — the desktop rail keeps its tiles, and
 * Settings ▸ This Device answers the same questions a tile did, from the browser
 * rather than from a picture of one. Nothing here is decorative: the grid is
 * built from the registry, so a window cannot exist on a Mac and be missing on a
 * phone, and every tile count in the test suite is counted from that same list.
 */

export function IphoneHome({ onOpen }) {
  /* Registry order, so the first tile is the first window and the grid cannot
     drift from the Dock's own list of destinations. */
  const apps = useMemo(
    () =>
      [...windowRegistry].sort(
        (a, b) => (a.dock?.order ?? 99) - (b.dock?.order ?? 99) || a.title.localeCompare(b.title),
      ),
    [],
  );

  return (
    <div className="ioshome" aria-label="Home screen">
      <ul className="ioshome__grid">
        {apps.map((definition) => (
          <li key={definition.id}>
            <button
              type="button"
              className="ioshome__cell"
              onClick={() => onOpen(definition.id, { origin: 'home-screen' })}
              aria-label={`Open ${definition.title}`}
            >
              <AppIcon icon={definition.icon} accent={definition.accent} art={definition.art} size={58} />
              <span className="ioshome__cell-label">{definition.dock?.mobileLabel ?? definition.title}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* The pill is iOS 18 furniture, and it does the one real thing a home
          screen can offer: the Finder search in the Projects app. */}
      <button type="button" className="ioshome__search" onClick={() => onOpen('projects', { origin: 'home-screen' })}>
        <Search size={13} strokeWidth={2.1} aria-hidden="true" />
        Search projects
      </button>
    </div>
  );
}

/**
 * The home indicator: always the last thing on screen, and on a phone it is how
 * you leave an app. When nothing is open there is nowhere to go home to, so the
 * bar stays put and does nothing — a control that lies is worse than no control.
 */
export function HomeIndicator({ canGoHome, onHome }) {
  return (
    <div className="ioshome__homebar">
      <button
        type="button"
        className="ioshome__homebar-button"
        onClick={onHome}
        disabled={!canGoHome}
        aria-label={canGoHome ? 'Back to the Home screen' : 'Home screen is already showing'}
      />
    </div>
  );
}

export default IphoneHome;
