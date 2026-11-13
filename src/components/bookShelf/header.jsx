import { DICTIONARY } from '../../utils/dictionary.js';
import { ThemeSelector } from '../ThemeSelector.jsx';

export function Header() {
  return (
    <header class="bookshelf-header">
      <div class="bookshelf-topbar">
        <div>
          <h1 class="bookshelf-title">{DICTIONARY.bookshelf.title}</h1>
          <p class="bookshelf-description">{DICTIONARY.bookshelf.description}</p>
        </div>
        <ThemeSelector />
      </div>
    </header>
  );
}
