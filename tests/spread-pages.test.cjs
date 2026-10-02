const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  Book,
  Viewer,
  AutoImage,
  viewerDom,
  ActionController,
  DummyPage,
  ImageCache,
} = require("./helpers.cjs");
global.Image = AutoImage;
const make = (types) =>
  Book(
    types.map((isWidePage, i) =>
      Promise.resolve(Object.freeze({ src: `p${i}`, isWidePage }))
    )
  );

// Positions follow cover (-1), then normal pairs or individual wide pages.
for (const [types, positions, images] of [
  [[], [-1], [[null, null]]],
  [[false], [-1], [[null, "p0"]]],
  [[true], [-1], [[null, "p0"]]],
  [
    [false, false],
    [-1, 1],
    [
      [null, "p0"],
      ["p1", null],
    ],
  ],
  [
    [false, false, false],
    [-1, 1],
    [
      [null, "p0"],
      ["p1", "p2"],
    ],
  ],
  [
    [false, false, false, false],
    [-1, 1, 3],
    [
      [null, "p0"],
      ["p1", "p2"],
      ["p3", null],
    ],
  ],
  [
    [false, true, false],
    [-1, 1, 2],
    [
      [null, "p0"],
      ["p1", null],
      ["p2", null],
    ],
  ],
  [
    [true, false, true, false, false],
    [-1, 1, 2, 3],
    [
      [null, "p0"],
      ["p1", null],
      ["p2", null],
      ["p3", "p4"],
    ],
  ],
]) {
  test(`cover traversal ${JSON.stringify(types)}`, async () => {
    const book = make(types);
    let spread = book.getSpreadPages(-1);
    for (let i = 0; i < positions.length; i++) {
      assert.equal(spread.pageNumber(), positions[i]);
      assert.deepEqual(
        [
          (await spread.image1())?.src ?? null,
          (await spread.image2())?.src ?? null,
        ],
        images[i]
      );
      assert.equal(await spread.hasNext(), i < positions.length - 1);
      assert.equal(await spread.hasPrev(), i > 0);
      if (i < positions.length - 1) spread = await spread.nextPage();
    }
    assert.equal((await spread.nextPage()).pageNumber(), spread.pageNumber());
    for (let i = positions.length - 2; i >= 0; i--) {
      spread = await spread.prevPage();
      assert.equal(spread.pageNumber(), positions[i]);
    }
    assert.equal((await spread.prevPage()).pageNumber(), -1);
  });
}

test("a normal page preceding a wide page displays alone without skipping the wide page", async () => {
  const spread = make([false, true, false]).getSpreadPages(0);
  assert.equal((await spread.image1()).src, "p0");
  assert.equal(await spread.image2(), null);
  assert.equal(await spread.isSingleUnit(), false); // Keep the normal page on the right half.
  assert.equal((await spread.nextPage()).pageNumber(), 1);
  assert.equal(await spread.hasPrev(), true);
  assert.equal((await spread.prevPage()).pageNumber(), -1);
});

test("relative canMove agrees with range clamping and last-relative positions", async () => {
  const book = make([false, false, false]);
  const spread = book.getSpreadPages(2);
  assert.equal(await spread.canMove(1), false);
  assert.equal(await spread.canMove(-3), true);
  assert.equal(await spread.canMove(-4), false);
  assert.equal(await spread.canMove(0), false);
  assert.equal((await spread.move(1)).pageNumber(), 2);
  assert.equal(book.getSpreadPages({ last: 0 }).pageNumber(), 1);
  assert.equal(book.getSpreadPages({ last: -1 }).pageNumber(), 2);
  assert.equal(await make([]).getSpreadPages(-1).canMove(1), false);
});

test("wide cover remains visible on the left and frozen input renders", async () => {
  const view = new Viewer(viewerDom());
  const toggles = new Map();
  view.inner.classList.toggle = (name, value) => toggles.set(name, value);
  await view.setCurrent(make([true]).getSpreadPages(-1));
  assert.equal(view.rightPage.style.backgroundImage, "");
  assert.equal(view.leftPage.style.backgroundImage, 'url("p0")');
  assert.equal(toggles.get("single"), true);
  assert.equal(toggles.get("single-left"), true);
  view.dispose();
});

