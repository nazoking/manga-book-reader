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
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
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
    assert.equal(await controller.actions.nextHalf.isEnable(), false);
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
