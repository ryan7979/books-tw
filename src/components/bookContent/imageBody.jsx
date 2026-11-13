import { useEffect, useRef, useState } from 'preact/hooks';
import { useAppContext } from '../../context/AppContext.jsx';

function ImagePage({
  bookId,
  folder,
  pageNumber,
  imageScale,
  imagePan,
  isOriginalSize,
  isDragging,
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
          class={`reader-image-page ${
            isOriginalSize ? 'reader-image-page-original' : 'reader-image-page-fit'
          }${isDragging ? ' reader-image-page-dragging' : ''}`}
          src={imageUrl}
          alt=""
          draggable="false"
          style={{
            transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageScale})`,
          }}
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
    onPreviousImagePage,
    onNextImagePage,
    onPrevious,
    onNext,
  } = useAppContext();
  const bodyRef = useRef(null);
  const touchStartRef = useRef(null);
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const pointerPanRef = useRef(null);
  const imageScaleRef = useRef(1);
  const chapter = toc.chapters[currentChIndex];
  const pageNumber = currentImagePage ?? chapter.startPage;
  const [imageScale, setImageScale] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isOriginalSize, setIsOriginalSize] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [currentBookId, chapter.id]);

  useEffect(() => {
    imageScaleRef.current = 1;
    setImageScale(1);
    setImagePan({ x: 0, y: 0 });
    setIsOriginalSize(false);
    setIsDragging(false);
    pinchRef.current = null;
    panRef.current = null;
    pointerPanRef.current = null;
    touchStartRef.current = null;
    if (bodyRef.current) {
      bodyRef.current.scrollLeft = 0;
      bodyRef.current.scrollTop = 0;
    }
  }, [currentBookId, pageNumber]);

  const changePage = direction => {
    if (direction < 0) onPreviousImagePage();
    else onNextImagePage();
  };

  useEffect(() => {
    const handleKeyDown = event => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          changePage(-1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          changePage(1);
          break;
        case 'PageUp':
          event.preventDefault();
          onPrevious();
          break;
        case 'PageDown':
          event.preventDefault();
          onNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    chapter.id,
    chapter.startPage,
    chapter.endPage,
    onPreviousImagePage,
    onNextImagePage,
    onPrevious,
    onNext,
  ]);

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
    if (touch && imageScaleRef.current > 1) {
      panRef.current = {
        x: touch.screenX,
        y: touch.screenY,
        startPan: imagePan,
        moved: false,
      };
    } else {
      panRef.current = null;
    }
  };

  const handleTouchMove = event => {
    if (event.touches.length >= 2) {
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
        panRef.current = null;
        return;
      }

      const nextScale = Math.min(
        4,
        Math.max(1, pinchRef.current.startScale
          * distance / pinchRef.current.startDistance),
      );
      imageScaleRef.current = nextScale;
      setImageScale(nextScale);
      if (nextScale === 1) setImagePan({ x: 0, y: 0 });
      return;
    }

    const pan = panRef.current;
    const touch = event.touches[0];
    if (imageScaleRef.current <= 1 || !pan || !touch) return;
    event.preventDefault();

    const deltaX = touch.screenX - pan.x;
    const deltaY = touch.screenY - pan.y;
    if (Math.hypot(deltaX, deltaY) > 3) pan.moved = true;
    setImagePan({
      x: pan.startPan.x + deltaX,
      y: pan.startPan.y + deltaY,
    });
  };

  const handleTouchEnd = event => {
    if (pinchRef.current) {
      if (event.touches.length < 2) pinchRef.current = null;
      touchStartRef.current = null;
      panRef.current = null;
      return;
    }

    const pan = panRef.current;
    panRef.current = null;
    if (pan?.moved || imageScaleRef.current > 1) {
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

  const handlePointerDown = event => {
    if (event.pointerType !== 'mouse'
      || !window.matchMedia('(min-width: 48rem)').matches
      || !(event.target instanceof Element)
      || !event.target.closest('.reader-image-page')) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerPanRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startPan: imagePan,
      isOriginalSize,
      moved: false,
    };
  };

  const handlePointerMove = event => {
    const pan = pointerPanRef.current;
    if (!pan || pan.pointerId !== event.pointerId || !pan.isOriginalSize) return;

    const deltaX = event.clientX - pan.x;
    const deltaY = event.clientY - pan.y;
    if (!pan.moved && Math.hypot(deltaX, deltaY) > 3) {
      pan.moved = true;
      setIsDragging(true);
    }
    if (pan.moved) {
      setImagePan({
        x: pan.startPan.x + deltaX,
        y: pan.startPan.y + deltaY,
      });
    }
  };

  const handlePointerEnd = event => {
    const pan = pointerPanRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;

    pointerPanRef.current = null;
    setIsDragging(false);
    if (pan.moved) return;

    const nextIsOriginalSize = !pan.isOriginalSize;
    setIsOriginalSize(nextIsOriginalSize);
    if (!nextIsOriginalSize) setImagePan({ x: 0, y: 0 });
  };

  const handlePointerCancel = event => {
    if (pointerPanRef.current?.pointerId !== event.pointerId) return;
    pointerPanRef.current = null;
    setIsDragging(false);
  };

  return (
    <main
      ref={bodyRef}
      class="reader-body image-reader-body"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerCancel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStartRef.current = null;
        pinchRef.current = null;
        panRef.current = null;
      }}
    >
      <ImagePage
        key={`${currentBookId}-${pageNumber}`}
        bookId={currentBookId}
        folder={folder}
        pageNumber={pageNumber}
        imageScale={imageScale}
        imagePan={imagePan}
        isOriginalSize={isOriginalSize}
        isDragging={isDragging}
      />
    </main>
  );
}
