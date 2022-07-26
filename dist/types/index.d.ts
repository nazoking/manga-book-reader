import { Viewer } from './view/Viewer';
import { BookLoadAction } from "./view/BookLoadAction";
import { DragHandler } from "./view/event/DragHandler";
import { infinityScroll } from './scraping/infinityScroll';
import { Book } from './book/Book';
import { ActionController } from './view/ActionController';
declare const _default: {
    Book: (pages: Promise<import("./page/PageData").PageData>[]) => Book;
    ActionController: typeof ActionController;
    Viewer: typeof Viewer;
    BookLoadAction: typeof BookLoadAction;
    DragHandler: typeof DragHandler;
    multiBook: <BookMeta>({ bookList, getBook, getName, onBookChanged, onPageChanged, dummyPage, getBookSelector, viewerDom, }: import("./high/multiBook").MultiBook<BookMeta>) => {
        controller: ActionController;
        action: BookLoadAction<BookMeta>;
    };
    preLoadImageList: (srcList: string[] | undefined) => Promise<void>;
    scraiping: <BookMeta_1 extends {
        title: string;
        url: string;
    }>({ pageList, bookList, addController, bookmarker, viewerDom, }: {
        bookList: BookMeta_1[] | undefined;
        pageList: (string | (string[] | Node[]) | ((doc: Document) => string[] | Node[]) | ((doc: Document) => Promise<string[] | Node[]>)) | {
            loadDom?: ((arg: {
                url: string;
            }) => Promise<Document>) | undefined;
            parseDom: string | (string[] | Node[]) | ((doc: Document) => string[] | Node[]) | ((doc: Document) => Promise<string[] | Node[]>);
            postParse?: ((arg: {
                pageList: string[];
                dom: Document;
                book: {
                    url: string;
                };
            }) => Promise<void>) | undefined;
        } | {
            loadBookPageList: (arg: {
                url: string;
            }) => Promise<string[]>;
        };
        addController?: ((div: HTMLElement) => void) | undefined;
        bookmarker?: import("./scraping/Storage").Storage<import("./scraping/Bookmark").Bookmark> | undefined;
        viewerDom?: HTMLElement | undefined;
    }) => Promise<{
        controller: ActionController;
        action?: undefined;
    } | {
        controller: ActionController;
        action: BookLoadAction<BookMeta_1>;
    } | undefined>;
    infinityScroll: typeof infinityScroll;
    query: (<T extends Node>(selector: `/${string}`, contextNode?: Node | undefined) => T[]) & (<T_1 extends Element>(selector: string, contextNode?: ParentNode | undefined) => T_1[]) & {
        context: (contextNode: Node | ParentNode) => (selector: string) => Node[];
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map