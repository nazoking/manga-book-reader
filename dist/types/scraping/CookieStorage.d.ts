import { Storage } from './Storage';
import { Bookmark } from './Bookmark';
export declare class CookieStorage implements Storage<Bookmark> {
    write(book: Bookmark): Promise<void>;
    read(): Promise<Bookmark | null>;
}
//# sourceMappingURL=CookieStorage.d.ts.map