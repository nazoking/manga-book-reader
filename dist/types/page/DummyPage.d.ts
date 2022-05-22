import { SpreadPages } from "./SpreadPages";
export declare class DummyPage implements SpreadPages {
    hasNext(): Promise<boolean>;
    nextPage(): Promise<this>;
    prevPage(): Promise<this>;
    move(): Promise<this>;
    pageNumber(): number;
    canMove(): Promise<boolean>;
    hasPrev(): Promise<boolean>;
    image1(): null;
    image2(): null;
    isSingleUnit(): Promise<boolean>;
}
//# sourceMappingURL=DummyPage.d.ts.map