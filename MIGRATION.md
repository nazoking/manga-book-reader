# 読み込み・キャッシュ再設計へのマイグレーション

比較元はコミット `3ca1e63`、移行先は今回の読み込み・画像キャッシュ再設計後の実装です。リリース番号による比較ではありません。コード例の `reader` はパッケージの default export、`bookList` や取得関数は利用側で用意する値です。

## 1. 影響のある利用箇所を探す

利用側のリポジトリで次の検索を行い、該当する節を適用してください。

```sh
rg -n 'BookController|BookLoadAction|getBookController|setHandler|getBookSelector|onBookChanged|onPageChanged|preLoadImageList|setCurrent|new .*Viewer|scraiping|multiBook' .
```

| 利用箇所 | 必要な対応 |
| --- | --- |
| `scraiping({ bookList, pageList, addController })` の基本形 | 呼び出しの変更は不要。先読み・再試行・通知の挙動を確認する |
| `BookLoadAction` の直接生成、`getBookController()` | インデックスを使う API へ変更する（節2） |
| 独自 `getBookSelector` | 通知の `controller` を `book` に変更する（節3） |
| `onBookChanged` / `onPageChanged` | 通知時点と非同期処理を確認する（節3） |
| `preLoadImageList(urls)` | 第2引数に `ImageCache` を渡す（節4） |
| 独自 loader / `Book` | 先読みで呼ばれる可能性を確認し、必要なら中断とページ単位アクセスに対応する（節5） |
| `ActionController` / `Viewer` の直接利用 | 再試行・完了待機・エラー処理を更新する（節6） |
| SPA などでビューアーを破棄する処理 | DOM の削除前に `dispose()` を呼ぶ（節7） |

default export 形式は変わりません。`Book`、`ActionController`、`Viewer`、`BookLoadAction`、`DragHandler`、`multiBook`、`preLoadImageList`、`scraiping`、`infinityScroll`、`query` は引き続き公開され、`ImageCache` と `ImagePrefetch` が追加されます。名前付き import に変更しないでください。

公開キーは引き続き **`scraiping`** です。内部の実装名 `scraping` への置き換えは不要です。ページ位置 `-1` と `{ last: -1 }` の指定形式も維持されています。

## 2. 章移動をインデックスで指定する

`BookController` と `BookLoadAction.getBookController()` は削除されました。選択位置は `action.index` から読み取ります。

| 変更前 | 変更後 |
| --- | --- |
| `new reader.BookLoadAction(bookController, onSelect)` | `new reader.BookLoadAction(bookList.length, onSelect)` |
| `onSelect(bookController, page)` | `onSelect(bookIndex, page)` |
| TypeScript の `BookLoadAction<BookMeta>` | `BookLoadAction`（型引数なし） |
| `action.move(bookController, page)` | `action.move(bookIndex, page)` |
| `action.getBookController().getBookMeta()` | `bookList[action.index]` |
| `action.getBookController().canMove(delta)` | `action.index + delta >= 0 && action.index + delta < bookList.length` |
| `action.setHandler = handler` | 生成時のコールバックへ渡す。後から差し替える場合は利用側の変数を介する |

変更前:

```js
const current = action.getBookController();
action.move(current.move(1), -1);
```

変更後:

```js
action.move(action.index + 1, -1);
action.move(0); // page の省略時は -1
const selectedBook = bookList[action.index];
```

`move()` は絶対インデックスを受け取り、有効範囲へ丸めます。空の一覧では何もしません。`move()` の戻り値は引き続き `void` で、描画完了は待てません。

直接生成する場合は、章取得を利用側で接続します。`initialPages` は初期表示用の `SpreadPages`、`acquireBook(index, reload)` は利用側の取得関数です。

```js
const view = new reader.Viewer();
const action = new reader.BookLoadAction(bookList.length, (index, page) => {
  void controller.open(async (position, reload) => {
    const book = await acquireBook(index, reload);
    return book.getSpreadPages(position);
  }, page);
});
const controller = new reader.ActionController(view, initialPages, action.actions());
document.body.appendChild(view.wrapper);
action.move(0, -1);
```

通常の複数章ビューアーでは `multiBook` がこの接続を行うため、直接生成は不要です。

## 3. 選択通知と表示成功通知を使い分ける

独自 `getBookSelector` に渡される `onBookChanged` は、引き続き章の**選択時**に同期通知します。ただしイベントの形が変わります。

変更前:

```js
onBookChanged.add(({ controller, bookIndex }) => {
  select.selectedIndex = bookIndex;
  title.textContent = controller.getBookMeta().title;
});
```

