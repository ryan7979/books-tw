import { DICTIONARY } from '../utils/dictionary.js';
import { useAppContext } from '../context/AppContext.jsx';

export function ThemeSelector() {
  const { theme, setTheme } = useAppContext();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark'
        ? DICTIONARY.theme.switchToLight
        : DICTIONARY.theme.switchToDark}
      class="theme-toggle theme-toggle-desktop"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
