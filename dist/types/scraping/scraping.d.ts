import { Bookmark } from "./Bookmark";
import { Storage } from "./Storage";
import { ActionController } from '../view/ActionController';
declare type op = string[] | Node[];
declare type Getterable = string | op | ((doc: Document) => op) | ((doc: Document) => Promise<op>);
declare type DomPageLoaderA = {
    loadDom?: (arg: {
        url: string;
    }) => Promise<Document>;
    parseDom: Getterable;
    postParse?: (arg: {
        pageList: string[];
        dom: Document;
        book: {
            url: string;
        };
    }) => Promise<void>;
};
declare type BookPageLoader = {
    loadBookPageList: (arg: {
        url: string;
    }) => Promise<string[]>;
};
export declare const scraping: <BookMeta extends {
    title: string;
    url: string;
}>({ pageList, bookList, addController, bookmarker, viewerDom, }: {
    bookList: BookMeta[] | undefined;
    pageList: Getterable | BookPageLoader | DomPageLoaderA;
    addController?: ((div: HTMLElement) => void) | undefined;
    bookmarker?: Storage<Bookmark> | undefined;
    viewerDom?: HTMLElement | undefined;
}) => Promise<{
    controller: ActionController;
    action?: undefined;
} | {
    controller: ActionController;
    action: import("../view/BookLoadAction").BookLoadAction<BookMeta>;
} | undefined>;
export {};
//# sourceMappingURL=scraping.d.ts.map