変更後:

```js
onBookChanged.add(({ book, bookIndex }) => {
  select.selectedIndex = bookIndex;
  title.textContent = book.title;
});
```

これとは別に、`multiBook` / `scraiping` のオプションとして渡すコールバックには次の変更があります。

| 通知 | 変更前 | 変更後 |
| --- | --- | --- |
| オプション `onBookChanged({ book, page })` | 章選択時。`page` は要求した `PageNumber` | 画像表示成功後。最後に通知した章インデックスと異なるときに通知。`page` の実値は解決済みの数値 |
| オプション `onPageChanged({ book, page })` | ページ表示時 | 現在のページの画像表示成功後。仮ページ・失敗・古い要求・先読みでは通知しない |
| 上記2つのコールバック | 同期呼び出し | マイクロタスクで呼び出す。`Promise<void>` を返せる。例外・reject は警告ログへ出す |

同じ章を再選択しても、最後に通知した章インデックスと同じならオプションの `onBookChanged` は呼ばれません。画像の再試行に成功した場合は `onPageChanged` が同じページ番号で再通知されることがあります。

選択直後の UI 更新をオプション `onBookChanged` に置いていた場合は、独自セレクターの選択通知、または利用側の `action.move()` 呼び出し箇所へ移してください。`scraiping` は独自 `getBookSelector` オプションを公開していないため、このカスタマイズが必要なら `multiBook` を使います。

ブックマークや閲覧記録は表示成功通知へ置いてください。非同期コールバックの完了をナビゲーションは待ちません。保存順序が重要な場合は、利用側で直列化します。

```js
let writes = Promise.resolve();
const onPageChanged = ({ book, page }) => {
  writes = writes.catch(() => {}).then(() =>
    bookmarker.write({ title: book.title, page })
  );
  return writes;
};
```

## 4. 先読みを画像キャッシュへ移す

`preLoadImageList` の第2引数は必須になりました。

```js
// 変更前
await reader.preLoadImageList(urls);

// 変更後: multiBook の表示と同じキャッシュを使う
await reader.preLoadImageList(urls, instance.imageCache);
```

この関数は渡された全 URL を先読み要求に登録し、各画像の失敗を吸収します。完了したことは全画像の取得成功を意味しません。スクロールやページ移動に合わせて対象を更新・中断したい場合は、追加された `ImagePrefetch` を使います。

```js
const prefetch = new reader.ImagePrefetch(instance.imageCache);
prefetch.update(nearbyUrls);
// 移動後: 共通の URL は継続し、不要な要求を中断する
prefetch.update(nextNearbyUrls);
// 利用終了時
prefetch.clear();
```

`multiBook` / `scraiping` は近隣ページと次章を自動で先読みするため、通常は独自の全章画像 preload 処理を削除できます。以前の標準 `postParse` が行っていた「1秒後に章の全画像を preload」はなくなりました。独自 `postParse` を渡した場合も、新しい自動先読みは別途動作します。

### loading の既定値

`multiBook` と `scraiping` に `loading` を渡せます。`Viewer` 単独では画像取得・キャッシュの設定だけが対象です。

| キー | 既定値 | 用途 |
| --- | --- | --- |
| `preloadAhead` | `6` | 表示範囲より先に読むページ数 |
| `preloadBehind` | `2` | 現在位置より前に読むページ数 |
| `preloadNextBook` | `true` | 次章を先読みする |
| `nextBookThreshold` | `6` | 現在位置から章末までの残りページ数のしきい値 |
| `nextBookPages` | `2` | 次章の先頭から先読みするページ数 |
| `maxConcurrent` | `4` | 画像取得の最大並列数 |
| `maxPreloadConcurrent` | `2` | 先読みとして開始する画像取得の最大並列数 |
| `timeoutMs` | `20000` | 各画像取得・標準章 HTML 取得のタイムアウト（ms） |
| `retries` | `2` | 自動再試行回数（初回を除く） |
| `retryDelaysMs` | `[500, 1500]` | 再試行の待ち時間（ms） |
| `maxEntries` | `24` | 画像キャッシュの保持数上限 |
| `maxBytes` | `100663296`（96 MiB） | 画像の推定保持サイズ上限 |

表示中など `retain()` で保持されている画像は容量制限から保護されるため、一時的に上限を超えることがあります。キャッシュはセッション内のメモリで、永続保存は行いません。

自動先読みを止める場合:

```js
const loading = {
  preloadAhead: 0,
  preloadBehind: 0,
  preloadNextBook: false,
  maxPreloadConcurrent: 0,
};
```

