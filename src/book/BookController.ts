import { SpreadPages } from "../page/SpreadPages";
import { PageNumber } from "../page/PageNumber";

/** 本の選択状態 */
export interface BookController<T> {
  /** 指定の本に移動した状態を返す。num は相対ページ位置。前のページなら -1。 */
  move(num: number): BookController<T>;
  /** 指定の本に移動できれば true num。 は相対ページ位置。前のページなら -1。*/
  canMove(num: number): boolean;
  /** 指定の本に移動した状態を返す。num は絶対ページ位置。 */
  goTo(num: number): BookController<T>;
  /** 選択中の本情報 */
  getBookMeta(): T;
  /** 指定のページ状態を取得 */
  getSpreadPages(num: PageNumber): Promise<SpreadPages>;
}
