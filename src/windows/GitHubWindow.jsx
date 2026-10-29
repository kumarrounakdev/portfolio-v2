import { Check, Copy, ExternalLink, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/Button.jsx';
import { ContributionGraph } from '../components/ContributionGraph.jsx';
import { WindowPane } from '../components/WindowPane.jsx';
import { ConfigNote } from '../components/ConfigNote.jsx';
import { GithubGlyph } from '../components/icons.jsx';
import { profile } from '../data/portfolio.js';
import { projects } from '../data/projects.js';
import { copyText, githubProfileUrl, githubUsername, isSet } from '../utils/links.js';

/**
 * GitHub is linked and read, never guessed. One live request draws the public
 * contribution graph (`src/utils/contributions.js` explains what it reads and
 * why); everything else here is the profile link plus the repositories that
 * projects.js actually points at — no stars, no follower counts, no language
 * breakdown, because those are the numbers a portfolio tends to make up.
 */
export function GithubWindow() {
  const [copied, setCopied] = useState(false);
  const url = githubProfileUrl();
  const username = githubUsername();
  const withRepos = projects.filter((project) => isSet(project.links?.repo));

  const copyProfile = async () => {
    const ok = await copyText(url);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <WindowPane>
      <div className="stack stack--loose">
        <header className="win-head">
          <p className="eyebrow">Source code</p>
          <h3 className="window-title">GitHub</h3>
        </header>

        {isSet(url) ? (
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div className="profile-row">
              <span className="avatar" style={{ width: 64, height: 64, borderRadius: 18, fontSize: 20 }}>
                <GithubGlyph size={28} />
              </span>
              <div style={{ minWidth: 0 }}>
                <p className="section-title" style={{ fontSize: 'var(--text-lg)' }}>
                  {profile.name}
                </p>
                <p className="section-sub mono">@{username}</p>
              </div>
              <div className="row" style={{ marginLeft: 'auto' }}>
                <Button size="sm" variant="ghost" icon={copied ? Check : Copy} onClick={copyProfile}>
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
                <Button size="sm" variant="primary" href={url} icon={ExternalLink}>
                  Open profile
                </Button>
              </div>
            </div>
            <p className="window-lede" style={{ marginTop: 'var(--space-4)' }}>
              One reading below — the public contribution graph — so that a claim about working in the open
              can be checked without leaving the page. Stars and follower counts stay where they are, on
              the profile itself.
            </p>
          </div>
        ) : (
          <ConfigNote title="No GitHub profile is configured." file="src/data/portfolio.js">
            Set <code>GITHUB_USERNAME</code> and the profile link appears here, in the Dock and in the hero.
          </ConfigNote>
        )}

        {isSet(url) ? <ContributionGraph username={username} /> : null}

        <section>
          <h4 className="section-title" style={{ marginBottom: 'var(--space-3)' }}>
            Repositories linked from projects
          </h4>
          {withRepos.length > 0 ? (
            <div className="repo-list">
              {withRepos.map((project) => (
                <div className="repo-row" key={project.id}>
                  <span className="icon-tile" aria-hidden="true">
                    <GithubGlyph size={15} />
                  </span>
                  <div className="repo-row__text">
                    <p className="repo-row__name">{project.name}</p>
                    <p className="repo-row__desc mono">{project.links.repo.replace(/^https?:\/\//, '')}</p>
                  </div>
                  <Button size="sm" variant="neutral" href={project.links.repo} icon={ExternalLink}>
                    Open
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <ConfigNote tone="default" title="No project repository links yet." file="src/data/projects.js">
              Add <code>links.repo</code> to a project and it is listed here and in the Projects window.
            </ConfigNote>
          )}
        </section>

        {isSet(url) ? (
          <div className="row">
            <Button size="sm" variant="neutral" icon={Search} href={`${url.replace(/\/$/, '')}?tab=repositories`}>
              Browse all repositories
            </Button>
            <span className="fineprint">Opens github.com in a new tab.</span>
          </div>
        ) : null}
      </div>
    </WindowPane>
  );
}

export default GithubWindow;