`maxPreloadConcurrent: 0` だけでは次章 HTML の取得は止まりません。章先読みも止めるには `preloadNextBook: false` を指定します。

## 5. 独自 loader を確認する

`multiBook.getBook` は第4引数に任意の `AbortSignal` を受け取ります。従来の3引数の関数もそのまま使えますが、中断可能な通信には signal を転送してください。

```js
const instance = reader.multiBook({
  bookList,
  getBook: async (book, index, list, signal) => {
    const response = await fetch(book.url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const urls = await parsePageUrls(await response.text());
    return reader.Book(urls.map((src) => Promise.resolve({ src })));
  },
});
```

`scraiping` の `loadBookPageList({ url, signal })`、`loadDom({ url, signal })`、`parseDom(doc, { url, signal })`、`postParse({ pageList, dom, book, signal })` にも signal が追加されています。signal を無視する既存 loader も動きますが、不要になった通信は継続します。

次章先読みで loader が選択前に呼ばれるようになります。また章キャッシュは最大3件を基本とするため、以前開いた章でも再取得されることがあります。loader / `postParse` で閲覧記録の保存や選択 UI の変更を行わず、節3の通知へ移してください。`scraiping` は loader へ渡す引数を `{ ...book, signal }` として作るため、元の章オブジェクトとの参照一致にも依存しないでください。

標準の章 HTML 取得には以下が追加されています。独自の `getBook` / `loadDom` / `loadBookPageList` 全体が自動でこの処理に包まれるわけではありません。

- HTTP エラーを検出する。通信エラー、408、429、5xx は再試行対象とし、一般的な4xxは再試行しない。
- 429 の `Retry-After` が5秒以内なら待ち時間として使い、5秒を超える場合は自動再試行しない。
- リダイレクト後の URL を基準に `<base>` を補完・解決する。相対画像 URL の解決結果が変わる場合がある。
- 章の画像一覧が空の場合は章読み込み失敗として再試行 UI を出す。ただし章一覧なしで現在の DOM を解析して画像がない場合は、従来どおり `undefined` を返す。

独自 `Book` は引き続き `getSpreadPages(page)` だけでも表示できます。近隣・次章画像の自動先読みに対応するには、`pageCount` と `getPage(index): Promise<PageData | null>` を両方実装してください。標準の `reader.Book(...)` は対応済みです。

## 6. 低レベル表示 API の再試行・完了待機を更新する

### ActionController

`setCurrent(spread)` と `setCurrent(promise)` は引き続き使えます。再試行可能にする場合は、失敗済み Promise を再利用せず、取得し直せる関数を渡します。

```js
// 変更前: この Promise 自体は再実行できない
await controller.setCurrent(loadPages());

// 変更後: 手動再試行時に関数がもう一度呼ばれる
await controller.setCurrent(() => loadPages());
```

章取得後の個別ページデータの失敗にも対応するなら、追加された `open(source, pageNumber)` を使います。

```js
await controller.open(async (page, reload) => {
  // reload=true なら、失敗した Promise や章データをキャッシュから再利用しない
  const book = await acquireBook(chapterIndex, reload);
  return book.getSpreadPages(page);
}, -1);
```

`source(page, reload)` の初回は `reload=false`、データ再取得は `true` です。最初の章取得失敗では要求時の位置を、表示中ページのデータ失敗では現在位置を使って再取得します。画像だけの失敗は現在の `SpreadPages` を再描画します。`multiBook` はこの接続を自動で行います。

`setCurrent()` / `open()` の完了は画像とレイアウトの処理まで待ちます。以前の `ActionController.setCurrent()` は描画処理の完了を待っていませんでした。また現在は取得失敗を UI で扱うため、呼び出し側の `.catch()` を失敗通知として使えません。完了したことも表示成功の保証にはなりません。成功後の処理は `controller.view.onChanged` へ移し、取得エラーの独自記録が必要なら渡した取得関数内で捕捉してから再 throw してください。

`getAction()` は未知の名前でも `undefined` ではなく何もしない Action を返します。存在確認が必要なら `controller.actions[name]` を確認してください。

### Viewer 単独利用

`new reader.Viewer(viewerDom)` は有効なままで、第2引数に `{ loading, imageCache }` を渡せるようになりました。`setCurrent()` は画像・レイアウト処理まで待ち、画像またはページデータの失敗を再試行 UI へ変換します。`onChanged` は画像表示成功時に通知します。

`Viewer` は章の取得方法を持たないため、単独利用では `onRetry` を接続してください。

