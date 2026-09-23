const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildSync } = require('esbuild');
const Module = require('node:module');

// Bundle browser sources without constructing the viewer's DOM.
const output = buildSync({
  stdin: {
    contents: `export { ActionController } from './src/view/ActionController';
      export { Viewer } from './src/view/Viewer';
      export { DummyPage } from './src/page/DummyPage';
      export { multiBook } from './src/high/multiBook';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  loader: { '.html': 'text', '.css': 'text', '.svg': 'text' },
}).outputFiles[0].text;
const bundled = new Module(__filename);
bundled._compile(output, __filename);
const { ActionController, Viewer, DummyPage, multiBook } = bundled.exports;
// Gesture setup needs browser matrix APIs and is unrelated to these races.
Viewer.prototype.setDrawHandler = () => {};
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const element = () => ({
  style: {}, dataset: {}, classList: { remove() {}, add() {}, toggle() {} },
  querySelectorAll: () => [], addEventListener() {}, appendChild() {},
});
const viewerDom = () => {
  const root = { ...element(), querySelector: () => element() };
  return { ...element(), ownerDocument: { createElement: () => ({
    ...element(), attachShadow: () => root,
  }) } };
};
const page = (src, image = Promise.resolve({ src, isWidePage: false })) => {
  const p = new DummyPage();
  p.image1 = () => image;
  return p;
};

test('last requested chapter wins, and only its position is reported', async () => {
  const a = deferred();
  const b = deferred();
  const notices = [];
  const pa = page('a');
  const pb = page('b');
  const { action, controller } = multiBook({
    bookList: ['a', 'b'],
    getBook: name => (name === 'a' ? a.promise : b.promise),
    onPageChanged: value => notices.push(value),
    viewerDom: viewerDom(), getBookSelector: () => '',
  });
  action.move(0, -1);
  action.move(1, -1);
  await flush();
  assert.deepEqual(notices, []); // Placeholder must not save a position.
  b.resolve({ getSpreadPages: async () => pb });
  await flush();
  a.resolve({ getSpreadPages: async () => pa });
  await flush();
  assert.equal(controller.current, pb);
  assert.deepEqual(notices, [{ book: 'b', page: -1 }]);
});

test('late images from the same page number cannot repaint or notify', async () => {
  const view = new Viewer(viewerDom());
  const image = deferred();
  const notices = [];
  view.onChanged.add(p => { notices.push(p); });
  const old = view.setCurrent(page('a', image.promise));
  const current = page('b');
  await view.setCurrent(current);
  image.resolve({ src: 'a', isWidePage: false });
  await old;
  assert.equal(view.rightPage.style.backgroundImage, 'url("b")');
  assert.deepEqual(notices, [current]);
});

test('a new page request invalidates an in-flight image notification immediately', async () => {
  const view = new Viewer(viewerDom());
  const controller = new ActionController(view, new DummyPage());
  await flush();
  const image = deferred();
  await controller.setCurrent(page('a', image.promise));
  const notices = [];
  view.onChanged.add(p => { notices.push(p); });
  const next = deferred();
  const pending = controller.setCurrent(next.promise);
  image.resolve({ src: 'a', isWidePage: false });
  await flush();
  assert.deepEqual(notices, []);
  next.resolve(page('b'));
  await pending;
  await flush();
  assert.equal(notices.length, 1);
});

test('late layout detection cannot overwrite the current layout', async () => {
  const view = new Viewer(viewerDom());
  const layout = deferred();
  const toggles = [];
  view.inner.classList.toggle = (name, value) => { toggles.push([name, value]); };
  const old = page('a');
  old.isSingleUnit = () => layout.promise;
  await view.setCurrent(old);
  const current = page('b');
  current.isSingleUnit = async () => false;
  await view.setCurrent(current);
  layout.resolve(true);
  await flush();
  assert.ok(toggles.length > 0);
  assert.ok(toggles.every(([, value]) => value === false));
});

test('late action availability cannot overwrite current button state', async () => {
  const view = new Viewer(viewerDom());
  const controller = new ActionController(view, new DummyPage());
  await flush();
  const enabled = deferred();
  const toggles = [];
  view.root.querySelectorAll = selector => selector === '.nextPage'
    ? [{ classList: { toggle: (_, value) => { toggles.push(value); } } }]
    : [];
  const old = page('a');
  old.hasNext = () => enabled.promise;
  await controller.setCurrent(old);
  await controller.setCurrent(page('b'));
  await flush();
  enabled.resolve(true);
  await flush();
  assert.deepEqual(toggles, [true]);
});
