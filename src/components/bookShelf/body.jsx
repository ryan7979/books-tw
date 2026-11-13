import { useEffect, useRef, useState } from 'preact/hooks';
import { DICTIONARY } from '../../utils/dictionary.js';
import { useAppContext } from '../../context/AppContext.jsx';

const BOOKS_PER_BATCH = 18;

export function Body() {
  const { filteredBooks, setCurrentBookId, searchQuery, setSearchQuery } = useAppContext();
  const [visibleBookCount, setVisibleBookCount] = useState(BOOKS_PER_BATCH);
  const contentRef = useRef(null);
  const loadMoreRef = useRef(null);
  const visibleBooks = filteredBooks.slice(0, visibleBookCount);

  useEffect(() => {
    setVisibleBookCount(BOOKS_PER_BATCH);
  }, [searchQuery]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const scrollContainer = contentRef.current;
    if (!sentinel || !scrollContainer || visibleBooks.length >= filteredBooks.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisibleBookCount(count => Math.min(
          count + BOOKS_PER_BATCH,
          filteredBooks.length,
        ));
      }
    }, {
      root: scrollContainer,
      rootMargin: '200px',
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredBooks.length, visibleBooks.length]);

  const searchInput = (
    <div class="bookshelf-search-wrap">
      <input
        type="text"
        placeholder={DICTIONARY.bookshelf.searchPlaceholder}
        value={searchQuery}
        onInput={event => setSearchQuery(event.currentTarget.value)}
        class="bookshelf-search"
      />
    </div>
  );

  if (filteredBooks.length === 0) {
    return (
      <div class="bookshelf-body">
        {searchInput}
        <main ref={contentRef} class="bookshelf-content">
          <div class="bookshelf-empty">{DICTIONARY.bookshelf.emptyMessage}</div>
        </main>
      </div>
    );
  }

  return (
    <div class="bookshelf-body">
      {searchInput}
      <main ref={contentRef} class="bookshelf-content">
        <div class="bookshelf-grid">
          {visibleBooks.map(book => (
            <div
              key={book.id}
              onClick={() => setCurrentBookId(book.id)}
              class="book-card"
            >
              <div class="book-cover-frame">
                <img
                  src={book.cover}
                  alt={book.title}
                  onError={event => { event.currentTarget.src = 'https://placehold.co'; }}
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
        {visibleBooks.length < filteredBooks.length && (
          <div ref={loadMoreRef} class="bookshelf-load-more" aria-hidden="true" />
        )}
      </main>
    </div>
  );
}
