/**
 * A macOS app tile, drawn as tinted glass: the squircle, the app's own colour as
 * the body, a sheet of the desktop's glass over it, and a plate for the icons
 * that carry one. `art` moves the body's two gradient stops per app — that is
 * what makes a row of tiles read as *apps* rather than as one hue repeated nine
 * times, while the veil keeps them all the same material.
 *
 * Always decorative — the accessible name comes from the control it sits in.
 */
export function AppIcon({ icon: Icon, glyph, accent, art, muted = false, size, className = '', ...rest }) {
  const style = {
    /* The hue is passed as a token, so the stylesheet decides how much of it
       survives under the glass and this component never has to know. */
    '--icon-accent': accent,
    ...(art?.from ? { '--icon-from': art.from } : null),
    ...(art?.to ? { '--icon-to': art.to } : null),
    ...(size ? { '--icon-size': `${size}px` } : null),
  };
  return (
    <span
      className={`app-icon${muted ? ' app-icon--muted' : ''}${art?.plate ? ' app-icon--plate' : ''} ${className}`.trim()}
      style={style}
      aria-hidden="true"
      {...rest}
    >
      <span className="app-icon__glyph">
        {glyph ?? (Icon ? <Icon size={Math.round((size ?? 46) * 0.52)} strokeWidth={1.7} /> : null)}
      </span>
    </span>
  );
}

export default AppIcon;
