export interface InfinityScroll {
    /** navigation. xpath or css-selector */
    nav: string;
    /** A tag that indicate next page. position from navigation element. xpath or css-selector */
    next: string;
    /** contents area from next page dom. xpath or css-selector */
    contents: string;
    /** event handler on load next page dom. you can modified next page dom */
    onLoad?: (document: DocumentFragment) => void;
}
export declare function appendNextPage(url: string, nav: HTMLElement, config: InfinityScroll): Promise<void>;
export declare function infinityScroll(config: InfinityScroll): void;
//# sourceMappingURL=infinityScroll.d.ts.map