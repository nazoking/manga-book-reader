import { PageData } from "../page/PageData";
import { SpreadPages } from "../page/SpreadPages";
import { PageNumber } from "../page/PageNumber";
export interface Book {
    getSpreadPages(pageA: PageNumber): SpreadPages;
}
export declare const Book: (pages: Promise<PageData>[]) => Book;
//# sourceMappingURL=Book.d.ts.map