/** ページ番号。-1 なら最初のページを左に表示。last なら、最後から lastページ目。 */
export declare type PageNumber = number | {
    last: number;
};
export declare module PageNumber {
    const of: (page: PageNumber, length: number) => number;
    const inRange: (page: PageNumber, length: number) => number;
}
//# sourceMappingURL=PageNumber.d.ts.map