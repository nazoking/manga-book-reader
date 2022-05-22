var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/viewerDom/view.html
var require_view = __commonJS({
  "src/viewerDom/view.html"(exports, module) {
    module.exports = '<div class="info controller">\n  <div class="view-ctrl">\n    <button class="fullscreen">\u{1F5D6}</button>\n  </div>\n  <div class="info-ctrl">\n    <button class="nextBook">\u23EE</button>\n    <button class="nextPage">\u25C0</button>\n    <button class="nextHalf">\u2345</button>\n    <button class="prevHalf">\u2346</button>\n    <button class="prevPage">\u25B6</button>\n    <button class="prevBook">\u23ED</button>\n  </div>\n  <div class="book-title"></div>\n</div>\n<div class="pages">\n  <div class="left page">\n    <div class="left-page img"></div>\n  </div>\n  <div class="right page">\n    <div class="right-page img"></div>\n  </div>\n</div>\n';
  }
});

// src/viewerDom/view.css
var require_view2 = __commonJS({
  "src/viewerDom/view.css"(exports, module) {
    module.exports = '/* src/viewerDom/view.css */\n#id {\n  background: #333;\n  position: relative;\n  margin: 0;\n  user-select: none;\n  width: 500px;\n  height: 300px;\n  color: black;\n  overflow: hidden;\n  touch-action: none;\n  z-index: 2147483647;\n  border: 1px solid gray;\n  display: flex;\n  flex-direction: column;\n}\n#id:fullscreen {\n  touch-action: none;\n  border: none;\n}\n#id:fullscreen.show-controllers .controller {\n  opacity: 0.5;\n}\n#id:fullscreen.show-controllers .controller:hover {\n  opacity: 0.9;\n}\n#id:fullscreen .controller {\n  opacity: 0;\n}\n#id .controller * {\n  pointer-events: none;\n}\n#id.show-controllers .controller * {\n  pointer-events: auto;\n}\n#id button {\n  font-family: "Segoe UI Emoji";\n  color: #333333;\n  background: #cccccc;\n  cursor: pointer;\n  border: 1px outset;\n}\n#id button.disabled {\n  cursor: default;\n  opacity: 0.4;\n}\n#id button.controller.disabled {\n  opacity: 0;\n}\n#id.show-controllers button.controller.disabled:hover {\n  opacity: 0.2;\n  cursor: default;\n}\n#id .info {\n  background: white;\n  position: relative;\n  top: 0;\n  width: 100%;\n  justify-content: space-between;\n  flex-direction: row-reverse;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 10px;\n  z-index: 1;\n}\n#id:fullscreen .info {\n  position: absolute;\n}\n#id .info .book-title select {\n  user-select: text;\n  justify-content: flex-start;\n  border: none;\n  appearance: none;\n  padding: 5px 0;\n}\n#id:fullscreen .info .book-title select {\n  padding: 10px 0;\n}\n#id .info .info-ctrl {\n  display: flex;\n  justify-content: space-evenly;\n}\n#id .info .view-ctrl {\n  display: flex;\n  justify-content: flex-end;\n}\n#id .info .book-title {\n  flex-grow: 1;\n}\n#id .info button {\n  padding: 5px 15px;\n}\n#id:fullscreen .info button {\n  padding: 10px 35px;\n}\n#id .info button {\n  line-height: 18px;\n  height: 100%;\n}\n#id .info .info-title {\n  padding-right: 15px;\n}\n#id .pages {\n  position: relative;\n  top: 0;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  transform-origin: 0 0;\n  cursor: none;\n  flex-grow: 1;\n  padding: 0;\n  margin: 0;\n}\n#id:fullscreen .pages {\n  position: absolute;\n}\n#id.show-controllers .pages {\n  cursor: auto;\n}\n#id .page {\n  width: 50%;\n  float: left;\n  height: 100%;\n  padding: 0;\n  margin: 0;\n}\n#id .img {\n  width: 100%;\n  height: 100%;\n  background-repeat: no-repeat;\n  background-size: contain;\n  background-position-y: center;\n}\n#id .img.broken-image {\n  background-image: url(data:text/plain;base64,PHN2ZyBjbGFzcz0ic3ZnLWljb24iIHN0eWxlPSJ3aWR0aDogMWVtOyBoZWlnaHQ6IDFlbTt2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO2ZpbGw6IGN1cnJlbnRDb2xvcjtvdmVyZmxvdzogaGlkZGVuOyIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNODk2IDIxM3YyODFsLTEyOC0xMjgtMTcwIDE3MC0xNzAtMTcwLTE3MCAxNzAtMTI4LTEyOFYyMTNjMC00NiAzOC04NSA4NS04NWg1OTdjNDYgMCA4NSAzOCA4NSA4NXogbS0xMjggMjczbDEyOCAxMjhWODEwYzAgNDYtMzggODUtODUgODVIMjEzYy00NiAwLTg1LTM4LTg1LTg1VjUyOWwxMjggMTI4IDE3MC0xNzAgMTcwIDE3MCAxNzAtMTcweiIgIC8+Cjwvc3ZnPg==) !important;\n  background-size: 40%;\n}\n#id .img.no-image {\n  background-image: linear-gradient(45deg, black, #888) !important;\n}\n#id .img.loading-image {\n  animation: loading 0.5s ease-in alternate infinite;\n}\n@keyframes loading {\n  0% {\n    background-color: #333;\n  }\n  100% {\n    background-color: #888;\n  }\n}\n#id .left-page {\n  background-position-x: right;\n}\n#id .right-page {\n  background-position-x: left;\n}\n#id.single .left.page {\n  display: none;\n}\n#id.single .right.page {\n  width: 100%;\n}\n#id.single .right-page {\n  background-position-x: center;\n}\n#id .move-button {\n  position: absolute;\n  font-size: 40px;\n  height: 80%;\n  top: 10%;\n}\n#id .left-button {\n  left: 60px;\n}\n#id .right-button {\n  right: 60px;\n}\n';
  }
});

