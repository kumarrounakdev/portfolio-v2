import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Copy, FolderOpen, Info, Mail } from 'lucide-react';
import { Button } from '../components/Button.jsx';
import { WindowPane } from '../components/WindowPane.jsx';
import { ConfigNote } from '../components/ConfigNote.jsx';
import { GithubGlyph, WhatsappGlyph, LinkedinGlyph } from '../components/icons.jsx';
import { contact, profile } from '../data/portfolio.js';
import { projects } from '../data/projects.js';
import {
  contactChannels,
  copyText,
  email,
  externalLinkProps,
  isExternalHref,
  isSet,
  mailtoUrl,
} from '../utils/links.js';
import { useWindowManager } from '../hooks/useWindowManager.jsx';

const CHANNEL_ICONS = {
  email: Info,
  whatsapp: WhatsappGlyph,
  github: GithubGlyph,
  linkedin: LinkedinGlyph,
};

const CHANNEL_ACCENTS = {
  email: '#0a7cff',
  whatsapp: '#25d366',
  github: '#6e7681',
  linkedin: '#0a66c2',
};

/**
 * Contact window. Deliberately form-free: a form with no backend either lies
 * about sending or needs a third-party endpoint, so this page only ever hands
 * the visitor a real channel — a mail client, a WhatsApp chat, a profile.
 * Email gets a card of its own because its address is worth copying and a mail
 * client needs the address in front of you; everything else is a row. The link
 * carries nothing else — not even a subject.
 */
export function ContactWindow() {
  const channels = useMemo(() => contactChannels(), []);
  const [copied, setCopied] = useState(false);
  const { announce, openWindow } = useWindowManager();
  const hasEmail = isSet(email());
  const rows = hasEmail ? channels.filter((channel) => channel.id !== 'email') : channels;
  const mailto = mailtoUrl();

  const copyEmail = () => {
    copyText(email()).then((ok) => {
      if (!ok) {
        announce('This browser blocked clipboard access');
        return;
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <WindowPane>
      <div className="stack stack--loose">
        <header className="win-head">
          <p className="eyebrow">Contact</p>
          <h3 className="window-title">Let’s talk about what you need built</h3>
          <p className="window-lede">{contact.intro}</p>
        </header>

        <div className="contact-layout">
          <div className="contact-col">
            {channels.length === 0 ? (
              <ConfigNote title="No contact channels are configured." file="src/data/portfolio.js">
                Add an email, WhatsApp number, GitHub or LinkedIn URL and the matching card appears here, in
                the hero and in the menu bar.
              </ConfigNote>
            ) : (
              <>
                {hasEmail ? (
                  <section className="email-card" aria-label="Email">
                    <div className="email-card__head">
                      <span className="email-card__icon" aria-hidden="true">
                        <Mail size={18} strokeWidth={1.9} />
                      </span>
                      <div className="email-card__text">
                        <p className="eyebrow">Usually answered first</p>
                        <a className="email-card__address mono" href={mailto}>
                          {email()}
                        </a>
                        <p className="email-card__note">
                          Opens a blank message in your own mail app. Nothing is written for you and nothing is sent
                          from this page.
                        </p>
                      </div>
                    </div>
                    <div className="email-card__actions">
                      <Button variant="primary" size="sm" icon={Mail} href={mailto}>
                        {profile.actions.email}
                      </Button>
                      <Button variant="neutral" size="sm" icon={copied ? Check : Copy} onClick={copyEmail}>
                        {copied ? 'Copied' : 'Copy email'}
                      </Button>
                    </div>
                  </section>
                ) : (
                  <ConfigNote tone="default" title="No email address is configured." file="src/data/portfolio.js">
                    Set <code>profile.email</code> and the mail card appears. There is no contact form on this
                    site by design — a form without a backend can only pretend to send.
                  </ConfigNote>
                )}

                {rows.length > 0 ? (
                  <section aria-label="Other ways to get in touch">
                    <p className="eyebrow contact-col__label">Elsewhere</p>
                    <div className="channels">
                      {rows.map((channel) => {
                        const Icon = CHANNEL_ICONS[channel.id] ?? Info;
                        const inner = (
                          <>
                            <span className="channel__icon" aria-hidden="true">
                              <Icon size={17} strokeWidth={1.9} />
                            </span>
                            <span className="channel__text">
                              <span className="channel__label">{channel.label}</span>
                              <span className="channel__value">{channel.value}</span>
                            </span>
                            <span className="channel__note">{channel.note}</span>
                            <ArrowUpRight className="channel__go" size={15} aria-hidden="true" />
                          </>
                        );
                        const shared = {
                          className: 'channel',
                          style: { '--channel-accent': CHANNEL_ACCENTS[channel.id] ?? 'var(--accent)' },
                          href: channel.href,
                        };

                        return isExternalHref(channel.href) ? (
                          <a key={channel.id} {...shared} {...externalLinkProps(channel.href)}>
                            {inner}
                          </a>
                        ) : (
                          <a key={channel.id} {...shared}>
                            {inner}
                          </a>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                <p className="fineprint">
                  Nothing is collected on this page: no form, no analytics, no stored message. Whichever channel
                  you use, it opens in your own app — and if a channel is not configured on this build, you will not
                  see a button for it.
                </p>
              </>
            )}
          </div>

          <aside className="contact-side">
            <div className={`availability-card availability-card--${profile.availability?.status ?? 'unset'}`}>
              <span
                className={`status-dot ${profile.availability?.status === 'available' ? 'status-dot--pulse' : 'status-dot--busy'}`}
                aria-hidden="true"
              />
              <div>
                <p className="availability-card__title">{profile.availability?.label ?? 'Availability not set'}</p>
                <p className="availability-card__text">
                  {contact.responseTime || 'No reply-time promise is made here, because none is configured.'}
                </p>
              </div>
            </div>

            {profile.focus?.length ? (
              <section className="side-card" aria-label="What I work on">
                <h4 className="side-card__title">Good briefs look like</h4>
                <ul className="side-card__list">
                  {profile.focus.map((line) => (
                    <li key={line.slice(0, 26)}>{line}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="side-card side-card--link" aria-label="Before you write">
              <h4 className="side-card__title">Judging the work first</h4>
              <p className="side-card__text">
                {projects.length} case studies, each with the decisions and trade-offs written down — including what
                a project deliberately does not do.
              </p>
              <Button
                size="sm"
                variant="ghost"
                icon={FolderOpen}
                trailingIcon={ArrowUpRight}
                onClick={() => openWindow('projects', { origin: 'contact' })}
              >
                Open Projects
              </Button>
            </section>
          </aside>
        </div>
      </div>
    </WindowPane>
  );
}

export default ContactWindow;
