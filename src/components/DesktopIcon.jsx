import { AppIcon } from './AppIcon.jsx';
import { externalLinkProps, isExternalHref, safeHref } from '../utils/links.js';

/**
 * Desktop shortcut. Secondary navigation only: everything reachable here is
 * also in the Dock, so nothing important depends on spotting a small icon.
 */
export function DesktopIcon({ item }) {
  const content = (
    <>
      <AppIcon icon={item.icon} accent={item.accent} art={item.art} muted={item.muted} />
      <span className="desktop-icon__label">{item.label}</span>
    </>
  );

  const target = safeHref(item.href);
  if (target) {
    return (
      <a
        className="desktop-icon"
        href={target}
        {...(isExternalHref(target) ? externalLinkProps(target) : {})}
        aria-label={`${item.label} (opens in a new tab)`}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" className="desktop-icon" onClick={item.onClick} aria-label={`Open the ${item.label} window`}>
      {content}
    </button>
  );
}

export default DesktopIcon;
