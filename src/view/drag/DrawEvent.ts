import { Direction } from "./Direction";

export class DrawEvent {
  constructor(public gestures: Array<Direction>) {}
}
