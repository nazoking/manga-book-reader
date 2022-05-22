import { PanZoomEvent } from "../drag/PanZoomEvent";
import { DrawEvent } from "../drag/DrawEvent";
import { EventHandler } from "./EventHandler";
export declare class DragHandler {
    private handler;
    private evCache;
    private dragging;
    private handlers;
    constructor(handler: {
        onPinch: EventHandler<PanZoomEvent>;
        onDraw: EventHandler<DrawEvent>;
    });
    attach(el: HTMLElement): void;
    detach(el: HTMLElement): void;
    onPointerDown(ev: PointerEvent): void;
    onPointerMove(ev: PointerEvent): void;
    onPointerUp(ev: PointerEvent): void;
    onWheel(e: WheelEvent): void;
}
//# sourceMappingURL=DragHandler.d.ts.map