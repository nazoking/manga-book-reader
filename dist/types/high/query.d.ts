declare type Query = ((<T extends Node>(selector: XPath, contextNode?: Node) => Array<T>) & (<T extends Element>(selector: string, contextNode?: ParentNode) => Array<T>)) & {
    context: (contextNode: Node | ParentNode) => (selector: string) => Node[];
};
declare type XPath = `/${string}`;
export declare const query: Query;
export {};
//# sourceMappingURL=query.d.ts.map