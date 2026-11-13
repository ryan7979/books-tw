import { useState } from 'preact/hooks';
import { DICTIONARY } from '../../utils/dictionary.js';
import { useAppContext } from '../../context/AppContext.jsx';
import { ThemeSelector } from '../ThemeSelector.jsx';

export function Header() {
  const {
    toc,
    currentChIndex,
    setCurrentChIndex,
    onClose,
    readerType,
    onIncreaseFontSize,
    onDecreaseFontSize,
    onResetFontSize,
  } = useAppContext();
  const [isChapterListOpen, setIsChapterListOpen] = useState(false);
  const currentChapter = toc.chapters[currentChIndex] || {
    title: DICTIONARY.reader.loadingTitle,
  };
  const isTextBook = !readerType && !toc.sourcePdf;

  const selectChapter = index => {
    setCurrentChIndex(index);
    setIsChapterListOpen(false);
  };

  const renderContentControls = className => (
    <div class={`reader-content-controls ${className}`} aria-label="文字閱讀控制">
      <button
        type="button"
        onClick={onIncreaseFontSize}
        aria-label={DICTIONARY.reader.increaseFontSize}
        title={DICTIONARY.reader.increaseFontSize}
        class="reader-content-control"
      >
        ➕
      </button>
      <button
        type="button"
        onClick={onDecreaseFontSize}
        aria-label={DICTIONARY.reader.decreaseFontSize}
        title={DICTIONARY.reader.decreaseFontSize}
        class="reader-content-control"
      >
        ➖
      </button>
      <button
        type="button"
        onClick={onResetFontSize}
        aria-label={DICTIONARY.reader.resetFontSize}
        title={DICTIONARY.reader.resetFontSize}
        class="reader-content-control"
      >
        🎯
      </button>
      <button
        type="button"
        onClick={selectChapterText}
        aria-label={DICTIONARY.reader.selectChapterText}
        title={DICTIONARY.reader.selectChapterText}
        class="reader-content-control"
      >
        📋
      </button>
    </div>
  );

  const selectChapterText = () => {
    const article = document.querySelector('.prose-reader');
    if (!article) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(article);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  return (
    <header class="reader-header">
      <div class="reader-header-inner">
        <button
          onClick={onClose}
          class="reader-close"
        >
          {DICTIONARY.reader.close}
        </button>
        <div class="reader-heading">
          <div class="reader-book-title">{toc.bookTitle}</div>
          <div class="reader-chapter-title">{currentChapter.title}</div>
        </div>
        <div class="reader-header-tools">
          {isTextBook && (
            renderContentControls('reader-content-controls-header')
          )}
          <ThemeSelector />
          <button
            type="button"
            onClick={() => setIsChapterListOpen(open => !open)}
            aria-label={isChapterListOpen
              ? DICTIONARY.reader.chapterListClose
              : DICTIONARY.reader.chapterListOpen}
            aria-expanded={isChapterListOpen}
            aria-controls="chapter-list"
            class="reader-menu-button"
          >
            <span aria-hidden="true" class="reader-menu-icon">☰</span>
          </button>
        </div>
      </div>
      {isChapterListOpen && (
        <nav
          id="chapter-list"
          aria-label={DICTIONARY.reader.chapterListLabel}
          class="chapter-list"
        >
          {isTextBook && renderContentControls('reader-content-controls-menu')}
          {toc.chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              type="button"
              onClick={() => selectChapter(index)}
              aria-current={index === currentChIndex ? 'location' : undefined}
              class={`chapter-list-item ${
                index === currentChIndex
                  ? 'chapter-list-item-current'
                  : 'chapter-list-item-default'
              }`}
            >
              {chapter.title}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
