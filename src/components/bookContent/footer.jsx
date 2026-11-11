import { DICTIONARY } from '../../utils/dictionary.js';
import { useAppContext } from '../../context/AppContext.jsx';

export function Footer() {
  const {
    toc,
    currentChIndex,
    readerType,
    currentImagePage,
    isLoadingContent,
    onPrevious,
    onNext,
    onPreviousImagePage,
    onNextImagePage,
    isFirstImagePage,
    isLastImagePage,
  } = useAppContext();
  const chapterCount = toc.chapters.length;
  const pageCount = toc.pdfPageCount
    || toc.chapters[toc.chapters.length - 1]?.endPage
    || 0;
  const pageLabel = readerType
    ? `${currentImagePage || toc.chapters[currentChIndex]?.startPage || 1} / ${pageCount}`
    : `${currentChIndex + 1} / ${chapterCount}`;

  return (
    <footer class="reader-footer">
      <button
        onClick={onPrevious}
        disabled={currentChIndex === 0 || isLoadingContent}
        class="reader-page-button reader-chapter-button"
      >
        {DICTIONARY.reader.previousPage}
      </button>

      {readerType && (
        <div class="inline-flex reader-image-page-controls">
          <button
            onClick={onPreviousImagePage}
            disabled={isFirstImagePage}
            data-image-page-control
            class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l disabled:opacity-30"
          >
            {DICTIONARY.reader.previousImagePage}
          </button>
          <span class="reader-page-count reader-image-page-count">
            {pageLabel}
          </span>
          <button
            onClick={onNextImagePage}
            disabled={isLastImagePage}
            data-image-page-control
            class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r disabled:opacity-30"
          >
            {DICTIONARY.reader.nextImagePage}
          </button>
        </div>
      )}

      {!readerType && (
        <span class="reader-page-count">
          {pageLabel}
        </span>
      )}

      <button
        onClick={onNext}
        disabled={currentChIndex === chapterCount - 1 || isLoadingContent}
        class="reader-page-button reader-chapter-button"
      >
        {DICTIONARY.reader.nextPage}
      </button>
    </footer>
  );
}