test("unspecified frozen metadata is classified from dimensions without mutation", async () => {
  const data = Object.freeze({ src: "wide" });
  const book = Book([Promise.resolve(data), Promise.resolve({ src: "next" })]);
  const spread = book.getSpreadPages(0);
  const view = new Viewer(viewerDom(), {
    imageCache: undefined,
    loading: {
      imageFactory: () => {
        const image = new AutoImage();
        image.naturalWidth = 1600;
        return image;
      },
    },
  });
  await view.setCurrent(spread);
  assert.equal(await spread.isSingleUnit(), true);
  assert.equal((await spread.nextPage()).pageNumber(), 1);
  assert.equal(data.isWidePage, undefined);
  view.dispose();
});

test("all short mixed books traverse every image once and reverse the same spreads", async () => {
  for (let length = 1; length <= 6; length++) {
    for (let mask = 0; mask < 2 ** length; mask++) {
      const book = make(Array.from({ length }, (_, i) => !!(mask & (1 << i))));
      let spread = book.getSpreadPages(-1);
      const seen = [];
      const positions = [];
      do {
        positions.push(spread.pageNumber());
        for (const data of [await spread.image1(), await spread.image2()])
          if (data) seen.push(data.src);
        if (!(await spread.hasNext())) break;
        spread = await spread.nextPage();
      } while (true);
      assert.deepEqual(
        seen,
        Array.from({ length }, (_, i) => `p${i}`)
      );
      for (let i = positions.length - 2; i >= 0; i--) {
        spread = await spread.prevPage();
        assert.equal(spread.pageNumber(), positions[i]);
        // Independent reconstruction uses the same cover-based alignment.
        assert.equal(
          (await book.getSpreadPages(positions[i + 1]).prevPage()).pageNumber(),
          positions[i]
        );
      }
    }
  }
});

test("arbitrary starts retain their alignment on next then previous", async () => {
  const book = make([false, false, false, true, false]);
  for (let i = 0; i < 4; i++) {
    const current = book.getSpreadPages(i);
    const next = await current.nextPage();
    assert.equal((await next.prevPage()).pageNumber(), i);
  }
});

test("queued turns preserve input order while metadata and rendering are pending", async () => {
  let resolve;
  const metadata = new Promise((r) => {
    resolve = r;
  });
  const book = Book([
    Promise.resolve({ src: "cover" }),
    metadata,
    Promise.resolve({ src: "normal", isWidePage: false }),
    Promise.resolve({ src: "wide", isWidePage: true }),
  ]);
  const view = new Viewer(viewerDom());
  const controller = new ActionController(view, new DummyPage());
  // Rendering can remain unresolved while navigation applies the queued inputs.
  view.setCurrent = async () => new Promise(() => {});
  void controller.setCurrent(Promise.resolve(book.getSpreadPages(-1)));
  controller.doAction("nextPage");
  controller.doAction("nextPage");
  controller.doAction("prevPage");
  await new Promise((r) => setImmediate(r));
  resolve({ src: "wide-first", isWidePage: true });
  await new Promise((r) => setImmediate(r));
  assert.equal(controller.current.pageNumber(), 1);
  controller.dispose();
});

const sizedCache = (wideSources) =>
  new ImageCache({
    imageFactory: () =>
      new (class extends AutoImage {
        set src(value) {
          this.naturalWidth = wideSources.includes(value) ? 1600 : 800;
          super.src = value;
        }
        get src() {
          return super.src;
        }
      })(),
  });

