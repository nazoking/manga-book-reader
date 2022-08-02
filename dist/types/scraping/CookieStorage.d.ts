import { Storage } from './Storage';
import { Bookmark } from './Bookmark';
export declare class CookieStorage implements Storage<Bookmark> {
    private name;
    constructor(name?: string);
    write(book: Bookmark): Promise<void>;
    read(): Promise<Bookmark> | Promise<null>;
}
//# sourceMappingURL=CookieStorage.d.ts.map