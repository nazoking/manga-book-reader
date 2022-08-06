import { loadImage } from "./event/loadImage";
import { PageData } from "../page/PageData";
import { SpreadPages } from "../page/SpreadPages";
import { EventHandler } from "./event/EventHandler";
import { KeyEvent } from "./event/KeyEvent";
import { DragHandler } from "./event/DragHandler";
import { Zoom } from "./drag/Zoom";
import { EventEmitter } from "./event/Emitter";
import { viewerDom } from "../viewerDom";

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
  readonly info: HTMLElement;
  readonly bookTitle: HTMLElement;
  private infoTimer: number | undefined;
  private zoom?: Zoom;
  readonly onChanged: EventEmitter<SpreadPages> =
    new EventEmitter<SpreadPages>();
  wrapper: HTMLElement;
  root: ShadowRoot;
  inner: HTMLElement;
  constructor(div: HTMLElement = viewerDom()) {
    this.wrapper = div.ownerDocument.createElement("div");
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
    this.info = elem(".info");
    this.bookTitle = elem(".book-title");
    this.inner.addEventListener("pointermove", (e) => {
      if (e.pointerType == "touch") return;
      this.showControllers();
    });
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
  }
  /** Click handlers handle events that occur when you click on an element */
  setClickHandler(clickHandler: EventHandler<Element>) {
    this.inner.addEventListener("click", (e) => {
      e.stopPropagation();
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
    });
  }
  /** Key handlers handle keyboard events */
  setKeyHandler(keyHandler: EventHandler<KeyEvent>) {
    this.inner.addEventListener(
      "keydown",
      (event) => {
        if (keyHandler(new KeyEvent(event))) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );
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
  private setPageImageType(
    elm: HTMLElement,
    type?: typeof PageImageType[number]
  ) {
    elm.classList.remove(...PageImageType);
    if (type) elm.classList.add(type);
  }

  private async setPageTypeSingleUnit(isSingleUnit: Promise<boolean>) {
    this.inner.classList.toggle("single", await isSingleUnit);
  }
  async setCurrent(pages: SpreadPages) {
    this.zoomReset();
    this.inner.dataset.pageNumber = `${pages.pageNumber()}`;
    const set = async (
      promise: Promise<PageData | null> | null,
      tag: HTMLElement
    ) => {
      const data = await promise;
      if (this.inner.dataset.pageNumber != `${pages.pageNumber()}`) return;
      if (!data) {
        this.setPageImageType(tag, "no-image");
        this.setPageTypeSingleUnit(pages.isSingleUnit());
        return;
      } else {
        this.setPageImageType(tag, "loading-image");
        tag.style.backgroundImage = `url("${encodeURI(data.src)}")`;
        if (typeof data.isWidePage == "boolean") {
          this.setPageImageType(tag, "show-image");
          this.setPageTypeSingleUnit(pages.isSingleUnit());
          return;
        }
        try {
          await loadImage(data.src, ({ width, height }) => {
            if (this.inner.dataset.pageNumber != `${pages.pageNumber()}`)
              return;
            data.isWidePage = height < width;
            this.setPageTypeSingleUnit(pages.isSingleUnit());
          });
          if (this.inner.dataset.pageNumber != `${pages.pageNumber()}`) return;
          this.setPageImageType(tag, "show-image");
        } catch (e) {
          if (this.inner.dataset.pageNumber != `${pages.pageNumber()}`) return;
          this.setPageImageType(tag, "broken-image");
          throw new Error(`can't load ${data.src}`);
        }
      }
    };
    await Promise.all([
      set(pages.image1(), this.rightPage),
      set(pages.image2(), this.leftPage),
    ]);
    this.onChanged.trigger(pages);
  }
}