test("wide cover with no metadata is inferred and shown on the left", async (t) => {
  const cache = sizedCache(["wide-cover"]);
  const view = new Viewer(viewerDom(), { imageCache: cache });
  t.after(() => {
    view.dispose();
    cache.dispose();
  });
  const spread = Book([
    Promise.resolve(Object.freeze({ src: "wide-cover" })),
  ]).getSpreadPages(-1);
  const toggles = new Map();
  view.inner.classList.toggle = (key, value) => toggles.set(key, value);
  await view.setCurrent(spread);
  assert.equal(toggles.get("single"), true);
  assert.equal(toggles.get("single-left"), true);
  assert.equal(await spread.hasNext(), false);
  assert.equal(view.leftPage.style.backgroundImage, 'url("wide-cover")');
});

test("mixed unknown dimensions display all images exactly once in forward and reverse order", async (t) => {
  const cache = sizedCache(["p1", "p3"]);
  const view = new Viewer(viewerDom(), { imageCache: cache });
  t.after(() => {
    view.dispose();
    cache.dispose();
  });
  const book = Book(
    Array.from({ length: 6 }, (_, i) =>
      Promise.resolve(Object.freeze({ src: `p${i}` }))
    )
  );
  let current = book.getSpreadPages(-1);
  const seen = [];
  const positions = [];
  do {
    await view.setCurrent(current);
    positions.push(current.pageNumber());
    for (const data of [await current.image1(), await current.image2()])
      if (data) seen.push(data.src);
    if (!(await current.hasNext())) break;
    current = await current.nextPage();
  } while (true);
  assert.deepEqual(positions, [-1, 1, 2, 3, 4]);
  assert.deepEqual(seen, ["p0", "p1", "p2", "p3", "p4", "p5"]);
  for (let i = positions.length - 2; i >= 0; i--) {
    current = await current.prevPage();
    await view.setCurrent(current);
    assert.equal(current.pageNumber(), positions[i]);
  }
  const arbitrary = book.getSpreadPages(0);
  await view.setCurrent(arbitrary);
  assert.equal(await arbitrary.image2(), null);
  assert.equal((await arbitrary.nextPage()).pageNumber(), 1);
});

test("queued turns bypass pending dimensions and retain their chosen positions", async (t) => {
  let finish;
  const cache = new ImageCache({
    imageFactory: () =>
      new (class extends AutoImage {
        set src(value) {
          if (value === "slow-wide") {
            this._src = value;
            this.naturalWidth = 1600;
            finish = () => {
              this.complete = true;
              this.dispatchEvent(new Event("load"));
            };
          } else super.src = value;
        }
        get src() {
          return this._src;
        }
      })(),
  });
  const view = new Viewer(viewerDom(), { imageCache: cache });
  const controller = new ActionController(view, new DummyPage());
  t.after(() => {
    controller.dispose();
    cache.dispose();
  });
  const book = Book(
    ["slow-wide", "p1", "p2", "p3", "p4", "p5", "p6", "p7"].map((src) =>
      Promise.resolve(Object.freeze({ src }))
    )
  );
  const notices = [];
  view.onChanged.add((spread) => notices.push(spread.pageNumber()));
  const pending = controller.setCurrent(
    Promise.resolve(book.getSpreadPages(0))
  );
  await new Promise((resolve) => setImmediate(resolve));
  controller.doAction("nextPage");
  controller.doAction("nextPage");
  controller.doAction("prevPage");
  await new Promise((r) => setImmediate(r));
  assert.equal(controller.current.pageNumber(), 2);
  assert.deepEqual(notices, [2]);
  finish();
  await pending;
  await new Promise((r) => setImmediate(r));
  assert.equal(controller.current.pageNumber(), 2);
  assert.deepEqual(notices, [2]);
});

test("explicit metadata overrides detected dimensions", async (t) => {
  const cache = sizedCache(["p0", "p1"]);
  const view = new Viewer(viewerDom(), { imageCache: cache });
  t.after(() => {
    view.dispose();
    cache.dispose();
  });
  const spread = make([false, false]).getSpreadPages(0);
  await view.setCurrent(spread);
  assert.equal(await spread.isSingleUnit(), false);
  assert.equal((await spread.image2()).src, "p1");
});

