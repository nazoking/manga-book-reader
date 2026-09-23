# AGENTS.md

このファイルは、リポジトリ全体を調査するときの案内と、変更前に把握しておくべき構成・開発手順をまとめたインデックスです。

## プロジェクト概要

既存の漫画 Web ページへ userscript 経由で埋め込むことを主目的とした、ブラウザー向け TypeScript ライブラリです。ページ上の章一覧と各章の画像 DOM を読み取り、そのページ内に漫画ビューアーを表示します。単一または複数の本を扱え、キーボード・クリック・ドラッグ・ピンチによる操作を提供します。

## 主な処理の流れ

```text
src/index.ts の default export
  ├─ scraiping: HTML / カスタム loader からページ URL を取得
  ├─ multiBook: 本の切り替え、Book の遅延生成とキャッシュ
  └─ Book: ページ列を SpreadPages として提供
       └─ ActionController: キー・クリック・ジェスチャーをページ操作へ変換
            └─ Viewer: viewerDom の Shadow DOM 内にページ画像と操作 UI を描画
```

`PageData` は画像 URL (`src`) と任意の見開き判定 (`isWidePage`) を持ちます。`SpreadPages.image1()` が右ページ、`image2()` が左ページです。ページ位置 `-1` は右側を空白にし、最初のページを左側に表示します。`PageNumber` は末尾基準の指定も扱います。

## ディレクトリ案内

| 場所 | 役割 |
| --- | --- |
| `src/index.ts` | パッケージの既定 export を組み立てる公開入口 |
| `src/book/` | 本と本の切り替え状態を表すインターフェース |
| `src/page/` | ページデータ、ページ番号、見開き状態、空ページ |
| `src/high/` | 複数冊の統合 (`multiBook`)、CSS/XPath 検索 (`query`)、キャッシュ |
| `src/scraping/` | DOM からのページ取得、ブックマーク保存、画像 preload、無限スクロール |
| `src/view/` | `Viewer`、アクション制御、本切り替えアクション |
| `src/view/drag/` | ポインター操作から作られるジェスチャー・ズーム用の型と処理 |
| `src/view/event/` | DOM イベント、イベントキャッシュ、画像ロード、イベント通知 |
| `src/viewerDom/` | ビューアーの HTML/CSS/SVG。`esbuild.ts` が HTML/CSS をバンドルへ埋め込む |
| `examples/scraping/` | HTML の本一覧・ページ画像を使うスクレイピング例 |
| `examples/zip/` | ZIP 内画像から `Book` を組み立てる例。サンプル ZIP を含む |
| `examples/bjy-1/` | スクレイピング例で使う画像サンプル |
| `.github/workflows/build.yml` | `main` 更新時などにビルドし GitHub Pages へ公開 |
| `esbuild.ts` | ESM バンドル生成と HTML/CSS/SVG のローダー設定 |

## 典型的な利用方法: userscript から既存ページへ埋め込む

userscript で公開済み ESM を動的 import し、現在のページから章一覧を作り、各章 URL の HTML から画像ノードを抽出します。`addController` にはビューアーを挿入する既存ページ上の要素を指定します。

```js
(async () => {
  const reader = (await import("https://nazoking.github.io/manga-book-reader/dist/index.mjs")).default;
  reader.scraiping({
    bookList: reader.query(".chapter a").map((a) => ({
      title: a.textContent.trim(),
      url: a.href,
    })).reverse(),
    pageList: (dom) => reader.query(".page_list img", dom),
  });
})();
```

この使い方では、`bookList` は章のタイトルと URL、`pageList` は章 DOM からページ画像を選ぶ selector または callback、`addController` は UI の挿入先です。`scraping` は章 HTML を取得し、画像要素から `data-lazy-src`、`data-src`、または `src` を読み取ります。selector・loader の詳細とサンプルは `examples/scraping/index.html` を参照してください。

## 公開 API

`src/index.ts` は名前付き export ではなく、公開機能をまとめた default export を返します。現在の主なキーは `Book`、`multiBook`、`ActionController`、`Viewer`、`BookLoadAction`、`DragHandler`、`query`、`preLoadImageList`、`infinityScroll`、`scraiping` です。

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

## テストと CI の現状

リポジトリ内にテストファイルやテスト用ディレクトリはありません。`package.json` の `test` スクリプトは未設定を示すメッセージを出して終了コード 1 を返します。CI workflow は `npm ci` と `npm run build` を実行して GitHub Pages をデプロイしますが、テストや lint は実行していません。

型定義の公開先は `package.json` の `types` と `tsconfig.json` の `rootDir` / `declarationDir` の組み合わせで決まります。どちらかを変更するときは、生成される `.d.ts` の場所と公開パスを一緒に更新してください。
