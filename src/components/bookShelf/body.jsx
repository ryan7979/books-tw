import { DICTIONARY } from '../../utils/dictionary.js';
import { useAppContext } from '../../context/AppContext.jsx';

export function Body() {
  const { filteredBooks, setCurrentBookId } = useAppContext();

  if (filteredBooks.length === 0) {
    return (
      <main class="bookshelf-content">
        <div class="bookshelf-empty">{DICTIONARY.bookshelf.emptyMessage}</div>
      </main>
    );
  }

  return (
    <main class="bookshelf-content">
      <div class="bookshelf-grid">
        {filteredBooks.map(book => (
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
    </main>
  );
}
