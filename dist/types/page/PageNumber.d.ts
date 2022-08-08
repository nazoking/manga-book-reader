/** page number.
 *
 * if number is -1, right page is blank, and left page is first page.
 * If the value is an object, `last: 0` makes the left page 0 page. */
export declare type PageNumber = number | {
    last: number;
};
export declare namespace PageNumber {
    const of: (page: PageNumber, length: number) => number;
    const inRange: (page: PageNumber, length: number) => number;
}
//# sourceMappingURL=PageNumber.d.ts.map