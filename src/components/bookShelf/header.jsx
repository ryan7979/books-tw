import { DICTIONARY } from '../../utils/dictionary.js';
import { useAppContext } from '../../context/AppContext.jsx';
import { ThemeSelector } from '../ThemeSelector.jsx';

export function Header() {
  const { searchQuery, setSearchQuery } = useAppContext();

  return (
    <header class="bookshelf-header">
      <div class="bookshelf-topbar">
        <div>
          <h1 class="bookshelf-title">{DICTIONARY.bookshelf.title}</h1>
          <p class="bookshelf-description">{DICTIONARY.bookshelf.description}</p>
        </div>
        <ThemeSelector />
      </div>

      <div class="bookshelf-search-wrap">
        <input
          type="text"
          placeholder={DICTIONARY.bookshelf.searchPlaceholder}
          value={searchQuery}
          onInput={event => setSearchQuery(event.currentTarget.value)}
          class="bookshelf-search"
        />
      </div>
    </header>
  );
}
