/** ページ番号。-1 なら最初のページを左に表示。last なら、最後から lastページ目。 */
export type PageNumber = number | { last: number; };
export module PageNumber{
  export const of = (page: PageNumber, length: number): number =>
    (typeof page == 'object') ? (length - page.last - 2) : page;
  export const inRange = (page: PageNumber, length: number): number =>
    Math.min(Math.max(of(page, length), -1), length - 1);
}