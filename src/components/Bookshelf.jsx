import { useState } from 'preact/hooks';
import { DICTIONARY } from '../utils/dictionary.js';
import { ThemeSelector } from './ThemeSelector.jsx';

export function Bookshelf({ books, theme, onThemeChange, onSelectBook }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div class="bookshelf-page">
      <header class="bookshelf-header">
        <div class="bookshelf-topbar">
          <div>
            <h1 class="bookshelf-title">{DICTIONARY.bookshelf.title}</h1>
            <p class="bookshelf-description">{DICTIONARY.bookshelf.description}</p>
          </div>
          <ThemeSelector theme={theme} onChange={onThemeChange} />
        </div>

        <div class="bookshelf-search-wrap">
          <input
            type="text"
            placeholder={DICTIONARY.bookshelf.searchPlaceholder}
            value={searchQuery}
            onInput={event => setSearchQuery(event.target.value)}
            class="bookshelf-search"
          />
        </div>
      </header>

      <main class="bookshelf-content">
        {filteredBooks.length === 0 ? (
          <div class="bookshelf-empty">{DICTIONARY.bookshelf.emptyMessage}</div>
        ) : (
          <div class="bookshelf-grid">
            {filteredBooks.map(book => (
              <div
                key={book.id}
                onClick={() => onSelectBook(book.id)}
                class="book-card"
              >
                <div class="book-cover-frame">
                  <img
                    src={book.cover}
                    alt={book.title}
                    onError={event => { event.target.src = 'https://placehold.co'; }}
                    class="book-cover"
                  />
                </div>
                <div class="book-details">
                  <div>
                    <h2 class="book-title">{book.title}</h2>
                    <p class="book-author">{DICTIONARY.bookshelf.authorPrefix}{book.author}</p>
                    <p class="book-description">{book.description}</p>
                  </div>
                  <div class="book-progress">
                    {localStorage.getItem(`progress_${book.id}`)
                      ? DICTIONARY.bookshelf.continueReading
                      : DICTIONARY.bookshelf.notStarted}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
