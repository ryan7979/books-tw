import { useEffect, useRef } from 'preact/hooks';
import { DICTIONARY } from '../../utils/dictionary.js';
import { useAppContext } from '../../context/AppContext.jsx';

export function Body() {
  const {
    markdownHtml,
    isLoadingContent,
    readerFontSize,
    scrollStorageKey,
    onPrevious,
    onNext,
  } = useAppContext();
  const bodyRef = useRef(null);
  const touchStart = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!bodyRef.current || isLoadingContent) return;

    const savedPosition = Number(localStorage.getItem(scrollStorageKey));
    bodyRef.current.scrollTop = Number.isFinite(savedPosition)
      ? Math.max(0, savedPosition)
      : 0;
  }, [markdownHtml, isLoadingContent, scrollStorageKey]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (bodyRef.current) {
      localStorage.setItem(scrollStorageKey, String(bodyRef.current.scrollTop));
    }
  }, [scrollStorageKey]);

  const handleScroll = () => {
    if (isLoadingContent) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (bodyRef.current) {
        localStorage.setItem(scrollStorageKey, String(bodyRef.current.scrollTop));
      }
      saveTimer.current = null;
    }, 200);
  };

  const handleTouchStart = event => {
    const touch = event.changedTouches[0];
    touchStart.current = touch
      ? { x: touch.screenX, y: touch.screenY }
      : null;
  };

  const handleTouchEnd = event => {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const swipeX = touch.screenX - start.x;
    const swipeY = touch.screenY - start.y;
    if (Math.abs(swipeX) < 50 || Math.abs(swipeX) <= Math.abs(swipeY)) return;

    if (swipeX < 0) {
      onNext();
    } else {
      onPrevious();
    }
  };

  return (
    <main
      ref={bodyRef}
      class="reader-body"
      style={{ touchAction: 'pan-y' }}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStart.current = null; }}
    >
      {isLoadingContent ? (
        <div class="reader-body-loading">{DICTIONARY.reader.loadingChapter}</div>
      ) : (
        <article
          class="prose-reader"
          style={{ fontSize: `${readerFontSize}rem` }}
          dangerouslySetInnerHTML={{ __html: markdownHtml }}
        />
      )}
    </main>
  );
}
