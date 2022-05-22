import { Point } from "./Point";
import { PanZoomEvent } from "./PanZoomEvent";


export class PinchEvent implements PanZoomEvent {
  public readonly center: Point;
  constructor(
    public readonly type: string,
    private readonly ev1: PointerEvent,
    private readonly ev2: PointerEvent
  ) {
    this.center = new Point(
      (this.ev1.clientX + this.ev2.clientX) / 2,
      (this.ev1.clientY + this.ev2.clientY) / 2
    );
  }
  get distance(): number {
    return Math.sqrt(
      Math.pow(this.ev1.screenX - this.ev2.screenX, 2) +
      Math.pow(this.ev1.screenY - this.ev2.screenY, 2)
    );
  }
}
