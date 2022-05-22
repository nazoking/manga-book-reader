import { Point } from "../drag/Point";
import { DragGesture } from "../drag/DragHandler";
import { Direction } from "../drag/Direction";
import { PanZoomEvent } from "../drag/PanZoomEvent";
import { PinchEvent } from "../drag/PinchEvent";
import { ZoomEvent } from "../drag/ZoomEvent";
import { DrawEvent } from "../drag/DrawEvent";
import { EventHandler } from "./EventHandler";
import { EventCache } from "./EventCache";


export class DragHandler {
  private evCache: EventCache;
  private dragging: DragGesture | undefined;
  private handlers: Array<any> = [
    ["pointerdown", (e: PointerEvent) => this.onPointerDown(e)],
    ["pointermove", (e: PointerEvent) => this.onPointerMove(e)],
    ["pointerup", (e: PointerEvent) => this.onPointerUp(e)],
    ["pointercancel", (e: PointerEvent) => this.onPointerUp(e)],
    ["pointerout", (e: PointerEvent) => this.onPointerUp(e)],
    ["pointerleave", (e: PointerEvent) => this.onPointerUp(e)],
    ["wheel", (e: WheelEvent) => this.onWheel(e)],
  ];
  constructor(
    private handler:{
      onPinch: EventHandler<PanZoomEvent>,
      onDraw: EventHandler<DrawEvent>,
    },
  ) {
    this.evCache = new EventCache();
  }
  attach(el: HTMLElement) {
    this.handlers.forEach(([type, handler]) => el.addEventListener(type, handler)
    );
  }
  detach(el: HTMLElement) {
    this.handlers.forEach(([type, handler]) => el.removeEventListener(type, handler)
    );
  }

  onPointerDown(ev: PointerEvent) {
    this.evCache.put(ev);
    if (this.evCache.size == 2) {
      const e = this.evCache.values();
      this.handler.onPinch(new PinchEvent("pinchstart", e[0], e[1]));
    }
    if (this.evCache.size == 1) {
      if (this.dragging === undefined) {
        this.dragging = { ev, gestures: [] };
      }
    } else {
      this.dragging = undefined;
    }
  }

  onPointerMove(ev: PointerEvent) {
    this.evCache.update(ev);
    if (this.evCache.size == 2) {
      const e = this.evCache.values();
      this.handler.onPinch(new PinchEvent("pinchmove", e[0], e[1]));
    }
    if (this.dragging?.ev.pointerId === ev.pointerId) {
      let direction: Direction | null = null;
      if (Math.abs(this.dragging.ev.clientX - ev.clientX) > 16) {
        direction = this.dragging.ev.clientX > ev.clientX ? "right" : "left";
      } else if (Math.abs(this.dragging.ev.clientY - ev.clientY) > 16) {
        direction = this.dragging.ev.clientY > ev.clientY ? "up" : "down";
      }
      if (this.dragging.lastDirection === direction) {
        this.dragging.ev = ev;
      } else if (direction) {
        this.dragging.lastDirection = direction;
        this.dragging.gestures.push(direction);
        this.dragging.ev = ev;
      }
    }
  }

  onPointerUp(ev: PointerEvent) {
    const up = this.evCache.delete(ev);
    if (this.evCache.size == 1 && up) {
      const e = this.evCache.values();
      this.handler.onPinch(new PinchEvent("pinchend", e[0], up));
    }
    if (this.dragging?.ev.pointerId === ev.pointerId) {
      if (this.dragging.gestures.length) {
        this.handler.onDraw(new DrawEvent(this.dragging.gestures));
      }
      this.dragging = undefined;
    }
  }
  onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey) {
      this.handler.onPinch(new ZoomEvent('pinchstart', new Point(e.clientX, e.clientY), 100));
      this.handler.onPinch(new ZoomEvent('pinchend', new Point(e.clientX, e.clientY), 100 - e.deltaY));
    } else {
      this.handler.onPinch(new ZoomEvent('pinchstart',
        new Point(e.clientX, e.clientY), 1));
      this.handler.onPinch(new ZoomEvent('pinchend',
        new Point(e.clientX + e.deltaX, e.clientY + e.deltaY), 1));
    }
  }
}
