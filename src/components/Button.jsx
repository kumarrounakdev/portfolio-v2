import { externalLinkProps, isExternalHref, safeHref } from '../utils/links.js';

/**
 * Shared UI primitives, kept in one small file:
 *   <Button> — every call to action in the app
 *   <Chip>   — technology / category / status labels
 *   <Kbd>    — keyboard shortcut key caps
 *
 * One button component so padding, focus ring, press feedback and disabled
 * behaviour stay consistent across windows.
 *
 * `href` renders an <a>; without it a <button>. External hrefs get
 * target/rel automatically — no `href="#"` placeholders anywhere in this app.
 */
export function Button({
  as,
  href,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  trailingIcon: TrailingIcon,
  children,
  className = '',
  ...rest
}) {
  const iconSize = size === 'sm' ? 14 : 16;
  const content = (
    <>
      {Icon ? <Icon size={iconSize} strokeWidth={2} className="btn__icon" aria-hidden="true" /> : null}
      <span className="btn__label">{children}</span>
      {TrailingIcon ? (
        <TrailingIcon size={iconSize} strokeWidth={2} className="btn__icon btn__icon--trail" aria-hidden="true" />
      ) : null}
    </>
  );

  const classes = ['btn', `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(' ');

  /* Every href on this site comes from src/data/, and `javascript:` in a
     configuration value would be executable HTML — so the sink sanitises even
     though the source is the author's own file. */
  const target = safeHref(href);
  if (target) {
    const external = isExternalHref(target);
    return (
      <a
        className={`${classes} btn--link`}
        href={target}
        {...(external ? externalLinkProps(href) : {})}
        {...rest}
      >
        {content}
      </a>
    );
  }

  const Component = as || 'button';
  return (
    <Component className={classes} type={Component === 'button' ? 'button' : undefined} {...rest}>
      {content}
    </Component>
  );
}

/** Small rounded label used for technologies, categories and statuses. */
export function Chip({ children, tone = 'default', icon: Icon, className = '', ...rest }) {
  const classes = ['chip', `chip--${tone}`, className].filter(Boolean).join(' ');
  return (
    <span className={classes} {...rest}>
      {Icon ? <Icon size={12} strokeWidth={2} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function Kbd({ children }) {
  return <kbd className="kbd">{children}</kbd>;
}

export default Button;
