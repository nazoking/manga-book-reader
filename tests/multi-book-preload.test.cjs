const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  multiBook,
  Book,
  ImageCache,
  AutoImage,
  viewerDom,
  requested,
} = require("./helpers.cjs");

const flush = async () => {
  for (let i = 0; i < 30; i++)
    await new Promise((resolve) => setTimeout(resolve, 0));
};

test("preloads nearby pages and the next chapter without firing navigation callbacks", async () => {
  global.Image = AutoImage;
  requested.length = 0;
  const changes = [];
  const pageChanges = [];
  const loads = [];
  const imageCache = new ImageCache({ retries: 0 });
  const reader = multiBook({
    bookList: [{ title: "one" }, { title: "two" }],
    getBook: async (book) => {
      loads.push(book.title);
      const prefix = book.title === "one" ? "one-" : "two-";
      const pages = Array.from(
        { length: book.title === "one" ? 3 : 2 },
        (_, index) => Promise.resolve({ src: `${prefix}${index}` })
      );
      return Book(pages);
    },
    onBookChanged: (event) => changes.push(event),
    onPageChanged: (event) => pageChanges.push(event),
    loading: {
      preloadAhead: 2,
      preloadBehind: 0,
      nextBookThreshold: 2,
      nextBookPages: 2,
    },
    imageCache,
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });

  reader.action.move(0, 0);
  await flush();
  assert.ok(requested.includes("one-2"));
  assert.ok(requested.includes("two-0"));
  assert.ok(loads.includes("two"));
  assert.deepEqual(changes, [{ book: { title: "one" }, page: 0 }]);
  assert.deepEqual(pageChanges, [{ book: { title: "one" }, page: 0 }]);

  reader.dispose();
  imageCache.dispose();
});

