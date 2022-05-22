import { EventHandler } from "./EventHandler";

export class EventEmitter<T> {
  constructor(private handlers: EventHandler<T>[] = []) { }
  trigger(action: T | null | undefined): boolean | void {
    if (action) {
      let ret: boolean | void = false;
      this.handlers.forEach((h) => (ret ||= h(action)));
      return ret;
    }
  }
  add(handler: EventHandler<T>) {
    this.handlers.push(handler);
  }
  remove(handler: EventHandler<T>) {
    const i = this.handlers.indexOf(handler);
    if (i >= 0) {
      this.handlers.splice(i, 1);
    }
  }
}