test("full-page turns bypass unresolved page data without waiting for its dimensions", async (t) => {
  let finish;
  const pendingData = new Promise((resolve) => {
    finish = resolve;
  });
  const book = Book([
    pendingData,
    ...["p1", "p2", "p3"].map((src) => Promise.resolve({ src })),
  ]);
  const view = new Viewer(viewerDom());
  const controller = new ActionController(view, new DummyPage());
  t.after(() => controller.dispose());
  const pending = controller.setCurrent(book.getSpreadPages(0));
  await new Promise((r) => setImmediate(r));
  controller.doAction("nextPage");
  await new Promise((r) => setImmediate(r));
  assert.equal(controller.current.pageNumber(), 2);
  assert.equal(view.rightPage.style.backgroundImage, 'url("p2")');
  finish({ src: "late-wide", isWidePage: true });
  await pending;
  assert.equal(controller.current.pageNumber(), 2);
  assert.equal(view.rightPage.style.backgroundImage, 'url("p2")');
});

test("both portrait dimensions start in parallel and their completed spread turns by two", async (t) => {
  const started = [];
  const complete = new Map();
  const cache = new ImageCache({
    imageFactory: () =>
      new (class extends AutoImage {
        set src(value) {
          if (!value) return;
          this._src = value;
          started.push(value);
          complete.set(value, () => {
            this.complete = true;
            this.dispatchEvent(new Event("load"));
          });
        }
        get src() {
          return this._src;
        }
      })(),
  });
  const view = new Viewer(viewerDom(), { imageCache: cache });
  t.after(() => {
    view.dispose();
    cache.dispose();
  });
  const book = Book(["p0", "p1", "p2"].map((src) => Promise.resolve({ src })));
  const spread = book.getSpreadPages(0);
  const render = view.setCurrent(spread);
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(started.sort(), ["p0", "p1"]);
  complete.get("p0")();
  complete.get("p1")();
  await render;
  assert.equal((await spread.nextPage()).pageNumber(), 2);
  assert.equal(await spread.isSingleUnit(), false);
});

