import { Viewer } from "./view/Viewer";
import { BookLoadAction } from "./view/BookLoadAction";
import { DragHandler } from "./view/event/DragHandler";
import { infinityScroll } from "./scraping/infinityScroll";
import { Book } from "./book/Book";
import { multiBook } from "./high/multiBook";
import { preLoadImageList } from "./scraping/preLoadImageList";
import { scraping } from "./scraping/scraping";
import { ActionController } from "./view/ActionController";
import { query } from "./high/query";

export default {
  Book,
  ActionController,
  Viewer,
  BookLoadAction,
  DragHandler,
  multiBook,
  preLoadImageList,
  scraiping: scraping,
  infinityScroll,
  query,
};
