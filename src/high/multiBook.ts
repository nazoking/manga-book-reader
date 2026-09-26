import { Book } from "../book/Book";
import { PageNumber } from "../page/PageNumber";
import { BookLoadAction } from "../view/BookLoadAction";
import { DummyPage } from "../page/DummyPage";
import { ActionController } from "../view/ActionController";
import { Viewer } from "../view/Viewer";
import { BookLoader } from "./BookLoader";
import { viewerDom as defaultViewerDom } from "../viewerDom";
import { SpreadPages } from "../page/SpreadPages";
import { EventEmitter as Emitter } from "../view/event/Emitter";
import { ImageCache } from "../page/ImageCache";
import { LoadingOptions } from "../loading/options";

type BookSelectorEvent<BookMeta> = {
  book: BookMeta;
  bookIndex: number;
};
type BookSelectorSeed<BookMeta> = {
  bookList: Array<BookMeta>;
  action: BookLoadAction;
  onBookChanged: Emitter<BookSelectorEvent<BookMeta>>;
};
export interface MultiBook<BookMeta> {
  readonly bookList: Array<BookMeta>;
  readonly getBook: (
    book: BookMeta,
    index: number,
    array: Array<BookMeta>,
    signal?: AbortSignal
  ) => Promise<Book>;
  readonly getName?: (
    book: BookMeta,
    index: number,
    array: Array<BookMeta>
  ) => string;
  readonly onBookChanged?: (arg: {
    page: PageNumber;
    book: BookMeta;
  }) => void | Promise<void>;
  readonly onPageChanged?: (arg: {
    page: number;
    book: BookMeta;
  }) => void | Promise<void>;
  readonly dummyPage?: SpreadPages;
  readonly getBookSelector?: (
    g: BookSelectorSeed<BookMeta>
  ) => HTMLElement | string;
  readonly viewerDom?: HTMLElement;
  readonly loading?: LoadingOptions;
  readonly imageCache?: ImageCache;
}
export const multiBook = <BookMeta>({
  bookList,
  getBook,
  getName = (_, index) => `Book ${index + 1}`,
  onBookChanged = () => {},
  onPageChanged = () => {},
  dummyPage = new DummyPage(),
  getBookSelector = ({
    bookList,
    action,
    onBookChanged,
  }: BookSelectorSeed<BookMeta>) => {
    const select = document.createElement("select");
    bookList.forEach((book, index, array) => {
      select.appendChild(new Option(getName(book, index, array)));
    });
    select.onchange = () => {
      action.move(select.selectedIndex, -1);
    };
    onBookChanged.add((event: BookSelectorEvent<BookMeta>) => {
      select.selectedIndex = event.bookIndex;
    });
    return select;
  },
  viewerDom = defaultViewerDom(),
  loading = {},
  imageCache: sharedImageCache,
}: MultiBook<BookMeta>) => {
  const imageCache = sharedImageCache ?? new ImageCache(loading);
  const books = new BookLoader(
    bookList.length,
    (index, signal) => getBook(bookList[index], index, bookList, signal),
    imageCache,
    loading
  );
  let lastNotifiedBookIndex: number | undefined;
  const selectHandler = new Emitter<BookSelectorEvent<BookMeta>>();
  const action = new BookLoadAction(
    bookList.length,
    (bookIndex, pageNumber) => {
      void controller.setCurrent(dummyPage);
      books.select(bookIndex);
      selectHandler.trigger({ book: bookList[bookIndex], bookIndex });
      void controller.open(
        (page, reload) => books.load(bookIndex, page, reload),
        pageNumber
      );
    }
  );
  const controller = new ActionController(
    new Viewer(viewerDom, { loading, imageCache }),
    dummyPage,
    action.actions()
  );
  controller.view.onChanged.add((page) => {
    if (page === dummyPage || page !== controller.current) return;
    const bookIndex = action.index;
    const book = bookList[bookIndex];
    const event = { book, page: page.pageNumber() };
    if (lastNotifiedBookIndex !== bookIndex) {
      lastNotifiedBookIndex = bookIndex;
      notify(onBookChanged, event);
    }
    void books.prefetch(bookIndex, event.page).catch(() => {});
    notify(onPageChanged, event);
  });
  controller.view.setTitle(
    getBookSelector({ bookList, action, onBookChanged: selectHandler })
  );
  const dispose = () => {
    controller.dispose();
    books.dispose();
    if (!sharedImageCache) imageCache.dispose();
  };
  return { controller, action, imageCache, dispose };
};

function notify<T>(callback: (event: T) => void | Promise<void>, event: T) {
  void Promise.resolve()
    .then(() => callback(event))
    .catch((error) => console.warn("📖navigation callback failed", error));
}
