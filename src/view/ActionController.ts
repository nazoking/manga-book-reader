import { PageNumber } from "../page/PageNumber";
import { KeyEvent } from "./event/KeyEvent";
import { SpreadPages } from "../page/SpreadPages";
import { Viewer } from "./Viewer";
import { Action } from "./Action";

export class ActionController {
  private currentRequest = 0;
  private actionStateRevision = 0;
  private state: "loading" | "ready" | "failed" = "ready";
  private pendingPage?: Promise<SpreadPages>;
  private pendingRetry?: () => SpreadPages | Promise<SpreadPages>;
  private navigationGeneration = 0;
  private pageSource?: (
    page: PageNumber,
    reload: boolean
  ) => Promise<SpreadPages>;
  private reloadPage?: (page: PageNumber) => Promise<SpreadPages>;
  private retryCurrent: () => void = () => {};

  private get canTurnPages() {
    return this.state !== "failed";
  }
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
    const page = (
      move: (current: SpreadPages) => Promise<SpreadPages>,
      enabled: () => Promise<boolean> = async () => true
    ): Action =>
      Action.wrap({
        action: () => c.moveCurrent(move),
        isEnable: async () =>
          c.canTurnPages && (c.state === "loading" || (await enabled())),
      });
    const orBook = (page: string, book: string) =>
      Action.wrap({
        action: () => {
          // Preserve explicitly replaced page actions in composite shortcuts.
          if (c.actions[page] !== defaults[page]) {
            c.actions[page].or(c.actions[book]).action();
            return;
          }
          if (c.state === "failed") {
            c.actions[book]?.action();
            return;
          }
          c.moveCurrent(async (current, isCurrent) => {
            const forward = page === "nextPage";
            const available =
              page === "firstPage"
                ? current.pageNumber() !== -1
                : await (forward ? current.hasNext() : current.hasPrev());
            if (!isCurrent()) return current;
            if (available) {
              return page === "firstPage"
                ? current.move(-1 - current.pageNumber())
                : forward
                ? current.nextPage()
                : current.prevPage();
            }
            await c.actions[book]?.action();
            return current;
          });
        },
        isEnable: async () =>
          c.state === "loading" ||
          (await c.actions[page].or(c.actions[book]).isEnable()),
      });
    const defaults: Record<string, Action.Able> = {
      nextPage: page(
        async (current) =>
          (await current.hasNext()) ? current.nextPage() : current,
        () => c.current.hasNext()
      ),
      prevPage: page(
        async (current) =>
          (await current.hasPrev()) ? current.prevPage() : current,
        () => c.current.hasPrev()
      ),
      nextHalf: page((current) => current.move(1)),
      prevHalf: page((current) => current.move(-1)),
      fullscreen: {
        action: () => (c.view.fullScreen = true),
        isEnable: async () => !c.view.fullScreen,
      },
      exitFullscreen: () => (c.view.fullScreen = false),
      toggleFullscreen: () =>
        c.doAction(c.view.fullScreen ? "exitFullscreen" : "fullscreen"),
      nextPageOrBook: orBook("nextPage", "nextBook"),
      prevPageOrBook: orBook("prevPage", "prevBookLast"),
      firstPage: page(
        (current) => current.move(-1 - current.pageNumber()),
        async () => c.current.pageNumber() !== -1
      ),
      firstPageOrPrevBook: orBook("firstPage", "prevBook"),
      zoomReset: () => c.view.zoomReset(),
    };
    return defaults;
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
    view.onRetry.add((reason) => {
      if (reason === "data" && this.reloadPage) {
        ++this.navigationGeneration;
        const pageNumber = this.current.pageNumber();
        const reload = this.reloadPage;
        const retry = () => reload(pageNumber);
        void this.load(retry);
      } else if (reason === "data") {
        this.retryCurrent();
      } else {
        void this.setCurrent(this.current);
      }
    });
    void this.setCurrent(Promise.resolve(current));
  }
  private moveCurrent(
    move: (
      current: SpreadPages,
      isCurrent: () => boolean
    ) => Promise<SpreadPages>
  ) {
    if (!this.canTurnPages) return;
    const current = this.current;
    const source = this.pendingPage ?? Promise.resolve(current);
    const sourceRetry = this.pendingRetry ?? (() => current);
    const generation = this.navigationGeneration;
    const retry = () => {
      const retryGeneration = this.navigationGeneration;
      return Promise.resolve(sourceRetry()).then((current) =>
        move(current, () => retryGeneration === this.navigationGeneration)
      );
    };
    const load = () =>
      source.then((current) => {
        // A new source (chapter selection or retry) discards queued navigation.
        if (generation !== this.navigationGeneration) return current;
        return move(current, () => generation === this.navigationGeneration);
      });
    void this.load(load, retry);
  }
  private moveToPage(pageNumber: number) {
    if (this.pageSource) {
      void this.open(this.pageSource, pageNumber);
      return;
    }
    this.moveCurrent((current) =>
      current.move(pageNumber - current.pageNumber())
    );
  }

  addActions(actions: { [key: string]: Action.Able }) {
    Object.entries(actions).forEach(([name, action]) =>
      this.addAction(name, action)
    );
  }
  addAction(name: string, action: Action.Able) {
    this.actions[name] = Action.wrap(action);
  }
  getAction(action: string | Action.Able): Action {
    return Action.wrap(
      typeof action === "string" ? this.actions[action] : action
    );
  }
  doAction(action: string | Action.Able): void {
    this.getAction(action).action();
  }
  /** Select a page source. A retry requests fresh data at the current position. */
  open(
    source: (page: PageNumber, reload: boolean) => Promise<SpreadPages>,
    pageNumber: PageNumber
  ) {
    ++this.navigationGeneration;
    this.pageSource = source;
    this.reloadPage = (page) => source(page, true);
    return this.load(
      () => source(pageNumber, false),
      () => source(pageNumber, true)
    );
  }

  setCurrent(
    page:
      | SpreadPages
      | Promise<SpreadPages>
      | (() => SpreadPages | Promise<SpreadPages>)
  ) {
    ++this.navigationGeneration;
    return this.load(typeof page === "function" ? page : () => page);
  }

  private async load(
    load: () => SpreadPages | Promise<SpreadPages>,
    retry = load
  ) {
    const request = ++this.currentRequest;
    this.view.invalidatePendingRender();
    this.view.clearLoadError();
    this.retryCurrent = () => {
      ++this.navigationGeneration;
      void this.load(retry);
    };
    this.setState("loading");
    let current: SpreadPages;
    try {
      const result = load();
      this.pendingPage = Promise.resolve(result);
      this.pendingRetry = retry;
      // Apply immediate pages before a subsequent request can supersede them.
      current = "then" in result ? await result : result;
      if (request !== this.currentRequest) return;
      this.pendingPage = undefined;
      this.pendingRetry = undefined;
      this.current = current;
      this.setState("ready");
      await this.view.setCurrent(current);
    } catch (error) {
      if (request === this.currentRequest) {
        this.pendingPage = undefined;
        this.pendingRetry = undefined;
        this.setState("failed");
        this.view.showLoadError(this.retryCurrent);
      }
      return;
    }
    if (request !== this.currentRequest) return;
    this.setState("ready");
  }

  dispose() {
    ++this.navigationGeneration;
    ++this.currentRequest;
    ++this.actionStateRevision;
    this.view.dispose();
  }
  private setState(state: "loading" | "ready" | "failed") {
    this.state = state;
    this.view.setRangeDisabled(state === "failed");
    this.updateActionStates();
  }

  private updateActionStates() {
    const revision = ++this.actionStateRevision;
    Object.entries(this.clicks).forEach(async ([selector, a]) => {
      const action = this.getAction(a);
      const elements = this.view.root.querySelectorAll(selector);
      if (elements.length) {
        const disabled = !(await action.isEnable());
        if (revision !== this.actionStateRevision) {
          return;
        }
        Array.from(elements).forEach((elem) => {
          elem.classList.toggle("disabled", disabled);
        });
      }
    });
  }
}
