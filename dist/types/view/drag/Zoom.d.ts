import { Point } from "./Point";
export declare class Zoom {
    content: {
        setTransform(transform: DOMMatrixReadOnly): void;
    };
    private transform;
    private ticking;
    private transformer?;
    constructor(content: {
        setTransform(transform: DOMMatrixReadOnly): void;
    });
    reset(): void;
    onPinch(ev: {
        type: string;
        center: Point;
        distance: number;
    }): void;
    private requestElementUpdate;
    private updateElement;
}
//# sourceMappingURL=Zoom.d.ts.map