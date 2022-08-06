export class EventCache {
  constructor(private map: Map<number, PointerEvent> = new Map()) {}
  put(ev: PointerEvent): PointerEvent | undefined {
    if (this.map.has(ev.pointerId)) {
      const old = this.map.get(ev.pointerId);
      this.map.set(ev.pointerId, ev);
      return old;
    } else {
      this.map.set(ev.pointerId, ev);
      return undefined;
    }
  }
  update(ev: PointerEvent): PointerEvent | undefined {
    if (this.map.has(ev.pointerId)) {
      const old = this.map.get(ev.pointerId);
      this.map.set(ev.pointerId, ev);
      return old;
    }
  }
  delete(ev: PointerEvent): PointerEvent | undefined {
    if (this.map.has(ev.pointerId)) {
      const old = this.map.get(ev.pointerId);
      this.map.delete(ev.pointerId);
      return old;
    }
  }
  get size() {
    return this.map.size;
  }
  values() {
    return Array.from(this.map.values());
  }
}
