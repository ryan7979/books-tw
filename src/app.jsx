import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import snarkdown from 'snarkdown';
import { Bookshelf } from './components/Bookshelf.jsx';
import { Content } from './components/Content.jsx';
import { DICTIONARY } from './utils/dictionary.js';

function renderMarkdown(markdown) {
  return markdown
    .split(/\r?\n[ \t]*\r?\n+/)
    .map(block => block.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, ''))
    .filter(Boolean)
    .map(block => {
      const html = snarkdown(block);
      return /^<(?:h[1-6]|ul|ol|blockquote|pre|table|hr|div|figure|section|p)\b/i
        .test(html)
        ? html
        : `<p>${html}</p>`;
    })
    .join('\n');
}

export function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ? 'dark' : 'light';
  });
  const [currentBookId, setCurrentBookId] = useState(null);
  const [bookList, setBookList] = useState([]);
  const [toc, setToc] = useState(null);
  const [currentChIndex, setCurrentChIndex] = useState(0);
  const [markdownHtml, setMarkdownHtml] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch('/books/manifest.json')
      .then(res => res.json())
      .then(data => setBookList(data))
      .catch(err => console.error(DICTIONARY.errors.bookListLoad, err));
  }, []);

  useEffect(() => {
    if (!currentBookId) {
      setToc(null);
      return;
    }

    fetch(`/books/${currentBookId}/toc.json`)
      .then(res => res.json())
      .then(data => {
        setToc(data);
        const savedChId = localStorage.getItem(`progress_${currentBookId}`);
        if (savedChId) {
          const index = data.chapters.findIndex(ch => ch.id === savedChId);
          if (index !== -1) {
            setCurrentChIndex(index);
            return;
          }
        }
        setCurrentChIndex(0);
      })
      .catch(err => console.error(DICTIONARY.errors.bookTocLoad, err));
  }, [currentBookId]);

  useEffect(() => {
    if (!toc || !currentBookId) return;

    const currentChapter = toc.chapters[currentChIndex];
    if (!currentChapter) return;

    setIsLoadingContent(true);

    fetch(`/books/${currentBookId}/${currentChapter.id}.md`)
      .then(res => res.text())
      .then(mdText => {
        setMarkdownHtml(renderMarkdown(mdText));
        setIsLoadingContent(false);
        localStorage.setItem(`progress_${currentBookId}`, currentChapter.id);
      })
      .catch(err => {
        console.error(DICTIONARY.errors.chapterLoad, err);
        setMarkdownHtml(`<p class="chapter-load-error">${DICTIONARY.errors.chapterLoadMessage}</p>`);
        setIsLoadingContent(false);
      });
  }, [currentChIndex, toc, currentBookId]);

  if (!currentBookId) {
    return (
      <Bookshelf
        books={bookList}
        theme={theme}
        onThemeChange={setTheme}
        onSelectBook={setCurrentBookId}
      />
    );
  }

  return (
    <Content
      toc={toc}
      scrollStorageKey={`scroll_${currentBookId}_${toc?.chapters[currentChIndex]?.id || ''}`}
      theme={theme}
      onThemeChange={setTheme}
      currentChIndex={currentChIndex}
      markdownHtml={markdownHtml}
      isLoadingContent={isLoadingContent}
      onClose={() => setCurrentBookId(null)}
      onSelectChapter={setCurrentChIndex}
      onPrevious={() => setCurrentChIndex(prev => Math.max(0, prev - 1))}
      onNext={() => setCurrentChIndex(prev => Math.min(toc.chapters.length - 1, prev + 1))}
    />
  );
}
