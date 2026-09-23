import { KeyEvent } from "./event/KeyEvent";
import { SpreadPages } from "../page/SpreadPages";
import { Viewer } from "./Viewer";
import { Action } from "./Action";

export class ActionController {
  private currentRequest = 0;
  private actionStateRevision = 0;
  private isLoading = false;
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
    up: "toggleFullscreen",
    left: "nextPageOrBook",
    right: "prevPageOrBook",
    "left-right": "nextHalf",
    "right-left": "prevHalf",
    "left-up": "nextBook",
    "left-down": "prevBook",
    down: "zoomReset",
  };
  private static defaultActions(c: ActionController): {
    [key: string]: Action.Able;
  } {
    return {
      nextPage: {
        action: () => c.moveCurrent((current) => current.nextPage()),
        isEnable: async () => !c.isLoading && (await c.current.hasNext()),
      },
      prevPage: {
        action: () => c.moveCurrent((current) => current.prevPage()),
        isEnable: async () => !c.isLoading && (await c.current.hasPrev()),
      },
      nextHalf: {
        action: () => c.moveCurrent((current) => current.move(+1)),
        isEnable: async () => !c.isLoading,
      },
      prevHalf: {
        action: () => c.moveCurrent((current) => current.move(-1)),
        isEnable: async () => !c.isLoading,
      },
      fullscreen: {
        action: () => (c.view.fullScreen = true),
        isEnable: async () => !c.view.fullScreen,
      },
      exitFullscreen: () => (c.view.fullScreen = false),
      toggleFullscreen: () =>
        c.doAction(c.view.fullScreen ? "exitFullscreen" : "fullscreen"),
      nextPageOrBook: Action.lazy(() =>
        c.isLoading
          ? Action.NOP
          : Action.wrap(c.actions["nextPage"]).or(c.actions["nextBook"])
      ),
      prevPageOrBook: Action.lazy(() =>
        c.isLoading
          ? Action.NOP
          : Action.wrap(c.actions["prevPage"]).or(c.actions["prevBookLast"])
      ),
      firstPage: {
        action: () => c.moveToPage(-1),
        isEnable: async () => !c.isLoading && c.current.pageNumber() != -1,
      },
      firstPageOrPrevBook: Action.lazy(() =>
        c.isLoading
          ? Action.NOP
          : Action.wrap(c.actions["firstPage"]).or(c.actions["prevBook"])
      ),
      zoomReset: () => c.view.zoomReset(),
    };
  }

  constructor(
    public readonly view: Viewer,
    public current: SpreadPages,
    actions?: { [key: string]: Action.Able },
    defaultActions?: (this: ActionController) => { [key: string]: Action.Able }
  ) {
    this.addActions(
      (defaultActions || ActionController.defaultActions).call(null, this)
    );
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
    });
    view.setRangeHandler((pageNumber) => this.moveToPage(pageNumber));
    if (actions) {
      this.addActions(actions);
    }
    this.setCurrent(Promise.resolve(current));
  }
  private moveCurrent(
    move: (current: SpreadPages) => Promise<SpreadPages>
  ) {
    if (this.isLoading) return;
    this.setCurrent(move(this.current));
  }
  private moveToPage(pageNumber: number) {
    if (this.isLoading) return;
    this.setCurrent(this.current.move(pageNumber - this.current.pageNumber()));
  }
  addActions(actions: { [key: string]: Action.Able }) {
    Object.entries(actions).forEach(([name, action]) =>
      this.addAction(name, action)
    );
  }
  addAction(name: string, action: Action.Able) {
    this.actions[name] = Action.wrap(action);
  }
  getAction(action: string | Action.Able): Action | undefined {
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
  async setCurrent(page: SpreadPages | Promise<SpreadPages>) {
    const request = ++this.currentRequest;
    this.view.invalidatePendingRender();
    this.isLoading = "then" in page;
    this.view.setRangeDisabled(this.isLoading);
    if (this.isLoading) this.updateActionStates(request);
    let current: SpreadPages;
    try {
      current = "then" in page ? await page : page;
    } catch (error) {
      if (request === this.currentRequest) {
        this.isLoading = false;
        this.view.setRangeDisabled(false);
        this.updateActionStates(request);
      }
      throw error;
    }
    if (request !== this.currentRequest) return;
    this.isLoading = false;
    this.view.setRangeDisabled(false);
    this.current = current;
    this.view.setCurrent(this.current);
    this.updateActionStates(request);
  }
  private updateActionStates(request: number) {
    const revision = ++this.actionStateRevision;
    Object.entries(this.clicks).forEach(async ([selector, a]) => {
      const action = this.getAction(a);
      const elements = this.view.root.querySelectorAll(selector);
      if (elements.length) {
        const disabled = action ? !(await action.isEnable()) : true;
        if (
          request !== this.currentRequest ||
          revision !== this.actionStateRevision
        ) {
          return;
        }
        Array.from(elements).forEach((elem) => {
          elem.classList.toggle("disabled", disabled);
        });
      }
    });
  }
}
