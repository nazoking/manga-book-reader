import { Book } from '../book/Book';
import { PageNumber } from "../page/PageNumber";
import { BookController } from "../book/BookController";
import { BookLoadAction } from "../view/BookLoadAction";
import { DummyPage } from '../page/DummyPage';
import { ActionController } from '../view/ActionController';
import { Viewer } from '../view/Viewer';
import { CacheMap } from './CacheMap';
import { viewerDom as defaultViewerDom } from '../viewerDom';
import { SpreadPages } from '../page/SpreadPages';
import { EventEmitter as Emitter } from '../view/event/Emitter';


type BookSelectorEvent<BookMeta> = {
  controller: BookController<BookMeta>;
  bookIndex: number;
};
type BookSelectorSeed<BookMeta> = {
  bookList: Array<BookMeta>;
  action: BookLoadAction<BookMeta>;
  onBookChanged: Emitter<BookSelectorEvent<BookMeta>>;
}
export interface MultiBook<BookMeta> {
  readonly bookList: Array<BookMeta>,
  readonly getBook: (book: BookMeta, index: number, array: Array<BookMeta>) => Promise<Book>,
  readonly getName?: (book: BookMeta, index: number, array: Array<BookMeta>) => string,
  readonly onBookChanged?: (arg:{page: PageNumber, book: BookMeta}) => void,
  readonly onPageChanged?: (arg:{page: number, book: BookMeta}) => void,
  readonly dummyPage?: SpreadPages,
  readonly getBookSelector?: (g:BookSelectorSeed<BookMeta>) => HTMLElement | string,
  readonly viewerDom?: HTMLElement,
}
export const multiBook = <BookMeta>({
  bookList,
  getBook,
  getName = (_, index) => `Book ${index + 1}`,
  onBookChanged = () => { },
  onPageChanged = () => { },
  dummyPage = new DummyPage(),
  getBookSelector = ({bookList, action, onBookChanged}: BookSelectorSeed<BookMeta>) => {
    const select = document.createElement("select");
    bookList.forEach((book, index, array) => {
      select.appendChild(new Option(getName(book, index, array)));
    });
    select.onchange = () => { action.move(select.selectedIndex, -1); }
    onBookChanged.add((event: BookSelectorEvent<BookMeta>) => {
      select.selectedIndex = event.bookIndex;
    })
    return select;
  },
  viewerDom = defaultViewerDom(),
}: MultiBook<BookMeta>) => {
  const cache = new CacheMap<BookMeta, Book>();
  const getController = (bookNumber: number): BookController<BookMeta> => {
    bookNumber = Math.min(Math.max(bookNumber, 0), bookList.length);
    return {
      move: (m) => getController(bookNumber + m),
      canMove: (m) => bookNumber + m >= 0 && bookNumber + m < bookList.length,
      goTo: (m) => getController(m),
      getBookMeta: () => bookList[bookNumber],
      getSpreadPages: (page: PageNumber) =>
        cache.getOr(bookList[bookNumber], (m) => getBook(m, bookNumber, bookList)).then(b => b.getSpreadPages(page)),
    };
  }
  const selectHandler = new Emitter<BookSelectorEvent<BookMeta>>();
  const action = new BookLoadAction(getController(0), (async (bc: BookController<BookMeta>, pageNumber) => {
    controller.setCurrent(Promise.resolve(dummyPage));
    selectHandler.trigger({ controller: bc, bookIndex: bookList.findIndex(l => l == bc.getBookMeta()) });
    controller.setCurrent(bc.getSpreadPages(pageNumber));
    onBookChanged({book:bc.getBookMeta(), page:pageNumber});
  }));
  const controller = new ActionController(
    new Viewer(viewerDom),
    dummyPage,
    action.actions(),
  );
  controller.view.onChanged.add((page) => {
    onPageChanged({page:page.pageNumber(), book: action.getBookController().getBookMeta()})
  });
  controller.view.setTitle(getBookSelector({bookList, action, onBookChanged:selectHandler }));
  return { controller, action }
}

