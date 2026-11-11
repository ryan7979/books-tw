async function fetchResponse(url, errorMessage) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.status}`);
  }
  return response;
}

export async function fetchBooks() {
  const response = await fetchResponse('/api/getBooks', 'Book list request failed');
  return response.json();
}

export async function fetchBookContents(bookId) {
  const params = new URLSearchParams({ bookId });
  const response = await fetchResponse(
    `/api/getChapter?${params}`,
    'Book contents request failed',
  );
  return response.json();
}

export async function fetchChapter(bookId, chapterId) {
  const params = new URLSearchParams({ bookId, chapterId });
  const response = await fetchResponse(
    `/api/getChapter?${params}`,
    'Chapter request failed',
  );
  return response.text();
}
