import { useState } from 'preact/hooks';
import { DICTIONARY } from '../utils/dictionary.js';
import { ThemeSelector } from './ThemeSelector.jsx';

export function Header({ toc, theme, onThemeChange, currentChIndex, onClose, onSelectChapter }) {
  const [isChapterListOpen, setIsChapterListOpen] = useState(false);
  const currentChapter = toc.chapters[currentChIndex] || { title: DICTIONARY.reader.loadingTitle };

  const selectChapter = index => {
    onSelectChapter(index);
    setIsChapterListOpen(false);
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
          <ThemeSelector theme={theme} onChange={onThemeChange} />
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
