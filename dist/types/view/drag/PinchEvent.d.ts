import { Point } from "./Point";
import { PanZoomEvent } from "./PanZoomEvent";
export declare class PinchEvent implements PanZoomEvent {
    readonly type: string;
    private readonly ev1;
    private readonly ev2;
    readonly center: Point;
    constructor(type: string, ev1: PointerEvent, ev2: PointerEvent);
    get distance(): number;
}
//# sourceMappingURL=PinchEvent.d.ts.map