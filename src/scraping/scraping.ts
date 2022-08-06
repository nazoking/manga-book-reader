import { Book } from "../book/Book";
import { preLoadImageList } from "./preLoadImageList";
import { multiBook } from "../high/multiBook";
import { CookieStorage } from "./CookieStorage";
import { Bookmark } from "./Bookmark";
import { Storage } from "./Storage";
import { viewerDom as defaultViewerDom } from "../viewerDom";
import { query } from "../high/query";

function isNodeArray(u: Array<Node> | Array<string>): u is Array<Node> {
  return u.length != 0 && u[0] instanceof Node;
}

type op = string[] | Node[];
type Getterable =
  | string
  | op
  | ((doc: Document) => op)
  | ((doc: Document) => Promise<op>);
const toParser =
  (getterable: Getterable) =>
  async (doc: Document): Promise<string[]> => {
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
            (imgs as Array<HTMLImageElement>).map(
              (e) => e.dataset.lazySrc || e.dataset.src || e.src
            )
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
    return inferPages(await getterable(doc));
  };
type DomPageLoaderA = {
  loadDom?: (arg: { url: string }) => Promise<Document>;
  parseDom: Getterable;
  postParse?: (arg: {
    pageList: string[];
    dom: Document;
    book: { url: string };
  }) => Promise<void>;
};
type DomPageLoader = {
  loadDom: (arg: { url: string }) => Promise<Document>;
  parseDom: (doc: Document) => Promise<string[]>;
  postParse: (arg: {
    pageList: string[];
    dom: Document;
    book: { url: string };
  }) => Promise<void>;
};
type BookPageLoader = {
  loadBookPageList: (arg: { url: string }) => Promise<string[]>;
};
const domLoader = async (book: { url: string }) => {
  const r = await fetch(book.url);
  const txt = await r.text();
  const dom = new DOMParser().parseFromString(txt, "text/html");
  if (dom.getElementsByTagName("base").length == 0) {
    const base = dom.createElement("base");
    base.href = book.url;
    dom.head.append(base);
  }
  return dom;
};
const preLoading = async (arg: {
  pageList: string[];
  dom: Document;
  book: { url: string };
}) => {
  setTimeout(() => preLoadImageList(arg.pageList), 1000);
};

const isBookPageLoader = (
  pageList: Getterable | DomPageLoaderA | BookPageLoader
): pageList is BookPageLoader =>
  typeof pageList == "object" && "loadBookPageList" in pageList;

const toDomPageLoader = (
  pageList: Getterable | DomPageLoaderA
): DomPageLoader => {
  if (typeof pageList == "object" && !Array.isArray(pageList)) {
    return {
      loadDom: pageList.loadDom?.bind(pageList) || domLoader,
      parseDom: toParser(
        typeof pageList.parseDom == "function"
          ? pageList.parseDom.bind(pageList)
          : pageList.parseDom
      ),
      postParse: pageList.postParse?.bind(pageList) || preLoading,
    };
  } else {
    return {
      loadDom: domLoader,
      parseDom: toParser(pageList),
      postParse: preLoading,
    };
  }
};
const toBookPageLoader = (
  pageList: Getterable | DomPageLoaderA | BookPageLoader
): BookPageLoader => {
  if (isBookPageLoader(pageList)) return pageList;
  const dl = toDomPageLoader(pageList);
  return {
    loadBookPageList: async (book: { url: string }) => {
      const dom = await dl.loadDom(book);
      const pageList = await dl.parseDom(dom);
      await dl.postParse({ pageList, dom, book });
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
}: {
  bookList: BookMeta[] | undefined;
  pageList: Getterable | BookPageLoader | DomPageLoaderA;
  addController?: string | HTMLElement | ((div: HTMLElement) => void);
  bookmarker?: Storage<Bookmark>;
  viewerDom?: HTMLElement;
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
    const pages = await toDomPageLoader(pageList).parseDom(document);
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
    bookPageLoader = toBookPageLoader(pageList);
  }
  const bookmark = await bookmarker.read();
  const r = bookList.findIndex((c) => c.title == bookmark?.title);
  const bookNumber = Math.max(r, 0);
  const pageNumber = (r !== -1 ? bookmark?.page : -1) ?? -1;
  console.log("📖start ", bookmark, bookNumber, bookList, pageNumber);
  const { controller, action } = multiBook({
    bookList,
    viewerDom,
    getBook: async (book) => {
      console.log("📖load=", book);
      const pageList = await bookPageLoader.loadBookPageList(book);
      console.log("📖pageList=", pageList);
      return Book(pageList.map(async (src) => ({ src })));
    },
    getName: (b) => b.title,
    onBookChanged: ({ book }) => {
      const current_url = window.location.href;
      history.replaceState({}, "", book.url);
      history.replaceState({}, "", current_url);
    },
    onPageChanged({ page, book }) {
      bookmarker.write({
        title: book.title,
        page,
      });
      console.log(`📖open ${book.title}(${page})`);
    },
  });
  doAddController(controller.view.wrapper, addController);
  action.move(bookNumber, pageNumber);
  return {
    controller,
    action,
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
