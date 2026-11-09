import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import sharp from 'sharp';
import TurndownService from 'turndown';

const EPUB_FILE_PATH = './epubs/demi-gods-and-semi-devils.epub';
const BOOK_ID = 'demi-gods-and-semi-devils';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
});

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2];
}

function decodeXml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function getMetadataValue(metadata, elementName) {
  const match = metadata.match(
    new RegExp(`<dc:${elementName}\\b[^>]*>([\\s\\S]*?)<\\/dc:${elementName}\\s*>`, 'i'),
  );
  return match?.[1].replace(/<[^>]+>/g, '').trim()
    ? decodeXml(match[1].replace(/<[^>]+>/g, '').trim())
    : '';
}

function getEpubMetadata(zipEntries, entryMap) {
  const containerEntry = zipEntries.find(entry =>
    entry.entryName.toLowerCase() === 'meta-inf/container.xml',
  );
  const rootfilePath = containerEntry
    && getAttribute(
      containerEntry.getData().toString('utf8')
        .match(/<rootfile\b[^>]*>/i)?.[0] || '',
      'full-path',
    );
  const opfEntry = rootfilePath
    ? entryMap.get(path.posix.normalize(rootfilePath))
    : zipEntries.find(entry => path.posix.extname(entry.entryName).toLowerCase() === '.opf');

  if (!opfEntry) {
    throw new Error('EPUB package metadata (.opf) was not found');
  }

  const opf = opfEntry.getData().toString('utf8');
  const metadata = opf.match(/<metadata\b[^>]*>([\s\S]*?)<\/metadata>/i)?.[1] || '';
  const coverId = opf.match(/<meta\b[^>]*\bname=["']cover["'][^>]*>/i);
  const coverItemId = coverId
    ? getAttribute(coverId[0], 'content')
    : null;
  const manifestItems = [...opf.matchAll(/<item\b[^>]*\/?>/gi)].map(match => match[0]);
  const coverItem = manifestItems.find(item =>
    (coverItemId && getAttribute(item, 'id') === coverItemId)
    || /(?:^|\s)cover-image(?:\s|$)/i.test(getAttribute(item, 'properties') || ''),
  );
  const coverHref = coverItem && getAttribute(coverItem, 'href');

  return {
    title: getMetadataValue(metadata, 'title'),
    author: getMetadataValue(metadata, 'creator'),
    description: getMetadataValue(metadata, 'description'),
    coverEntryName: coverHref
      ? path.posix.normalize(path.posix.join(path.posix.dirname(opfEntry.entryName), coverHref))
      : null,
  };
}

function getNavPoints(ncx) {
  const rootNavPoints = [];
  const stack = [];
  const tokens = /<navPoint\b[^>]*>|<\/navPoint>|<navLabel\b[^>]*>[\s\S]*?<\/navLabel>|<content\b[^>]*\/?>/gi;

  for (const match of ncx.matchAll(tokens)) {
    const token = match[0];

    if (/^<navPoint\b/i.test(token)) {
      stack.push({ title: '', href: '', children: [] });
    } else if (/^<\/navPoint/i.test(token)) {
      const navPoint = stack.pop();
      if (navPoint) {
        const parent = stack[stack.length - 1];
        if (parent) parent.children.push(navPoint);
        else rootNavPoints.push(navPoint);
      }
    } else if (/^<navLabel\b/i.test(token) && stack.length > 0) {
      const titleMatch = token.match(/<text\b[^>]*>([\s\S]*?)<\/text>/i);
      if (titleMatch) {
        stack[stack.length - 1].title = titleMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;|&apos;/g, "'")
          .trim();
      }
    } else if (/^<content\b/i.test(token) && stack.length > 0) {
      stack[stack.length - 1].href = getAttribute(token, 'src') || '';
    }
  }

  const leafNavPoints = [];
  const visit = navPoint => {
    if (navPoint.children.length > 0) {
      navPoint.children.forEach(visit);
    } else {
      leafNavPoints.push(navPoint);
    }
  };
  rootNavPoints.forEach(visit);
  return leafNavPoints;
}

function rewriteImageSources(html, imageMap) {
  return html.replace(/<img\b[^>]*>/gi, imageTag => {
    const source = getAttribute(imageTag, 'src');
    if (!source) return imageTag;

    const imageName = path.posix.basename(source.split(/[?#]/)[0]);
    const imageUrl = imageMap.get(imageName.toLowerCase());
    if (!imageUrl) return imageTag;

    return imageTag.replace(
      /\bsrc\s*=\s*(["']).*?\1/i,
      `src="${imageUrl}"`,
    );
  });
}

function getImageName(source) {
  if (!source || /^(?:data:|https?:)/i.test(source)) return null;
  return path.posix.basename(source.split(/[?#]/)[0]);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractFootnotes(html) {
  const footnoteList = [...html.matchAll(/<ol\b[^>]*>[\s\S]*?<\/ol>/gi)]
    .find(match => (getAttribute(match[0].match(/^<ol\b[^>]*>/i)[0], 'class') || '')
      .split(/\s+/)
      .includes('duokan-footnote-content'));
  if (!footnoteList) return { bodyHtml: html, footnotes: [], references: [] };

  const footnotes = [...footnoteList[0].matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)]
    .map(match => {
      const openingTag = match[0].match(/^<li\b[^>]*>/i)[0];
      const id = getAttribute(openingTag, 'id');
      const number = getAttribute(openingTag, 'value') || id?.match(/_(\d+)$/)?.[1];
      const content = match[0].replace(/^<li\b[^>]*>|<\/li>$/gi, '');
      const backLink = content.match(/<a\b[^>]*href=["'][^"']*#(c_[\w-]+)["'][^>]*>/i);
      const textHtml = content.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1');

      return {
        id,
        targetId: `footnote-${(id || '').replace(/_/g, '-')}`,
        referenceId: backLink ? `note-ref-${backLink[1].replace(/_/g, '-')}` : '',
        label: number ? `注释${number}` : '',
        text: turndownService.turndown(textHtml).trim(),
      };
    })
    .filter(footnote => footnote.id && footnote.text);

  const references = [];
  const bodyHtml = html
    .replace(footnoteList[0], '')
    .replace(/<a\b[^>]*class=["'][^"']*\bduokan-footnote\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, anchor => {
      const openingTag = anchor.match(/^<a\b[^>]*>/i)[0];
      const markerId = getAttribute(openingTag, 'id');
      const href = getAttribute(openingTag, 'href') || '';
      const noteId = href.match(/#(a_[\w-]+)$/)?.[1];
      const footnote = footnotes.find(item => item.id === noteId);
      if (!footnote) return anchor;

      const label = anchor.match(/<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/i)?.[1]
        || noteId.replace(/^a_/, '');
      const token = `FOOTNOTEREFERENCE${references.length}TOKEN`;
      references.push({
        token,
        id: markerId ? `note-ref-${markerId.replace(/_/g, '-')}` : '',
        href: footnote.targetId,
        label,
      });
      return token;
    });

  return { bodyHtml, footnotes, references };
}

function extractBodyHtml(html, entryName) {
  const match = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) {
    throw new Error(`EPUB HTML entry has no body: ${entryName}`);
  }
  return match[1];
}

async function convertEpubToMarkdown() {
  const baseOutputDir = path.join('./public/books', BOOK_ID);
  const imagesOutputDir = path.join(baseOutputDir, 'images');
  fs.mkdirSync(imagesOutputDir, { recursive: true });

  const zip = new AdmZip(EPUB_FILE_PATH);
  const zipEntries = zip.getEntries();
  const entryMap = new Map(zipEntries.map(entry => [entry.entryName, entry]));
  const epubMetadata = getEpubMetadata(zipEntries, entryMap);
  const imageEntriesByName = new Map();
  for (const entry of zipEntries) {
    const extension = path.posix.extname(entry.entryName).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) continue;

    const imageName = path.posix.basename(entry.entryName);
    const key = imageName.toLowerCase();
    if (imageEntriesByName.has(key)) {
      throw new Error(`Duplicate image filename in EPUB: ${imageName}`);
    }
    imageEntriesByName.set(key, entry);
  }

  const ncxEntry = zipEntries.find(entry => path.extname(entry.entryName).toLowerCase() === '.ncx');

  if (!ncxEntry) {
    throw new Error('EPUB table of contents (.ncx) was not found');
  }

  const usedImageEntries = new Map();
  const registerImage = source => {
    const imageName = getImageName(source);
    if (!imageName) return;
    const entry = imageEntriesByName.get(imageName.toLowerCase());
    if (entry) usedImageEntries.set(imageName.toLowerCase(), entry);
  };
  const ncx = ncxEntry.getData().toString('utf8');
  const parsedChapters = getNavPoints(ncx)
    .filter(navPoint => navPoint.title && navPoint.href)
    .filter(navPoint => /\.(?:xhtml|html|htm)$/i.test(navPoint.href.split(/[?#]/)[0]))
    .map(navPoint => {
      const href = navPoint.href.split('#')[0];
      const entryName = path.posix.normalize(
        path.posix.join(path.posix.dirname(ncxEntry.entryName), href),
      );
      const entry = entryMap.get(entryName);
      if (!entry) {
        throw new Error(`Chapter content not found in EPUB: ${entryName}`);
      }

      const html = entry.getData().toString('utf8');
      const extracted = extractFootnotes(extractBodyHtml(html, entryName));
      for (const imageTag of extracted.bodyHtml.matchAll(/<img\b[^>]*>/gi)) {
        registerImage(getAttribute(imageTag[0], 'src'));
      }
      return {
        title: navPoint.title,
        bodyHtml: extracted.bodyHtml,
        references: extracted.references,
        footnotes: extracted.footnotes,
      };
    });

  if (parsedChapters.length === 0) {
    throw new Error('No chapters were found in the EPUB table of contents');
  }

  if (epubMetadata.coverEntryName) {
    const coverEntry = entryMap.get(epubMetadata.coverEntryName);
    if (coverEntry) registerImage(path.posix.basename(coverEntry.entryName));
  }

  const manifestPath = './public/books/manifest.json';

  const imageMap = new Map();
  let originalImageBytes = 0;
  let optimizedImageBytes = 0;
  for (const [imageKey, entry] of usedImageEntries) {
    const imageName = path.posix.basename(entry.entryName);
    const outputName = `${path.parse(imageName).name}.webp`;
    const outputPath = path.join(imagesOutputDir, outputName);
    const original = entry.getData();
    const optimized = await sharp(original).webp({ quality: 75, effort: 5 }).toBuffer();
    fs.writeFileSync(outputPath, optimized);
    imageMap.set(
      imageKey,
      `/books/${BOOK_ID}/images/${outputName}`,
    );
    originalImageBytes += original.length;
    optimizedImageBytes += optimized.length;
  }

  fs.mkdirSync(baseOutputDir, { recursive: true });
  const tocChapters = parsedChapters.map((chapter, index) => {
    const id = `ch-${String(index + 1).padStart(3, '0')}`;
    const bodyHtml = rewriteImageSources(chapter.bodyHtml, imageMap);
    let markdown = turndownService.turndown(bodyHtml).trim();
    for (const reference of chapter.references) {
      const idAttribute = reference.id ? ` id="${reference.id}"` : '';
      const link = `<sup><a${idAttribute} href="#${reference.href}">${escapeHtml(reference.label)}</a></sup>`;
      markdown = markdown.replace(reference.token, link);
    }
    const footnoteList = chapter.footnotes.length
      ? `\n\n<ol class="footnotes">\n${chapter.footnotes.map(footnote =>
        `<li id="${footnote.targetId}">${escapeHtml(footnote.label)} ${escapeHtml(footnote.text)}${
          footnote.referenceId
            ? ` <a href="#${footnote.referenceId}" aria-label="返回正文">↩</a>`
            : ''
        }</li>`,
      ).join('\n')}\n</ol>`
      : '';
    fs.writeFileSync(
      path.join(baseOutputDir, `${id}.md`),
      `${markdown}${footnoteList}`,
      'utf8',
    );
    return { id, title: chapter.title };
  });

  const tocData = {
    bookTitle: epubMetadata.title || BOOK_ID,
    chapters: tocChapters,
  };
  fs.writeFileSync(
    path.join(baseOutputDir, 'toc.json'),
    JSON.stringify(tocData, null, 2),
    'utf8',
  );

  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : [];
  const coverEntry = epubMetadata.coverEntryName
    && entryMap.get(epubMetadata.coverEntryName);
  const coverName = coverEntry
    ? `${path.parse(path.posix.basename(coverEntry.entryName)).name}.webp`
    : null;
  const bookRecord = {
    id: BOOK_ID,
    title: epubMetadata.title || BOOK_ID,
    author: epubMetadata.author || 'Unknown author',
    description: epubMetadata.description
      || manifest.find(item => item.id === BOOK_ID)?.description
      || epubMetadata.title
      || BOOK_ID,
    ...(coverName
      ? { cover: `/books/${BOOK_ID}/images/${coverName}` }
      : {}),
  };
  const existingBookIndex = manifest.findIndex(item => item.id === BOOK_ID);
  if (existingBookIndex === -1) {
    manifest.push(bookRecord);
  } else {
    manifest[existingBookIndex] = bookRecord;
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  for (const entry of imageEntriesByName.values()) {
    const sourcePath = path.join(imagesOutputDir, path.posix.basename(entry.entryName));
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
  }

  console.log(`Converted ${parsedChapters.length} chapters from ${EPUB_FILE_PATH}`);
  console.log(`Optimized ${imageMap.size} referenced images as WebP`);
  console.log(`Image size: ${(originalImageBytes / 1024 / 1024).toFixed(2)} MB -> ${(optimizedImageBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Removed unused extracted images from ${imagesOutputDir}`);
}

convertEpubToMarkdown().catch(error => {
  console.error('EPUB conversion failed:', error);
  process.exitCode = 1;
});
