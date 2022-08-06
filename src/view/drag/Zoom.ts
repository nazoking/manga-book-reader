import { Point } from "./Point";

class Transformer {
  constructor(
    private center: Point,
    private distance: number,
    public transform: DOMMatrixReadOnly
  ) {}
  zoom(newCenter: Point, distance: number): DOMMatrixReadOnly {
    const scale = distance / this.distance;
    const a = new DOMMatrixReadOnly()
      .translate(newCenter.x, newCenter.y)
      .scale(scale, scale)
      .translate(-this.center.x, -this.center.y)
      .multiply(this.transform);
    return a.a < 0.5 || a.a > 4 ? this.transform : a;
  }
}

export class Zoom {
  private transform = new DOMMatrixReadOnly();
  private ticking = false;
  private transformer?: Transformer;
  constructor(
    public content: {
      setTransform(transform: DOMMatrixReadOnly): void;
    }
  ) {
    this.content = content;
    this.reset();
  }
  reset() {
    this.transform = new DOMMatrixReadOnly();
    this.requestElementUpdate();
  }
  onPinch(ev: { type: string; center: Point; distance: number }): void {
    if (ev.type == "pinchstart") {
      this.transformer = new Transformer(
        ev.center,
        ev.distance,
        this.transform
      );
    }
    if (this.transformer) {
      this.transform = this.transformer.zoom(ev.center, ev.distance);
      this.requestElementUpdate();
    }
  }

  private requestElementUpdate() {
    if (!this.ticking) {
      window.requestAnimationFrame(() => this.updateElement());
      this.ticking = true;
    }
  }
  private updateElement() {
    this.content.setTransform(this.transform);
    this.ticking = false;
  }
}
