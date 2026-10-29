import { Moon, Sun, SunMoon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.jsx';
import { Tooltip } from './Tooltip.jsx';

const LABELS = {
  light: 'Light',
  dark: 'Dark',
  system: 'Auto',
};

/** Menu-bar control: flips light/dark, or follows the OS when set to Auto. */
export function ThemeToggle({ variant = 'menubar' }) {
  const { preference, theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const Icon = preference === 'system' ? SunMoon : isDark ? Moon : Sun;

  const label =
    preference === 'system'
      ? `Appearance: Auto (currently ${theme}) — switch to ${isDark ? 'Light' : 'Dark'}`
      : `Appearance: ${LABELS[preference]} — switch to ${isDark ? 'Light' : 'Dark'}`;

  const button = (
    <button
      type="button"
      className={variant === 'menubar' ? 'menubar__trigger theme-toggle' : 'btn btn--sm btn--ghost'}
      onClick={toggle}
      aria-label={label}
      title={undefined}
    >
      <span className="theme-toggle__icon">
        <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
      </span>
      {variant === 'menubar' ? null : <span>{isDark ? 'Dark' : 'Light'}</span>}
    </button>
  );

  if (variant === 'menubar') return <Tooltip label="Appearance">{button}</Tooltip>;
  return button;
}
