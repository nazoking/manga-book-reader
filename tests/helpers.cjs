const { buildSync } = require("esbuild");
const Module = require("node:module");

const output = buildSync({
  stdin: {
    contents: `export { default as reader } from './src/index';
      export { DummyPage } from './src/page/DummyPage';
      export { loadChapterDocument } from './src/scraping/scraping';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  loader: { ".html": "text", ".css": "text", ".svg": "text" },
}).outputFiles[0].text;
const bundled = new Module(__filename);
bundled._compile(output, __filename);

const requested = [];
class AutoImage extends EventTarget {
  naturalWidth = 800;
  naturalHeight = 1200;
  complete = false;
  decoding = "async";
  set src(value) {
    this._src = value;
    if (!value) return;
    requested.push(value);
    this.complete = true;
    queueMicrotask(() => this.dispatchEvent(new Event("load")));
  }
  get src() {
    return this._src;
  }
  async decode() {}
}
const element = () => ({
  style: {},
  dataset: {},
  classList: { remove() {}, add() {}, toggle() {} },
  querySelectorAll: () => [],
  addEventListener() {},
  appendChild() {},
});
const viewerDom = () => {
  const root = { ...element(), querySelector: () => element() };
  return {
    ...element(),
    ownerDocument: {
      createElement: () => ({
        ...element(),
        attachShadow: () => root,
      }),
    },
  };
};

// Unit tests supply DOM fixtures; gestures require real browser matrix APIs.
bundled.exports.reader.Viewer.prototype.setDrawHandler = () => {};
module.exports = {
  ...bundled.exports.reader,
  DummyPage: bundled.exports.DummyPage,
  loadChapterDocument: bundled.exports.loadChapterDocument,
  AutoImage,
  viewerDom,
  requested,
};
