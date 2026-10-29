/**
 * Visual tooltip for icon-only controls (Dock items, window lights, toolbar).
 *
 * The bubble is aria-hidden: the *accessible* name always comes from the real
 * label of the control it wraps (aria-label, or the <Tooltip> child's own text),
 * so a tooltip can never duplicate or override what a screen reader announces.
 */
export function Tooltip({ label, side = 'top', children }) {
  if (!label) return children;
  return (
    <span className={`tooltip tooltip--${side}`}>
      {children}
      <span className="tooltip__bubble" aria-hidden="true">
        {label}
      </span>
    </span>
  );
}

export default Tooltip;
