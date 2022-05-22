import { Direction } from "./Direction";
export interface DragGesture {
    ev: PointerEvent;
    lastDirection?: Direction;
    gestures: Array<Direction>;
}
//# sourceMappingURL=DragHandler.d.ts.map