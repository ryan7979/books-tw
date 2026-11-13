import { useEffect, useState } from 'preact/hooks';
import snarkdown from 'snarkdown';
import { Body } from './body.jsx';
import { PdfBody } from './pdfBody.jsx';
import { ImageBody } from './imageBody.jsx';
import { Footer } from './footer.jsx';
import { Header } from './header.jsx';
import { DICTIONARY } from '../../utils/dictionary.js';
import { AppProvider, useAppContext } from '../../context/AppContext.jsx';
import {
  fetchBookContents,
  fetchBooks,
  fetchChapter,
} from '../../utils/dataService.js';

function getImageProgress(bookId) {
  const savedProgress = localStorage.getItem(`image_progress_${bookId}`);
  if (!savedProgress) return null;

  try {
    const progress = JSON.parse(savedProgress);
    return typeof progress.chapterId === 'string'
      && Number.isInteger(progress.imagePage)
      ? progress
      : null;
  } catch (error) {
    console.warn(`Invalid image progress for ${bookId}:`, error);
    return null;
  }
}

function saveImageProgress(bookId, chapterId, imagePage) {
  localStorage.setItem(`progress_${bookId}`, chapterId);
  localStorage.setItem(
    `image_progress_${bookId}`,
    JSON.stringify({ chapterId, imagePage }),
  );
}

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

