import { PageNumber } from "../page/PageNumber";
import { Action } from "./Action";
import { BookController } from "../book/BookController";
export declare class BookLoadAction<T> {
    private bookController;
    setHandler: (bc: BookController<T>, page: PageNumber) => void;
    constructor(bookController: BookController<T>, setHandler: (bc: BookController<T>, page: PageNumber) => void);
    actions(): {
        [key: string]: Action.Able;
    };
    move(bookNumber: number | BookController<T>, pageNumber: PageNumber): void;
    getBookController(): BookController<T>;
}
//# sourceMappingURL=BookLoadAction.d.ts.map