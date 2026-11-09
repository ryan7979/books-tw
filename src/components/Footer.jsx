import { DICTIONARY } from '../utils/dictionary.js';

export function Footer({ currentChIndex, chapterCount, isLoadingContent, onPrevious, onNext }) {
  return (
    <footer class="reader-footer">
      <button
        onClick={onPrevious}
        disabled={currentChIndex === 0 || isLoadingContent}
        class="reader-page-button reader-page-button-previous"
      >
        {DICTIONARY.reader.previousPage}
      </button>

      <span class="reader-page-count">
        {currentChIndex + 1} / {chapterCount}
      </span>

      <button
        onClick={onNext}
        disabled={currentChIndex === chapterCount - 1 || isLoadingContent}
        class="reader-page-button reader-page-button-next"
      >
        {DICTIONARY.reader.nextPage}
      </button>
    </footer>
  );
}