export function Content() {
  const appContext = useAppContext();
  const {
    currentBookId,
    currentChapterId,
    setCurrentBookId,
    setCurrentChapterId,
  } = appContext;
  const [toc, setToc] = useState(null);
  const [bookType, setBookType] = useState(null);
  const [currentChIndex, setCurrentChIndexState] = useState(0);
  const [currentImagePage, setCurrentImagePage] = useState(null);
  const [markdownHtml, setMarkdownHtml] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  useEffect(() => {
    if (!currentBookId) return;

    let isActive = true;
    setToc(null);
    setBookType(null);
    setCurrentChIndexState(0);
    setMarkdownHtml('');

    Promise.all([fetchBookContents(currentBookId), fetchBooks()])
      .then(([data, books]) => {
        if (!isActive) return;

        const book = books.find(item => item.id === currentBookId);
        if (!book) {
          throw new Error(`Book not found in manifest: ${currentBookId}`);
        }

        setToc(data);
        setBookType(typeof book.type === 'string' ? book.type : '');
        const routeIndex = currentChapterId
          ? data.chapters.findIndex(chapter => chapter.id === currentChapterId)
          : -1;
        const savedImageProgress = typeof book.type === 'string'
          ? getImageProgress(currentBookId)
          : null;
        const savedChId = savedImageProgress?.chapterId
          || localStorage.getItem(`progress_${currentBookId}`);
        const savedIndex = savedChId
          ? data.chapters.findIndex(chapter => chapter.id === savedChId)
          : -1;
        const selectedIndex = routeIndex >= 0
          ? routeIndex
          : savedIndex >= 0
            ? savedIndex
            : 0;
        setCurrentChIndexState(selectedIndex);
        if (routeIndex < 0 && data.chapters[selectedIndex]) {
          setCurrentChapterId(data.chapters[selectedIndex].id, true);
        }
      })
      .catch(error => {
        if (isActive) {
          console.error(DICTIONARY.errors.bookTocLoad, error);
          setBookType('');
        }
      });

    return () => {
      isActive = false;
    };
  }, [currentBookId]);

  useEffect(() => {
    if (!toc || !currentChapterId) return;
    const chapterIndex = toc.chapters.findIndex(
      chapter => chapter.id === currentChapterId,
    );
    if (chapterIndex >= 0 && chapterIndex !== currentChIndex) {
      setCurrentChIndexState(chapterIndex);
    }
  }, [currentChapterId, toc]);

  useEffect(() => {
    const currentChapter = toc?.chapters[currentChIndex];
    if (!currentBookId || !currentChapter) return;

    const savedProgress = bookType ? getImageProgress(currentBookId) : null;
    const savedPage = savedProgress?.chapterId === currentChapter.id
      && savedProgress.imagePage >= currentChapter.startPage
      && savedProgress.imagePage <= currentChapter.endPage
      ? savedProgress.imagePage
      : currentChapter.startPage;
    setCurrentImagePage(savedPage);
    if (bookType) {
      saveImageProgress(currentBookId, currentChapter.id, savedPage);
    }
  }, [currentBookId, currentChIndex, toc, bookType]);

  useEffect(() => {
    const currentChapter = toc?.chapters[currentChIndex];
    if (!currentBookId || !currentChapter) return;

    if (bookType || toc.sourcePdf) {
      setIsLoadingContent(false);
      return;
    }

    let isActive = true;
    setIsLoadingContent(true);

    fetchChapter(currentBookId, currentChapter.id)
      .then(markdown => {
        if (!isActive) return;

        setMarkdownHtml(renderMarkdown(markdown));
        setIsLoadingContent(false);
        localStorage.setItem(`progress_${currentBookId}`, currentChapter.id);
      })
      .catch(error => {
        if (!isActive) return;

        console.error(DICTIONARY.errors.chapterLoad, error);
        setMarkdownHtml(`<p class="chapter-load-error">${DICTIONARY.errors.chapterLoadMessage}</p>`);
        setIsLoadingContent(false);
      });

    return () => {
      isActive = false;
    };
  }, [currentChIndex, toc, currentBookId, bookType]);

  if (!toc) {
    return <div class="reader-loading">{DICTIONARY.reader.loadingBook}</div>;
  }

  const setCurrentChIndex = indexOrUpdater => {
    const nextIndex = typeof indexOrUpdater === 'function'
      ? indexOrUpdater(currentChIndex)
      : indexOrUpdater;
    const chapter = toc.chapters[nextIndex];
    if (!chapter) return;

    setCurrentChIndexState(nextIndex);
    setCurrentChapterId(chapter.id);
  };
  const onClose = () => setCurrentBookId(null);
  const onPrevious = () => {
    if (currentChIndex > 0 && !isLoadingContent) {
      setCurrentChIndex(index => index - 1);
    }
  };
  const onNext = () => {
    if (currentChIndex < toc.chapters.length - 1 && !isLoadingContent) {
      setCurrentChIndex(index => index + 1);
    }
  };
  const currentChapter = toc.chapters[currentChIndex];
  const updateCurrentImagePage = pageOrUpdater => {
    if (!currentChapter) return;

    const currentPage = currentImagePage ?? currentChapter.startPage;
    const nextPage = typeof pageOrUpdater === 'function'
      ? pageOrUpdater(currentPage)
      : pageOrUpdater;
    setCurrentImagePage(nextPage);
    if (bookType) {
      saveImageProgress(currentBookId, currentChapter.id, nextPage);
    }
  };
  const onImagePageChange = direction => {
    if (!bookType || !currentChapter) return;
    updateCurrentImagePage(page => Math.min(
      currentChapter.endPage,
      Math.max(currentChapter.startPage, page + direction),
    ));
  };
  const readerContextValue = {
    ...appContext,
    toc,
    currentChIndex,
    setCurrentChIndex,
    markdownHtml,
    isLoadingContent,
    readerType: bookType,
    currentImagePage,
    setCurrentImagePage: updateCurrentImagePage,
    onPreviousImagePage: () => onImagePageChange(-1),
    onNextImagePage: () => onImagePageChange(1),
    isFirstImagePage: currentImagePage <= currentChapter.startPage,
    isLastImagePage: currentImagePage >= currentChapter.endPage,
    scrollStorageKey: `scroll_${currentBookId}_${toc.chapters[currentChIndex]?.id || ''}`,
    onClose,
    onPrevious,
    onNext,
  };

  return (
    <AppProvider value={readerContextValue}>
      <div class="reader-page">
        <Header />
        {bookType
          ? <ImageBody key={toc.chapters[currentChIndex].id} folder={bookType} />
          : toc.sourcePdf
          ? <PdfBody key={toc.chapters[currentChIndex].id} />
          : <Body />}
        <Footer />
      </div>
    </AppProvider>
  );
}
