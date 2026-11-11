import {
  fetchBookAsset,
  isValidBookId,
  isValidImageName,
  jsonResponse,
  protectedAssetResponse,
} from './_utils.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const bookId = url.searchParams.get('bookId');
  const name = url.searchParams.get('name');

  if (!isValidBookId(bookId) || !isValidImageName(name)) {
    return jsonResponse({ error: 'Invalid image request' }, 400);
  }

  try {
    const response = await fetchBookAsset(context, `${bookId}/images/${name}`);
    if (!response.ok) {
      return jsonResponse({ error: 'Image not found' }, 404);
    }
    return protectedAssetResponse(response);
  } catch (error) {
    console.error(`Failed to load image for ${bookId}:`, error);
    return jsonResponse({ error: 'Failed to load image' }, 500);
  }
}
