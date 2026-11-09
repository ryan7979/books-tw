import { Body } from './Body.jsx';
import { Footer } from './Footer.jsx';
import { Header } from './Header.jsx';
import { DICTIONARY } from '../utils/dictionary.js';

export function Content({
  toc,
  theme,
  onThemeChange,
  currentChIndex,
  markdownHtml,
  isLoadingContent,
  onClose,
  onSelectChapter,
  onPrevious,
  onNext,
}) {
  if (!toc) {
    return <div class="reader-loading">{DICTIONARY.reader.loadingBook}</div>;
  }

  return (
    <div class="reader-page">
      <Header
        toc={toc}
        theme={theme}
        onThemeChange={onThemeChange}
        currentChIndex={currentChIndex}
        onClose={onClose}
        onSelectChapter={onSelectChapter}
      />
      <Body
        markdownHtml={markdownHtml}
        isLoadingContent={isLoadingContent}
        onPrevious={() => {
          if (currentChIndex > 0 && !isLoadingContent) onPrevious();
        }}
        onNext={() => {
          if (currentChIndex < toc.chapters.length - 1 && !isLoadingContent) onNext();
        }}
      />

      <Footer
        currentChIndex={currentChIndex}
        chapterCount={toc.chapters.length}
        isLoadingContent={isLoadingContent}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </div>
  );
}
