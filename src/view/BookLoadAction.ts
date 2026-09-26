import { PageNumber } from "../page/PageNumber";
import { Action } from "./Action";

/** The selected chapter index is the only navigation state. */
export class BookLoadAction {
  private currentIndex = 0;

  constructor(
    private readonly count: number,
    private readonly select: (index: number, page: PageNumber) => void
  ) {}

  get index() {
    return this.currentIndex;
  }

  move(index: number, page: PageNumber = -1): void {
    if (!this.count) return;
    this.currentIndex = Math.min(
      Math.max(Math.trunc(index), 0),
      this.count - 1
    );
    this.select(this.currentIndex, page);
  }

  actions(): Record<string, Action.Able> {
    const step = (offset: number, page: PageNumber = -1): Action.Seed => ({
      action: () => this.move(this.index + offset, page),
      isEnable: async () =>
        this.index + offset >= 0 && this.index + offset < this.count,
    });
    return {
      nextBook: step(1),
      prevBook: step(-1),
      prevBookLast: step(-1, { last: -1 }),
    };
  }
}
