import { ChevronRight, Sparkles } from 'lucide-react';

import { externalLinkProps, safeHref } from '../../utils/links.js';

/**
 * One squircle tile with a label under it. It is a `<button>` when it opens an
 * app inside the phone and an `<a>` when it leaves for a real URL, so keyboard
 * and screen-reader semantics match what actually happens.
 *
 * `accent` is only set from data that exists; a missing colour falls back to
 * the accent token rather than a made-up one.
 */
export function PhoneAppIcon({
  label,
  ariaLabel,
  icon: Icon,
  accent,
  href,
  onOpen,
  badge,
  hideLabel = false,
}) {
  const tile = (
    <>
      <span
        className={`phone-icon__tile${href ? ' phone-icon__tile--link' : ''}`}
        style={accent ? { '--phone-app-bg': accent } : undefined}
      >
        {Icon ? <Icon size={17} strokeWidth={1.7} aria-hidden="true" /> : label.slice(0, 1)}
        {badge ? <span className="phone-icon__badge" aria-hidden="true">{badge}</span> : null}
      </span>
      {hideLabel ? null : <span className="phone-icon__label">{label}</span>}
    </>
  );

  const text = ariaLabel ?? label;

  const safe = safeHref(href);
  if (safe) {
    return (
      <a className="phone-icon" href={safe} aria-label={text} {...externalLinkProps(safe)}>
        {tile}
      </a>
    );
  }

  return (
    <button type="button" className="phone-icon" onClick={onOpen} aria-label={text}>
      {tile}
    </button>
  );
}

/**
 * The dock. Apps that live in the phone stay in it; the last slot is the
 * "escape hatch" back to the full desktop, which is the honest equivalent of
 * closing the phone.
 */
export function PhoneDock({ items }) {
  return (
    <nav className="phone-dock" aria-label="Phone dock">
      {items.map((item) => (
        <PhoneAppIcon
          key={item.id}
          label={item.label}
          ariaLabel={item.ariaLabel}
          icon={item.icon}
          accent={item.accent}
          href={item.href}
          onOpen={item.onOpen}
          hideLabel
        />
      ))}
    </nav>
  );
}

/**
 * The chrome around an app screen: a nav bar with one close action, a scrolling
 * body and a footer that offers the way out. Apps only ever pass content, so
 * every screen in the phone keeps the same structure.
 */
export function PhoneAppScreen({ title, onHome, onBack, backLabel = 'Home', footer, children }) {
  return (
    <section className="phone-app phone-screen" aria-label={title}>
      <header className="phone-app__nav">
        {onBack ? (
          <button type="button" className="phone-app__back" onClick={onBack}>
            <ChevronRight size={13} strokeWidth={2.4} aria-hidden="true" style={{ rotate: '180deg' }} />
            {backLabel}
          </button>
        ) : null}
        <h2 className="phone-app__title">{title}</h2>
        <button type="button" className="phone-app__home" onClick={onHome}>
          <Sparkles size={12} strokeWidth={2} aria-hidden="true" />
          Home
        </button>
      </header>

      <div className="phone-app__body">{children}</div>

      {footer ? <footer className="phone-app__foot">{footer}</footer> : null}
    </section>
  );
}

/** A titled card — the iPhone "grouped list" container. */
export function PhoneCard({ title, children }) {
  return (
    <section className="phone-card">
      {title ? <h3 className="phone-card__title">{title}</h3> : null}
      {children}
    </section>
  );
}

/** A pressable row. `href` makes it a link, `onSelect` makes it a button. */
export function PhoneRow({ icon: Icon, title, sub, href, onSelect, chevron = true }) {
  const inner = (
    <>
      {Icon ? (
        <span className="phone-row__icon">
          <Icon size={12} strokeWidth={2} aria-hidden="true" />
        </span>
      ) : null}
      <span className="phone-row__label">
        <span className="phone-row__title">{title}</span>
        {sub ? <span className="phone-row__sub">{sub}</span> : null}
      </span>
      {chevron ? <ChevronRight className="phone-row__go" size={14} strokeWidth={2} aria-hidden="true" /> : null}
    </>
  );

  /* A row whose href was dropped renders as the button it would have been
     without a destination — never as an anchor pointing at nothing. */
  const target = safeHref(href);
  if (target) {
    return (
      <a className="phone-row" href={target} {...externalLinkProps(target)}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" className="phone-row" onClick={onSelect}>
      {inner}
    </button>
  );
}

/** Label/value pairs, iOS settings style. Only real values are passed in. */
export function PhoneFacts({ rows }) {
  return (
    <dl className="phone-facts">
      {rows.map((row) => (
        <div className="phone-facts__row" key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
