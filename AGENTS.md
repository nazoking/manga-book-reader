# AGENTS.md

このファイルは、リポジトリ全体を調査するときの案内と、変更前に把握しておくべき構成・開発手順をまとめたインデックスです。

公開 API の変更点と利用側の移行手順は [MIGRATION.md](MIGRATION.md) を参照してください。

## プロジェクト概要

既存の漫画 Web ページへ userscript 経由で埋め込むことを主目的とした、ブラウザー向け TypeScript ライブラリです。ページ上の章一覧と各章の画像 DOM を読み取り、そのページ内に漫画ビューアーを表示します。単一または複数の本を扱え、キーボード・クリック・ドラッグ・ピンチによる操作を提供します。

## 主な処理の流れ

```text
src/index.ts の default export
  ├─ scraiping: HTML / カスタム loader からページ URL を取得
  ├─ multiBook: UI と読み込み処理の接続
  │    └─ BookLoader: 章キャッシュと先読み（ImagePrefetch 経由）
  └─ Book: ページ列を SpreadPages として提供
       └─ ActionController: キー・クリック・ジェスチャーをページ操作へ変換
            ├─ ImageCache: 表示・先読みの画像要求を共有し、並列数と LRU 容量を制限
            └─ Viewer: viewerDom の Shadow DOM 内にページ画像と操作 UI を描画
```

`PageData` は画像 URL (`src`) と任意の見開き判定 (`isWidePage`) を持ちます。`SpreadPages.image1()` が右ページ、`image2()` が左ページです。ページ位置 `-1` は右側を空白にし、最初のページを左側に表示します。`PageNumber` は末尾基準の指定も扱います。

## ディレクトリ案内

| 場所                          | 役割                                                                     |
| ----------------------------- | ------------------------------------------------------------------------ |
| `src/index.ts`                | パッケージの既定 export を組み立てる公開入口                             |
| `src/book/`                   | 本とページ列を表すインターフェース                               |
| `src/page/`                   | ページデータ、ページ番号、見開き状態、空ページ、画像キャッシュ           |
| `src/high/`                   | 複数冊の統合 (`multiBook`)、CSS/XPath 検索 (`query`)、章キャッシュ       |
| `src/scraping/`               | DOM からのページ取得、ブックマーク保存、画像 preload、無限スクロール     |
| `src/view/`                   | `Viewer`、アクション制御、本切り替えアクション                           |
| `src/view/drag/`              | ポインター操作から作られるジェスチャー・ズーム用の型と処理               |
| `src/view/event/`             | DOM イベント、イベントキャッシュ、画像ロード、イベント通知               |
| `src/viewerDom/`              | ビューアーの HTML/CSS/SVG。`esbuild.ts` が HTML/CSS をバンドルへ埋め込む |
| `examples/scraping/`          | HTML の本一覧・ページ画像を使うスクレイピング例                          |
| `examples/zip/`               | ZIP 内画像から `Book` を組み立てる例。サンプル ZIP を含む                |
| `examples/bjy-1/`             | スクレイピング例で使う画像サンプル                                       |
| `.github/workflows/build.yml` | `main` 更新時などにビルドし GitHub Pages へ公開                          |
| `esbuild.ts`                  | ESM バンドル生成と HTML/CSS/SVG のローダー設定                           |

## 典型的な利用方法: userscript から既存ページへ埋め込む

userscript で公開済み ESM を動的 import し、現在のページから章一覧を作り、各章 URL の HTML から画像ノードを抽出します。`addController` にはビューアーを挿入する既存ページ上の要素を指定します。

```js
(async () => {
  const reader = (
    await import("https://nazoking.github.io/manga-book-reader/dist/index.mjs")
  ).default;
  reader.scraiping({
    bookList: reader
      .query(".chapter a")
      .map((a) => ({
        title: a.textContent.trim(),
        url: a.href,
      }))
      .reverse(),
    pageList: (dom) => reader.query(".page_list img", dom),
  });
})();
```

この使い方では、`bookList` は章のタイトルと URL、`pageList` は章 DOM からページ画像を選ぶ selector または callback、`addController` は UI の挿入先です。`scraping` は章 HTML を取得し、画像要素から `data-lazy-src`、`data-src`、または `src` を読み取ります。selector・loader の詳細とサンプルは `examples/scraping/index.html` を参照してください。

## 公開 API

`src/index.ts` は名前付き export ではなく、公開機能をまとめた default export を返します。現在の主なキーは `Book`、`ImageCache`、`ImagePrefetch`、`multiBook`、`ActionController`、`Viewer`、`BookLoadAction`、`DragHandler`、`query`、`preLoadImageList`、`infinityScroll`、`scraiping` です。

`ImageCache` は表示と先読みで共用する画像管理器です。通常は `multiBook` / `scraiping` がビューアー単位で作成します。複数ビューアーで共有する場合は `const imageCache = new reader.ImageCache()` を作り、各 `multiBook({ imageCache })` に渡します。作成側が所有権を持ち、全利用ビューアーを破棄した後に `imageCache.dispose()` を呼びます。`multiBook` / `scraiping` が返す `dispose()` は、そのビューアーの要求とキャッシュ参照を解放します。

`loading` オプションで先読み範囲、並列数、タイムアウト、再試行、保持容量、次章先読みを調整できます。既定値は後ろ 6 ページ・手前 2 ページ、最大 4 要求（先読みは最大 2 要求）、画像タイムアウト 20 秒、自動再試行 2 回、24 画像または推定 96MiB、次章先読み有効です。例: `reader.scraiping({ ..., loading: { preloadAhead: 8, maxConcurrent: 5 } })`。画像はセッション中のメモリに保持され、利用側が渡した Blob URL はライブラリが revoke しません。

