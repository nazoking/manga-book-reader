import { Book } from "../book/Book";
import { multiBook } from "../high/multiBook";
import { CookieStorage } from "./CookieStorage";
import { Bookmark } from "./Bookmark";
import { Storage } from "./Storage";
import { viewerDom as defaultViewerDom } from "../viewerDom";
import { query } from "../high/query";
import { abortError, retry } from "../loading/retry";
import {
  LoadingOptions,
  RequestOptions,
  resolveRequestOptions,
} from "../loading/options";

function isNodeArray(u: Array<Node> | Array<string>): u is Array<Node> {
  return u.length != 0 && u[0] instanceof Node;
}

type op = string[] | Node[];
type Getterable =
  | string
  | op
  | ((doc: Document, options: { url: string; signal?: AbortSignal }) => op)
  | ((
      doc: Document,
      options: { url: string; signal?: AbortSignal }
    ) => Promise<op>);
const toParser =
  (getterable: Getterable) =>
  async (
    doc: Document,
    options: { url: string; signal?: AbortSignal }
  ): Promise<string[]> => {
    const inferPages = (imgs: op): string[] => {
      if (imgs.length == 0) return imgs as string[];
      if (isNodeArray(imgs)) {
        if (imgs[0] instanceof HTMLAnchorElement) {
          return inferPages(
            (imgs as Array<HTMLAnchorElement>).map((e) => e.href)
          );
        }
        if (imgs[0] instanceof HTMLImageElement) {
          return inferPages(
            (imgs as Array<HTMLImageElement>).map((e) => {
              const src = e.dataset.lazySrc || e.dataset.src;
              return src
                ? new URL(src, doc.baseURI || options.url).href
                : e.src;
            })
          );
        }
        throw new Error(`📖Un Supported Node ${imgs[0]}`);
      }
      return imgs;
    };
    if (typeof getterable == "string") {
      return inferPages(query(getterable, doc));
    }
    if (typeof getterable == "object") {
      return inferPages(getterable);
    }
    return inferPages(await getterable(doc, options));
  };
type DomPageLoaderA = {
  loadDom?: (arg: { url: string; signal?: AbortSignal }) => Promise<Document>;
  parseDom: Getterable;
  postParse?: (arg: {
    pageList: string[];
    dom: Document;
    book: { url: string };
    signal?: AbortSignal;
  }) => Promise<void>;
};
type DomPageLoader = {
  loadDom: (arg: { url: string; signal?: AbortSignal }) => Promise<Document>;
  parseDom: (
    doc: Document,
    options: { url: string; signal?: AbortSignal }
  ) => Promise<string[]>;
  postParse: (arg: {
    pageList: string[];
    dom: Document;
    book: { url: string };
    signal?: AbortSignal;
  }) => Promise<void>;
};
type BookPageLoader = {
  loadBookPageList: (arg: {
    url: string;
    signal?: AbortSignal;
  }) => Promise<string[]> | Promise<Promise<string>[]>;
};
const retryAfterMs = (response: Response): number | undefined => {
  const value = response.headers.get("Retry-After");
  if (!value) return;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
};
export const loadChapterDocument = async (
  book: { url: string; signal?: AbortSignal },
  loading: RequestOptions
) => {
  const config = resolveRequestOptions(loading);
  return retry(
    async () => {
      const request = new AbortController();
      const parentAbort = () => request.abort();
      book.signal?.addEventListener("abort", parentAbort, { once: true });
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        request.abort();
      }, config.timeoutMs);
      try {
        if (book.signal?.aborted) throw abortError();
        const response = await fetch(book.url, { signal: request.signal });
        if (!response.ok) {
          const error = new Error(
            `Chapter request failed (${response.status}): ${book.url}`
          ) as Error & {
            status?: number;
            retryAfter?: number;
          };
          error.status = response.status;
          error.retryAfter =
            response.status === 429 ? retryAfterMs(response) : undefined;
          throw error;
        }
        const text = await response.text();
        if (book.signal?.aborted) throw abortError();
        const finalUrl = response.url || book.url;
        const dom = new DOMParser().parseFromString(text, "text/html");
        let base = dom.querySelector<HTMLBaseElement>("base[href]");
        if (!base) {
          base = dom.createElement("base");
          dom.head.prepend(base);
          base.href = finalUrl;
        } else {
          try {
            const resolvedBase = new URL(
              base.getAttribute("href") || finalUrl,
              finalUrl
            );
            if (["http:", "https:", "blob:"].includes(resolvedBase.protocol)) {
              base.href = resolvedBase.href;
            } else {
              base.href = finalUrl;
            }
          } catch {
            base.href = finalUrl;
          }
        }
        return dom;
      } catch (error) {
        if (book.signal?.aborted) throw abortError();
        if (timedOut)
          throw new Error(
            `Chapter request timed out after ${config.timeoutMs}ms: ${book.url}`,
            { cause: error }
          );
        throw error;
      } finally {
        clearTimeout(timeout);
        book.signal?.removeEventListener("abort", parentAbort);
      }
    },
    config,
    book.signal,
    (error, ms) => {
      const failure = error as Error & { status?: number; retryAfter?: number };
      if (failure.status === 429 && failure.retryAfter !== undefined)
        return failure.retryAfter <= 5000 ? failure.retryAfter : false;
      return failure.status === undefined ||
        failure.status === 408 ||
        failure.status === 429 ||
        failure.status >= 500
        ? ms
        : false;
    }
  );
};

