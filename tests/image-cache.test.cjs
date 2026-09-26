const assert = require("node:assert/strict");
const { test } = require("node:test");
const { ImageCache, ImagePrefetch } = require("./helpers.cjs");

const fixture = (options = {}) => {
  const images = [];
  const cache = new ImageCache({
    retries: 0,
    retryDelaysMs: [0],
    ...options,
    imageFactory: () => {
      const image = new FakeImage();
      images.push(image);
      return image;
    },
  });
  return { cache, images };
};
class FakeImage extends EventTarget {
  naturalWidth = 0;
  naturalHeight = 0;
  complete = false;
  decoding = "async";
  set src(value) {
    this._src = value;
  }
  get src() {
    return this._src;
  }
  async decode() {}
  succeed(width = 800, height = 1200) {
    this.naturalWidth = width;
    this.naturalHeight = height;
    this.complete = true;
    this.dispatchEvent(new Event("load"));
  }
  fail() {
    this.dispatchEvent(new Event("error"));
  }
}
const flush = async () => {
  for (let i = 0; i < 8; i++)
    await new Promise((resolve) => setTimeout(resolve, 0));
};

test("disables preloading cleanly when its concurrency is zero", async () => {
  const { cache, images } = fixture({ maxPreloadConcurrent: 0 });
  new ImagePrefetch(cache).update(["ignored"]);
  await assert.rejects(
    cache.load("ignored", { priority: "preload" }),
    /preloading is disabled/
  );
  assert.equal(images.length, 0);
  cache.dispose();
});

test("deduplicates concurrent requests for the same URL", async () => {
  const { cache, images } = fixture();
  const first = cache.load("same");
  const second = cache.load("same");
  assert.equal(images.length, 1);
  images[0].succeed();
  assert.equal(await first, await second);
  cache.dispose();
});

test("display requests take priority over queued preloads", async () => {
  const { cache, images } = fixture({
    maxConcurrent: 1,
    maxPreloadConcurrent: 1,
  });
  const first = cache.load("visible-first");
  const prefetch = new ImagePrefetch(cache);
  prefetch.update(["next-a", "next-b"]);
  const promoted = cache.load("next-b", { priority: "display" });
  assert.equal(images.length, 1);
  images[0].succeed();
  await first;
  await flush();
  assert.equal(images[1].src, "next-b");
  images[1].succeed();
  await promoted;
  await flush();
  cache.dispose();
});

test("bounds concurrent network loads", async () => {
  const { cache, images } = fixture({ maxConcurrent: 2 });
  const requests = ["a", "b", "c"].map((src) => cache.load(src));
  assert.equal(images.length, 2);
  images[1].succeed();
  await requests[1];
  await flush();
  assert.equal(images.length, 3);
  images[0].succeed();
  images[2].succeed();
  await Promise.all([requests[0], requests[2]]);
  cache.dispose();
});

test("retries image errors and permits a fresh request after final failure", async () => {
  const { cache, images } = fixture({ retries: 1, retryDelaysMs: [0] });
  const request = cache.load("retry");
  images[0].fail();
  await flush();
  assert.equal(images.length, 2);
  images[1].succeed();
  await request;

  const failed = cache.load("fails");
  images[2].fail();
  await flush();
  images[3].fail();
  await assert.rejects(failed, /Failed to load image/);
  const fresh = cache.load("fails");
  assert.equal(images.length, 5);
  images[4].succeed();
  await fresh;
  cache.dispose();
});

test("times out a stalled image and allows a new request", async () => {
  const { cache, images } = fixture({ timeoutMs: 5 });
  await assert.rejects(cache.load("stalled"), /timed out/);
  const retry = cache.load("stalled");
  assert.equal(images.length, 2);
  images[1].succeed();
  await retry;
  cache.dispose();
});

test("evicts least recently used images without evicting retained images", async () => {
  const { cache, images } = fixture({ maxEntries: 2, maxBytes: 10_000_000 });
  const loadAndSucceed = async (src) => {
    const promise = cache.load(src);
    images.at(-1).succeed();
    await promise;
  };
  await loadAndSucceed("a");
  await loadAndSucceed("b");
  cache.retain("a");
  await loadAndSucceed("c");
  await cache.load("a");
  const reloadedB = cache.load("b");
  assert.equal(images.at(-1).src, "b");
  images.at(-1).succeed();
  await reloadedB;
  cache.dispose();
});

test("keeps a just-loaded display image until its reference is released", async () => {
  const { cache, images } = fixture({ maxEntries: 0, maxBytes: 0 });
  const release = cache.retain("visible");
  const visible = cache.load("visible");
  images[0].succeed();
  await visible;
  await cache.load("visible");
  assert.equal(images.length, 1);
  release();
  const reloaded = cache.load("visible");
  assert.equal(images.length, 2);
  images[1].succeed();
  await reloaded;
  cache.dispose();
});

test("cancels stale queued preloads and rejects pending work on disposal", async () => {
  const { cache, images } = fixture({ maxConcurrent: 1 });
  const visible = cache.load("visible");
  const prefetch = new ImagePrefetch(cache);
  prefetch.update(["stale"]);
  prefetch.update(["fresh"]);
  assert.equal(images.length, 1);
  images[0].succeed();
  await visible;
  await flush();
  assert.equal(images[1].src, "fresh");
  const pending = cache.load("pending");
  cache.dispose();
  await assert.rejects(pending, { name: "AbortError" });
});

test("one consumer cannot cancel or release another consumer's image", async () => {
  const { cache, images } = fixture({ maxEntries: 0 });
  const firstOwner = new AbortController();
  const releaseFirst = cache.retain("shared");
  const releaseSecond = cache.retain("shared");
  const first = cache.load("shared", { signal: firstOwner.signal });
  const second = cache.load("shared");
  firstOwner.abort();
  releaseFirst();
  releaseFirst(); // Releases are idempotent.
  await assert.rejects(first, { name: "AbortError" });
  assert.equal(images[0].src, "shared");
  images[0].succeed();
  await second;
  await cache.load("shared");
  assert.equal(images.length, 1);
  releaseSecond();
  const reloaded = cache.load("shared");
  assert.equal(images.length, 2);
  images[1].succeed();
  await reloaded;
  cache.dispose();
});

test("moving a prefetch window preserves overlap and clearing it preserves display requests", async () => {
  const { cache, images } = fixture({ maxConcurrent: 2 });
  const prefetch = new ImagePrefetch(cache);
  prefetch.update(["old", "overlap"]);
  const overlap = images[1];
  prefetch.update(["overlap", "new"]);
  assert.equal(images[0].src, "");
  assert.equal(overlap.src, "overlap");
  const visible = cache.load("overlap");
  prefetch.clear();
  await flush();
  assert.equal(overlap.src, "overlap");
  assert.equal(images.filter((image) => image.src === "overlap").length, 1);
  overlap.succeed();
  await visible;
  cache.dispose();
});

test("LRU order remains deterministic when loads share a clock timestamp", async (t) => {
  t.mock.method(Date, "now", () => 100);
  const { cache, images } = fixture({ maxEntries: 2 });
  for (const src of ["a", "b"]) {
    const request = cache.load(src);
    images.at(-1).succeed();
    await request;
  }
  await cache.load("a");
  const third = cache.load("c");
  images.at(-1).succeed();
  await third;
  await cache.load("a");
  assert.equal(images.length, 3);
  const evicted = cache.load("b");
  assert.equal(images.length, 4);
  images.at(-1).succeed();
  await evicted;
  cache.dispose();
});
