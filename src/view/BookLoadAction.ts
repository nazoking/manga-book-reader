import { PageNumber } from "../page/PageNumber";
import { Action } from "./Action";
import { BookController } from "../book/BookController";

export class BookLoadAction<T> {
  constructor(
    private bookController: BookController<T>,
    public setHandler: (bc: BookController<T>, page: PageNumber) => void
  ) {
  }
  actions(): { [key: string]: Action.Able; } {
    return {
      nextBook: {
        action: () => {
          this.move(this.bookController.move(+1), -1);
        },
        isEnable: async () => this.bookController.canMove(+1),
      },
      prevBook: {
        action: () => {
          this.move(this.bookController.move(-1), -1);
        },
        isEnable: async () => this.bookController.canMove(-1),
      },
      prevBookLast: {
        action: () => {
          this.move(this.bookController.move(-1), { last: -1 });
        },
        isEnable: async () => this.bookController.canMove(-1),
      },
    };
  }
  move(bookNumber: number | BookController<T>, pageNumber: PageNumber) {
    if (typeof bookNumber == 'number') {
      bookNumber = this.bookController.goTo(bookNumber);
    }
    this.bookController = bookNumber;
    this.setHandler(this.bookController, pageNumber);
  }
  getBookController(){
    return this.bookController;
  }
}
