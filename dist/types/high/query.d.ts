declare type Query = ((<T extends Node>(selector: `/${string}`, contextNode?: Node) => Array<T>) & (<T extends Element>(selector: string, contextNode?: ParentNode) => Array<T>)) & {
    context: (contextNode: Node | ParentNode) => (selector: string) => Node[];
};
export declare const query: Query;
export {};
//# sourceMappingURL=query.d.ts.map