test("chapter retry restores navigation callbacks and nearby preloading", async (t) => {
  global.Image = AutoImage;
  requested.length = 0;
  let attempts = 0;
  let retry;
  const changes = [];
  const pageChanges = [];
  const reader = multiBook({
    bookList: ["one"],
    getBook: async () => {
      if (++attempts === 1) throw new Error("temporary chapter failure");
      return Book(
        Array.from({ length: 5 }, (_, index) =>
          Promise.resolve({ src: `retry-${index}` })
        )
      );
    },
    onBookChanged: (event) => changes.push(event),
    onPageChanged: (event) => pageChanges.push(event),
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  t.after(() => reader.dispose());
  reader.controller.view.showLoadError = (callback) => {
    retry = callback;
  };
  reader.action.move(0, -1);
  await flush();
  assert.equal(typeof retry, "function");
  assert.deepEqual(pageChanges, []);
  retry();
  await flush();
  assert.equal(attempts, 2);
  assert.deepEqual(changes, [{ book: "one", page: -1 }]);
  assert.deepEqual(pageChanges, [{ book: "one", page: -1 }]);
  assert.ok(requested.includes("retry-2"));
  reader.controller.doAction("nextPage");
  await flush();
  assert.deepEqual(pageChanges, [
    { book: "one", page: -1 },
    { book: "one", page: 1 },
  ]);
  assert.equal(changes.length, 1);
});

test("nearby images preload while the next chapter is pending", async (t) => {
  global.Image = AutoImage;
  requested.length = 0;
  let resolveNext;
  const pendingNext = new Promise((resolve) => {
    resolveNext = resolve;
  });
  const loads = [];
  const notices = [];
  const reader = multiBook({
    bookList: ["current", "next"],
    getBook: async (name) => {
      loads.push(name);
      return name === "next"
        ? pendingNext
        : Book(
            Array.from({ length: 4 }, (_, index) =>
              Promise.resolve({ src: `current-${index}` })
            )
          );
    },
    onPageChanged: (event) => notices.push(event),
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  t.after(() => reader.dispose());
  reader.action.move(0, 0);
  await flush();
  assert.ok(loads.includes("next"));
  assert.ok(requested.includes("current-2"));
  assert.ok(requested.includes("current-3"));
  resolveNext(Book([Promise.resolve({ src: "next-0" })]));
  await flush();
  assert.ok(requested.includes("next-0"));
  assert.deepEqual(notices, [{ book: "current", page: 0 }]);
});

test("late next-chapter results cannot restart preloading after navigation", async (t) => {
  global.Image = AutoImage;
  requested.length = 0;
  let resolveNext;
  let resolveDestination;
  const pendingNext = new Promise((resolve) => {
    resolveNext = resolve;
  });
  const pendingDestination = new Promise((resolve) => {
    resolveDestination = resolve;
  });
  const reader = multiBook({
    bookList: ["current", "next", "destination"],
    getBook: async (name) => {
      if (name === "next") return pendingNext;
      if (name === "destination") return pendingDestination;
      return Book([Promise.resolve({ src: "current-0" })]);
    },
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  t.after(() => reader.dispose());
  reader.action.move(0, -1);
  await flush();
  reader.action.move(2, -1);
  // This loader ignores cancellation, so its old result still arrives.
  resolveNext(Book([Promise.resolve({ src: "stale-next-0" })]));
  await flush();
  assert.ok(!requested.includes("stale-next-0"));
  resolveDestination(Book([Promise.resolve({ src: "destination-0" })]));
  await flush();
  assert.equal(
    reader.controller.view.leftPage.style.backgroundImage,
    'url("destination-0")'
  );
});

test("shared cache respects each reader's preload settings", async (t) => {
  global.Image = AutoImage;
  requested.length = 0;
  const imageCache = new ImageCache();
  const loads = [];
  const reader = multiBook({
    bookList: ["a", "b"],
    imageCache,
    loading: { preloadAhead: 0, preloadBehind: 0, preloadNextBook: false },
    getBook: async (name) => {
      loads.push(name);
      return Book(
        Array.from({ length: 4 }, (_, i) => Promise.resolve({ src: name + i }))
      );
    },
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  t.after(() => {
    reader.dispose();
    imageCache.dispose();
  });
  reader.action.move(0, -1);
  await flush();
  assert.deepEqual(loads, ["a"]);
  assert.deepEqual(requested, ["a0"]);
});

test("page data retry reloads the chapter at the current position", async (t) => {
  global.Image = AutoImage;
  let rejectPage;
  const pendingPage = new Promise((_, reject) => {
    rejectPage = reject;
  });
  let attempts = 0;
  const notices = [];
  const reader = multiBook({
    bookList: ["chapter"],
    loading: { preloadAhead: 0, preloadBehind: 0, preloadNextBook: false },
    getBook: async () => {
      attempts++;
      return Book([
        Promise.resolve({ src: "cover" }),
        attempts === 1 ? pendingPage : Promise.resolve({ src: "recovered" }),
      ]);
    },
    onPageChanged: (event) => notices.push(event.page),
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  t.after(() => reader.dispose());
  let retry;
  reader.controller.view.showPageRetry = (_, callback) => {
    retry = callback;
  };
  reader.action.move(0, -1);
  await flush();
  reader.controller.doAction("nextPage");
  rejectPage(new Error("temporary URL lookup failure"));
  await flush();
  assert.equal(typeof retry, "function");
  retry();
  await flush();
  assert.equal(attempts, 2);
  assert.equal(reader.controller.current.pageNumber(), 1);
  assert.deepEqual(notices, [-1, 1]);
  assert.equal(
    reader.controller.view.rightPage.style.backgroundImage,
    'url("recovered")'
  );
});

test("disposal releases this reader's images without disposing a shared cache", async () => {
  global.Image = AutoImage;
  requested.length = 0;
  const cache = new ImageCache({ maxEntries: 0 });
  const makeReader = () =>
    multiBook({
      bookList: ["shared"],
      imageCache: cache,
      getBook: async () => Book([Promise.resolve({ src: "shared-cover" })]),
      viewerDom: viewerDom(),
      getBookSelector: () => "",
    });
  const first = makeReader();
  const second = makeReader();
  first.action.move(0, -1);
  second.action.move(0, -1);
  await flush();
  assert.deepEqual(requested, ["shared-cover"]);
  first.dispose();
  await cache.load("shared-cover");
  assert.equal(requested.length, 1);
  second.dispose();
  await cache.load("shared-cover");
  assert.equal(requested.length, 2);
  cache.dispose();
});

test("image retry redraws through the controller without reloading chapter data", async (t) => {
  let imageAttempts = 0;
  global.Image = class extends AutoImage {
    set src(value) {
      if (!value) return;
      if (++imageAttempts === 1) {
        queueMicrotask(() => this.dispatchEvent(new Event("error")));
      } else {
        super.src = value;
      }
    }
  };
  let bookLoads = 0;
  const notices = [];
  const reader = multiBook({
    bookList: ["one"],
    loading: { retries: 0, preloadAhead: 0, preloadNextBook: false },
    getBook: async () => {
      bookLoads++;
      return Book([Promise.resolve({ src: "cover" })]);
    },
    onPageChanged: (event) => notices.push(event.page),
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  t.after(() => reader.dispose());
  let retry;
  reader.controller.view.showPageRetry = (_, callback) => {
    retry = callback;
  };
  reader.action.move(0, -1);
  await flush();
  assert.deepEqual(notices, []);
  retry();
  assert.equal(await reader.controller.actions.nextHalf.isEnable(), false);
  await flush();
  assert.equal(bookLoads, 1);
  assert.equal(imageAttempts, 2);
  assert.deepEqual(notices, [-1]);
  assert.equal(await reader.controller.actions.nextHalf.isEnable(), true);
});

test("a chapter loader that ignores abort cannot render after disposal", async () => {
  global.Image = AutoImage;
  requested.length = 0;
  let resolveBook;
  const notices = [];
  const reader = multiBook({
    bookList: ["one"],
    getBook: () =>
      new Promise((resolve) => {
        resolveBook = resolve;
      }),
    onPageChanged: (event) => notices.push(event),
    viewerDom: viewerDom(),
    getBookSelector: () => "",
  });
  reader.action.move(0, -1);
  await flush();
  reader.dispose();
  resolveBook(Book([Promise.resolve({ src: "late" })]));
  await flush();
  assert.deepEqual(requested, []);
  assert.deepEqual(notices, []);
});

test("chapter navigation has one index and distinguishes identical metadata", async (t) => {
  global.Image = AutoImage;
  requested.length = 0;
  const selected = [];
  const reader = multiBook({
    bookList: ["same", "same"],
    loading: { preloadNextBook: false },
    getBook: async (_, index) =>
      Book([Promise.resolve({ src: `chapter-${index}` })]),
    viewerDom: viewerDom(),
    getBookSelector: ({ onBookChanged }) => {
      onBookChanged.add((event) => {
        selected.push(event);
      });
      return "";
    },
  });
  t.after(() => reader.dispose());
  reader.action.move(0, -1);
  await flush();
  reader.controller.doAction("nextBook");
  await flush();
  assert.equal(reader.action.index, 1);
  assert.equal(await reader.controller.actions.nextBook.isEnable(), false);
  assert.equal(
    reader.controller.view.leftPage.style.backgroundImage,
    'url("chapter-1")'
  );
  reader.controller.doAction("prevBookLast");
  await flush();
  assert.equal(reader.action.index, 0);
  assert.equal(await reader.controller.actions.prevBook.isEnable(), false);
  assert.deepEqual(
    selected,
    [0, 1, 0].map((bookIndex) => ({ book: "same", bookIndex }))
  );
  reader.action.move(999);
  await flush();
  assert.equal(reader.action.index, 1);
});
