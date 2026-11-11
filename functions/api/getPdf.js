import { PDFDocument } from 'pdf-lib';
import {
  fetchBookAsset,
  isValidBookId,
  jsonResponse,
} from './_utils.js';

const PDF_PATH_PATTERN = /^\/books\/([a-z0-9-]+)\/([\w .-]+\.pdf)$/i;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const bookId = url.searchParams.get('bookId');
  const pageNumber = url.searchParams.get('page');

  if (!isValidBookId(bookId) || !/^[1-9]\d*$/.test(pageNumber || '')) {
    return jsonResponse({ error: 'Invalid PDF request' }, 400);
  }

  const pageIndex = Number(pageNumber) - 1;
  if (!Number.isSafeInteger(pageIndex)) {
    return jsonResponse({ error: 'Invalid PDF page number' }, 400);
  }

  try {
    const manifestResponse = await fetchBookAsset(context, 'manifest.json');
    if (!manifestResponse.ok) {
      return jsonResponse({ error: 'Book manifest not found' }, 404);
    }

    const books = await manifestResponse.json();
    if (!Array.isArray(books)) {
      return jsonResponse({ error: 'Book manifest has an invalid format' }, 500);
    }

    const book = books.find(item => item.id === bookId);
    if (!book) {
      return jsonResponse({ error: 'Book not found' }, 404);
    }

    const pdfPathMatch = typeof book.pdf === 'string'
      ? book.pdf.match(PDF_PATH_PATTERN)
      : null;
    if (!pdfPathMatch || pdfPathMatch[1] !== bookId) {
      return jsonResponse({ error: 'Book PDF not found' }, 404);
    }

    const tocResponse = await fetchBookAsset(context, `${bookId}/toc.json`);
    if (!tocResponse.ok) {
      return jsonResponse({ error: 'Book not found' }, 404);
    }

    const toc = await tocResponse.json();
    if (!Number.isSafeInteger(toc.pdfPageCount)
      || pageIndex >= toc.pdfPageCount) {
      return jsonResponse({ error: 'PDF page not found' }, 404);
    }

    const pdfResponse = await fetchBookAsset(
      context,
      `${bookId}/${pdfPathMatch[2]}`,
    );
    if (!pdfResponse.ok) {
      return jsonResponse({ error: 'Book PDF not found' }, 404);
    }

    const sourcePdf = await PDFDocument.load(await pdfResponse.arrayBuffer());
    if (pageIndex >= sourcePdf.getPageCount()) {
      return jsonResponse({ error: 'PDF page not found' }, 404);
    }

    const pagePdf = await PDFDocument.create();
    const [page] = await pagePdf.copyPages(sourcePdf, [pageIndex]);
    pagePdf.addPage(page);
    const bytes = await pagePdf.save();

    return new Response(bytes, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': 'application/pdf',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error(`Failed to load PDF page ${pageNumber} for ${bookId}:`, error);
    return jsonResponse({ error: 'Failed to load PDF page' }, 500);
  }
}
