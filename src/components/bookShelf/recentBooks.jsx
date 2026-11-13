import { DICTIONARY } from '../../utils/dictionary.js';
import { useAppContext } from '../../context/AppContext.jsx';

export function RecentBooks() {
  const { bookList, setCurrentBookId } = useAppContext();
  const recentBooks = bookList
    .map((book, index) => ({
      book,
      index,
      lastRead: Number(localStorage.getItem(`last_read_${book.id}`)) || 0,
    }))
    .filter(({ book }) => localStorage.getItem(`progress_${book.id}`))
    .sort((a, b) => b.lastRead - a.lastRead || a.index - b.index)
    .map(({ book }) => book);

  if (recentBooks.length === 0) return null;

  return (
    <section class="bookshelf-recent" aria-label={DICTIONARY.bookshelf.recentlyRead}>
      <h2 class="bookshelf-recent-title">{DICTIONARY.bookshelf.recentlyRead}</h2>
      <div
        class="bookshelf-recent-list"
        onWheel={event => {
          if (event.deltaY !== 0) {
            event.currentTarget.scrollLeft += event.deltaY;
            event.preventDefault();
          }
        }}
      >
        {recentBooks.map(book => (
          <button
            key={book.id}
            type="button"
            onClick={() => setCurrentBookId(book.id)}
            class="bookshelf-recent-book"
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
              <h3 class="book-title">{book.title}</h3>
              <p class="book-author">{DICTIONARY.bookshelf.authorPrefix}{book.author}</p>
              <p class="book-progress">{DICTIONARY.bookshelf.continueReading}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
