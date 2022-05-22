export class KeyEvent {
  /** "shift+" "meta+" "ctrl+" "alt+" KeyboardEvent.code */
  string: string;
  constructor(event: KeyboardEvent) {
    this.string =
      (event.shiftKey ? "shift+" : "") +
      (event.metaKey ? "meta+" : "") +
      (event.ctrlKey ? "ctrl+" : "") +
      (event.altKey ? "alt+" : "") +
      event.code;
  }
}
