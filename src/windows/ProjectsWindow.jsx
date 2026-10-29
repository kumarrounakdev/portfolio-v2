import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, ExternalLink, Grid2x2, LayoutList, Search, Star, X, Folder, FolderOpen, Boxes } from 'lucide-react';
import { Button, Chip } from '../components/Button.jsx';
import { ProjectDetailsWindow } from './ProjectDetailsWindow.jsx';
import { CATEGORIES, countByCategory, featuredFilter, partCount, projectCategories, projects } from '../data/projects.js';
import { externalLinkProps, isSet } from '../utils/links.js';
import { GithubGlyph } from '../components/icons.jsx';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import { useWindowManager } from '../hooks/useWindowManager.jsx';

const SORTS = [
  { id: 'featured', label: 'Featured first' },
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'category', label: 'Category' },
];

const SIDEBAR = [{ id: 'all', label: 'All Projects', icon: Folder }, { id: featuredFilter.id, label: featuredFilter.label, icon: Star }, ...CATEGORIES.map((category) => ({ ...category, icon: FolderOpen }))];

function matches(project, query) {
  if (!query) return true;
  const haystack = [
    project.name,
    project.tagline,
    project.summary,
    ...(project.stack || []),
    ...(project.does || []),
    ...(project.notes || []),
    ...(project.parts || []).map((part) => `${part.name} ${part.kind}`),
    ...projectCategories(project).map((category) => category.label),
  ]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/**
 * Finder-style project browser: sidebar categories, search, sorting and a
 * grid/list toggle over one data file. Selecting a project opens the detail
 * view inside this window — the browser location never changes.
 */
export function ProjectsWindow() {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [view, setView] = useState('grid');
  const [selectedId, setSelectedId] = useState(null);
  const gridRef = useRef(null);
  const triggerRef = useRef(null);
  const { announce } = useWindowManager();
  const reducedMotion = usePrefersReducedMotion();

  const visible = useMemo(() => {
    const filtered = projects.filter((project) => {
      if (category === 'all') return matches(project, query);
      if (category === featuredFilter.id) return project.featured && matches(project, query);
      return (project.categories || []).includes(category) && matches(project, query);
    });
    const sorted = [...filtered];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'category')
      sorted.sort(
        (a, b) =>
          (projectCategories(a)[0]?.label ?? 'zzz').localeCompare(projectCategories(b)[0]?.label ?? 'zzz') ||
          a.name.localeCompare(b.name),
      );
    if (sort === 'featured')
      sorted.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.name.localeCompare(b.name));
    return sorted;
  }, [category, query, sort]);

  const selected = useMemo(() => projects.find((project) => project.id === selectedId) ?? null, [selectedId]);

  const closeDetails = useCallback(() => {
    setSelectedId(null);
    // Hand focus back to the card the detail view was opened from.
    window.requestAnimationFrame(() => {
      const card = triggerRef.current;
      if (card && document.contains(card)) card.focus({ preventScroll: true });
    });
  }, []);

  const openDetails = (project, node) => {
    triggerRef.current = node ?? null;
    setSelectedId(project.id);
    if (!reducedMotion) announce(`${project.name} details opened`);
  };

  /* Roving arrow-key navigation across the grid, like an icon view. */
  const onGridKeyDown = (event) => {
    if (selected) return;
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    if (!keys.includes(event.key)) return;
    const cards = Array.from(gridRef.current?.querySelectorAll('[data-project-card]') ?? []);
    if (cards.length === 0) return;
    const current = cards.indexOf(document.activeElement);
    if (current === -1) return;
    event.preventDefault();
    const width = cards[0].getBoundingClientRect().width || 240;
    const columns = Math.max(1, Math.round(gridRef.current.getBoundingClientRect().width / (width + 16)));
    const delta =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? columns : -columns;
    const next = Math.min(Math.max(current + delta, 0), cards.length - 1);
    cards[next].focus({ preventScroll: false });
  };

  /* A filter that hides the open project closes the detail view, so the window
     can never show a project that is not in the list behind it. */
  useEffect(() => {
    if (selectedId && !visible.some((project) => project.id === selectedId)) setSelectedId(null);
  }, [visible, selectedId]);

  const activeSidebar = SIDEBAR.find((entry) => entry.id === category);

  return (
    <div className="finder" onKeyDown={onGridKeyDown}>
      <aside className="finder__sidebar" aria-label="Project categories">
        <p className="sidebar__group-label">Browse</p>
        {SIDEBAR.map((entry) => {
          const Icon = entry.icon;
          const count = countByCategory(entry.id);
          const isCurrent = category === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              className="sidebar__item"
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => setCategory(entry.id)}
            >
              <Icon className="sidebar__item-icon" size={13} strokeWidth={1.9} aria-hidden="true" />
              <span className="sidebar__item-label">{entry.label}</span>
              <span className="sidebar__count">{count}</span>
            </button>
          );
        })}
        <p className="sidebar__footer">
          Listed from <code className="mono">src/data/projects.js</code>; a link appears only when one is configured.
        </p>
      </aside>

      <div className="finder__main">
        <div className="finder__toolbar">
          <h3 className="finder__title">
            {activeSidebar?.label ?? 'Projects'}
            <small>
              {visible.length} {visible.length === 1 ? 'item' : 'items'}
            </small>
          </h3>

          <div className="search-field">
            <Search className="search-field__icon" size={13} strokeWidth={2} aria-hidden="true" />
            <label className="sr-only" htmlFor="project-search">
              Search projects by name, technology or description
            </label>
            <input
              id="project-search"
              type="search"
              autoComplete="off"
              placeholder="Search projects"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button type="button" className="search-field__clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={11} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="select-field">
            <label className="sr-only" htmlFor="project-sort">
              Sort projects
            </label>
            <select id="project-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="segmented" role="group" aria-label="View style">
            <button
              type="button"
              className="segmented__option"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <Grid2x2 size={12} aria-hidden="true" />
              <span className="sr-only">Grid view</span>
            </button>
            <button
              type="button"
              className="segmented__option"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <LayoutList size={12} aria-hidden="true" />
              <span className="sr-only">List view</span>
            </button>
          </div>
        </div>

        <div className="projects-scroll scroll-area">
          {visible.length > 0 ? (
            <div className={`proj-grid ${view === 'list' ? 'proj-grid--list' : ''}`} ref={gridRef} role="list">
              {visible.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  selected={project.id === selectedId}
                  onOpen={openDetails}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="icon-tile" aria-hidden="true">
                <Boxes size={16} />
              </span>
              <p className="empty-state__title">No projects match this view</p>
              <p style={{ maxWidth: '36ch' }}>
                {query ? `Nothing in ${activeSidebar?.label ?? 'Projects'} contains “${query}”.` : 'This category is empty.'}
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                {query ? (
                  <Button size="sm" variant="neutral" onClick={() => setQuery('')}>
                    Clear search
                  </Button>
                ) : null}
                {category !== 'all' ? (
                  <Button size="sm" variant="neutral" onClick={() => setCategory('all')}>
                    Show all projects
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {selected ? <ProjectDetailsWindow project={selected} onClose={closeDetails} /> : null}
    </div>
  );
}

function ProjectCard({ project, selected, onOpen }) {
  const ref = useRef(null);
  const repo = isSet(project.links?.repo) ? project.links.repo : '';
  const demo = isSet(project.links?.demo) ? project.links.demo : '';
  const categories = projectCategories(project);
  const stack = project.stack || [];
  const parts = partCount(project);

  return (
    <article
      className="proj-card"
      role="listitem"
      data-selected={selected ? 'true' : 'false'}
      style={{ '--proj-accent': project.accent }}
    >
      <button
        type="button"
        className="proj-card__hit"
        data-project-card={project.id}
        ref={ref}
        onClick={() => onOpen(project, ref.current)}
        aria-label={`Open details for ${project.name}`}
      >
        <div className={`proj-thumb art--${project.art}`}>
          {isSet(project.image) ? (
            <img className="proj-thumb__img" src={project.image} alt="" loading="lazy" />
          ) : null}
          {parts > 1 ? (
            <span className="proj-thumb__tag">
              {parts} parts
            </span>
          ) : null}
        </div>
        <div className="proj-card__body">
          <div className="proj-card__head">
            <h4 className="proj-card__name">{project.name}</h4>
            {project.featured ? <Chip tone="featured">Featured</Chip> : null}
          </div>
          <p className="proj-card__tagline">{project.tagline}</p>
          <div className="proj-card__stack">
            {stack.slice(0, 3).map((tech) => (
              <Chip tone="tech" key={tech}>
                {tech}
              </Chip>
            ))}
            {stack.length > 3 ? <span className="proj-card__more">+{stack.length - 3}</span> : null}
          </div>
          <span className="proj-card__cta">
            Open details
            <ChevronRight size={12} aria-hidden="true" />
          </span>
        </div>
      </button>

      <div className="proj-card__foot">
        {repo || demo ? (
          <span className="proj-card__links">
            {repo ? (
              <a className="link-btn" href={repo} {...externalLinkProps(repo)} aria-label={`Open the ${project.name} repository on GitHub`}>
                <GithubGlyph size={12} />
                Code
              </a>
            ) : null}
            {demo ? (
              <a className="link-btn" href={demo} {...externalLinkProps(demo)} aria-label={`Open the ${project.name} live demo`}>
                <ExternalLink size={11} aria-hidden="true" />
                Demo
              </a>
            ) : null}
          </span>
        ) : (
          <span className="proj-card__note">No public repository or demo link</span>
        )}
      </div>
    </article>
  );
}

export default ProjectsWindow;
