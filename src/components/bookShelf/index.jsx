import { useEffect, useMemo, useState } from 'preact/hooks';
import { Body } from './body.jsx';
import { Footer } from './footer.jsx';
import { Header } from './header.jsx';
import { RecentBooks } from './recentBooks.jsx';
import { AppProvider, useAppContext } from '../../context/AppContext.jsx';
import { fetchBooks } from '../../utils/dataService.js';
import { DICTIONARY } from '../../utils/dictionary.js';

export function Bookshelf() {
  const appContext = useAppContext();
  const [bookList, setBookList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isActive = true;

    fetchBooks()
      .then(books => {
        if (isActive) setBookList(books);
      })
      .catch(error => {
        if (isActive) console.error(DICTIONARY.errors.bookListLoad, error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredBooks = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();
    return bookList.filter(book =>
      book.title.toLowerCase().includes(normalizedQuery) ||
      book.author.toLowerCase().includes(normalizedQuery)
    );
  }, [bookList, searchQuery]);
  const contextValue = {
    ...appContext,
    bookList,
    filteredBooks,
    searchQuery,
    setSearchQuery,
  };

  return (
    <AppProvider value={contextValue}>
      <div class="bookshelf-page">
        <Header />
        <RecentBooks />
        <Body />
        <Footer />
      </div>
    </AppProvider>
  );
}
