import { useEffect, useRef, useState } from 'preact/hooks';
import { useAppContext } from '../../context/AppContext.jsx';

function ImagePage({ bookId, folder, pageNumber }) {
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;

    async function loadImage() {
      try {
        setError('');
        const name = `${String(pageNumber).padStart(3, '0')}.${folder}`;
        const params = new URLSearchParams({ bookId, folder, name });
        const response = await fetch(`/api/getImage?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Image request failed: ${response.status}`);
        }

        const blob = await response.blob();
        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          console.error(`Failed to load image page ${pageNumber}:`, loadError);
          setError('此頁載入失敗，請重新載入書籍後再試。');
        }
      }
    }

    loadImage();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bookId, folder, pageNumber]);

  return error
    ? <p class="pdf-page-error">{error}</p>
    : imageUrl
      ? <img class="reader-image-page" src={imageUrl} alt="" />
      : <p class="pdf-page-loading">載入圖片…</p>;
}

export function ImageBody({ folder }) {
  const {
    currentBookId,
    toc,
    currentChIndex,
    currentImagePage,
    setCurrentImagePage,
  } = useAppContext();
  const bodyRef = useRef(null);
  const touchStartRef = useRef(null);
  const chapter = toc.chapters[currentChIndex];
  const pageNumber = currentImagePage ?? chapter.startPage;

  useEffect(() => {
    setCurrentImagePage(chapter.startPage);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [currentBookId, chapter.id, chapter.startPage]);

  const changePage = direction => {
    setCurrentImagePage(currentPage => Math.min(
      chapter.endPage,
      Math.max(chapter.startPage, currentPage + direction),
    ));
  };

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      const isImagePageButton = target instanceof HTMLElement
        && target.closest('[data-image-page-control]');
      if (target instanceof HTMLElement
        && (target.isContentEditable
          || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
          || (target.tagName === 'BUTTON' && !isImagePageButton))) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        changePage(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        changePage(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapter.startPage, chapter.endPage]);

  const handleTouchStart = event => {
    const touch = event.changedTouches[0];
    touchStartRef.current = touch
      ? { x: touch.screenX, y: touch.screenY }
      : null;
  };

  const handleTouchEnd = event => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const deltaY = touch.screenY - start.y;
    const deltaX = touch.screenX - start.x;
    if (Math.abs(deltaY) < 50 || Math.abs(deltaY) <= Math.abs(deltaX)) return;
    changePage(deltaY < 0 ? 1 : -1);
  };

  return (
    <main
      ref={bodyRef}
      class="reader-body image-reader-body"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStartRef.current = null; }}
    >
      <ImagePage
        key={`${currentBookId}-${pageNumber}`}
        bookId={currentBookId}
        folder={folder}
        pageNumber={pageNumber}
      />
    </main>
  );
}
