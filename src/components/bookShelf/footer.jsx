import { DICTIONARY } from '../../utils/dictionary.js';
import { useAppContext } from '../../context/AppContext.jsx';

export function Footer() {
  const { filteredBooks, bookList } = useAppContext();

  return (
    <footer class="bookshelf-footer">
      {DICTIONARY.bookshelf.bookCount(filteredBooks.length, bookList.length)}
    </footer>
  );
}
