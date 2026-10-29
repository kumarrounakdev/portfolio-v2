import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowLeft, ArrowUpRight, ExternalLink, X } from 'lucide-react';
import { Button, Chip } from '../components/Button.jsx';
import { partCount, projectCategories } from '../data/projects.js';
import { externalLinkProps, isSet } from '../utils/links.js';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';

/**
 * Project copy uses markdown-ish backticks for identifiers (`action`). Rendering
 * those as <code> keeps the data file plain text and still tells an identifier
 * apart from prose.
 */
function Rich({ text }) {
  const chunks = String(text ?? '').split(/`([^`]+)`/g);
  return chunks.map((chunk, index) =>
    index % 2 === 1 ? (
      <code className="inline-code" key={`${index}-${chunk}`}>
        {chunk}
      </code>
    ) : (
      <span key={`${index}-${chunk.slice(0, 8)}`}>{chunk}</span>
    ),
  );
}

function Block({ title, aside, children }) {
  if (!children) return null;
  return (
    <section className="detail-block">
      <h4 className="detail-block__title">
        {title}
        {aside ? <span className="detail-block__aside">{aside}</span> : null}
      </h4>
      {children}
    </section>
  );
}

/**
 * The detail view is an inspector panel that slides over the Projects window
 * rather than a navigation, so the back button stays out of the picture. One
 * reading column, four blocks, all of it points and chips — and a block the
 * data cannot fill is not rendered at all.
 */
export function ProjectDetailsWindow({ project, onClose }) {
  const panelRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const categories = projectCategories(project);
  const parts = project.parts ?? [];
  const does = project.does ?? [];
  const notes = project.notes ?? [];

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;
    panel.focus({ preventScroll: true });
    if (reducedMotion) return undefined;
    gsap.killTweensOf(panel);
    const tween = gsap.fromTo(panel, { autoAlpha: 0, x: 28 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power3.out' });
    return () => {
      tween.kill();
      gsap.set(panel, { clearProps: 'transform,opacity' });
    };
  }, [project?.id, reducedMotion]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!project) return null;

  const repo = isSet(project.links?.repo) ? project.links.repo : '';
  const demo = isSet(project.links?.demo) ? project.links.demo : '';
  const partsLabel = partCount(project) > 1 ? `${partCount(project)} codebases` : 'Single codebase';

  return (
    <div
      className="proj-details"
      ref={panelRef}
      role="group"
      aria-label={`${project.name} details`}
      tabIndex={-1}
      style={{ '--proj-accent': project.accent }}
    >
      <header className="proj-details__bar">
        <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onClose}>
          Back to projects
        </Button>
        <h3 className="proj-details__title">
          <span className="proj-details__dot" aria-hidden="true" />
          {project.name}
        </h3>
        <button type="button" className="notice__dismiss" onClick={onClose} aria-label={`Close ${project.name} details`}>
          <X size={13} aria-hidden="true" />
        </button>
      </header>

      <div className="proj-details__body scroll-area">
        <div className="proj-details__masthead">
          <div className={`proj-thumb proj-details__thumb art--${project.art}`} aria-hidden="true">
            {isSet(project.image) ? <img className="proj-thumb__img" src={project.image} alt="" loading="lazy" /> : null}
          </div>
          <div className="proj-details__heading">
            <p className="eyebrow">{categories.map((category) => category.label).join(' · ') || 'Project'}</p>
            <h2 className="proj-details__name" id="proj-details-title">
              {project.name}
            </h2>
            <p className="proj-details__tagline">{project.tagline}</p>
            <div className="chip-row">
              {project.featured ? <Chip tone="featured">Featured</Chip> : null}
              <Chip tone="category">{partsLabel}</Chip>
            </div>
          </div>
        </div>

        <div className="proj-details__inner">
          <p className="proj-summary">
            <Rich text={project.summary} />
          </p>

          {parts.length > 1 ? (
            <Block title={`Built in ${parts.length} parts`} aside="separate codebases, one shared contract">
              <div className="part-row">
                {parts.map((part) => (
                  <article className="part-tile" key={part.name}>
                    <p className="part-tile__kind">{part.kind}</p>
                    <code className="part-tile__name">{part.name}</code>
                    <p className="part-tile__line">
                      <Rich text={part.line} />
                    </p>
                  </article>
                ))}
              </div>
            </Block>
          ) : null}

          <Block title="What it does" aside={`${does.length} points`}>
            <ul className="tick-list">
              {does.map((line) => (
                <li key={line.slice(0, 32)}>
                  <Rich text={line} />
                </li>
              ))}
            </ul>
          </Block>

          <div className="detail-pair">
            <Block title="Built with">
              <div className="chip-row">
                {(project.stack || []).map((tech) => (
                  <Chip tone="tech" key={tech}>
                    {tech}
                  </Chip>
                ))}
              </div>
            </Block>

            {notes.length ? (
              <Block title="Notes">
                <ul className="tick-list tick-list--single">
                  {notes.map((note) => (
                    <li key={note.slice(0, 32)}>
                      <Rich text={note} />
                    </li>
                  ))}
                </ul>
              </Block>
            ) : null}
          </div>
        </div>
      </div>

      <footer className="proj-details__actions window__statusbar">
        {repo ? (
          <Button size="sm" variant="neutral" href={repo} {...externalLinkProps(repo)} icon={ExternalLink}>
            Repository
          </Button>
        ) : (
          <span className="mono">No repository link configured</span>
        )}
        {demo ? (
          <Button size="sm" variant="primary" href={demo} {...externalLinkProps(demo)} icon={ArrowUpRight}>
            Live demo
          </Button>
        ) : (
          <span className="mono">No live deployment link configured</span>
        )}
        <span className="spacer" />
        <span className="sheet-actions">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </span>
      </footer>
    </div>
  );
}

export default ProjectDetailsWindow;
