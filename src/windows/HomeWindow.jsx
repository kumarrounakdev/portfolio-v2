import { FileText } from 'lucide-react';
import { resume } from '../data/resume.js';
import { Button, Chip } from '../components/Button.jsx';
import { WindowPane } from '../components/WindowPane.jsx';
import { useWindowManager } from '../hooks/useWindowManager.jsx';
import { profile, about } from '../data/portfolio.js';
import { email, externalLinkProps, githubProfileUrl, isSet, mailtoUrl, resumeUrl, safeHref, whatsappUrl } from '../utils/links.js';
import { GithubGlyph, WhatsappGlyph } from '../components/icons.jsx';

/**
 * The portfolio window, set like a page rather than stacked like a form: a
 * headline band that states the thing, a hairline, and under it three columns of
 * the same weight — the tools, the facts, the ways to reach me.
 *
 * Deliberately absent: the readings a profile window usually fills itself with
 * (the clock, the weather, the machine), which belong to the desktop rail and to
 * About and Contact, and a name in display type, which would spend the largest
 * thing on screen on a label instead of a claim. The name is one row of the
 * Details column; the window's own title bar, the menu bar and the document title
 * carry it everywhere else.
 *
 * Each column also refuses to repeat another: the email address is written once,
 * in the reach column, where clicking it is the point of reading it.
 */
export function HomeWindow() {
  const { openWindow } = useWindowManager();
  const hasResume = isSet(resumeUrl());
  const hasGithub = isSet(githubProfileUrl());
  const hasEmail = isSet(email());
  const hasWhatsapp = isSet(whatsappUrl());
  const studying = resume.education[0];

  /* Facts, not buttons. Anything a visitor could act on lives in the reach column,
     so nothing in here is a row that looks pressable and is not. */
  const facts = [
    ['Name', profile.name],
    ['Role', profile.title],
    ...(profile.city ? [['Based in', profile.city]] : []),
    ['Studying', `${studying.award} — ${studying.place}, ${studying.when}`],
  ];

  return (
    <>
      <WindowPane className="hero-pane">
        <section className="hero">
          <header className="hero-band">
            <div className="hero-band__top">
              <p className="hero__eyebrow">
                <span
                  className={`status-dot ${
                    profile.availability?.status === 'available' ? 'status-dot--pulse' : 'status-dot--busy'
                  }`}
                  aria-hidden="true"
                />
                {profile.availability?.label}
              </p>
              {/* Only a real portrait is drawn. Initials in a coloured square are not a
                  stand-in for a face, so until a file exists at AVATAR_URL the masthead
                  has nothing to show and shows nothing. */}
              {isSet(profile.avatarUrl) ? (
                <span className="avatar">
                  <img src={profile.avatarUrl} alt={`Portrait of ${profile.name}`} loading="lazy" />
                </span>
              ) : null}
            </div>

            {/* The headline is the h1: this window's first line is a claim about the
                work, in the largest type on the surface. */}
            <h1 className="hero__headline">{profile.headline}</h1>
            <p className="hero__role">{[profile.title, profile.city].filter(Boolean).join('  ·  ')}</p>
            <p className="hero__text">{profile.description}</p>

            <div className="hero__cta">
              <Button size="lg" variant="primary" onClick={() => openWindow('projects', { origin: 'hero' })}>
                {profile.actions.projects}
              </Button>
              <Button size="lg" variant="neutral" onClick={() => openWindow('contact', { origin: 'hero' })}>
                {profile.actions.contact}
              </Button>
              {/* The same button as the other two, because it asks for the same thing:
                  a click that opens a window. The icon it used to carry marked it as a
                  download, which is what the window inside then offers. */}
              {hasResume ? (
                <Button size="lg" variant="neutral" onClick={() => openWindow('resume', { origin: 'hero' })}>
                  Résumé
                </Button>
              ) : null}
            </div>
          </header>

          <div className="hero-grid">
            <section className="hero-block" aria-label="What I work with">
              <p className="hero-block__title">What I work with</p>
              <div className="chip-row">
                {profile.techLabels.map((label) => (
                  <Chip key={label} tone="tech">
                    {label}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="hero-block" aria-label="Details">
              <p className="hero-block__title">Details</p>
              <dl className="hero-facts">
                {facts.map(([label, value]) => (
                  <div className="identity-row" key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="hero-block" aria-label="Reach me">
              <p className="hero-block__title">Reach me</p>
              {/* The address is the action: it is written once, and reading it is what
                  makes the click worth offering. No second row labelled "write to me". */}
              {hasEmail ? (
                <a className="hero-mail mono" href={safeHref(mailtoUrl())}>
                  {email()}
                </a>
              ) : (
                <p className="hero-mail mono">No address configured in src/data/portfolio.js</p>
              )}
              <div className="hero-reach">
                {hasGithub ? (
                  <a className="hero-reach__row" {...externalLinkProps(githubProfileUrl())}>
                    <GithubGlyph size={14} />
                    <span>GitHub</span>
                  </a>
                ) : null}
                {hasWhatsapp ? (
                  <a className="hero-reach__row" {...externalLinkProps(whatsappUrl())}>
                    <WhatsappGlyph size={14} />
                    <span>WhatsApp</span>
                  </a>
                ) : null}
                {hasResume ? (
                  <button
                    type="button"
                    className="hero-reach__row"
                    onClick={() => openWindow('resume', { origin: 'hero' })}
                  >
                    <FileText size={14} aria-hidden="true" />
                    <span>Full résumé</span>
                  </button>
                ) : null}
              </div>
            </section>
          </div>
        </section>
      </WindowPane>

      <footer className="window__statusbar">
        <span className="mono">{about.building.slice(0, 3).join('  ·  ')}</span>
        <span className="spacer" />
        <Button size="sm" variant="ghost" onClick={() => openWindow('skills', { origin: 'hero' })}>
          Skills
        </Button>
        <Button size="sm" variant="ghost" onClick={() => openWindow('education', { origin: 'hero' })}>
          Education
        </Button>
        <Button size="sm" variant="ghost" onClick={() => openWindow('terminal', { origin: 'hero' })}>
          Terminal
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={FileText}
          onClick={() => openWindow('guide', { origin: 'hero', payload: 'start' })}
        >
          Manual
        </Button>
      </footer>
    </>
  );
}

export default HomeWindow;
