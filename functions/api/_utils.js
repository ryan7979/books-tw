const BOOKS_PATH = '/books';

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function isValidBookId(bookId) {
  return typeof bookId === 'string' && /^[a-z0-9-]+$/i.test(bookId);
}

export function isValidImageName(name) {
  return typeof name === 'string'
    && !name.includes('..')
    && /^[\w .-]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(name);
}

export async function fetchBookAsset(context, relativePath) {
  if (!context.env?.ASSETS?.fetch) {
    throw new Error('Cloudflare Pages ASSETS binding is unavailable');
  }

  const url = new URL(`${BOOKS_PATH}/${relativePath}`, context.request.url);
  return context.env.ASSETS.fetch(url);
}

export function protectedAssetResponse(response) {
  if (response.status !== 200) return response;

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
