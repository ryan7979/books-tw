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

## Book conversion tool

The EPUB conversion tool and its dependencies are isolated in `tools/` and are
not installed when setting up the website. Install them only when converting a
book, then run the parser from the project root:

```sh
npm --prefix tools install
npm run parse-book
```