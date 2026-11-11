import { useState, useEffect } from 'preact/hooks';
import snarkdown from 'snarkdown';
import { Bookshelf } from './components/bookShelf/index.jsx';
import { Content } from './components/bookContent/index.jsx';
import { AppProvider } from './context/AppContext.jsx';

function getRoute(location) {
  const params = new URLSearchParams(location.search);
  const bookId = params.get('book');
  return {
    bookId: bookId && /^[a-z0-9-]+$/i.test(bookId) ? bookId : null,
    chapterId: bookId && /^ch-\d{3}$/.test(params.get('chapter') || '')
      ? params.get('chapter')
      : null,
  };
}

export function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ? 'dark' : 'light';
  });
  const [route, setRoute] = useState(() => getRoute(window.location));

  useEffect(() => {
    const handlePopState = () => setRoute(getRoute(window.location));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (bookId, chapterId, replace = false) => {
    const url = new URL(window.location.href);
    if (bookId) {
      url.searchParams.set('book', bookId);
      if (chapterId) url.searchParams.set('chapter', chapterId);
      else url.searchParams.delete('chapter');
    } else {
      url.searchParams.delete('book');
      url.searchParams.delete('chapter');
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    if (replace) window.history.replaceState(null, '', nextUrl);
    else window.history.pushState(null, '', nextUrl);
    setRoute({ bookId: bookId || null, chapterId: chapterId || null });
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setCurrentBookId = bookId => navigate(bookId, null);
  const setCurrentChapterId = (chapterId, replace = false) => {
    if (route.bookId) navigate(route.bookId, chapterId, replace);
  };
  const contextValue = {
    theme,
    setTheme,
    currentBookId: route.bookId,
    setCurrentBookId,
    currentChapterId: route.chapterId,
    setCurrentChapterId,
  };

  return (
    <AppProvider value={contextValue}>
      {route.bookId ? <Content /> : <Bookshelf />}
    </AppProvider>
  );
}
