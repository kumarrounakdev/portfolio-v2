import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  GraduationCap,
  Info,
  Mail,
  MessageCircle,
  Moon,
  Monitor,
  Star,
  Sun,
  User,
  Wrench,
} from 'lucide-react';

import { PhoneAppScreen, PhoneCard, PhoneFacts, PhoneRow } from './parts.jsx';
import { ContributionGraph } from '../ContributionGraph.jsx';
import { GithubGlyph, LinkedinGlyph, WhatsappGlyph } from '../icons.jsx';
import { about, contact, profile } from '../../data/portfolio.js';
import { education } from '../../data/education.js';
import { projects } from '../../data/projects.js';
import { primaryStack, skillGroups } from '../../data/skills.js';
import { useBattery } from '../../hooks/useBattery.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { useTextScale } from '../../hooks/useTextScale.js';
import { useTheme } from '../../hooks/useTheme.jsx';
import {
  contactChannels,
  externalLinkProps,
  githubProfileUrl,
  githubUsername,
  isSet,
} from '../../utils/links.js';

/**
 * The apps that run inside the phone.
 *
 * Each one is a thin, phone-shaped view over the *same* modules the macOS
 * windows import — `src/data/*` and `src/utils/links.js` — so nothing is
 * restated and a change in `projects.js` appears in both places at once.
 * Unconfigured values (an empty demo URL, an unset response time) render as
 * nothing, exactly as they do on the desktop.
 */

const firstName = profile.name.split(' ')[0];

/* --- About ---------------------------------------------------------------- */

