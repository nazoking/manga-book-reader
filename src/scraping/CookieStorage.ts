import { Storage } from './Storage';
import { Bookmark } from './Bookmark';


export class CookieStorage implements Storage<Bookmark> {
  write(book: Bookmark) {
    document.cookie = `lastchap=${escape(book.title)}; max-age=31536000; samesite`;
    if (typeof book.page === "number") {
      document.cookie = `page=${book.page}; max-age=31536000; samesite`;
    }
    return Promise.resolve();
  }
  read() {
    const c = new Map(document.cookie.split(/; /).map(a => a.split('=', 2) as [string, string]));
    const title = c.get("lastchap");
    let ret: Bookmark | null = null;
    if (title) {
      ret = { title: unescape(title) };
      const page = c.get("page");
      if (page)
        ret.page = (page as any) * 1;
    }
    return Promise.resolve(ret);
  }
}
