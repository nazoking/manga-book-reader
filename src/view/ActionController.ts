import { KeyEvent } from "./event/KeyEvent";
import { SpreadPages } from "../page/SpreadPages";
import { Viewer } from "./Viewer";
import { Action } from "./Action";

export class ActionController {
  readonly keys: { [key: string]: string | Action.Seed } = {
    ArrowDown: "nextPageOrBook",
    Space: "nextPageOrBook",
    ArrowUp: "prevPageOrBook",
    "shift+Space": "prevPageOrBook",
    ArrowLeft: "nextHalf",
    ArrowRight: "prevHalf",
    Enter: "toggleFullscreen",
    Period: "nextBook",
    Comma: "prevBook",
  };
  readonly clicks: { [key: string]: string | Action.Seed } = {
    ".right-button": "prevPageOrBook",
    ".fullscreen": "toggleFullscreen",
    ".pages": "nextPageOrBook",
    ".nextBook": "nextBook",
    ".prevBook": "prevBook",
    ".nextPage": "nextPage",
    ".prevPage": "prevPage",
    ".nextHalf": "nextHalf",
    ".prevHalf": "prevHalf",
  };
  readonly actions: { [key: string]: Action } = {};
  readonly draws: { [key: string]: string | Action.Seed } = {
    "up": "toggleFullscreen",
    "left": "nextPageOrBook",
    "right": "prevPageOrBook",
    "left-right": "nextHalf",
    "right-left": "prevHalf",
    "left-up": "nextBook",
    "left-down": "prevBook",
    "down": "zoomReset",
  };
  private static defaultActions(c: ActionController):{ [key: string]: Action.Able }{
    return {
      nextPage: {
        action: () => c.setCurrent(c.current.nextPage()),
        isEnable: () => c.current.hasNext(),
      },
      prevPage: {
        action: () => c.setCurrent(c.current.prevPage()),
        isEnable: () => c.current.hasPrev(),
      },
      nextHalf: () => c.setCurrent(c.current.move(+1)),
      prevHalf: () => c.setCurrent(c.current.move(-1)),
      fullscreen: {
        action:() => c.view.fullScreen = true,
        isEnable: async () => !c.view.fullScreen,
      },
      exitFullscreen: () => c.view.fullScreen = false,
      toggleFullscreen: () => c.doAction(c.view.fullScreen ? "exitFullscreen" : "fullscreen"),
      nextPageOrBook: Action.lazy(() => Action.wrap(c.actions['nextPage']).or(c.actions['nextBook'])),
      prevPageOrBook: Action.lazy(() => Action.wrap(c.actions['prevPage']).or(c.actions['prevBookLast'])),
      firstPage: {
        action: () => c.current.move(-1),
        isEnable: async () => c.current.pageNumber() != -1,
      },
      firstPageOrPrevBook: Action.lazy(() => Action.wrap(c.actions['firstPage']).or(c.actions['prevBook'])),
      zoomReset: () => c.view.zoomReset()
    };
  }

  constructor(
    public readonly view: Viewer,
    public current: SpreadPages,
    actions?: { [key: string]: Action.Able },
    defaultActions?: (this:ActionController) => { [key: string]: Action.Able },
  ) {
    this.addActions((defaultActions || ActionController.defaultActions).call(null, this));
    view.setClickHandler((element: Element) => {
      const key = Object.keys(this.clicks).find((selector) =>
        element.matches(selector)
      );
      if (key) {
        this.doAction(this.clicks[key]);
        return true;
      }
    });
    view.setKeyHandler((key: KeyEvent) => {
      if (this.keys[key.string]) {
        this.doAction(this.keys[key.string]);
        return true;
      }
    });
    view.setDrawHandler((key: string) => {
      if (this.draws[key]) {
        this.doAction(this.draws[key]);
        return true;
      }
    })
    if(actions){
      this.addActions(actions);
    }
    this.setCurrent(Promise.resolve(current));
  }
  addActions(actions: {[key: string]: Action.Able}){
    Object.entries(actions).forEach(([name, action]) => this.addAction(name, action));
  }
  addAction(name:string, action: Action.Able){
    this.actions[name] = Action.wrap(action);
  }
  getAction(
    action: string | Action.Able
  ): Action | undefined {
    if (action) {
      if (typeof action == "string") {
        return this.getAction(this.actions[action]);
      }
      return Action.wrap(action);
    }
  }
  doAction(action: string | Action.Able): void {
    const a = this.getAction(action);
    if (a) {
      a.action();
    } else {
      if (typeof a == "string") {
        console.log(`📖unknown action ${action}`);
      }
    }
  }
  async setCurrent(page: Promise<SpreadPages>) {
    this.current = await page;
    this.view.setCurrent(this.current);
    Object.entries(this.clicks).forEach(async ([selector, a]) => {
      const action = this.getAction(a);
      const elements = this.view.root.querySelectorAll(selector);
      if (elements.length) {
        const disabled = action ? !(await action.isEnable()) : true;
        Array.from(elements).forEach((elem) => {
          elem.classList.toggle("disabled", disabled);
        });
      }
    });
  }
}
