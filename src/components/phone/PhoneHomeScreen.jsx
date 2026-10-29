import { ArrowUpRight, FolderOpen, House, MessageCircle, MonitorSmartphone } from 'lucide-react';

import { PHONE_APPS } from './apps.jsx';
import { PhoneAppIcon, PhoneDock } from './parts.jsx';
import { greetingFor } from '../widgets.jsx';
import { profile } from '../../data/portfolio.js';
import { useClock } from '../../hooks/useClock.js';
import { githubProfileUrl, isSet, linkedinUrl } from '../../utils/links.js';

/**
 * The phone's home screen.
 *
 * Two things make it a device rather than a menu: a greeting that reads the
 * same clock hook as the menu bar, and a dock whose fourth slot is the way back
 * out to the desktop. The apps are the ones from `apps.jsx`, and the two links
 * under them are the only things that leave the phone — they open in a new tab
 * because a browser cannot pretend otherwise.
 */
export function PhoneHomeScreen({ onOpen, onOpenDesktop }) {
  const clock = useClock();
  const greeting = greetingFor(clock.raw.getHours());

  const links = [
    { id: 'github', label: 'GitHub', href: githubProfileUrl(), icon: ArrowUpRight },
    { id: 'linkedin', label: 'LinkedIn', href: linkedinUrl(), icon: ArrowUpRight },
  ].filter((link) => isSet(link.href));

  const dock = [
    { id: 'home', label: 'Home', icon: House, ariaLabel: 'Phone home screen', onOpen: () => onOpen(null) },
    { id: 'projects', label: 'Projects', icon: FolderOpen, onOpen: () => onOpen({ app: 'projects' }) },
    { id: 'contact', label: 'Contact', icon: MessageCircle, onOpen: () => onOpen({ app: 'contact' }) },
    {
      id: 'desktop',
      label: 'Desktop',
      icon: MonitorSmartphone,
      ariaLabel: 'Leave the phone and open the desktop',
      onOpen: () => onOpenDesktop('home'),
    },
  ];

  return (
    <div className="phone-home">
      <header className="phone-home__head">
        <h2 className="phone-home__greeting">
          {greeting}, {profile.name.split(' ')[0]}
        </h2>
        <p className="phone-home__label">
          {PHONE_APPS.length} apps, all of them the real data
        </p>
      </header>

      {/* No widget band, because the screen this is a picture of has none: a phone
          gets icons, and the live tiles stay where they are read — the desktop rail
          and the lock screen above. Showing a band here would be a drawing of an
          interface that no longer exists. */}
      <div className="phone-home__scroll">
        <ul className="phone-home__apps">
          {PHONE_APPS.map((app) => (
            <li key={app.id}>
              <PhoneAppIcon
                label={app.label}
                ariaLabel={`Open ${app.title} in the phone`}
                icon={app.icon}
                accent={app.accent}
                onOpen={() => onOpen({ app: app.id })}
              />
            </li>
          ))}
        </ul>

        {links.length ? (
          <>
            <p className="phone-section-title">Leave the phone</p>
            <ul className="phone-home__apps">
              {links.map((link) => (
                <li key={link.id}>
                  <PhoneAppIcon
                    label={link.label}
                    ariaLabel={`${link.label} opens in a new tab`}
                    icon={link.icon}
                    href={link.href}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <p className="phone-home__intro">
          Every screen here reads src/data — the same files the windows read. Nothing is stored on the
          device.
        </p>
      </div>

      <PhoneDock items={dock} />
    </div>
  );
}
