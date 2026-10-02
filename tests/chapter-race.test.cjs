const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  ActionController,
  Book,
  ImageCache,
  Viewer,
  DummyPage,
  multiBook,
  AutoImage,
  viewerDom,
} = require("./helpers.cjs");

global.Image = AutoImage;
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const flush = () => new Promise((resolve) => setImmediate(resolve));
const page = (src, image = Promise.resolve({ src, isWidePage: false })) => {
  const p = new DummyPage();
  p.image1 = () => image;
  return p;
};

test("last requested chapter wins, and only its position is reported", async () => {
  const a = deferred();
  const b = deferred();
  const notices = [];
  const signals = {};
  const pa = page("a");
  const pb = page("b");
  const { action, controller } = multiBook({
    bookList: ["a", "b"],
    getBook: (name, index, books, signal) => {
      signals[name] = signal;
      return name === "a" ? a.promise : b.promise;
    },
    onPageChanged: (value) => notices.push(value),
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  action.move(0, -1);
  action.move(1, -1);
  await flush();
  assert.equal(signals.a.aborted, true);
  assert.deepEqual(notices, []); // Placeholder must not save a position.
  b.resolve({ getSpreadPages: async () => pb });
  await flush();
  a.resolve({ getSpreadPages: async () => pa });
  await flush();
  assert.equal(controller.current, pb);
  assert.deepEqual(notices, [{ book: "b", page: -1 }]);
});

test("late images from the same page number cannot repaint or notify", async () => {
  const view = new Viewer(viewerDom());
  const image = deferred();
  const notices = [];
  view.onChanged.add((p) => {
    notices.push(p);
  });
  const old = view.setCurrent(page("a", image.promise));
  const current = page("b");
  await view.setCurrent(current);
  image.resolve({ src: "a", isWidePage: false });
  await old;
  await flush();
  assert.equal(view.rightPage.style.backgroundImage, 'url("b")');
  assert.deepEqual(notices, [current]);
});

test("a new page request invalidates an in-flight image notification immediately", async () => {
  const view = new Viewer(viewerDom());
  const controller = new ActionController(view, new DummyPage());
  await flush();
  const image = deferred();
  const oldRender = controller.setCurrent(page("a", image.promise));
  await flush();
  const notices = [];
  view.onChanged.add((p) => {
    notices.push(p);
  });
  const next = deferred();
  const pending = controller.setCurrent(next.promise);
  image.resolve({ src: "a", isWidePage: false });
  await flush();
  assert.deepEqual(notices, []);
  next.resolve(page("b"));
  await pending;
  await oldRender;
  await flush();
  assert.equal(notices.length, 1);
});

test("late layout detection cannot overwrite the current layout", async () => {
  const view = new Viewer(viewerDom());
  const layout = deferred();
  const toggles = [];
  view.inner.classList.toggle = (name, value) => {
    toggles.push([name, value]);
  };
  const old = page("a");
  old.isSingleUnit = () => layout.promise;
  const oldRender = view.setCurrent(old);
  await flush();
  const current = page("b");
  current.isSingleUnit = async () => false;
  await view.setCurrent(current);
  layout.resolve(true);
  await oldRender;
  await flush();
  assert.ok(toggles.length > 0);
  assert.ok(toggles.every(([, value]) => value === false));
});

test("late action availability cannot overwrite current button state", async () => {
  const view = new Viewer(viewerDom());
  const controller = new ActionController(view, new DummyPage());
  await flush();
  const enabled = deferred();
  const toggles = [];
  view.root.querySelectorAll = (selector) =>
    selector === ".nextPage"
      ? [
          {
            classList: {
              toggle: (_, value) => {
                toggles.push(value);
              },
            },
          },
        ]
      : [];
  const old = page("a");
  old.hasNext = () => enabled.promise;
  await controller.setCurrent(old);
  await controller.setCurrent(page("b"));
  await flush();
  enabled.resolve(true);
  await flush();
  assert.ok(toggles.length >= 1);
  assert.ok(toggles.every((value) => value === true));
});

test("a synchronous page-source failure is retried through the same load path", async () => {
  const view = new Viewer(viewerDom());
  const controller = new ActionController(view, new DummyPage());
  let attempts = 0;
  let retry;
  view.showLoadError = (callback) => {
    retry = callback;
  };
  const recovered = page("recovered");
  await controller.setCurrent(() => {
    if (++attempts === 1) throw new Error("temporary failure");
    return recovered;
  });
  assert.equal(typeof retry, "function");
  retry();
  await flush();
  assert.equal(attempts, 2);
  assert.equal(controller.current, recovered);
  assert.equal(view.rightPage.style.backgroundImage, 'url("recovered")');
  controller.dispose();
});

test("chapter selection clears the previous display before acquisition, including failure", async (t) => {
  let rejectNext;
  const next = new Promise((_, reject) => { rejectNext = reject; });
  const notices = [];
  const placeholder = new DummyPage();
  const reader = multiBook({
    bookList: ["old", "new"],
    getBook: async (name) => name === "old"
      ? Book([Promise.resolve({ src: "old-cover" })])
      : next,
    dummyPage: placeholder,
    loading: { preloadNextBook: false },
    onPageChanged: (event) => notices.push(event.book),
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  t.after(() => reader.dispose());
  let retry;
  reader.controller.view.showLoadError = (callback) => { retry = callback; };
  reader.action.move(0, -1);
  await flush();
  assert.equal(reader.controller.view.leftPage.style.backgroundImage, 'url("old-cover")');
  reader.action.move(1, -1);
  assert.equal(reader.controller.current, placeholder);
  assert.equal(reader.controller.view.leftPage.style.backgroundImage, "");
  assert.equal(reader.controller.view.inner.dataset.pageNumber, "-1");
  rejectNext(new Error("chapter unavailable"));
  await flush();
  assert.equal(typeof retry, "function");
  assert.equal(reader.controller.current, placeholder);
  assert.equal(reader.controller.view.leftPage.style.backgroundImage, "");
  assert.deepEqual(notices, ["old"]);
});

for (const failure of ["data", "image"]) {
  test(`${failure} retry works while the other page is still loading`, async (t) => {
    let imageAttempts = 0;
    const imageCache = new ImageCache({
      retries: 0,
      imageFactory: () => new (class extends AutoImage {
        set src(value) {
          if (failure === "image" && value === "right" && ++imageAttempts === 1) {
            queueMicrotask(() => this.dispatchEvent(new Event("error")));
          } else {
            super.src = value;
          }
        }
      })(),
    });
    t.after(() => imageCache.dispose());
    const view = new Viewer(viewerDom(), { imageCache });
    const controller = new ActionController(view, new DummyPage());
    t.after(() => controller.dispose());
    const slow = deferred();
    const notices = [];
    view.onChanged.add((pages) => notices.push(pages));
    let retry;
    view.showPageRetry = (_, callback) => { retry = callback; };
    let loads = 0;
    const pending = controller.open(async () => {
      loads++;
      const pages = new DummyPage();
      pages.image1 = () => failure === "data" && loads === 1
        ? Promise.reject(new Error("page data unavailable"))
        : Promise.resolve({ src: "right" });
      pages.image2 = () => slow.promise;
      return pages;
    }, -1);
    await flush();
    assert.equal(typeof retry, "function");
    assert.equal(await controller.actions.nextHalf.isEnable(), true);
    retry();
    await flush();
    assert.equal(failure === "data" ? loads : imageAttempts, 2);
    slow.resolve({ src: "left" });
    await pending;
    await flush();
    assert.equal(view.rightPage.style.backgroundImage, 'url("right")');
    assert.equal(view.leftPage.style.backgroundImage, 'url("left")');
    assert.equal(notices.length, 1);
    assert.equal(await controller.actions.nextHalf.isEnable(), true);
  });
}

test("navigation skips an unresolved page image and reports only the destination", async (t) => {
  const slow = deferred();
  const book = Book([
    slow.promise,
    ...[1, 2, 3].map((index) => Promise.resolve({ src: `page-${index}` })),
  ]);
  const view = new Viewer(viewerDom());
  const controller = new ActionController(view, new DummyPage());
  t.after(() => controller.dispose());
  const notices = [];
  view.onChanged.add((pages) => notices.push(pages.pageNumber()));
  const pending = controller.setCurrent(book.getSpreadPages(0));
  await flush();
  controller.doAction("nextHalf");
  controller.doAction("nextHalf");
  await flush();
  assert.equal(controller.current.pageNumber(), 2);
  assert.equal(view.rightPage.style.backgroundImage, 'url("page-2")');
  assert.deepEqual(notices, [2]);
  slow.resolve({ src: "old" });
  await pending;
  assert.deepEqual(notices, [2]);
});

test("chapter acquisition queues forward and backward inputs without skipping chapters", async (t) => {
  const chapter = deferred();
  const notices = [];
  const reader = multiBook({
    bookList: ["first", "second"],
    getBook: () => chapter.promise,
    loading: { preloadNextBook: false },
    onPageChanged: (event) => notices.push(event),
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  t.after(() => reader.dispose());
  reader.action.move(0, -1);
  reader.controller.doAction("nextPageOrBook");
  reader.controller.doAction("nextPageOrBook");
  reader.controller.doAction("prevPageOrBook");
  await flush();
  assert.equal(reader.action.index, 0);
  chapter.resolve(Book(Array.from({ length: 8 }, (_, i) =>
    Promise.resolve({ src: `page-${i}`, isWidePage: false }))));
  await flush();
  await flush();
  assert.equal(reader.action.index, 0);
  assert.equal(reader.controller.current.pageNumber(), 1);
  assert.deepEqual(notices, [{ book: "first", page: 1 }]);
});

test("new chapter discards pending page operations and their chapter fallback", async (t) => {
  const metadata = deferred();
  const old = Book([Promise.resolve({ src: "old" })]).getSpreadPages(0);
  old.hasNext = () => metadata.promise;
  const reader = multiBook({
    bookList: ["old", "new", "unwanted"],
    getBook: async (name) => name === "old" ? { getSpreadPages: () => old }
      : Book([Promise.resolve({ src: name })]),
    loading: { preloadNextBook: false },
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  t.after(() => reader.dispose());
  reader.action.move(0, 0);
  await flush();
  // Queue during acquisition so availability is evaluated inside the queue.
  void reader.controller.setCurrent(Promise.resolve(old));
  reader.controller.doAction("nextPageOrBook");
  reader.controller.doAction("nextHalf");
  await flush();
  reader.action.move(1, -1);
  await flush();
  metadata.resolve(false);
  await flush();
  assert.equal(reader.action.index, 1);
  assert.equal(reader.controller.current.pageNumber(), -1);
  assert.equal(reader.controller.view.leftPage.style.backgroundImage, 'url("new")');
});

test("range navigation supersedes pending relative navigation", async (t) => {
  const slow = deferred();
  const book = Book([
    slow.promise,
    ...[1, 2, 3, 4].map((i) => Promise.resolve({ src: `page-${i}` })),
  ]);
  const view = new Viewer(viewerDom());
  let range;
  const disabled = [];
  view.setRangeHandler = (handler) => { range = handler; };
  view.setRangeDisabled = (value) => disabled.push(value);
  const controller = new ActionController(view, new DummyPage());
  t.after(() => controller.dispose());
  const pending = controller.open(async (position) => book.getSpreadPages(position), 0);
  await flush();
  controller.doAction("nextPage");
  await flush();
  range(3);
  await flush();
  assert.equal(controller.current.pageNumber(), 3);
  assert.equal(view.rightPage.style.backgroundImage, 'url("page-3")');
  assert.ok(disabled.every((value) => value === false));
  slow.resolve({ src: "old" });
  await pending;
  await flush();
  assert.equal(controller.current.pageNumber(), 3);
});

test("queued next-page navigation at the end selects the next chapter", async (t) => {
  const chapter = deferred();
  const reader = multiBook({
    bookList: ["first", "second"],
    getBook: async (name) => name === "first" ? chapter.promise
      : Book([Promise.resolve({ src: "second" })]),
    loading: { preloadNextBook: false },
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  t.after(() => reader.dispose());
  reader.action.move(0, 0);
  reader.controller.doAction("nextPageOrBook");
  await flush();
  chapter.resolve(Book([Promise.resolve({ src: "first" })]));
  await flush();
  await flush();
  assert.equal(reader.action.index, 1);
  assert.equal(reader.controller.view.leftPage.style.backgroundImage, 'url("second")');
});

test("retry after failed acquisition replays queued navigation with fresh chapter data", async (t) => {
  let reject;
  const firstAttempt = new Promise((_, fail) => { reject = fail; });
  const view = new Viewer(viewerDom());
  const controller = new ActionController(view, new DummyPage());
  t.after(() => controller.dispose());
  const book = Book(Array.from({ length: 8 }, (_, i) =>
    Promise.resolve({ src: `page-${i}`, isWidePage: false })));
  const loads = [];
  let retry;
  view.showLoadError = (callback) => { retry = callback; };
  void controller.open(async (position, reload) => {
    loads.push({ position, reload });
    return reload ? book.getSpreadPages(position) : firstAttempt;
  }, 1);
  controller.doAction("nextPageOrBook");
  controller.doAction("nextHalf");
  await flush();
  reject(new Error("chapter unavailable"));
  await flush();
  assert.equal(typeof retry, "function");
  retry();
  await flush();
  await flush();
  assert.deepEqual(loads, [{ position: 1, reload: false }, { position: 1, reload: true }]);
  assert.equal(controller.current.pageNumber(), 4);
  assert.equal(view.rightPage.style.backgroundImage, 'url("page-4")');
});

test("composite shortcuts preserve explicitly replaced page actions", async (t) => {
  let calls = 0;
  const controller = new ActionController(new Viewer(viewerDom()), new DummyPage(), {
    nextPage: () => { calls++; },
  });
  t.after(() => controller.dispose());
  await flush();
  controller.doAction("nextPageOrBook");
  await flush();
  assert.equal(calls, 1);
});
