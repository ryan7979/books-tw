import {
  fetchBookAsset,
  isValidBookId,
  jsonResponse,
} from './_utils.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const bookId = url.searchParams.get('bookId');
  const chapterId = url.searchParams.get('chapterId');

  if (!isValidBookId(bookId)) {
    return jsonResponse({ error: 'Invalid book ID' }, 400);
  }

  try {
    const tocResponse = await fetchBookAsset(context, `${bookId}/toc.json`);
    if (!tocResponse.ok) {
      return jsonResponse({ error: 'Book not found' }, 404);
    }

    const toc = await tocResponse.json();
    if (!chapterId) return jsonResponse(toc);

    if (!/^ch-\d{3}$/.test(chapterId)
      || !Array.isArray(toc.chapters)
      || !toc.chapters.some(chapter => chapter.id === chapterId)) {
      return jsonResponse({ error: 'Chapter not found' }, 404);
    }

    const chapterResponse = await fetchBookAsset(
      context,
      `${bookId}/${chapterId}.md`,
    );
    if (!chapterResponse.ok) {
      return jsonResponse({ error: 'Chapter not found' }, 404);
    }

    const markdown = await chapterResponse.text();
    const imagePath = `/books/${bookId}/images/`;
    const protectedMarkdown = markdown.replace(
      new RegExp(`${imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\s)]+)`, 'g'),
      (_match, name) => `/api/getImage?bookId=${encodeURIComponent(bookId)}&name=${encodeURIComponent(name)}`,
    );

    return new Response(protectedMarkdown, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error(`Failed to load chapter for ${bookId}:`, error);
    return jsonResponse({ error: 'Failed to load chapter' }, 500);
  }
}