const controlledSizes = (t) => {
  const complete = new Map();
  const cache = new ImageCache({
    retries: 0,
    maxConcurrent: 2,
    imageFactory: () =>
      new (class extends AutoImage {
        set src(value) {
          if (!value) return;
          this._src = value;
          complete.set(value, (wide) => {
            this.naturalWidth = wide ? 1600 : 800;
            this.complete = true;
            this.dispatchEvent(new Event("load"));
          });
        }
        get src() {
          return this._src;
        }
      })(),
  });
  const view = new Viewer(viewerDom(), { imageCache: cache });
  const toggles = [];
  view.inner.classList.toggle = (key, value) => toggles.push([key, value]);
  t.after(() => {
    view.dispose();
    cache.dispose();
  });
  const book = Book(
    Array.from({ length: 8 }, (_, i) =>
      Promise.resolve(Object.freeze({ src: `u${i}` }))
    )
  );
  return { view, book, complete, toggles };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("unknown sizes expose both pages and allow successive two-image turns", async (t) => {
  const { view, book, complete } = controlledSizes(t);
  let spread = book.getSpreadPages(0);
  const rendering = view.setCurrent(spread);
  await tick();
  assert.equal((await spread.image2()).src, "u1");
  assert.equal(await spread.isSingleUnit(), false);
  spread = await spread.nextPage();
  assert.equal(spread.pageNumber(), 2);
  spread = await spread.nextPage();
  assert.equal(spread.pageNumber(), 4);
  complete.get("u0")(false);
  complete.get("u1")(false);
  await rendering;
});

test("a current right image becoming wide evicts left without waiting for left to load", async (t) => {
  const { view, book, complete, toggles } = controlledSizes(t);
  const spread = book.getSpreadPages(0);
  const rendering = view.setCurrent(spread);
  await tick();
  complete.get("u0")(true);
  await rendering;
  assert.equal(view.inner.dataset.pageNumber, "0");
  assert.equal(view.rightPage.style.backgroundImage, 'url("u0")');
  assert.equal(view.leftPage.style.backgroundImage, "");
  assert.equal(await spread.image2(), null);
  assert.ok(toggles.some(([key, value]) => key === "single" && value === true));
  const before = JSON.stringify(toggles);
  complete.get("u1")(true); // Already evicted: its later result must not update layout.
  await tick();
  assert.equal(JSON.stringify(toggles), before);
});

test("a current left image becoming wide evicts left and preserves the right image and anchor", async (t) => {
  const { view, book, complete, toggles } = controlledSizes(t);
  const spread = book.getSpreadPages(0);
  const rendering = view.setCurrent(spread);
  await tick();
  complete.get("u0")(false);
  await tick();
  assert.equal(view.rightPage.style.backgroundImage, 'url("u0")');
  const before = toggles.length;
  complete.get("u1")(true);
  await rendering;
  assert.equal(view.inner.dataset.pageNumber, "0");
  assert.equal(view.rightPage.style.backgroundImage, 'url("u0")');
  assert.equal(view.leftPage.style.backgroundImage, "");
  assert.ok(
    toggles
      .slice(before)
      .every(([key, value]) => key !== "single" || value === false)
  );
  assert.equal((await spread.nextPage()).pageNumber(), 1);
});

test("late wide results from skipped spreads cannot repaint or reflow the current spread", async (t) => {
  const { view, book, complete, toggles } = controlledSizes(t);
  const old = view.setCurrent(book.getSpreadPages(0));
  await tick();
  const current = book.getSpreadPages(4);
  const rendering = view.setCurrent(current);
  await tick();
  complete.get("u4")(false);
  complete.get("u5")(false);
  await rendering;
  const before = JSON.stringify(toggles);
  complete.get("u0")(true);
  complete.get("u1")(true);
  await old;
  await tick();
  assert.equal(view.inner.dataset.pageNumber, "4");
  assert.equal(view.rightPage.style.backgroundImage, 'url("u4")');
  assert.equal(view.leftPage.style.backgroundImage, 'url("u5")');
  assert.equal(JSON.stringify(toggles), before);
  assert.equal((await current.nextPage()).pageNumber(), 6);
});

test("portrait confirmations do not change the current spread layout", async (t) => {
  const { view, book, complete, toggles } = controlledSizes(t);
  const spread = book.getSpreadPages(0);
  const rendering = view.setCurrent(spread);
  await tick();
  const initial = toggles.length;
  complete.get("u0")(false);
  await tick();
  assert.equal(toggles.length, initial);
  assert.equal((await spread.image2()).src, "u1");
  complete.get("u1")(false);
  await rendering;
  assert.equal(view.inner.dataset.pageNumber, "0");
  assert.equal(view.leftPage.style.backgroundImage, 'url("u1")');
  assert.ok(
    toggles.every(([key, value]) => key !== "single" || value === false)
  );
});

test("an older layout promise cannot overwrite a newer layout within the same render", async (t) => {
  const view = new Viewer(viewerDom());
  t.after(() => view.dispose());
  const spread = make([false]).getSpreadPages(0);
  let finishInitial;
  const initial = new Promise((resolve) => {
    finishInitial = resolve;
  });
  let calls = 0;
  let single = false;
  let changed;
  spread.isSingleUnit = () =>
    ++calls === 1 ? initial : Promise.resolve(single);
  spread.onLayoutChanged = (listener) => {
    changed = listener;
    return () => {};
  };
  const toggles = [];
  view.inner.classList.toggle = (key, value) => {
    if (key === "single") toggles.push(value);
  };
  await view.setCurrent(spread);
  single = true;
  changed();
  await tick();
  assert.equal(toggles.at(-1), true);
  finishInitial(false);
  await tick();
  assert.equal(toggles.at(-1), true);
});
