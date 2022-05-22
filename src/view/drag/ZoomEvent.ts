import { Point } from "./Point";
import { PanZoomEvent } from "./PanZoomEvent";

export class ZoomEvent implements PanZoomEvent {
  constructor(
    public readonly type: string,
    public readonly center: Point,
    public readonly distance: number
  ) { }
}
