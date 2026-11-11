import { useEffect, useRef, useState } from 'preact/hooks';
import { useAppContext } from '../../context/AppContext.jsx';

function ImagePage({
  bookId,
  folder,
  pageNumber,
  onImageLoad,
  isZoomed,
  imageSize,
}) {
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
      ? (
        <img
          class={`reader-image-page${isZoomed ? ' reader-image-page-zoomed' : ''}`}
          src={imageUrl}
          alt=""
          draggable="false"
          style={isZoomed && imageSize
            ? {
              width: `${imageSize.width}px`,
              height: `${imageSize.height}px`,
            }
            : undefined}
          onLoad={event => onImageLoad({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })}
        />
      )
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
  const lastTapRef = useRef(null);
  const panRef = useRef(null);
  const chapter = toc.chapters[currentChIndex];
  const pageNumber = currentImagePage ?? chapter.startPage;
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageSize, setImageSize] = useState(null);

  useEffect(() => {
    setCurrentImagePage(chapter.startPage);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [currentBookId, chapter.id, chapter.startPage]);

  useEffect(() => {
    setIsZoomed(false);
    setImageSize(null);
    if (bodyRef.current) {
      bodyRef.current.scrollLeft = 0;
      bodyRef.current.scrollTop = 0;
    }
  }, [currentBookId, pageNumber]);

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
      ? { x: touch.screenX, y: touch.screenY, time: Date.now() }
      : null;
  };

  const handleTouchEnd = event => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const deltaY = touch.screenY - start.y;
    const deltaX = touch.screenX - start.x;
    const distance = Math.hypot(deltaX, deltaY);
    const now = Date.now();

    if (isZoomed) {
      if (distance < 24 && now - start.time < 300) {
        const lastTap = lastTapRef.current;
        if (lastTap && now - lastTap.time < 350
          && Math.hypot(touch.screenX - lastTap.x, touch.screenY - lastTap.y) < 40) {
          setIsZoomed(false);
          lastTapRef.current = null;
        } else {
          lastTapRef.current = { x: touch.screenX, y: touch.screenY, time: now };
        }
      }
      return;
    }

    if (distance < 24 && now - start.time < 300
      && window.matchMedia('(max-width: 47.999rem)').matches) {
      const lastTap = lastTapRef.current;
      if (lastTap && now - lastTap.time < 350
        && Math.hypot(touch.screenX - lastTap.x, touch.screenY - lastTap.y) < 40) {
        if (imageSize) setIsZoomed(true);
        lastTapRef.current = null;
      } else {
        lastTapRef.current = { x: touch.screenX, y: touch.screenY, time: now };
      }
      return;
    }

    lastTapRef.current = null;
    if (Math.abs(deltaY) < 50 || Math.abs(deltaY) <= Math.abs(deltaX)) return;
    changePage(deltaY < 0 ? 1 : -1);
  };

  const handlePointerDown = event => {
    if (!isZoomed || event.pointerType !== 'touch') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
    };
  };

  const handlePointerMove = event => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = pan.scrollLeft - (event.clientX - pan.x);
    event.currentTarget.scrollTop = pan.scrollTop - (event.clientY - pan.y);
  };

  const handlePointerEnd = event => {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
  };

  return (
    <main
      ref={bodyRef}
      class={`reader-body image-reader-body${isZoomed ? ' image-reader-body-zoomed' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStartRef.current = null; }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <ImagePage
        key={`${currentBookId}-${pageNumber}`}
        bookId={currentBookId}
        folder={folder}
        pageNumber={pageNumber}
        isZoomed={isZoomed}
        imageSize={imageSize}
        onImageLoad={setImageSize}
      />
    </main>
  );
}
