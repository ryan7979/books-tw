import { useEffect, useRef, useState } from 'preact/hooks';
import { useAppContext } from '../../context/AppContext.jsx';

function ImagePage({
  bookId,
  folder,
  pageNumber,
  imageScale,
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
          class="reader-image-page"
          src={imageUrl}
          alt=""
          draggable="false"
          style={{ transform: `scale(${imageScale})` }}
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
  const pinchRef = useRef(null);
  const imageScaleRef = useRef(1);
  const chapter = toc.chapters[currentChIndex];
  const pageNumber = currentImagePage ?? chapter.startPage;
  const [imageScale, setImageScale] = useState(1);

  useEffect(() => {
    setCurrentImagePage(chapter.startPage);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [currentBookId, chapter.id, chapter.startPage]);

  useEffect(() => {
    imageScaleRef.current = 1;
    setImageScale(1);
    pinchRef.current = null;
    touchStartRef.current = null;
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
    if (event.touches.length >= 2) {
      const [first, second] = event.touches;
      const startDistance = Math.hypot(
        second.clientX - first.clientX,
        second.clientY - first.clientY,
      );
      if (startDistance === 0) return;
      pinchRef.current = {
        startDistance,
        startScale: imageScaleRef.current,
      };
      touchStartRef.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    touchStartRef.current = touch
      ? { x: touch.screenX, y: touch.screenY, time: Date.now() }
      : null;
  };

  const handleTouchMove = event => {
    if (event.touches.length < 2) return;
    event.preventDefault();

    const [first, second] = event.touches;
    const distance = Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY,
    );
    if (distance === 0) return;
    if (!pinchRef.current) {
      pinchRef.current = {
        startDistance: distance,
        startScale: imageScaleRef.current,
      };
      touchStartRef.current = null;
      return;
    }

    const nextScale = Math.min(
      4,
      Math.max(1, pinchRef.current.startScale
        * distance / pinchRef.current.startDistance),
    );
    imageScaleRef.current = nextScale;
    setImageScale(nextScale);
  };

  const handleTouchEnd = event => {
    if (pinchRef.current) {
      if (event.touches.length < 2) pinchRef.current = null;
      touchStartRef.current = null;
      return;
    }

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
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStartRef.current = null;
        pinchRef.current = null;
      }}
    >
      <ImagePage
        key={`${currentBookId}-${pageNumber}`}
        bookId={currentBookId}
        folder={folder}
        pageNumber={pageNumber}
        imageScale={imageScale}
      />
    </main>
  );
}
