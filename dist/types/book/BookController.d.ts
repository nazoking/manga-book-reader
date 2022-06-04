import { SpreadPages } from "../page/SpreadPages";
import { PageNumber } from "../page/PageNumber";
/** State of Book selector */
export interface BookController<T> {
    /** Returns the state of being moved to the specified book. num is the relative page position. Pass -1 if you want to move to the previous page. */
    move(num: number): BookController<T>;
    /** True if you can move to the specified book. num is the relative page position. -1 on the previous page. */
    canMove(num: number): boolean;
    /** Returns the state of being moved to the specified book. num is the absolute page position. */
    goTo(num: number): BookController<T>;
    /** This information selected */
    getBookMeta(): T;
    /** Get the specified page state */
    getSpreadPages(num: PageNumber): Promise<SpreadPages>;
}
//# sourceMappingURL=BookController.d.ts.map