import { PageData } from "./PageData";
/** ページの取得状態 */
export interface SpreadPages {
    /** 次のページに移動できれば true */
    hasNext(): Promise<boolean>;
    /** 次のページに移動した状態 */
    nextPage(): Promise<SpreadPages>;
    /** 前のページに移動した状態 */
    prevPage(): Promise<SpreadPages>;
    /** 前のページに移動できれば true */
    hasPrev(): Promise<boolean>;
    move(num: number): Promise<SpreadPages>;
    pageNumber(): number;
    canMove(num: number): Promise<boolean>;
    /** 左ページ */
    image1(): Promise<PageData | null> | null;
    /** 右ページ */
    image2(): Promise<PageData | null> | null;
    /** 単ページなら true */
    isSingleUnit(): Promise<boolean>;
}
//# sourceMappingURL=SpreadPages.d.ts.map