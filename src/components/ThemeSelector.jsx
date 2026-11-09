import { DICTIONARY } from '../utils/dictionary.js';

export function ThemeSelector({ theme, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark'
        ? DICTIONARY.theme.switchToLight
        : DICTIONARY.theme.switchToDark}
      class="theme-toggle theme-toggle-desktop"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