function PhoneAboutApp() {
  const facts = (about.facts || []).filter((fact) => isSet(fact.value));

  return (
    <>
      <PhoneCard>
        <h3 className="phone-card__title">{profile.name}</h3>
        <p className="phone-card__text">{profile.title}</p>
        <p className="phone-card__text">{profile.headline}</p>
      </PhoneCard>

      {facts.length ? (
        <PhoneCard title="Facts">
          <PhoneFacts rows={facts} />
        </PhoneCard>
      ) : null}

      <p className="phone-section-title">How I work</p>
      {about.principles.map((principle) => (
        <PhoneCard key={principle.title}>
          <h3 className="phone-card__title">{principle.title}</h3>
          <p className="phone-card__text">{principle.text}</p>
        </PhoneCard>
      ))}

      <PhoneCard title="Currently building">
        <ul className="phone-bullets">
          {about.building.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </PhoneCard>
    </>
  );
}

/* --- Projects ------------------------------------------------------------- */

function PhoneProjectsApp({ go }) {
  return (
    <>
      <p className="phone-card__text">
        {projects.length} projects, with the same notes the Projects window shows.
      </p>

      <ul className="phone-row__list">
        {projects.map((project) => (
          <li key={project.id}>
            <PhoneRow
              icon={project.featured ? Star : BookOpen}
              title={project.name}
              sub={project.tagline}
              onSelect={() => go({ app: 'project', id: project.id, backTo: 'projects' })}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function PhoneProjectDetailApp({ params }) {
  const project = projects.find((entry) => entry.id === params.id);
  if (!project) {
    return <p className="phone-card__text">That project is no longer in src/data/projects.js.</p>;
  }

  const links = Object.entries(project.links || {}).filter(([, href]) => isSet(href));

  return (
    <>
      <div className="phone-tile-art">
        <span className={`proj-thumb art--${project.art}`} aria-hidden="true" />
      </div>

      <div>
        <h3 className="phone-card__title">{project.name}</h3>
        <p className="phone-card__text">{project.tagline}</p>
      </div>

      <p className="phone-card__text">{project.summary}</p>

      {project.parts?.length ? (
        <PhoneCard title={`Built in ${project.parts.length} parts`}>
          <ul className="phone-bullets">
            {project.parts.map((part) => (
              <li key={part.name}>
                {part.kind}: {part.line}
              </li>
            ))}
          </ul>
        </PhoneCard>
      ) : null}

      {project.does?.length ? (
        <PhoneCard title="What it does">
          <ul className="phone-bullets">
            {project.does.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </PhoneCard>
      ) : null}

      {project.stack?.length ? (
        <PhoneCard title="Stack">
          <div className="phone-chips">
            {project.stack.map((item) => (
              <span className="phone-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </PhoneCard>
      ) : null}

      {project.notes?.length ? (
        <PhoneCard title="Trade-offs">
          <ul className="phone-bullets">
            {project.notes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </PhoneCard>
      ) : null}

      {links.length ? (
        <ul className="phone-row__list">
          {links.map(([kind, href]) => (
            <li key={kind}>
              <PhoneRow
                icon={kind === 'demo' ? ArrowUpRight : GithubGlyph}
                title={kind === 'demo' ? 'Live demo' : 'Source code'}
                sub={href.replace(/^https?:\/\//, '')}
                href={href}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="phone-settings__hint">
          No public link is configured for this project, so there is nothing to open.
        </p>
      )}
    </>
  );
}

/* --- Skills --------------------------------------------------------------- */

function PhoneSkillsApp() {
  return (
    <>
      <PhoneCard title="Every day">
        <div className="phone-chips">
          {primaryStack.map((item) => (
            <span className="phone-chip" key={item}>
              {item}
            </span>
          ))}
        </div>
      </PhoneCard>

      {skillGroups.map((group) => (
        <PhoneCard key={group.id} title={group.title}>
          <p className="phone-card__text">{group.blurb}</p>
          <div className="phone-chips">
            {group.items.map((item) => (
              <span className="phone-chip phone-chip--muted" key={item}>
                {item}
              </span>
            ))}
          </div>
        </PhoneCard>
      ))}
    </>
  );
}

/* --- Education ------------------------------------------------------------ */

function PhoneEducationApp() {
  return (
    <>
      <ul className="phone-row__list">
        {education.map((entry) => (
          <li key={entry.id}>
            <PhoneRow
              icon={entry.type === 'degree' ? GraduationCap : BookOpen}
              title={entry.title}
              sub={[entry.org, entry.period, entry.status].filter(isSet).join(' · ')}
              chevron={false}
            />
          </li>
        ))}
      </ul>

      <PhoneCard title="Focus">
        <ul className="phone-bullets">
          {profile.focus.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </PhoneCard>
    </>
  );
}

/* --- GitHub --------------------------------------------------------------- */

function PhoneGitHubApp() {
  const url = githubProfileUrl();
  const username = githubUsername();
  const repos = projects.filter((project) => isSet(project.links?.repo));

  if (!isSet(url)) {
    return (
      <p className="phone-card__text">
        No GitHub profile is configured. Set <code>GITHUB_USERNAME</code> in src/data/portfolio.js and
        this screen fills in.
      </p>
    );
  }

  return (
    <>
      <PhoneCard>
        <h3 className="phone-card__title">@{username}</h3>
        <p className="phone-card__text">{profile.name}</p>
      </PhoneCard>

      <ContributionGraph username={username} />

      <p className="phone-section-title">Repositories linked from projects</p>
      {repos.length ? (
        <ul className="phone-row__list">
          {repos.map((project) => (
            <li key={project.id}>
              <PhoneRow
                icon={GithubGlyph}
                title={project.name}
                sub={project.links.repo.replace(/^https?:\/\//, '')}
                href={project.links.repo}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="phone-settings__hint">No project repository links are set in src/data/projects.js.</p>
      )}

      <a className="phone-call" href={url} {...externalLinkProps(url)}>
        <ArrowUpRight size={13} aria-hidden="true" />
        Open github.com/{username}
      </a>

      <p className="phone-settings__hint">
        The graph above is the same live reading the desktop window shows; stars and follower counts
        stay on the profile itself.
      </p>
    </>
  );
}

/* --- Contact -------------------------------------------------------------- */

/* A channel is recognised by its own mark, so the phone draws the same three the
   desktop does: a chat bubble for WhatsApp and an information circle for
   LinkedIn would be two icons describing the wrong thing. */
const CHANNEL_ICONS = {
  email: Mail,
  whatsapp: WhatsappGlyph,
  github: GithubGlyph,
  linkedin: LinkedinGlyph,
};

function PhoneContactApp() {
  const channels = contactChannels();
  const [primary, ...rest] = channels;

  if (!channels.length) {
    return <p className="phone-card__text">No contact channel is configured yet.</p>;
  }

  const PrimaryIcon = CHANNEL_ICONS[primary.id] ?? Mail;

  return (
    <>
      <p className="phone-card__text">{contact.intro}</p>

      <a className="phone-call" href={primary.href} {...(primary.external ? externalLinkProps(primary.href) : {})}>
        <PrimaryIcon size={13} aria-hidden="true" />
        {primary.label}
      </a>

      {rest.length ? (
        <ul className="phone-row__list">
          {rest.map((channel) => (
            <li key={channel.id}>
              <PhoneRow
                icon={CHANNEL_ICONS[channel.id] ?? Mail}
                title={channel.label}
                sub={channel.note ? `${channel.value} · ${channel.note}` : channel.value}
                href={channel.href}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <PhoneCard title="Response time">
        <p className="phone-card__text">
          {isSet(contact.responseTime)
            ? contact.responseTime
            : 'No response time is promised, because none is measured. It lives in src/data/portfolio.js.'}
        </p>
      </PhoneCard>
    </>
  );
}

/* --- Settings ------------------------------------------------------------- */

const APPEARANCES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'Auto', icon: Monitor },
];

function PhoneSettingsApp() {
  const { theme, preference, setPreference } = useTheme();
  const { percent, canIncrease, canDecrease, increase, decrease, reset } = useTextScale();
  const reducedMotion = usePrefersReducedMotion();
  const battery = useBattery();

  const chosen = APPEARANCES.find((option) => option.id === preference);

  return (
    <>
      <div className="phone-settings__group">
        <p className="phone-settings__legend">Appearance</p>
        <div className="phone-segmented" role="radiogroup" aria-label="Appearance">
          {APPEARANCES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              className="phone-segmented__option"
              aria-checked={preference === option.id}
              onClick={() => setPreference(option.id)}
            >
              <option.icon size={12} strokeWidth={2} aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
        <p className="phone-settings__hint">
          This is the same setting the Apple menu writes: {chosen?.label} selected, {theme} right now.
        </p>
      </div>

      <div className="phone-settings__group">
        <p className="phone-settings__legend">Text size</p>
        <div className="phone-segmented" role="group" aria-label="Text size">
          <button type="button" className="phone-segmented__option" onClick={decrease} disabled={!canDecrease}>
            Smaller
          </button>
          <button type="button" className="phone-segmented__option" onClick={reset}>
            {percent}%
          </button>
          <button type="button" className="phone-segmented__option" onClick={increase} disabled={!canIncrease}>
            Larger
          </button>
        </div>
        <p className="phone-settings__hint">
          View ▸ Zoom on the desktop: text scales, window geometry does not.
        </p>
      </div>

      <PhoneCard title="This device">
        <PhoneFacts
          rows={[
            { label: 'Reduced motion', value: reducedMotion ? 'Requested' : 'Not requested' },
            {
              label: 'Battery',
              value: battery ? `${battery.level}%${battery.charging ? ' · charging' : ''}` : 'Not reported',
            },
            { label: 'Time zone', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
          ]}
        />
      </PhoneCard>

      <PhoneCard title="Interface guards">
        <PhoneFacts
          rows={[
            { label: 'Right-click menu', value: profile.guards.contextMenu ? 'Off' : 'On' },
            { label: 'DevTools keys', value: profile.guards.devtools ? 'Off' : 'On' },
          ]}
        />
        <p className="phone-settings__hint">
          Cosmetic deterrence, configured in src/data/portfolio.js. The content itself is never hidden.
        </p>
      </PhoneCard>

      <PhoneCard title="The small print">
        <p className="phone-settings__hint">
          Terms of Use, the Privacy Policy, the accessibility notes and the dependency licences live in the
          Settings window on the desktop — the row below opens it. They describe this build, so they are edited
          in src/data/legal.js rather than pasted from a generator.
        </p>
      </PhoneCard>

      <p className="phone-settings__hint">
        <Check size={11} strokeWidth={2.4} aria-hidden="true" /> No account, no cookies, nothing sent
        anywhere.
      </p>
    </>
  );
}

/* --- The registry --------------------------------------------------------- */

/** The phone's home screen and the screens it can open, from one list, so an
 *  app cannot exist in one place and be missing from the other. `desktop` names
 *  the window a press on the footer opens behind the phone; `accent` reuses the
 *  registry's colour for the shared apps so the two metaphors match, and
 *  Settings keeps the accent token because the desktop has no tile for it. */
export const PHONE_APPS = [
  { id: 'about', label: 'About', title: `About ${firstName}`, icon: User, accent: '#8b5cf6', desktop: 'about', App: PhoneAboutApp },
  { id: 'projects', label: 'Projects', title: 'Projects', icon: Star, accent: '#2f9de0', desktop: 'projects', App: PhoneProjectsApp },
  { id: 'skills', label: 'Skills', title: 'Skills', icon: Wrench, accent: '#f2994a', desktop: 'skills', App: PhoneSkillsApp },
  { id: 'education', label: 'Education', title: 'Education', icon: CalendarDays, accent: '#12b886', desktop: 'education', App: PhoneEducationApp },
  { id: 'github', label: 'GitHub', title: 'GitHub', icon: GithubGlyph, accent: '#6e7681', desktop: 'github', App: PhoneGitHubApp },
  { id: 'contact', label: 'Contact', title: 'Contact', icon: MessageCircle, accent: '#e2577a', desktop: 'contact', App: PhoneContactApp },
  {
    id: 'settings',
    label: 'Settings',
    title: 'Settings',
    icon: Info,
    accent: '#8b93a7',
    desktop: 'settings',
    App: PhoneSettingsApp,
  },
];

/** The one screen that is not in the grid: a project, opened from Projects. */
const PHONE_DETAIL_APP = { id: 'project', title: 'Project', App: PhoneProjectDetailApp };

function phoneAppFor(id) {
  if (id === PHONE_DETAIL_APP.id) return PHONE_DETAIL_APP;
  return PHONE_APPS.find((app) => app.id === id) ?? null;
}

/** Wraps an app's content in the shared chrome: title bar, one home action,
 *  a scrolling body and a footer that leaves the phone. */
export function PhoneAppRouter({ screen, go, onHome, onOpenDesktop }) {
  const entry = phoneAppFor(screen.app);
  if (!entry) return null;
  const { App, title, desktop } = entry;
  // A screen that was opened from another one gets a back action; the phone's
  // own apps only ever need Home.
  const back = screen.backTo ? phoneAppFor(screen.backTo) : null;

  return (
    <PhoneAppScreen
      title={title}
      onHome={onHome}
      onBack={back ? () => go({ app: back.id }) : undefined}
      backLabel={back ? back.label : undefined}
      footer={
        desktop ? (
          <PhoneRow
            icon={BookOpen}
            title={`Open ${title} on the desktop`}
            sub="The window this screen is summarising"
            onSelect={() => onOpenDesktop(desktop)}
          />
        ) : null
      }
    >
      <App go={go} params={screen} />
    </PhoneAppScreen>
  );
}
