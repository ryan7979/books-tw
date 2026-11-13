import { useEffect, useRef, useState } from 'preact/hooks';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useAppContext } from '../../context/AppContext.jsx';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function PdfPage({ bookId, pageNumber }) {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    let loadingTask;
    let destroyPromise;
    const destroyLoadingTask = () => {
      if (!loadingTask) return Promise.resolve();
      if (!destroyPromise) {
        destroyPromise = loadingTask.destroy();
        loadingTask = null;
      }
      return destroyPromise;
    };

    async function renderPage() {
      try {
        setError('');
        setIsLoading(true);
        const params = new URLSearchParams({
          bookId,
          page: String(pageNumber),
        });
        const response = await fetch(`/api/getPdf?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`PDF page request failed: ${response.status}`);
        }

        const data = new Uint8Array(await response.arrayBuffer());
        if (!isActive) return;

        loadingTask = pdfjs.getDocument({
          data,
          wasmUrl: '/assets/pdfjs-wasm/',
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas || !isActive) return;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('PDF canvas context is unavailable');
        }

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        await page.render({
          canvasContext: context,
          viewport,
          ...(pixelRatio === 1
            ? {}
            : { transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] }),
        }).promise;
        page.cleanup();
        await destroyLoadingTask();
        if (isActive) setIsLoading(false);
      } catch (renderError) {
        if (isActive && renderError.name !== 'AbortError') {
          console.error(`Failed to render PDF page ${pageNumber}:`, renderError);
          setError('此頁載入失敗，請重新載入書籍後再試。');
          setIsLoading(false);
        }
      }
    }

    renderPage();
    return () => {
      isActive = false;
      controller.abort();
      destroyLoadingTask().catch(error => {
        console.error(`Failed to release PDF page ${pageNumber}:`, error);
      });
    };
  }, [bookId, pageNumber]);

  return (
    <section class="pdf-page" aria-label={`PDF 第 ${pageNumber} 頁`}>
      {error
        ? <p class="pdf-page-error">{error}</p>
        : (
          <>
            {isLoading && <p class="pdf-page-loading">載入 PDF 頁面…</p>}
            <canvas ref={canvasRef} class="pdf-page-canvas" />
          </>
        )}
    </section>
  );
}

export function PdfBody() {
  const { currentBookId, toc, currentChIndex } = useAppContext();
  const bodyRef = useRef(null);
  const sentinelRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const chapter = toc.chapters[currentChIndex];
  const startPage = chapter.startPage;
  const endPage = chapter.endPage;
  const [pageNumbers, setPageNumbers] = useState([startPage]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setPageNumbers([startPage]);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    localStorage.setItem(`progress_${currentBookId}`, chapter.id);
    localStorage.setItem(`last_read_${currentBookId}`, String(Date.now()));
  }, [currentBookId, chapter.id, startPage, endPage]);

  useEffect(() => {
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
  }, [pageNumbers]);

  useEffect(() => {
    if (!sentinelRef.current
      || pageNumbers[pageNumbers.length - 1] >= endPage
      || isLoadingMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)
        || isLoadingMoreRef.current) {
        return;
      }

      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
      setPageNumbers(currentPages => {
        const lastPage = currentPages[currentPages.length - 1];
        return lastPage < endPage ? [...currentPages, lastPage + 1] : currentPages;
      });
    }, {
      root: bodyRef.current,
      rootMargin: '600px',
    });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [pageNumbers, endPage, isLoadingMore]);

  return (
    <main ref={bodyRef} class="reader-body pdf-reader-body">
      {pageNumbers.map(pageNumber => (
        <PdfPage
          key={`${currentBookId}-${pageNumber}`}
          bookId={currentBookId}
          pageNumber={pageNumber}
        />
      ))}
      {pageNumbers[pageNumbers.length - 1] < endPage && (
        <div ref={sentinelRef} class="pdf-page-sentinel" aria-hidden="true">
          {isLoadingMore && <span class="reader-body-loading">載入下一頁…</span>}
        </div>
      )}
    </main>
  );
}
