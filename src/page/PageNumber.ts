/** page number.
 * 
 * if number is -1, right page is blank, and left page is first page.
 * If the value is an object, `last: 0` makes the left page 0 page. */
export type PageNumber = number | { last: number; };
export module PageNumber{
  export const of = (page: PageNumber, length: number): number =>
    (typeof page == 'object') ? (length - page.last - 2) : page;
  export const inRange = (page: PageNumber, length: number): number =>
    Math.min(Math.max(of(page, length), -1), length - 1);
}