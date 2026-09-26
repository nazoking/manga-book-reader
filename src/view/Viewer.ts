import { PageData } from "../page/PageData";
import { SpreadPages } from "../page/SpreadPages";
import { EventHandler } from "./event/EventHandler";
import { KeyEvent } from "./event/KeyEvent";
import { DragHandler } from "./event/DragHandler";
import { Zoom } from "./drag/Zoom";
import { EventEmitter } from "./event/Emitter";
import { viewerDom } from "../viewerDom";
import { ImageCache } from "../page/ImageCache";
import { CacheOptions } from "../loading/options";

const PageImageType = [
  "loading-image",
  "no-image",
  "broken-image",
  "show-image",
] as const;

export class Viewer {
  readonly rightPage: HTMLElement;
  readonly leftPage: HTMLElement;
  readonly pages: HTMLElement;
  readonly bookTitle: HTMLElement;
  private infoTimer: number | undefined;
  private zoom?: Zoom;
  readonly onChanged: EventEmitter<SpreadPages> =
    new EventEmitter<SpreadPages>();
  readonly onRetry = new EventEmitter<"data" | "image">();
  wrapper: HTMLElement;
  root: ShadowRoot;
  inner: HTMLElement;
  readonly imageCache: ImageCache;
  private readonly ownsImageCache: boolean;
  private readonly eventController = new AbortController();
  private readonly retryButtons = new Map<HTMLElement, HTMLButtonElement>();
  private dragHandler?: DragHandler;
  private renderController?: AbortController;
  constructor(
    div: HTMLElement = viewerDom(),
    options: { loading?: CacheOptions; imageCache?: ImageCache } = {}
  ) {
    this.wrapper = div.ownerDocument.createElement("div");
    this.imageCache = options.imageCache ?? new ImageCache(options.loading);
    this.ownsImageCache = !options.imageCache;
    this.root = this.wrapper.attachShadow({ mode: "closed" });
    this.root.appendChild(div);
    div.tabIndex = 0;
    this.inner = div;
    const elem = (selector: string) => {
      const ret = this.root.querySelector<HTMLElement>(selector);
      if (!ret)
        throw Error(`div has not element "${selector}" ${div.outerHTML}`);
      return ret;
    };
    this.rightPage = elem(".right-page");
    this.leftPage = elem(".left-page");
    this.pages = elem(".pages");
    this.bookTitle = elem(".book-title");
    this.inner.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType == "touch") return;
        this.showControllers();
      },
      { signal: this.eventController.signal }
    );
  }
  /** DrawHandler handles gestures (moving a certain distance while dragging) */
  setDrawHandler(drawHandler: EventHandler<string>) {
    this.zoom = new Zoom({
      setTransform: (t) => {
        this.pages.style.transform = t.toString();
      },
    });
    const drag = new DragHandler({
      onPinch: (p) => {
        this.zoom?.onPinch(p);
      },
      onDraw: (e) => {
        drawHandler(e.gestures.join("-"));
      },
    });
    drag.attach(this.inner);
    this.dragHandler = drag;
  }
  /** Click handlers handle events that occur when you click on an element */
  setClickHandler(clickHandler: EventHandler<Element>) {
    this.inner.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        if (e.target instanceof HTMLInputElement && e.target.type == "range") {
          return;
        }
        e.preventDefault();
        let v = e.target as HTMLElement | null;
        while (v && v != this.inner) {
          if (clickHandler(v)) {
            break;
          }
          if (v.classList.contains("controller")) {
            this.toggleControllers();
            break;
          }
          v = v.parentElement;
        }
      },
      { signal: this.eventController.signal }
    );
  }
  /** Key handlers handle keyboard events */
  setKeyHandler(keyHandler: EventHandler<KeyEvent>) {
    this.inner.addEventListener(
      "keydown",
      (event) => {
        if (
          event.target instanceof HTMLInputElement &&
          event.target.type == "range"
        ) {
          event.stopPropagation();
          return;
        }
        if (keyHandler(new KeyEvent(event))) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { capture: true, signal: this.eventController.signal }
    );
  }
  setRangeHandler(handler: (pageNumber: number) => void) {
    this.inner.querySelectorAll<HTMLInputElement>(".range").forEach((range) => {
      range.addEventListener("change", () => handler(Number(range.value)), {
        signal: this.eventController.signal,
      });
    });
  }
  setRangeDisabled(disabled: boolean) {
    this.inner.querySelectorAll<HTMLInputElement>(".range").forEach((range) => {
      range.disabled = disabled;
    });
  }
  toggleControllers() {
    if (this.inner.classList.contains("show-controllers")) {
      this.hideControllers();
    } else {
      this.showControllers();
    }
  }
  showControllers() {
    this.inner.classList.add("show-controllers");
    clearTimeout(this.infoTimer);
    this.infoTimer = window.setTimeout(() => {
      this.hideControllers();
    }, 3000);
  }
  hideControllers() {
    this.inner.classList.remove("show-controllers");
  }
  zoomReset() {
    this.zoom?.reset();
  }
  get fullScreen(): boolean {
    return !!document.fullscreenElement;
  }
  set fullScreen(set: boolean) {
    if (set) {
      this.inner.requestFullscreen();
    } else {
      document.exitFullscreen().then(() => {
        this.inner.focus();
      });
    }
  }
  setTitle(title: string | HTMLElement) {
    if (typeof title == "string") {
      this.bookTitle.innerText = title;
    } else {
      this.bookTitle.innerText = "";
      this.bookTitle.appendChild(title);
    }
  }

  dispose() {
    this.invalidatePendingRender();
    this.eventController.abort();
    if (this.dragHandler) this.dragHandler.detach(this.inner);
    clearTimeout(this.infoTimer);
    if (this.ownsImageCache) this.imageCache.dispose();
    this.onChanged.clear();
    this.onRetry.clear();
    this.clearRetryButtons();
  }
  private setPageImageType(
    elm: HTMLElement,
    type?: (typeof PageImageType)[number]
  ) {
    elm.classList.remove(...PageImageType);
    if (type) elm.classList.add(type);
  }

  invalidatePendingRender() {
    this.renderController?.abort();
    this.clearRetryButtons();
  }

  async setCurrent(pages: SpreadPages) {
    this.invalidatePendingRender();
    const renderController = new AbortController();
    this.renderController = renderController;
    [this.rightPage, this.leftPage].forEach((tag) => {
      this.setPageImageType(tag, "loading-image");
      tag.style.backgroundImage = "";
    });
    Array.from(this.inner.querySelectorAll(".pageNumber")).forEach((e) => {
      e.textContent = `${pages.pageNumber()}`;
    });
    Array.from(this.inner.querySelectorAll(".pageMax")).forEach((e) => {
      e.textContent = pages.pageMax !== undefined ? `${pages.pageMax}` : "";
    });
    Array.from(this.inner.querySelectorAll<HTMLInputElement>(".range")).forEach(
      (e) => {
        e.max = `${Math.max((pages.pageMax ?? 1) - 1, -1)}`;
        e.value = `${pages.pageNumber()}`;
      }
    );
    this.zoomReset();
    this.inner.dataset.pageNumber = `${pages.pageNumber()}`;
    const [rightLoaded, leftLoaded] = await Promise.all([
      this.renderPage(pages.image1(), this.rightPage, renderController.signal),
      this.renderPage(pages.image2(), this.leftPage, renderController.signal),
    ]);
    if (renderController.signal.aborted) return;
    try {
      const single = await pages.isSingleUnit();
      if (!renderController.signal.aborted)
        this.inner.classList.toggle("single", single);
    } catch {
      // Keep the last known layout if custom page metadata fails.
    }
    if (!renderController.signal.aborted && rightLoaded && leftLoaded)
      this.onChanged.trigger(pages);
  }

  private async renderPage(
    promise: Promise<PageData | null> | null,
    tag: HTMLElement,
    signal: AbortSignal
  ): Promise<boolean> {
    let failure: "data" | "image" = "data";
    let release = () => {};
    try {
      const data = await promise;
      if (signal.aborted) return false;
      if (!data) {
        this.setPageImageType(tag, "no-image");
        return true;
      }
      failure = "image";
      release = this.imageCache.retain(data.src);
      signal.addEventListener("abort", release, { once: true });
      const image = await this.imageCache.load(data.src, { signal });
      if (signal.aborted) return false;
      data.isWidePage ??= image.naturalHeight < image.naturalWidth;
      tag.style.backgroundImage = `url(${JSON.stringify(data.src)})`;
      this.setPageImageType(tag, "show-image");
      return true;
    } catch {
      release();
      signal.removeEventListener("abort", release);
      if (!signal.aborted) {
        this.setPageImageType(tag, "broken-image");
        this.showPageRetry(tag, () => this.onRetry.trigger(failure));
      }
      return false;
    }
  }

  private retryButton(label: string, className: string, retry: () => void) {
    const button = this.inner.ownerDocument.createElement("button");
    button.className = `reader-retry ${className}`;
    button.type = "button";
    button.textContent = label;
    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        button.remove();
        retry();
      },
      { once: true, signal: this.eventController.signal }
    );
    return button;
  }

  private showPageRetry(tag: HTMLElement, retry: () => void): void {
    this.retryButtons.get(tag)?.remove();
    const button = this.retryButton("画像を再試行", "reader-page-retry", retry);
    tag.parentElement?.appendChild(button);
    this.retryButtons.set(tag, button);
  }

  showLoadError(retry: () => void): void {
    this.clearLoadError();
    this.pages.appendChild(
      this.retryButton(
        "章の読み込みに失敗しました。再試行",
        "reader-load-retry",
        retry
      )
    );
  }

  clearLoadError(): void {
    this.pages.querySelector?.(".reader-load-retry")?.remove();
  }

  private clearRetryButtons(): void {
    for (const button of this.retryButtons.values()) button.remove();
    this.retryButtons.clear();
    this.clearLoadError();
  }
}