```js
let current = await loadPages();
view.onRetry.add((reason) => {
  void (async () => {
    if (reason === "data") current = await loadPages();
    await view.setCurrent(current);
  })().catch(reportError);
});
await view.setCurrent(current);
```

`"data"` はページデータ再取得、`"image"` は画像再描画です。`ActionController` を使う場合、このハンドラーを二重登録する必要はありません。`isWidePage` を指定済みでも画像取得は行われます。画像 URL が利用可能であることを確認してください。

## 7. 破棄と共有キャッシュの所有者を決める

| API | 現在の戻り値 |
| --- | --- |
| `multiBook(options)` | `{ controller, action, imageCache, dispose }` |
| `await scraiping(options)` | `{ controller, action, dispose }` または `undefined` |

ビューアーを取り外すときは、戻り値の `dispose()` を呼んでから DOM を削除します。`dispose()` 自体は DOM を削除しません。

```js
const instance = await reader.scraiping({ bookList, pageList: ".page_list img" });
// 利用終了時
if (instance) {
  instance.dispose();
  instance.controller.view.wrapper.remove();
}
```

`multiBook` / `scraiping` では `controller.dispose()` だけでは章キャッシュや先読みの後始末が完結しません。戻り値の `dispose()` を使ってください。独立した `ActionController` は `controller.dispose()`、独立した `Viewer` は `view.dispose()` を呼びます。

共有キャッシュは作成側が破棄します。各ビューアーの破棄は他のビューアーの要求を中断しません。

```js
const imageCache = new reader.ImageCache({ maxConcurrent: 5, maxEntries: 32 });
const first = reader.multiBook({ ...firstOptions, imageCache });
const second = reader.multiBook({ ...secondOptions, imageCache });

// 両方の利用終了後
first.dispose();
second.dispose();
imageCache.dispose();
```

共有時の通信並列数・画像再試行・保持容量は `ImageCache` 作成時の設定を使います。各 `multiBook.loading` では先読み範囲と次章先読みを設定します。

**現在の `scraiping` は共有 `imageCache` 引数を公開していません。** 共有が必要なら `multiBook` を使ってください。`scraiping` のキャッシュを明示的な画像 preload に使う場合は `instance.controller.view.imageCache` で取得できますが、その所有者は `scraiping` 側です。

独自の画像取得でキャッシュからの退避を防ぐには、取得前に保持し、利用終了時に解放します。

```js
const release = imageCache.retain(src);
try {
  const image = await imageCache.load(src);
  await useImage(image);
} finally {
  release();
}
```

ZIP などから作った Blob URL はライブラリが revoke しません。画像の利用終了後に作成側で `URL.revokeObjectURL()` を呼んでください。

## 8. 移行後に確認する

1. 利用側を型チェック・ビルドし、削除された API や第2引数のない `preLoadImageList` が残っていないことを確認する。
2. 章の選択、次章・前章、末尾指定、ブックマーク復帰を確認する。同じ章の再選択を通知回数に依存させない。
3. 章 HTML 失敗・画像失敗・個別ページデータ失敗から再試行する。片側が読み込み中でも再試行できることを確認する。
4. 読み込み途中に章を切り替え、旧画像や古い要求のブックマーク通知が残らないことを確認する。
5. 先読みが閲覧記録などの副作用を起こさず、設定した範囲で動くことを確認する。
6. ビューアーを破棄し、共有している別のビューアーが引き続き使えることを確認する。

ライブラリ側の確認コマンドは `npm test` と `npm run build` です。mise を使う環境ではそれぞれ `mise exec -- npm test`、`mise exec -- npm run build` で実行できます。

### 比較対象と内部 API について

`BookController` は default export のキーではありませんでしたが、公開 `BookLoadAction` と独自セレクターから利用できたため本書で移行対象としています。内部ファイル `src/view/event/loadImage.ts` も削除されました。内部から直接 import していた場合は `ImageCache.load()` へ移してください。

開発途中の `pin` / `unpin` / `releaseDisplay` / `displayOwner` / `displayToken` / `ImageCache.retry` / `ImageCache.prefetch` / `cancelPrefetch` / `Viewer.whenLayoutReady()` や `setCurrent` の再試行用第2引数は、比較元 `3ca1e63` の公開 API にはありません。途中版を使っていた場合に限り、保持は `retain()`、画像再試行は再度 `load()`、先読みは `ImagePrefetch.update()` / `clear()`、描画待機は `await setCurrent()`、データ再試行は取得関数または `open()` へ移してください。
