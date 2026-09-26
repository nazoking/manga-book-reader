import { Book } from "../book/Book";
import { PageNumber } from "../page/PageNumber";
import { ImageCache } from "../page/ImageCache";
import { ImagePrefetch } from "../loading/ImagePrefetch";
import { PreloadOptions, resolvePreloadOptions } from "../loading/options";
import { CacheMap } from "./CacheMap";

/** Owns chapter acquisition and speculative work for a single reader. */
export class BookLoader {
  private readonly cache = new CacheMap<number, Book>(3);
  private readonly images: ImagePrefetch;
  private readonly options: Required<PreloadOptions>;
  private generation = 0;

  constructor(
    private readonly count: number,
    private readonly getBook: (
      index: number,
      signal: AbortSignal
    ) => Promise<Book>,
    imageCache: ImageCache,
    options: PreloadOptions = {}
  ) {
    this.images = new ImagePrefetch(imageCache);
    this.options = resolvePreloadOptions(options);
  }

  select(index: number): void {
    this.stopPrefetch();
    // Preserve a pending next chapter so selecting it can reuse the request.
    this.cache.protect(index + 1 < this.count ? [index, index + 1] : [index]);
  }

  async load(index: number, page: PageNumber, reload = false) {
    if (reload) {
      this.stopPrefetch();
      this.cache.delete(index);
    }
    return (await this.book(index)).getSpreadPages(page);
  }

  async prefetch(index: number, page: number): Promise<void> {
    const generation = ++this.generation;
    const current = await this.book(index);
    if (
      generation !== this.generation ||
      current.pageCount === undefined ||
      !current.getPage
    )
      return;
    const config = this.options;
    const warmNext =
      config.preloadNextBook &&
      index + 1 < this.count &&
      current.pageCount - (page + 1) <= config.nextBookThreshold;
    this.cache.protect(warmNext ? [index, index + 1] : [index]);
    const next = warmNext
      ? this.book(index + 1).catch(() => undefined)
      : undefined;
    const sources = await pageSources(
      current,
      page - config.preloadBehind,
      page + 1 + config.preloadAhead,
      page
    );
    if (generation !== this.generation) return;
    this.images.update(sources);
    const nextBook = await next;
    if (generation !== this.generation || !nextBook) return;
    const nextSources = await pageSources(
      nextBook,
      0,
      config.nextBookPages - 1,
      0
    );
    if (generation === this.generation)
      this.images.update([...sources, ...nextSources]);
  }

  dispose(): void {
    this.stopPrefetch();
    this.cache.clear();
  }

  private book(index: number) {
    return this.cache.getOr(index, this.getBook);
  }

  private stopPrefetch() {
    ++this.generation;
    this.images.clear();
  }
}

async function pageSources(
  book: Book,
  start: number,
  end: number,
  position: number
): Promise<string[]> {
  if (!book.getPage || book.pageCount === undefined) return [];
  start = Math.max(0, start);
  end = Math.min(book.pageCount - 1, end);
  const indices = Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, offset) => start + offset
  ).sort((a, b) => Math.abs(a - position) - Math.abs(b - position));
  const pages = await Promise.all(
    indices.map(async (index) => {
      try {
        return await book.getPage!(index);
      } catch {
        return null;
      }
    })
  );
  return pages.flatMap((page) => (page ? [page.src] : []));
}
