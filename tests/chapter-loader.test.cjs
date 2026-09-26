const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadChapterDocument } = require("./helpers.cjs");

const response = (
  status,
  url = "https://cdn.example/redirected/chapter.html",
  retryAfter
) => ({
  ok: status >= 200 && status < 300,
  status,
  url,
  headers: { get: (name) => (name === "Retry-After" ? retryAfter : null) },
  text: async () => "<html></html>",
});

test("rejects permanent chapter HTTP errors without retrying", async () => {
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = async () => {
    requests++;
    return response(404);
  };
  try {
    await assert.rejects(
      loadChapterDocument(
        { url: "https://example.test/chapter" },
        { retryDelaysMs: [0] }
      ),
      /Chapter request failed \(404\)/
    );
    assert.equal(requests, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test("retries temporary server failures and resolves relative base URLs against redirect URL", async () => {
  const originalFetch = global.fetch;
  const originalDOMParser = global.DOMParser;
  let requests = 0;
  let assignedBase;
  global.fetch = async () => (++requests === 1 ? response(503) : response(200));
  global.DOMParser = class {
    parseFromString() {
      const base = {
        get href() {
          return assignedBase;
        },
        set href(value) {
          assignedBase = value;
        },
        getAttribute: () => "../images/",
      };
      return {
        head: { prepend() {} },
        querySelector: () => base,
        createElement: () => ({ href: "" }),
      };
    }
  };
  try {
    await loadChapterDocument(
      { url: "https://example.test/chapter" },
      { retries: 1, retryDelaysMs: [0] }
    );
    assert.equal(requests, 2);
    assert.equal(assignedBase, "https://cdn.example/images/");
  } finally {
    global.fetch = originalFetch;
    global.DOMParser = originalDOMParser;
  }
});

test("does not automatically retry a rate limit with a long Retry-After", async () => {
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = async () => {
    requests++;
    return response(429, undefined, "60");
  };
  try {
    await assert.rejects(
      loadChapterDocument(
        { url: "https://example.test/chapter" },
        { retryDelaysMs: [0] }
      ),
      /Chapter request failed \(429\)/
    );
    assert.equal(requests, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test("chapter retries use delays in order and clean up attempt timers", async (t) => {
  const waits = [];
  t.mock.method(global, "fetch", async () => response(503));
  t.mock.method(global, "setTimeout", (fn, ms) => {
    if (ms !== 20000) {
      waits.push(ms);
      queueMicrotask(fn);
    }
    return 1;
  });
  t.mock.method(global, "clearTimeout", () => {});
  await assert.rejects(
    loadChapterDocument(
      { url: "https://example.test/chapter" },
      { retries: 2, retryDelaysMs: [100, 300] }
    ),
    /Chapter request failed/
  );
  assert.deepEqual(waits, [100, 300]);
  assert.equal(global.clearTimeout.mock.callCount(), 5);
});

test("abort during chapter backoff prevents another request", async (t) => {
  const controller = new AbortController();
  t.mock.method(global, "fetch", async () => response(503));
  const request = loadChapterDocument(
    { url: "https://example.test/chapter", signal: controller.signal },
    { retryDelaysMs: [10000] }
  );
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  assert.equal(global.fetch.mock.callCount(), 1);
});
