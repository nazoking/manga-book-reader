import { Storage } from './Storage';
import { Bookmark } from './Bookmark';


export class CookieStorage implements Storage<Bookmark> {
  constructor(private name: string = "bookmark"){}
  write(book: Bookmark) {
    document.cookie = `${this.name}=${encodeURIComponent(JSON.stringify(book))}; path=${document.location.pathname}; max-age=31536000; samesite`;
    return Promise.resolve();
  }
  read() {
    const cookies = new Map(document.cookie.split(/; /).map(a => a.split('=', 2) as [string, string]));
    const value = cookies.get(this.name);
    if (value){
      try{
        const json = JSON.parse(decodeURIComponent(value));
        return Promise.resolve(json as Bookmark);
      }catch(e){
      }
    }
    return Promise.resolve(null);
  }
}
