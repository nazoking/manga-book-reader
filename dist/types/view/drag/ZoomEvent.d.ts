import { Point } from "./Point";
import { PanZoomEvent } from "./PanZoomEvent";
export declare class ZoomEvent implements PanZoomEvent {
    readonly type: string;
    readonly center: Point;
    readonly distance: number;
    constructor(type: string, center: Point, distance: number);
}
//# sourceMappingURL=ZoomEvent.d.ts.map