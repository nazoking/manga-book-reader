import { Point } from "./Point";


export interface PanZoomEvent {
  type: string;
  center: Point;
  distance: number;
}
