import { useEffect, useRef } from 'preact/hooks';
import { DICTIONARY } from '../utils/dictionary.js';

export function Body({ markdownHtml, isLoadingContent, onPrevious, onNext }) {
  const bodyRef = useRef(null);
  const touchStart = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [markdownHtml]);

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
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStart.current = null; }}
    >
      {isLoadingContent ? (
        <div class="reader-body-loading">{DICTIONARY.reader.loadingChapter}</div>
      ) : (
        <article
          class="prose-reader"
          dangerouslySetInnerHTML={{ __html: markdownHtml }}
        />
      )}
    </main>
  );
}
