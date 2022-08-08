import { Book } from "../book/Book";
import { PageNumber } from "../page/PageNumber";
import { BookController } from "../book/BookController";
import { BookLoadAction } from "../view/BookLoadAction";
import { ActionController } from "../view/ActionController";
import { SpreadPages } from "../page/SpreadPages";
import { EventEmitter as Emitter } from "../view/event/Emitter";
declare type BookSelectorEvent<BookMeta> = {
    controller: BookController<BookMeta>;
    bookIndex: number;
};
declare type BookSelectorSeed<BookMeta> = {
    bookList: Array<BookMeta>;
    action: BookLoadAction<BookMeta>;
    onBookChanged: Emitter<BookSelectorEvent<BookMeta>>;
};
export interface MultiBook<BookMeta> {
    readonly bookList: Array<BookMeta>;
    readonly getBook: (book: BookMeta, index: number, array: Array<BookMeta>) => Promise<Book>;
    readonly getName?: (book: BookMeta, index: number, array: Array<BookMeta>) => string;
    readonly onBookChanged?: (arg: {
        page: PageNumber;
        book: BookMeta;
    }) => void;
    readonly onPageChanged?: (arg: {
        page: number;
        book: BookMeta;
    }) => void;
    readonly dummyPage?: SpreadPages;
    readonly getBookSelector?: (g: BookSelectorSeed<BookMeta>) => HTMLElement | string;
    readonly viewerDom?: HTMLElement;
}
export declare const multiBook: <BookMeta>({ bookList, getBook, getName, onBookChanged, onPageChanged, dummyPage, getBookSelector, viewerDom, }: MultiBook<BookMeta>) => {
    controller: ActionController;
    action: BookLoadAction<BookMeta>;
};
export {};
//# sourceMappingURL=multiBook.d.ts.map