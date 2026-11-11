import { fetchBookAsset, isValidBookId, jsonResponse } from './_utils.js';

export async function onRequestGet(context) {
  try {
    const response = await fetchBookAsset(context, 'manifest.json');
    if (!response.ok) {
      return jsonResponse({ error: 'Book manifest not found' }, 404);
    }

    const books = await response.json();
    if (!Array.isArray(books)) {
      return jsonResponse({ error: 'Book manifest has an invalid format' }, 500);
    }

    const result = books.map(book => {
      if (!isValidBookId(book.id)) {
        throw new Error('Book manifest contains an invalid book ID');
      }

      const coverName = typeof book.cover === 'string'
        ? book.cover.split('/').pop()
        : null;
      return {
        ...book,
        cover: coverName
          ? `/api/getImage?bookId=${encodeURIComponent(book.id)}&name=${encodeURIComponent(coverName)}`
          : null,
      };
    });

    return jsonResponse(result);
  } catch (error) {
    console.error('Failed to load book manifest:', error);
    return jsonResponse({ error: 'Failed to load book manifest' }, 500);
  }
}
