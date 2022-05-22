export interface InfinityScroll {
    /** ナビゲーションの位置。xpath か css-selector */
    nav: string;
    /** ナビゲーションから次ページ a タグの位置。xpath か css-selector */
    next: string;
    /** 次ページ dom から コンテンツエリアの位置。xpath か css-selector */
    contents: string;
    /** つぎ足す前にコンテンツに何かする場合 */
    onLoad?: (document: DocumentFragment) => void;
}
export declare function appendNextPage(url: string, nav: HTMLElement, config: InfinityScroll): Promise<void>;
export declare function infinityScroll(config: InfinityScroll): void;
//# sourceMappingURL=infinityScroll.d.ts.map