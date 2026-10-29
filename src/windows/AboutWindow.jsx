import { ArrowRight } from 'lucide-react';
import { Button, Chip } from '../components/Button.jsx';
import { WindowPane, WindowSection } from '../components/WindowPane.jsx';
import { ConfigNote } from '../components/ConfigNote.jsx';
import { useWindowManager } from '../hooks/useWindowManager.jsx';
import { about, profile } from '../data/portfolio.js';
import { githubProfileUrl, isSet } from '../utils/links.js';

/** A short, factual profile — no biography, no marketing filler. */
export function AboutWindow() {
  const { openWindow } = useWindowManager();
  const facts = (about.facts || []).filter((fact) => isSet(fact.value));

  return (
    <WindowPane>
      <div className="stack stack--loose">
        <header className="win-head">
          <p className="eyebrow">About</p>
          <h3 className="window-title">{profile.name}</h3>
          <p className="section-sub">{profile.title}</p>
        </header>

        <div className="about-grid">
          <div className="stack stack--loose">
            <WindowSection eyebrow="Introduction">
              <div className="prose">
                {about.intro.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
              </div>
            </WindowSection>

            <WindowSection eyebrow="How I work" title="Four rules I keep">
              <ul className="principle-list">
                {about.principles.map((principle, index) => (
                  <li className="principle" key={principle.title}>
                    <span className="principle__num mono">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="principle__title">{principle.title}</p>
                      <p className="principle__text">{principle.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </WindowSection>
          </div>

          <div className="stack stack--loose">
            <WindowSection eyebrow="Building with">
              <div className="chip-row">
                {about.building.map((item) => (
                  <Chip key={item} tone="tech">
                    {item}
                  </Chip>
                ))}
              </div>
            </WindowSection>

            {facts.length > 0 ? (
              <WindowSection eyebrow="Details">
                <dl className="identity-card__rows fact-list">
                  {facts.map((fact) => (
                    <div className="identity-row" key={fact.label}>
                      <dt>{fact.label}</dt>
                      <dd>{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </WindowSection>
            ) : null}

            <WindowSection eyebrow="Goals">
              <ul className="bullet-list">
                {about.goals.map((goal) => (
                  <li key={goal.slice(0, 24)}>{goal}</li>
                ))}
              </ul>
            </WindowSection>

            <div className="stack stack--tight">
              <Button variant="neutral" size="sm" onClick={() => openWindow('education', { origin: 'about' })} trailingIcon={ArrowRight}>
                See the education
              </Button>
              <Button variant="neutral" size="sm" onClick={() => openWindow('projects', { origin: 'about' })} trailingIcon={ArrowRight}>
                See the projects
              </Button>
            </div>
          </div>
        </div>

        {!isSet(githubProfileUrl()) ? (
          <ConfigNote title="GitHub is not configured." file="src/data/portfolio.js">
            Set <code>GITHUB_USERNAME</code> to show a profile link here and in the Dock.
          </ConfigNote>
        ) : null}
      </div>
    </WindowPane>
  );
}

export default AboutWindow;