### 読み込みの責務と低レベル API

- `multiBook` は章選択と UI の接続を担当し、`BookLoader` が章キャッシュと先読み範囲を管理します。共有 `imageCache` を渡した場合、通信並列数・画像の再試行・容量はキャッシュ側の設定を使い、先読み範囲と次章先読みは各ビューアーの `loading` で指定します。設定型は `src/loading/options.ts` の `RequestOptions`・`CacheOptions`・`PreloadOptions` に分離しています。
- 章の選択位置は `BookLoadAction.index` のみに保持します。`BookLoadAction(bookCount, onSelect)` の `move(index, page = -1)` で移動し、`onSelect(index, page)` が呼ばれます。`BookController` と `getBookController()` は廃止しました。独自 `getBookSelector` の選択通知は `{ book, bookIndex }` です。
- `ActionController.open(source, pageNumber)` はページ取得元を選択します。`source(pageNumber, reload)` の `reload` が `true` の場合は新しいページデータを取得してください。ページデータ取得に失敗したときの手動再試行は、現在位置を維持してこの取得元を呼び直します。
- `Viewer` は描画と UI 通知を担当します。`setCurrent()` は画像とレイアウトの処理が終わるまで待機し、表示成功時に `onChanged` を通知します。単独利用時は `onRetry` の `"data"`（ページデータ再取得）と `"image"`（再描画）を利用側で処理してください。`ActionController` を使う場合は自動で接続されます。
- `ImagePrefetch` は利用者ごとの先読み要求を管理します。`new reader.ImagePrefetch(imageCache)` の `update(sources)` で対象を置き換え、`clear()` で中断します。共通する対象の取得は継続し、他の利用者の表示要求は中断しません。
- `ImageCache` は通信共有・取得優先度・LRU を管理し、画面や描画世代を保持しません。要求の状態は画像と実行中リクエストから判定し、別のキュー配列や状態フラグは持ちません。容量制限から画像を保護する場合は読み込み前に `const release = imageCache.retain(src)` を呼び、利用終了時に `release()` を呼びます。複数利用者の参照は独立し、同じ解放関数を複数回呼んでも安全です。
- 自動再試行と中断可能な待機は `src/loading/retry.ts` に集約しています。HTTP ステータスの判定と各要求のタイムアウトは取得処理側が担当します。

再設計前の `pin` / `unpin` / `releaseDisplay` / `displayOwner` / `displayToken` / `ImageCache.retry` は廃止しました。保持には `retain`、画像の再試行には再度 `load` を使います。`Viewer.whenLayoutReady()` は廃止し、`setCurrent()` の完了に統合しました。`ImageCache.prefetch` / `cancelPrefetch` は `ImagePrefetch.update` / `clear` に移しました。`preLoadImageList(srcList, imageCache)` はキャッシュの明示指定が必須です。未使用の `view/event/loadImage.ts` と暗黙の共有キャッシュは削除しました。`ActionController.setCurrent` の再試行用第2引数は廃止し、再実行可能な取得関数を第1引数に渡す形式に統一しました。

独自の `multiBook.getBook` / `loadBookPageList` / `loadDom` は第 4 引数または引数オブジェクトの `signal` を受け取れます。無視しても従来どおり動作しますが、中断に対応する loader では `fetch(url, { signal })` へ渡してください。標準 `Book` は `pageCount` と `getPage(index)` を持ちます。既存の独自 `Book` も `getSpreadPages` だけで表示でき、ページ単位アクセスを実装した場合に先読み対象になります。

注意: スクレイピング機能の実装名は `scraping` ですが、公開オブジェクトのキーは現状 `scraiping`（綴り違い）です。既存利用者との互換性を確認せずに改名・削除しないでください。呼び出し例は `examples/scraping/index.html` と `examples/zip/index.html` を参照してください。

`query(selector, context?)` は `/` で始まる文字列を XPath、それ以外を CSS selector として扱います。スクレイピング loader は selector、ノード/URL 配列、コールバック、または `loadDom` / `parseDom` / `postParse` を持つオブジェクトを受け取れます。独自のページ取得手順を変更するときは `src/scraping/scraping.ts` の loader 正規化処理も確認してください。

## 開発とビルド

- `mise.toml` は Node.js 24 と npm latest を指定します。
- 依存関係をロックファイルどおりに入れる: `npm ci`
- 型宣言と ESM バンドルを生成: `npm run build`。成果物は `dist/` に出力されます。
- esbuild の監視: `npm run esbuild:watch`。型宣言の監視: `npm run tsc:watch`。両方の監視: `npm run watch`。
- サンプル確認用サーバー: `npm run server`。
- `npm run lint` は ESLint の `--fix` と Prettier の `--write` を実行し、`src/` を書き換えます。

TypeScript は `strict`、`NodeNext` 解決、ブラウザー DOM ライブラリを有効にしています。HTML/CSS/SVG のバンドル挙動を変える場合は `src/viewerDom/` と `esbuild.ts` の両方を確認してください。`dist/` と `out/` は Git 管理対象外です。

## テストと CI

`npm test` は Node の `node:test` を使い、章切り替え競合、表示の競合、画像キャッシュ（重複要求、優先度、並列数、再試行、タイムアウト、LRU、破棄）、章 HTML の HTTP 再試行と基準 URL を検証します。ブラウザー依存の処理はフェイク画像・DOM で単体検証します。CI workflow は引き続き `npm ci` と `npm run build` を実行します。

型定義の公開先は `package.json` の `types` と `tsconfig.json` の `rootDir` / `declarationDir` の組み合わせで決まります。どちらかを変更するときは、生成される `.d.ts` の場所と公開パスを一緒に更新してください。
