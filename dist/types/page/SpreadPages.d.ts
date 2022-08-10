import { PageData } from "./PageData";
/** Page acquisition status */
export interface SpreadPages {
    /** True if you can move to the next page */
    hasNext(): Promise<boolean>;
    /** Returns the state of moving to the next page. */
    nextPage(): Promise<SpreadPages>;
    /** Returns the state of moving to the previous page. */
    prevPage(): Promise<SpreadPages>;
    /** True if you can move to the previous page */
    hasPrev(): Promise<boolean>;
    move(num: number): Promise<SpreadPages>;
    pageNumber(): number;
    canMove(num: number): Promise<boolean>;
    /** right page */
    image1(): Promise<PageData | null> | null;
    /** left page */
    image2(): Promise<PageData | null> | null;
    /** True in double-page spread mode. */
    isSingleUnit(): Promise<boolean>;
    pageMax?: number;
}
//# sourceMappingURL=SpreadPages.d.ts.map