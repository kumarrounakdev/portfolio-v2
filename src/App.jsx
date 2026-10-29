import { Desktop } from './components/Desktop.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import { WindowManagerProvider } from './hooks/useWindowManager.jsx';
import { windowRegistry } from './windows/registry.jsx';

/**
 * Two providers, one desktop.
 *
 * No router: every section of this portfolio is a window in a single desktop
 * surface, and window state is the navigation state. Adding React Router would
 * duplicate that with URLs for screens that are not separate documents.
 */
export default function App() {
  return (
    <ThemeProvider>
      <WindowManagerProvider definitions={windowRegistry}>
        <Desktop />
      </WindowManagerProvider>
    </ThemeProvider>
  );
}