// src/view/event/once.ts
function once(e, type, f) {
  const cancel = () => e.removeEventListener(type, handler);
  const handler = (event) => {
    cancel();
    f(event);
  };
  e.addEventListener(type, handler);
  return { cancel };
}

// src/view/event/loadImage.ts
var loadImage = (src, onSizeDetected) => new Promise((resolve, reject) => {
  const image = new Image();
  var poll = setInterval(function() {
    if (image.naturalWidth) {
      clearInterval(poll);
      onSizeDetected({
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    }
  }, 10);
  const ok = once(image, "load", (_event) => {
    ng.cancel();
    resolve(image);
  });
  const ng = once(image, "error", (_event) => {
    ok.cancel();
    reject(image);
  });
  image.src = src;
});

// src/view/event/KeyEvent.ts
var KeyEvent = class {
  string;
  constructor(event) {
    this.string = (event.shiftKey ? "shift+" : "") + (event.metaKey ? "meta+" : "") + (event.ctrlKey ? "ctrl+" : "") + (event.altKey ? "alt+" : "") + event.code;
  }
};

// src/view/drag/Point.ts
var _Point = class {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  toString() {
    return `(${this.x};${this.y})`;
  }
  div(n) {
    return new _Point(this.x / n, this.y / n);
  }
  mul(n) {
    return new _Point(this.x * n, this.y * n);
  }
  plus(p) {
    return new _Point(this.x + p.x, this.y + p.y);
  }
  minus(p) {
    return p ? new _Point(this.x - p.x, this.y - p.y) : new _Point(-this.x, -this.y);
  }
  distance() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }
};
var Point = _Point;
__publicField(Point, "Zero", new _Point(0, 0));

// src/view/drag/PinchEvent.ts
var PinchEvent = class {
  constructor(type, ev1, ev2) {
    this.type = type;
    this.ev1 = ev1;
    this.ev2 = ev2;
    this.center = new Point((this.ev1.clientX + this.ev2.clientX) / 2, (this.ev1.clientY + this.ev2.clientY) / 2);
  }
  center;
  get distance() {
    return Math.sqrt(Math.pow(this.ev1.screenX - this.ev2.screenX, 2) + Math.pow(this.ev1.screenY - this.ev2.screenY, 2));
  }
};

// src/view/drag/ZoomEvent.ts
var ZoomEvent = class {
  constructor(type, center, distance) {
    this.type = type;
    this.center = center;
    this.distance = distance;
  }
};

// src/view/drag/DrawEvent.ts
var DrawEvent = class {
  constructor(gestures) {
    this.gestures = gestures;
  }
};

// src/view/event/EventCache.ts
var EventCache = class {
  constructor(map = /* @__PURE__ */ new Map()) {
    this.map = map;
  }
  put(ev) {
    if (this.map.has(ev.pointerId)) {
      const old = this.map.get(ev.pointerId);
      this.map.set(ev.pointerId, ev);
      return old;
    } else {
      this.map.set(ev.pointerId, ev);
      return void 0;
    }
  }
  update(ev) {
    if (this.map.has(ev.pointerId)) {
      const old = this.map.get(ev.pointerId);
      this.map.set(ev.pointerId, ev);
      return old;
    }
  }
  delete(ev) {
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
};

// src/view/event/DragHandler.ts
var DragHandler = class {
  constructor(handler) {
    this.handler = handler;
    this.evCache = new EventCache();
  }
  evCache;
  dragging;
  handlers = [
    ["pointerdown", (e) => this.onPointerDown(e)],
    ["pointermove", (e) => this.onPointerMove(e)],
    ["pointerup", (e) => this.onPointerUp(e)],
    ["pointercancel", (e) => this.onPointerUp(e)],
    ["pointerout", (e) => this.onPointerUp(e)],
    ["pointerleave", (e) => this.onPointerUp(e)],
    ["wheel", (e) => this.onWheel(e)]
  ];
  attach(el) {
    this.handlers.forEach(([type, handler]) => el.addEventListener(type, handler));
  }
  detach(el) {
    this.handlers.forEach(([type, handler]) => el.removeEventListener(type, handler));
  }
  onPointerDown(ev) {
    this.evCache.put(ev);
    if (this.evCache.size == 2) {
      const e = this.evCache.values();
      this.handler.onPinch(new PinchEvent("pinchstart", e[0], e[1]));
    }
    if (this.evCache.size == 1) {
      if (this.dragging === void 0) {
        this.dragging = { ev, gestures: [] };
      }
    } else {
      this.dragging = void 0;
    }
  }
  onPointerMove(ev) {
    this.evCache.update(ev);
    if (this.evCache.size == 2) {
      const e = this.evCache.values();
      this.handler.onPinch(new PinchEvent("pinchmove", e[0], e[1]));
    }
    if (this.dragging?.ev.pointerId === ev.pointerId) {
      let direction = null;
      if (Math.abs(this.dragging.ev.clientX - ev.clientX) > 16) {
        direction = this.dragging.ev.clientX > ev.clientX ? "right" : "left";
      } else if (Math.abs(this.dragging.ev.clientY - ev.clientY) > 16) {
        direction = this.dragging.ev.clientY > ev.clientY ? "up" : "down";
      }
      if (this.dragging.lastDirection === direction) {
        this.dragging.ev = ev;
      } else if (direction) {
        this.dragging.lastDirection = direction;
        this.dragging.gestures.push(direction);
        this.dragging.ev = ev;
      }
    }
  }
  onPointerUp(ev) {
    const up = this.evCache.delete(ev);
    if (this.evCache.size == 1 && up) {
      const e = this.evCache.values();
      this.handler.onPinch(new PinchEvent("pinchend", e[0], up));
    }
    if (this.dragging?.ev.pointerId === ev.pointerId) {
      if (this.dragging.gestures.length) {
        this.handler.onDraw(new DrawEvent(this.dragging.gestures));
      }
      this.dragging = void 0;
    }
  }
  onWheel(e) {
    e.preventDefault();
    if (e.ctrlKey) {
      this.handler.onPinch(new ZoomEvent("pinchstart", new Point(e.clientX, e.clientY), 100));
      this.handler.onPinch(new ZoomEvent("pinchend", new Point(e.clientX, e.clientY), 100 - e.deltaY));
    } else {
      this.handler.onPinch(new ZoomEvent("pinchstart", new Point(e.clientX, e.clientY), 1));
      this.handler.onPinch(new ZoomEvent("pinchend", new Point(e.clientX + e.deltaX, e.clientY + e.deltaY), 1));
    }
  }
};

// src/view/drag/Zoom.ts
var Transformer = class {
  constructor(center, distance, transform) {
    this.center = center;
    this.distance = distance;
    this.transform = transform;
  }
  zoom(newCenter, distance) {
    const scale = distance / this.distance;
    const a = new DOMMatrixReadOnly().translate(newCenter.x, newCenter.y).scale(scale, scale).translate(-this.center.x, -this.center.y).multiply(this.transform);
    return a.a < 0.5 || a.a > 4 ? this.transform : a;
  }
};
var Zoom = class {
  constructor(content) {
    this.content = content;
    this.content = content;
    this.reset();
  }
  transform = new DOMMatrixReadOnly();
  ticking = false;
  transformer;
  reset() {
    this.transform = new DOMMatrixReadOnly();
    this.requestElementUpdate();
  }
  onPinch(ev) {
    if (ev.type == "pinchstart") {
      this.transformer = new Transformer(ev.center, ev.distance, this.transform);
    }
    if (this.transformer) {
      this.transform = this.transformer.zoom(ev.center, ev.distance);
      this.requestElementUpdate();
    }
  }
  requestElementUpdate() {
    if (!this.ticking) {
      window.requestAnimationFrame(() => this.updateElement());
      this.ticking = true;
    }
  }
  updateElement() {
    this.content.setTransform(this.transform);
    this.ticking = false;
  }
};

// src/view/event/Emitter.ts
var EventEmitter = class {
  constructor(handlers = []) {
    this.handlers = handlers;
  }
  trigger(action) {
    if (action) {
      let ret = false;
      this.handlers.forEach((h) => ret ||= h(action));
      return ret;
    }
  }
  add(handler) {
    this.handlers.push(handler);
  }
  remove(handler) {
    const i = this.handlers.indexOf(handler);
    if (i >= 0) {
      this.handlers.splice(i, 1);
    }
  }
};

// src/viewerDom/index.ts
var viewerDom = (doc = document) => {
  const div = doc.createElement("div");
  const id = "bookview-" + Math.random().toString(36).replace(/0\./, "");
  div.id = id;
  div.tabIndex = 0;
  div.innerHTML = require_view() + `<style>${require_view2().replace(/#id/g, `#${id}`)}</style>`;
  return div;
};

// src/view/Viewer.ts
var PageImageType = ["loading-image", "no-image", "broken-image", "show-image"];
var Viewer = class {
  constructor(div = viewerDom()) {
    this.div = div;
    this.rightPage = div.querySelector(".right-page");
    this.leftPage = div.querySelector(".left-page");
    this.pages = div.querySelector(".pages");
    this.info = div.querySelector(".info");
    this.bookTitle = div.querySelector(".book-title");
    this.div = div;
    this.div.addEventListener("pointermove", (e) => {
      if (e.pointerType == "touch")
        return;
      this.showControllers();
    });
  }
  rightPage;
  leftPage;
  pages;
  info;
  bookTitle;
  infoTimer;
  zoom;
  onChanged = new EventEmitter();
  setDrawHandler(drawHandler) {
    this.zoom = new Zoom({
      setTransform: (t) => {
        this.pages.style.transform = t.toString();
      }
    });
    const drag = new DragHandler({
      onPinch: (p) => {
        this.zoom?.onPinch(p);
      },
      onDraw: (e) => {
        drawHandler(e.gestures.join("-"));
      }
    });
    drag.attach(this.div);
  }
  setClickHandler(clickHandler) {
    this.div.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      let v = e.target;
      while (v && v != this.div) {
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
  setKeyHandler(keyHandler) {
    this.div.addEventListener("keydown", (event) => {
      if (keyHandler(new KeyEvent(event))) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }
  toggleControllers() {
    if (this.div.classList.contains("show-controllers")) {
      this.hideControllers();
    } else {
      this.showControllers();
    }
  }
  showControllers() {
    this.div.classList.add("show-controllers");
    clearTimeout(this.infoTimer);
    this.infoTimer = window.setTimeout(() => {
      this.hideControllers();
    }, 3e3);
  }
  hideControllers() {
    this.div.classList.remove("show-controllers");
  }
  zoomReset() {
    this.zoom?.reset();
  }
  get fullScreen() {
    return !!document.fullscreenElement;
  }
  set fullScreen(set) {
    if (set) {
      this.div.requestFullscreen();
    } else {
      document.exitFullscreen().then(() => {
        this.div.focus();
      });
    }
  }
  setTitle(title) {
    if (typeof title == "string") {
      this.bookTitle.innerText = title;
    } else {
      this.bookTitle.innerText = "";
      this.bookTitle.appendChild(title);
    }
  }
  setPageImageType(elm, type) {
    elm.classList.remove(...PageImageType);
    if (type)
      elm.classList.add(type);
  }
  async setPageTypeSingleUnit(isSingleUnit) {
    this.div.classList.toggle("single", await isSingleUnit);
  }
  async setCurrent(pages) {
    this.zoomReset();
    this.div.dataset.pageNumber = `${pages.pageNumber()}`;
    const set = async (promise, tag) => {
      const data = await promise;
      if (this.div.dataset.pageNumber != `${pages.pageNumber()}`)
        return;
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
          const img = await loadImage(data.src, ({ width, height }) => {
            if (this.div.dataset.pageNumber != `${pages.pageNumber()}`)
              return;
            data.isWidePage = height < width;
            this.setPageTypeSingleUnit(pages.isSingleUnit());
          });
          if (this.div.dataset.pageNumber != `${pages.pageNumber()}`)
            return;
          this.setPageImageType(tag, "show-image");
        } catch (e) {
          if (this.div.dataset.pageNumber != `${pages.pageNumber()}`)
            return;
          this.setPageImageType(tag, "broken-image");
          throw new Error(`can't load ${data.src}`);
        }
        ;
      }
    };
    await Promise.all([
      set(pages.image1(), this.rightPage),
      set(pages.image2(), this.leftPage)
    ]);
    this.onChanged.trigger(pages);
  }
};

// src/view/BookLoadAction.ts
var BookLoadAction = class {
  constructor(bookController, setHandler) {
    this.bookController = bookController;
    this.setHandler = setHandler;
  }
  actions() {
    return {
      nextBook: {
        action: () => {
          this.move(this.bookController.move(1), -1);
        },
        isEnable: async () => this.bookController.canMove(1)
      },
      prevBook: {
        action: () => {
          this.move(this.bookController.move(-1), -1);
        },
        isEnable: async () => this.bookController.canMove(-1)
      },
      prevBookLast: {
        action: () => {
          this.move(this.bookController.move(-1), { last: -1 });
        },
        isEnable: async () => this.bookController.canMove(-1)
      }
    };
  }
  move(bookNumber, pageNumber) {
    if (typeof bookNumber == "number") {
      bookNumber = this.bookController.goTo(bookNumber);
    }
    this.bookController = bookNumber;
    this.setHandler(this.bookController, pageNumber);
  }
};

// src/high/query.ts
function isXPath(selector) {
  return selector.startsWith("/");
}
var queryi = (selector, contextNode) => {
  const context = contextNode || document;
  if (isXPath(selector)) {
    const result = document.evaluate(selector, context);
    if (result.resultType == XPathResult.ORDERED_NODE_ITERATOR_TYPE || result.resultType == XPathResult.UNORDERED_NODE_ITERATOR_TYPE) {
      let i = result.iterateNext();
      const ret = [];
      while (i) {
        ret.push(i);
        i = result.iterateNext();
      }
      return ret;
    }
    if (result.resultType == XPathResult.ORDERED_NODE_SNAPSHOT_TYPE || result.resultType == XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE) {
      const ret = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        ret.push(result.snapshotItem(i));
      }
      return ret;
    }
    throw new Error(`unsupported result type ${result.resultType} by ${selector}`);
  } else {
    return Array.from(context.querySelectorAll(selector));
  }
};
queryi.context = (contextNode) => (selector) => queryi(selector, contextNode);
var query = queryi;

// src/scraping/infinityScroll.ts
async function appendNextPage(url, nav, config) {
  console.log(`\u7D99\u304E\u8DB3\u3057 ${url}`);
  nav.style.backgroundColor = "red";
  const f = await fetch(url).then((a) => a.text()).then((a) => new DOMParser().parseFromString(a, "text/html"));
  const nextNav = query(config.nav, f)[0];
  if (!nextNav) {
    console.log(`\u6B21\u30DA\u30FC\u30B8 ${url} \u306E\u7D99\u304E\u8DB3\u3057\u90E8\u5206 ${config.nav} \u304C\u898B\u3064\u304B\u3089\u306A\u3044`);
    return;
  }
  const contents = f.querySelector(config.contents);
  if (!contents) {
    console.log(`\u6B21\u30DA\u30FC\u30B8 ${url} \u306E\u7D99\u304E\u8DB3\u3057\u90E8\u5206 ${config.contents} \u304C\u898B\u3064\u304B\u3089\u306A\u3044`);
    return;
  }
  let frag = document.createDocumentFragment();
  frag.appendChild(contents);
  frag.appendChild(nextNav);
  if (config.onLoad) {
    config.onLoad(frag);
  }
  const navParent = nav.parentElement;
  navParent.insertBefore(frag, nav);
  navParent.removeChild(nav);
  infinityScroll(config);
}
function infinityScroll(config) {
  const nav = query(config.nav)[0];
  if (!nav) {
    console.log(`\u73FE\u30DA\u30FC\u30B8\u306E nav ${config.nav} \u304C\u898B\u3064\u304B\u3089\u306A\u3044`);
    return;
  }
  const next = query(config.next, nav)[0];
  if (!next) {
    console.log(`\u73FE\u30DA\u30FC\u30B8\u306E \u300C\u6B21\u306E\u30DA\u30FC\u30B8\u300D\u30EA\u30F3\u30AF ${config.next} \u304C\u898B\u3064\u304B\u3089\u306A\u3044`);
    return;
  }
  const timeerId = setInterval(() => {
    if (nav.getBoundingClientRect().top < window.innerHeight) {
      clearInterval(timeerId);
      appendNextPage(next.href, nav, config);
    }
  }, 500);
}

// src/page/PageNumber.ts
var PageNumber;
((PageNumber2) => {
  PageNumber2.of = (page, length) => typeof page == "object" ? length - page.last - 2 : page;
  PageNumber2.inRange = (page, length) => Math.min(Math.max(PageNumber2.of(page, length), -1), length - 1);
})(PageNumber || (PageNumber = {}));

// src/book/Book.ts
var Book = (pages) => {
  const book = {
    getSpreadPages(pageA = 0) {
      let page = PageNumber.inRange(pageA, pages.length);
      const image1 = pages[page] || null;
      const image2 = pages[page + 1] || null;
      const spread = {
        image1: () => image1,
        image2: () => image2,
        hasNext: async () => page < pages.length - 1,
        nextPage: async () => book.getSpreadPages(page + (await spread.isSingleUnit() ? 1 : 2)),
        hasPrev: async () => page > 0,
        prevPage: async () => book.getSpreadPages(page - ((await pages[page - 1])?.isWidePage ? 1 : 2)),
        move: async (num) => book.getSpreadPages(page + num),
        canMove: async (num) => pages[num] !== void 0,
        pageNumber: () => page,
        isSingleUnit: async () => (await image1)?.isWidePage || (await image2)?.isWidePage || false
      };
      return spread;
    }
  };
  return book;
};

// src/page/DummyPage.ts
var DummyPage = class {
  async hasNext() {
    return false;
  }
  async nextPage() {
    return this;
  }
  async prevPage() {
    return this;
  }
  async move() {
    return this;
  }
  pageNumber() {
    return -1;
  }
  async canMove() {
    return false;
  }
  async hasPrev() {
    return false;
  }
  image1() {
    return null;
  }
  image2() {
    return null;
  }
  async isSingleUnit() {
    return true;
  }
};

// src/view/Action.ts
var Wrapper = class {
  constructor(internal) {
    this.internal = internal;
    this.isEnable = Action.isEnable(internal);
  }
  isEnable;
  async action() {
    if (await this.isEnable()) {
      this.internal.action();
    }
  }
  or(other) {
    if (!other)
      return this;
    const a1 = Action.wrap(other);
    return new Wrapper({
      action: async () => {
        if (await this.isEnable())
          return this.action();
        if (await a1.isEnable())
          return a1.action();
        return false;
      },
      isEnable: async () => {
        return await this.isEnable() || await a1.isEnable();
      }
    });
  }
};
var Action = {
  NOP: void 0,
  wrap(action) {
    if (!action)
      return Action.NOP;
    if (action instanceof Wrapper)
      return action;
    if (typeof action == "function")
      return new Wrapper({ action: () => action() });
    return new Wrapper(action);
  },
  isEnable(action) {
    return "isEnable" in action ? () => action.isEnable() : async () => true;
  },
  lazy(action) {
    return new Wrapper({
      action: () => action().action(),
      isEnable: () => Action.isEnable(action())()
    });
  }
};
Action.NOP = new Wrapper({ action: () => {
} });

// src/view/ActionController.ts
var ActionController = class {
  constructor(view, current, actions, defaultActions) {
    this.view = view;
    this.current = current;
    this.addActions((defaultActions || ActionController.defaultActions).call(null, this));
    view.setClickHandler((element) => {
      const key = Object.keys(this.clicks).find((selector) => element.matches(selector));
      if (key) {
        this.doAction(this.clicks[key]);
        return true;
      }
    });
    view.setKeyHandler((key) => {
      if (this.keys[key.string]) {
        this.doAction(this.keys[key.string]);
        return true;
      }
    });
    view.setDrawHandler((key) => {
      if (this.draws[key]) {
        this.doAction(this.draws[key]);
        return true;
      }
    });
    if (actions) {
      this.addActions(actions);
    }
    this.setCurrent(Promise.resolve(current));
  }
  keys = {
    ArrowDown: "nextPageOrBook",
    Space: "nextPageOrBook",
    ArrowUp: "prevPageOrBook",
    "shift+Space": "prevPageOrBook",
    ArrowLeft: "nextHalf",
    ArrowRight: "prevHalf",
    Enter: "toggleFullscreen",
    Period: "nextBook",
    Comma: "prevBook"
  };
  clicks = {
    ".right-button": "prevPageOrBook",
    ".fullscreen": "toggleFullscreen",
    ".pages": "nextPageOrBook",
    ".nextBook": "nextBook",
    ".prevBook": "prevBook",
    ".nextPage": "nextPage",
    ".prevPage": "prevPage",
    ".nextHalf": "nextHalf",
    ".prevHalf": "prevHalf"
  };
  actions = {};
  draws = {
    "up": "toggleFullscreen",
    "left": "nextPageOrBook",
    "right": "prevPageOrBook",
    "left-right": "nextHalf",
    "right-left": "prevHalf",
    "left-up": "nextBook",
    "left-down": "prevBook",
    "down": "zoomReset"
  };
  static defaultActions(c) {
    return {
      nextPage: {
        action: () => c.setCurrent(c.current.nextPage()),
        isEnable: () => c.current.hasNext()
      },
      prevPage: {
        action: () => c.setCurrent(c.current.prevPage()),
        isEnable: () => c.current.hasPrev()
      },
      nextHalf: () => c.setCurrent(c.current.move(1)),
      prevHalf: () => c.setCurrent(c.current.move(-1)),
      fullscreen: {
        action: () => c.view.fullScreen = true,
        isEnable: async () => !c.view.fullScreen
      },
      exitFullscreen: () => c.view.fullScreen = false,
      toggleFullscreen: () => c.doAction(c.view.fullScreen ? "exitFullscreen" : "fullscreen"),
      nextPageOrBook: Action.lazy(() => Action.wrap(c.actions["nextPage"]).or(c.actions["nextBook"])),
      prevPageOrBook: Action.lazy(() => Action.wrap(c.actions["prevPage"]).or(c.actions["prevBookLast"])),
      firstPage: {
        action: () => c.current.move(-1),
        isEnable: async () => c.current.pageNumber() != -1
      },
      firstPageOrPrevBook: Action.lazy(() => Action.wrap(c.actions["firstPage"]).or(c.actions["prevBook"])),
      zoomReset: () => c.view.zoomReset()
    };
  }
  addActions(actions) {
    Object.entries(actions).forEach(([name, action]) => this.addAction(name, action));
  }
  addAction(name, action) {
    this.actions[name] = Action.wrap(action);
  }
  getAction(action) {
    if (action) {
      if (typeof action == "string") {
        return this.getAction(this.actions[action]);
      }
      return Action.wrap(action);
    }
  }
  doAction(action) {
    const a = this.getAction(action);
    if (a) {
      a.action();
    } else {
      if (typeof a == "string") {
        console.log(`unknown action ${action}`);
      }
    }
  }
  async setCurrent(page) {
    this.current = await page;
    this.view.setCurrent(this.current);
    Object.entries(this.clicks).forEach(async ([selector, a]) => {
      const action = this.getAction(a);
      const elements = this.view.div.querySelectorAll(selector);
      if (elements.length) {
        const disabled = action ? !await action.isEnable() : true;
        Array.from(elements).forEach((elem) => {
          elem.classList.toggle("disabled", disabled);
        });
      }
    });
  }
};

// src/high/CacheMap.ts
var CacheMap = class {
  map = /* @__PURE__ */ new Map();
  async getOr(key, value) {
    const c = this.map.get(key);
    if (c)
      return c;
    const r = await value(key);
    this.map.set(key, r);
    return r;
  }
};

// src/high/multiBook.ts
var multiBook = ({
  bookList,
  getBook,
  getName = (_, index) => `Book ${index + 1}`,
  onBookChanged = () => {
  },
  onPageChanged = () => {
  },
  dummyPage = new DummyPage(),
  getBookSelector = ({ bookList: bookList2, action, onBookChanged: onBookChanged2 }) => {
    const select = document.createElement("select");
    bookList2.forEach((book, index, array) => {
      select.appendChild(new Option(getName(book, index, array)));
    });
    select.onchange = () => {
      action.move(select.selectedIndex, -1);
    };
    onBookChanged2.add((event) => {
      select.selectedIndex = event.bookIndex;
    });
    return select;
  },
  viewerDom: viewerDom2 = viewerDom()
}) => {
  const cache = new CacheMap();
  const getController = (bookNumber) => {
    bookNumber = Math.min(Math.max(bookNumber, 0), bookList.length);
    return {
      move: (m) => getController(bookNumber + m),
      canMove: (m) => bookNumber + m >= 0 && bookNumber + m < bookList.length,
      goTo: (m) => getController(m),
      getBookMeta: () => bookList[bookNumber],
      getSpreadPages: (page) => cache.getOr(bookList[bookNumber], (m) => getBook(m, bookNumber, bookList)).then((b) => b.getSpreadPages(page))
    };
  };
  const selectHandler = new EventEmitter();
  const action = new BookLoadAction(getController(0), async (bc, pageNumber) => {
    controller.setCurrent(Promise.resolve(dummyPage));
    selectHandler.trigger({ controller: bc, bookIndex: bookList.findIndex((l) => l == bc.getBookMeta()) });
    controller.setCurrent(bc.getSpreadPages(pageNumber));
    onBookChanged(bc, pageNumber);
  });
  const controller = new ActionController(new Viewer(viewerDom2), dummyPage, action.actions());
  controller.view.onChanged.add(onPageChanged);
  controller.view.setTitle(getBookSelector({ bookList, action, onBookChanged: selectHandler }));
  return { controller, action };
};

// src/scraping/preLoadImageList.ts
var preLoadImageList = async (srcList) => {
  if (!srcList)
    return;
  const f = document.head.firstChild;
  for (const src of srcList) {
    await new Promise((resolve) => {
      const link = document.createElement("link");
      link.setAttribute("rel", "preload");
      link.setAttribute("as", "image");
      link.setAttribute("href", src);
      const next = (message) => {
        console.log(`${message} ${src}`);
        document.head.removeChild(link);
        resolve();
      };
      link.onload = () => next("loaded");
      link.onerror = () => next("load error");
      document.head.insertBefore(link, f);
    });
  }
  ;
};

// src/scraping/CookieStorage.ts
var CookieStorage = class {
  write(book) {
    document.cookie = `lastchap=${escape(book.title)}; max-age=31536000; samesite`;
    if (typeof book.page === "number") {
      document.cookie = `page=${book.page}; max-age=31536000; samesite`;
    }
    return Promise.resolve();
  }
  read() {
    const c = new Map(document.cookie.split(/; /).map((a) => a.split("=", 2)));
    const title = c.get("lastchap");
    let ret = null;
    if (title) {
      ret = { title: unescape(title) };
      const page = c.get("page");
      if (page)
        ret.page = page * 1;
    }
    return Promise.resolve(ret);
  }
};

// src/scraping/scraping.ts
function isNodeArray(u) {
  return u.length != 0 && u[0] instanceof Node;
}
var toGetter = (getterable) => async (doc) => {
  const inferPages = (imgs) => {
    if (imgs.length == 0)
      return imgs;
    if (isNodeArray(imgs)) {
      if (imgs[0] instanceof HTMLAnchorElement) {
        return inferPages(imgs.map((e) => e.href));
      }
      if (imgs[0] instanceof HTMLImageElement) {
        return inferPages(imgs.map((e) => e.dataset.lazySrc || e.dataset.src || e.src));
      }
      throw new Error(`\u672A\u5BFE\u5FDC\u306E Node ${imgs[0]}`);
    }
    return imgs;
  };
  if (typeof getterable == "string") {
    return inferPages(query(getterable, doc));
  }
  if (typeof getterable == "string" || typeof getterable == "object") {
    return inferPages(getterable);
  }
  return inferPages(await getterable(doc));
};
var scraping = async ({
  pageList,
  bookList = void 0,
  addController = (div) => {
    document.body.prepend(div);
    setTimeout(() => div.focus());
  },
  bookmarker = new CookieStorage(),
  viewerDom: viewerDom2 = viewerDom()
}) => {
  const getPageImageList = toGetter(pageList);
  if (!bookList || bookList.length == 0) {
    console.log("bookList \u306F\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
    const pages = await getPageImageList(document);
    if (pages.length) {
      const book = Book(pages.map(async (src) => ({ src })));
      const controller2 = new ActionController(new Viewer(viewerDom2), book.getSpreadPages(-1), {});
      addController(controller2.view.div);
      setTimeout(() => preLoadImageList(pages), 1e3);
      return {
        controller: controller2
      };
    }
    console.log("pageList \u3082\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
    return;
  }
  const bookmark = await bookmarker.read();
  let bookNumber = Math.max(bookList.findIndex((c) => c.title == bookmark?.title), 0);
  console.log("start ", bookmark, bookNumber, bookList);
  const { controller, action } = multiBook({
    bookList,
    viewerDom: viewerDom2,
    getBook: async (book) => {
      console.log("load=", book);
      const r = await fetch(book.url);
      const txt = await r.text();
      const dom = new DOMParser().parseFromString(txt, "text/html");
      if (dom.getElementsByTagName("base").length == 0) {
        const base = dom.createElement("base");
        base.href = book.url;
        dom.head.append(base);
      }
      const pageList2 = await getPageImageList(dom);
      console.log("pageList=", pageList2);
      setTimeout(() => preLoadImageList(pageList2), 1e3);
      return Book(pageList2.map(async (src) => ({ src })));
    },
    getName: (b) => b.title,
    onBookChanged: (bc, pageNumber) => {
      const b = bc.getBookMeta();
      bookmarker.write({
        title: b.title
      });
      const current_url = window.location.href;
      history.replaceState({}, "", b.url);
      history.replaceState({}, "", current_url);
      console.log(`${JSON.stringify(bc.getBookMeta())} ${b.title} ${JSON.stringify(pageNumber)}`);
    }
  });
  addController(controller.view.div);
  action.move(bookNumber, -1);
  return {
    controller,
    action
  };
};

// src/index.ts
var src_default = {
  Book,
  ActionController,
  Viewer,
  BookLoadAction,
  DragHandler,
  multiBook,
  preLoadImageList,
  scraiping: scraping,
  infinityScroll,
  query
};
export {
  src_default as default
};
