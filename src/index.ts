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
import { ImageCache } from "./page/ImageCache";

import { ImagePrefetch } from "./loading/ImagePrefetch";

export default {
  Book,
  ImageCache,
  ImagePrefetch,
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
