/**
 * Standard content frame for a window body: a scroll region, a max-width
 * measure and consistent padding. Keeps every window's rhythm identical
 * without each one re-declaring the same three wrappers.
 */
export function WindowPane({ children, className = '', bare = false, ref }) {
  return (
    <div className={`window__scroll scroll-area ${className}`.trim()} ref={ref}>
      {bare ? (
        children
      ) : (
        <div className="win-inner">
          <div className="win-pad">{children}</div>
        </div>
      )}
    </div>
  );
}

export function WindowSection({ title, eyebrow, action, children, id }) {
  return (
    <section className="win-section" id={id}>
      {title || eyebrow || action ? (
        <header className="win-head row row--between" style={{ alignItems: 'center' }}>
          <div className="stack stack--tight">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h3 className="section-title">{title}</h3> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export default WindowPane;