const isBookPageLoader = (
  pageList: Getterable | DomPageLoaderA | BookPageLoader
): pageList is BookPageLoader =>
  typeof pageList == "object" && "loadBookPageList" in pageList;

const toDomPageLoader = (
  pageList: Getterable | DomPageLoaderA,
  loading: LoadingOptions
): DomPageLoader => {
  if (typeof pageList == "object" && !Array.isArray(pageList)) {
    return {
      loadDom:
        pageList.loadDom?.bind(pageList) ||
        ((arg) => loadChapterDocument(arg, loading)),
      parseDom: toParser(
        typeof pageList.parseDom == "function"
          ? pageList.parseDom.bind(pageList)
          : pageList.parseDom
      ),
      postParse: pageList.postParse?.bind(pageList) || (async () => {}),
    };
  } else {
    return {
      loadDom: (arg) => loadChapterDocument(arg, loading),
      parseDom: toParser(pageList),
      postParse: async () => {},
    };
  }
};
const toBookPageLoader = (
  pageList: Getterable | DomPageLoaderA | BookPageLoader,
  loading: LoadingOptions
): BookPageLoader => {
  if (isBookPageLoader(pageList)) return pageList;
  const dl = toDomPageLoader(pageList, loading);
  return {
    loadBookPageList: async (book: { url: string; signal?: AbortSignal }) => {
      const dom = await dl.loadDom(book);
      if (book.signal?.aborted) throw abortError();
      const pageList = await dl.parseDom(dom, book);
      if (book.signal?.aborted) throw abortError();
      await dl.postParse({ pageList, dom, book, signal: book.signal });
      return pageList;
    },
  };
};

export const scraping = async <
  BookMeta extends { title: string; url: string }
>({
  pageList,
  bookList = undefined,
  addController = undefined,
  bookmarker = new CookieStorage(),
  viewerDom = defaultViewerDom(),
  onBookChanged = undefined,
  onPageChanged = undefined,
  loading = {},
}: {
  bookList: BookMeta[] | undefined;
  pageList: Getterable | BookPageLoader | DomPageLoaderA;
  addController?: string | HTMLElement | ((div: HTMLElement) => void);
  bookmarker?: Storage<Bookmark>;
  viewerDom?: HTMLElement;
  onBookChanged?: Parameters<typeof multiBook>[0]["onBookChanged"];
  onPageChanged?: Parameters<typeof multiBook>[0]["onPageChanged"];
  loading?: LoadingOptions;
}) => {
  let bookPageLoader: BookPageLoader;
  if (!bookList || bookList.length == 0) {
    console.log("📖bookList not found");
    if (isBookPageLoader(pageList)) {
      console.log(
        "📖pageList is BookLoader, but book info is not exists",
        pageList
      );
      return;
    }
    const pages = await toDomPageLoader(pageList, loading).parseDom(document, {
      url: location.href,
    });
    if (!pages.length) {
      console.log("📖pageList not found");
      return;
    }
    bookPageLoader = {
      loadBookPageList: async () => pages,
    };
    bookList = [
      {
        title: document.title,
        url: location.href,
      } as BookMeta,
    ];
  } else {
    bookPageLoader = toBookPageLoader(pageList, loading);
  }
  const bookmark = await bookmarker.read();
  const r = bookList.findIndex((c) => c.title == bookmark?.title);
  const bookNumber = Math.max(r, 0);
  const pageNumber = (r !== -1 ? bookmark?.page : -1) ?? -1;
  console.log("📖start ", bookmark, bookNumber, bookList, pageNumber);
  const { controller, action, dispose } = multiBook({
    bookList,
    viewerDom,
    loading,
    getBook: async (book, _index, _bookList, signal) => {
      console.log("📖load=", book);
      const pageList = await bookPageLoader.loadBookPageList({
        ...book,
        signal,
      });
      console.log("📖pageList=", pageList);
      if (!pageList.length)
        throw new Error(`No pages found for chapter: ${book.url}`);
      return Book(
        pageList.map((src) => Promise.resolve(src).then((src) => ({ src })))
      );
    },
    getName: (b) => b.title,
    onBookChanged:
      onBookChanged ??
      (({ book }) => {
        const current_url = window.location.href;
        try {
          history.replaceState({}, "", book.url);
          history.replaceState({}, "", current_url);
        } catch (e) {
          // origin が違うと security error になることがある
        }
      }),
    onPageChanged:
      onPageChanged ??
      (({ page, book }) => {
        void bookmarker
          .write({
            title: book.title,
            page,
          })
          .catch((error) => console.warn("📖bookmark write failed", error));
        console.log(`📖open ${book.title}(${page})`);
      }),
  });
  doAddController(controller.view.wrapper, addController);
  action.move(bookNumber, pageNumber);
  return {
    controller,
    action,
    dispose,
  };
};
function doAddController(
  div: HTMLElement,
  add: undefined | Element | string | ((div: HTMLElement) => void)
) {
  if (!add) {
    doAddController(div, document.body);
  } else if (typeof add == "string") {
    doAddController(div, query(add, document)[0] || document.body);
  } else if (typeof add == "function") {
    add(div);
  } else {
    add.prepend(div);
    setTimeout(() => div.focus());
  }
}
