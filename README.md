# Books Taiwan

## Website

Install the root dependencies and build the website:

```sh
npm install
npm run build
```

Book data lives in the repository-root `books/` directory. The Vite build
copies it under `dist/_private/books/` for the Cloudflare Pages asset binding;
the application middleware blocks direct requests to both `/books/` and
`/_private/`. The reader uses the protected APIs instead:

- `GET /api/getBooks` returns the bookshelf list.
- `GET /api/getChapter?bookId=...` returns a book's table of contents.
- `GET /api/getChapter?bookId=...&chapterId=...` returns chapter Markdown.
- `GET /api/getImage?bookId=...&name=...` returns a book image.
- `GET /api/getPdf?bookId=...&page=...` returns a single-page PDF for rendering.

PDF table-of-contents files specify `sourcePdf`, `pdfPageCount`, and each
chapter's `startPage` and `endPage`. The reader uses those ranges for chapter
navigation and loads PDF pages incrementally.

Reader URLs include `?book=<book-id>&chapter=<chapter-id>`, so refreshing or
sharing a reader URL opens the same book and chapter. Browser back/forward
navigates between the bookshelf and recently viewed chapters.

## Book import tool

The EPUB conversion tool and its dependencies are isolated in `tools/` and are
not installed when setting up the website. Install them only when converting a
book, then run the parser from the project root:

```sh
npm --prefix tools install
npm run parse-book
```

EPUB files are converted to chapters. PDF files are moved into `books/` and
their path is recorded in `books/manifest.json`.