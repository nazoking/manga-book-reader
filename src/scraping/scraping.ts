import { Book } from '../book/Book';
import { preLoadImageList } from './preLoadImageList';
import { multiBook } from '../high/multiBook';
import { CookieStorage } from "./CookieStorage";
import { Bookmark } from "./Bookmark";
import { Storage } from "./Storage";
import { viewerDom as defaultViewerDom } from '../viewerDom';
import { ActionController } from '../view/ActionController';
import { Viewer } from '../view/Viewer';
import { query } from '../high/query';

function isNodeArray(u: Array<Node> | Array<string>): u is Array<Node> {
  return u.length != 0 && u[0] instanceof Node;
}

type op = string[] | Node[];
type Getterable = string | op | ((doc: Document) => op) | ((doc: Document) => Promise<op>);
const toGetter = (getterable: Getterable) => async (doc: Document) => {
  const inferPages = (imgs: op): string[] => {
    if (imgs.length == 0) return imgs as string[];
    if (isNodeArray(imgs)) {
      if (imgs[0] instanceof HTMLAnchorElement) {
        return inferPages((imgs as Array<HTMLAnchorElement>).map(e => e.href));
      }
      if (imgs[0] instanceof HTMLImageElement) {
        return inferPages((imgs as Array<HTMLImageElement>).map(e => e.dataset.lazySrc || e.dataset.src || e.src));
      }
      throw new Error(`📖Un Supported Node ${imgs[0]}`);
    }
    return imgs;
  };
  if (typeof getterable == 'string') {
    return inferPages(query(getterable, doc));
  }
  if (typeof getterable == 'object') {
    return inferPages(getterable);
  }
  return inferPages(await getterable(doc));
}

export const scraping = async ({
  pageList,
  bookList = undefined,
  addController = (div: HTMLElement) => {
    document.body.prepend(div);
    setTimeout(() => div.focus());
  },
  bookmarker = new CookieStorage(),
  viewerDom = defaultViewerDom(),
}: {
  bookList: { url: string, title: string }[] | undefined;
  pageList: Getterable;
  addController?: (div: HTMLElement) => void;
  bookmarker?: Storage<Bookmark>,
  viewerDom?: HTMLElement,
}) => {
  const getPageImageList = toGetter(pageList);
  if (!bookList || bookList.length == 0) {
    console.log("📖bookList not found");
    const pages = await getPageImageList(document);
    if (pages.length) {
      const book = Book(pages.map(async (src) => ({ src })));
      const controller = new ActionController(new Viewer(viewerDom), book.getSpreadPages(-1), {});
      addController(controller.view.div);
      setTimeout(() => preLoadImageList(pages), 1000);
      return {
        controller,
      }
    }
    console.log("📖pageList not found");
    return;
  }
  const bookmark = await bookmarker.read();
  let bookNumber = Math.max(bookList.findIndex((c) => c.title == bookmark?.title), 0);
  console.log("📖start ", bookmark, bookNumber, bookList);
  const { controller, action } = multiBook({
    bookList,
    viewerDom,
    getBook: async (book) => {
      console.log("📖load=", book);
      const r = await fetch(book.url);
      const txt = await r.text();
      const dom = new DOMParser().parseFromString(txt, "text/html");
      if(dom.getElementsByTagName("base").length == 0){
        const base = dom.createElement("base")
        base.href = book.url;
        dom.head.append(base);
      }
      const pageList = await getPageImageList(dom);
      console.log("📖pageList=", pageList);
      setTimeout(() => preLoadImageList(pageList), 1000);
      return Book(pageList.map(async (src) => ({ src })));
    },
    getName: (b) => b.title,
    onBookChanged: (bc, pageNumber) => {
      const b = bc.getBookMeta();
      bookmarker.write({
        title: b.title,
      });
      const current_url = window.location.href;
      history.replaceState({}, "", b.url);
      history.replaceState({}, "", current_url);
      console.log(`📖${JSON.stringify(bc.getBookMeta())} ${b.title} ${JSON.stringify(pageNumber)}`);
    }
  });
  addController(controller.view.div);
  action.move(bookNumber, -1);
  return {
    controller,
    action,
  };
}
