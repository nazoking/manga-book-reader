# 改善タスク

最初は **T01：見開き表示とページ移動**。`src/book/Book.ts`、`src/view/Viewer.ts`、`src/viewerDom/view.css`を開き、横長の先頭画像が隠れるケースの回帰テストから始める。

各タスクに関連ファイル・問題・作業項目・完了条件を記載した。**再現**は実行確認済み、**構造**はコード上の確認、**要検証**は影響を未確認。[AGENTS.md](AGENTS.md)の開発手順と、API変更時の[MIGRATION.md](MIGRATION.md)に従う。

## 優先度と依存関係

P1は表示・操作・利用・開発を阻害する問題、P2は保存・拡張・資源管理の安定性、P3は継続検証と文書整備。

| 状態 | ID | 優先度 | 実装単位 | 依存・進め方 |
| --- | --- | --- | --- | --- |
| [x] | T01 | P1 | 見開き表示とページ移動 | 最初に仕様と回帰テストを固める |
| [ ] | T02 | P1 | 取得元・再試行・破棄 | T01の移動仕様と整合させる |
| [ ] | T03 | P1 | ポインター操作 | ブラウザー検証をこの時点で行う |
| [ ] | T04 | P1 | 設定値・外部データ検証 | T01/T02と入力・データ所有権の境界を合わせる |
| [ ] | T05 | P1 | 型定義・配布・品質チェック・CI | 読み取り/ビルド責務は他の修正と独立して進められる |
| [ ] | T06 | P2 | ブックマークとホストページ | T02の成功通知契約を保つ |
| [ ] | T07 | P2 | カスタムAPIの契約 | T01/T02/T04とAPI変更を調整する |
| [ ] | T08 | P2 | 先読みの未解決データ待ち | T02の世代・中断制御を保つ |
| [ ] | T09 | P2 | ズーム・キーボード・Fullscreen・操作性 | T03のイベント責務と整合させる |
| [ ] | T10 | P2 | 無限スクロール | 章HTMLの既存取得処理を参考にする |
| [ ] | T11 | P2 | ZIPサンプルの資源管理 | 共有キャッシュの所有権を変えない |
| [ ] | T12 | P3 | ブラウザー回帰基盤・利用文書 | 各タスクの検証/移行説明を後回しにする意味ではない |

## T01 — 見開き表示とページ移動を統一する

入口: [Book.ts](src/book/Book.ts)、[SpreadPages.ts](src/page/SpreadPages.ts)、[PageNumber.ts](src/page/PageNumber.ts)、[Viewer.ts](src/view/Viewer.ts)、[view.css](src/viewerDom/view.css)、[ActionController.ts](src/view/ActionController.ts)。

確認事項:

- **再現＋CSS確認:** 横長画像1件のBookを位置`-1`で表示すると、右背景は空、左背景には画像URL、`single=true`になる。CSSの `.single .left.page { display: none; }` により画像のある側を隠す。実ブラウザーの画面撮影は未実施。
- **再現:** `[通常0, 横長1, 通常2]` の位置0は右=0、左=1なのに `isSingleUnit()=true`。CSSは左を隠して右を全面化する。横長画像は次の位置1で表示されるが、組み合わせのレイアウトが不整合。
- **構造/要検証:** `isWidePage`未指定時、Viewerが画像取得後に値を埋める。一方、Book.nextPageは画像描画を待たずその値を読む。ロード前後の移動幅差は回帰テストで詰める。
- **再現:** 通常画像3件、位置2で `canMove(1)=true`、`move(1)`は範囲補正され位置2のまま。canMoveは絶対配列位置、moveは相対量として扱う。意図を確認して契約を揃える。
- **仕様確認が必要:** 位置0の `hasPrev()` はfalseだが `prevPage()`は-1を返す。-1へ戻るべきか、前章へ移るべきかを既存操作と合わせて決める。単純に条件を書き換えない。

作業:

- [x] 通常/横長/混在、空Book、1画像、奇数/偶数、-1、末尾指定の期待表示と移動表を作る。
- [x] 単ページ時の表示対象とnext/prevの計算を同じページ構成に基づかせる。
- [x] 寸法判定前の入力をどう処理するか決め、ロード完了前の連打を検証する。
- [x] hasNext/hasPrev/canMoveの契約を明文化し、必要なら移行説明を追加する。

完了条件: 画像の消失・意図しない重複/飛ばしがなく、入力順序を保ち、同じ構成で前後移動が整合する。既存の「未解決画像を待たず移動できる」テストの意図も維持/説明する。

## T02 — 取得元・再試行・破棄のライフサイクルを修正する

入口: [ActionController.ts](src/view/ActionController.ts)、[Viewer.ts](src/view/Viewer.ts)、[multiBook.ts](src/high/multiBook.ts)、[BookLoader.ts](src/high/BookLoader.ts)、[Action.ts](src/view/Action.ts)。既存回帰テストは `tests/chapter-race.test.cjs` と `tests/multi-book-preload.test.cjs`。

確認事項:

- **再現:** `await controller.open(sourceA, -1)` → `await controller.setCurrent(spreadB)` → `view.onRetry.trigger('data')` でsourceAが再度呼ばれ、表示がAへ戻る。setCurrentがpageSource/reloadPageを更新しない。
- **注意:** 画像だけの再試行も現在 `setCurrent(this.current)` を使う。setCurrentで取得元を単純に消すと、その後のデータ再試行・range移動を壊し得る。取得元置換と再描画の責務を分けて設計する。
- **再現:** 共有ImageCacheを渡したViewerをdisposeした後でも、setCurrentで背景画像を設定できる。eventControllerはabort済みだが描画自体のガードがない。
- **構造:** setDrawHandlerを複数回呼ぶと古いDragHandlerをdetachせず、新しい参照だけ保持する。disposeで解除するのは最新のものだけ。
- **構造/要検証:** ActionのPromiseが呼び出し側で扱われず、updateActionStatesのasync forEachにもcatchがない。独自isEnable/actionのreject経路を検証する。

作業:

- [ ] open・取得元置換・画像再描画・データ再取得の契約を整理する。
- [ ] disposeを終端状態として扱い、以後の操作を拒否または安全に無操作にする。
- [ ] ハンドラー再設定を置換にするか、複数登録なら解除手段を公開する。
- [ ] 非同期例外を適切に扱い、診断に必要な情報を残す。

完了条件: 古い取得元・描画・ハンドラーが新しい状態に作用しない。disposeは繰り返しても安全。共有キャッシュの別利用者は影響を受けない。

## T03 — ポインター操作を一操作・一アクションにする

入口: [DragHandler.ts](src/view/event/DragHandler.ts)、[EventCache.ts](src/view/event/EventCache.ts)、[Viewer.ts](src/view/Viewer.ts)、[ActionController.ts](src/view/ActionController.ts)。

確認事項:

- **再現:** pointerdown(0,0) → pointermove(30,0) → pointercancel相当の終了処理で `onDraw(['left'])` が通知される。pointercancelとpointerupを同じ関数へ接続している。
- **構造/要ブラウザー検証:** pointerout/pointerleaveも同じ終了処理。子要素間の境界移動・領域外への移動がどう作用するかを確認する。pointer captureは未使用。
- **構造/要ブラウザー検証:** ドラッグ後clickを抑止する共有状態がない。Viewerはpagesへのclickをページ移動へ変換する。実ブラウザーで二重実行が起こる入力を確認してから修正する。

作業:

- [ ] 正常終了とキャンセルを分離し、キャンセルではdrawを発火しない。
- [ ] pointer capture、lostpointercapture、領域外操作の状態遷移を定義する。
- [ ] 有効なgesture後のclickだけを抑止し、通常タップ・retryボタン・rangeを壊さない。
- [ ] 2本指操作、指を1本離した場合、マウス/タッチ、子要素間移動をブラウザーで確認する。

完了条件: 正常ジェスチャーは一度だけ実行、キャンセルは移動なし、通常clickは維持。既存の方向名称を物理方向に合わせて無断で反転しない。

## T04 — 設定値と外部データを入口で検証する

入口: [options.ts](src/loading/options.ts)、[retry.ts](src/loading/retry.ts)、[BookLoadAction.ts](src/view/BookLoadAction.ts)、[PageNumber.ts](src/page/PageNumber.ts)、[Viewer.ts](src/view/Viewer.ts)、[PageData.ts](src/page/PageData.ts)。

確認事項:

- **再現:** `resolveCacheOptions({maxConcurrent: NaN, retries: NaN})` はそのままNaNを返す。maxConcurrentがNaNのImageCache.loadは要求を開始せず、disposeするまで未完了だった。
- **構造:** retriesがNaNだと `attempt >= retries` は成立しない。実際の無限再試行を放置する確認はしていない。Infinityも含め、上限とフォールバック/例外方針を決める。
- **再現:** `new BookLoadAction(2, select).move(NaN)` はselectにNaNを渡す。
- **再現:** `Object.freeze({src: 'frozen'})`を含むBookは画像取得後の `data.isWidePage ??=` で例外となり、onChangedが発火しない。PageDataへの寸法判定書き込みが原因。

作業:

- [ ] 全数値設定、ページ/章位置をNumber.isFiniteで検証し、整数化・範囲・異常値処理を統一する。
- [ ] retryDelaysMsの各値、末尾指定、カスタムBook.pageCountなどの境界も確認する。
- [ ] 画像寸法からの判定と利用者指定値の責務を整理し、利用者オブジェクトへ不要な書き込みをしない。

完了条件: 不正入力で無限待機・無制限再試行・NaNインデックスが生じず、凍結データも扱える。判定情報の保持方法はT01と合わせる。

## T05 — 型定義・配布・品質チェック・CIを正常化する

入口: [package.json](package.json)、[package-lock.json](package-lock.json)、[tsconfig.json](tsconfig.json)、[esbuild.ts](esbuild.ts)、[ESLint設定](.eslintrc.json)、[CI](.github/workflows/build.yml)、[.gitignore](.gitignore)。

確認事項:

- **再現:** exportsはimport先だけを指定し、ルートのtypesをESM/NodeNext利用側が解決できない。TS7016は「型ファイルはあるがexportsを尊重すると解決できない」と報告する。
- **再現:** npm packにdistが入らず、mainで指定するindex.jsも存在しない。.npmignore/filesがなく.gitignoreのdist除外が使われる。GitHub Pagesはdistを直接コピーするため、この問題をnpm配布と混同しない。
- **再現:** ESLint 8.57.1の起動時にtypescript-eslint type-utilsのTypeFlags.Any参照で失敗。package.jsonはtypescript `^7.0.2`、typescript-eslint plugin `^5.32.0`。互換性を確認して組み合わせを整える。更新バージョンは調査時に決定していない。
- **構造:** workflowはmain pushと手動実行でnpm ci/build/Pages公開のみ。npm testとPR検証がない。
- **構造:** tsconfig.tsbuildinfoはGit管理されている。生成キャッシュを管理する必要性を判断する。ただし宣言欠落の再現はないため、原因として断定しない。

作業:

- [ ] exportsの型定義条件とESM宣言の形式を外部利用側で検証する。必要なら宣言全体のmodule形式・拡張子・importを合わせる。
- [ ] npm配布を維持するならfilesで実行・宣言ファイルを収録し、不要な大型サンプルを除く。古いmainも整える。
- [ ] parser/plugin/compilerの互換性を直し、lockfileを更新する。
- [ ] lint:check/format:check等、変更を伴わない品質チェックを作る。
- [ ] PR用検証を追加し、npm test、build、品質チェック、外部型チェック、梱包後のimportを実行する。検証PRからPages公開しない。

完了条件: クリーン環境と梱包した成果物で実行・型チェックが通る。既存のdefault exportとGitHub Pagesの利用例を維持する。

## T06 — ブックマーク保存とホストページへの影響を整理する

入口: [scraping.ts](src/scraping/scraping.ts)、[CookieStorage.ts](src/scraping/CookieStorage.ts)、[Bookmark.ts](src/scraping/Bookmark.ts)、[Storage.ts](src/scraping/Storage.ts)、[multiBook.ts](src/high/multiBook.ts)。

確認事項:

- **再現:** cookieに `{"title":"x","page":"bad"}` を入れてもBookmarkとして受理される。JSON parse後の型検証がない。
- **構造:** 復元は `bookList.findIndex(c => c.title == bookmark?.title)`。同名章を区別できない。
- **構造:** cookieのpathは現在のpathname、名前は既定でbookmark。別の章URLや作品で復元/衝突の問題が起こるか、実際の埋め込み利用に合わせて検証する。`samesite`は値なしなので意図した属性値を明確にする。
- **構造:** bookmarker.readのrejectでscraping初期化が中断する。
- **構造:** 標準保存コールバックはwriteを直列化しない。独自の非同期Storageでは完了順が逆転し得る。MIGRATION.mdには利用側直列化の例があるため、責務変更を説明する。
- **構造:** 標準onBookChangedは `history.replaceState({}, '', book.url)` の後に元URLへ戻す。履歴stateは元に戻さない。ホストSPAの状態を消す可能性がある。

作業:

- [ ] 安定ID/URLによる章識別と旧titleデータの読み取り方を設計する。
- [ ] 保存値検証、読み取り失敗時の先頭復帰、最新位置を保つ保存順序を実装する。
- [ ] 作品単位のキーと保存範囲を決め、保存できない環境でも閲覧できるようにする。
- [ ] 履歴操作の目的を調べ、必要性・オプション化・既存stateの保存を整理する。

完了条件: 同名章、章URL移動、保存障害、高速ページ送りでも適切に復帰し、ホストページの履歴状態を壊さない。

## T07 — カスタムloader・アクション・通知のAPI契約を揃える

入口: [scraping.ts](src/scraping/scraping.ts)、[multiBook.ts](src/high/multiBook.ts)、[ActionController.ts](src/view/ActionController.ts)、[Emitter.ts](src/view/event/Emitter.ts)、[EventHandler.ts](src/view/event/EventHandler.ts)。

確認事項:

- **再現:** scrapingのコールバック型を `Parameters<typeof multiBook>[0]` から取るため、bookがunknownになる。book.title参照はTS18046。
- **再現:** scrapingはbookListの省略を実装上扱うが、型は `bookList: BookMeta[] | undefined` で必須。`scraiping({pageList: '.page img'})` はTS2741。
- **再現:** defaultActionsは `this: ActionController` の型なのに `.call(null, this)` で実行される。strictな独自function内のthisはnull。既定static関数だけが引数でControllerを受けている。
- **構造:** bookListなしの経路はparseDomだけ呼び、postParseを呼ばない。取得したpagesを再利用するため、データ再試行時にも現在DOMを再解析しない。期待契約を確認する。
- **再現:** EventEmitterの最初の購読者がtrueを返すと後続を実行しない。trigger(0)も通知しない。これはイベント消費として意図されている可能性があるため、単純な不具合と断定して全購読者通知へ変更しない。

作業:

- [ ] scrapingのBookMetaを通知型へ伝播し、bookListの型と単一ページ利用を揃える。
- [ ] defaultActionsをthis契約または明示引数へ統一する。
- [ ] 単一ページ/複数章でloaderフックと再試行の動作を明文化する。
- [ ] 通知型Emitterと消費型EventHandlerの契約を整理し、公開購読者の互換性を確認する。

完了条件: 利用側の型テストと実行時契約テストが一致する。仕様変更はMIGRATION.mdへ反映する。

## T08 — 先読みを未解決データで止めない

入口: [BookLoader.ts](src/high/BookLoader.ts)、[ImagePrefetch.ts](src/loading/ImagePrefetch.ts)、[CacheMap.ts](src/high/CacheMap.ts)、[ImageCache.ts](src/page/ImageCache.ts)。

- **再現:** pageCount=3、getPage(0/1)は即時解決、getPage(2)は永久未解決の独自Bookで、prefetch(0,0)は画像要求を1件も開始しない。pageSourcesのPromise.allが全件を待つため。
- 近隣画像は次章取得待ちより先に始まる既存テストがある。この良い挙動を保持する。
- ImagePrefetch.updateは対象を「置換」する。ページごとにupdate([src])を呼ぶだけでは他の対象をキャンセルするため、同一世代で解決済み対象を集約する設計が必要。

作業:

- [ ] 解決したページデータから先読みを始め、表示位置への距離順の意図を保つ。
- [ ] 移動・再試行・disposeで古い世代の解決が対象へ戻らないようにする。
- [ ] reject、永久未解決、次章遅延、重複URL、共有キャッシュを検証する。

完了条件: 遅い1ページが他の先読みを止めず、古い世代や他の利用者の要求を巻き込まない。

## T09 — ズーム・キーボード・Fullscreen・アクセシビリティを整える

入口: [Zoom.ts](src/view/drag/Zoom.ts)、[PinchEvent.ts](src/view/drag/PinchEvent.ts)、[DragHandler.ts](src/view/event/DragHandler.ts)、[Viewer.ts](src/view/Viewer.ts)、[view.html](src/viewerDom/view.html)、[view.css](src/viewerDom/view.css)。

すべて構造確認。ブラウザーでユーザーへの影響を検証してから修正範囲を確定する。

- CSS transformのoriginは0 0なのに、ズーム中心はviewport上のclientX/Yを直接使う。非原点の埋め込み位置、スクロール、Fullscreen切り替えで中心がずれないか確認する。
- scaleはdistance/初期distance。距離0などで非有限値となり、NaNは上下限比較も通り抜ける。
- キー処理の例外はrangeだけ。select、textarea、input、contenteditable内の矢印/Space/Enterを奪わないようにする。
- clickもrange以外ではpreventDefaultする。selectや独自タイトルUIの標準操作への影響を確認する。
- fullScreen判定はdocument.fullscreenElementの有無だけ。自分の要素/閉じたShadowRootの所属を含めて確認し、request/exitのrejectを扱う。ownerDocument/iframeの責務も合わせる。
- 記号ボタンとrangeに操作名がなく、ボタン無効化はCSS classのみ。フォーカス時もコントローラーを隠すタイマーが動く。
- ZoomのrequestAnimationFrameをdisposeで解除する手段がない。T02と合わせて後始末を確認する。

作業:

- [ ] 座標変換、有限値検証、ズーム上下限、resetをブラウザーで検証する。
- [ ] 操作可能な子UIをイベント処理から適切に除外する。
- [ ] Fullscreenの所有者・失敗・終了後フォーカスを扱う。
- [ ] accessible name、実際のdisabled状態、キーボードフォーカス時の表示を整える。

完了条件: 埋め込み位置に左右されず拡大でき、キーボードだけで章選択・移動・再試行が可能。Fullscreen拒否で未処理rejectが生じない。

## T10 — 無限スクロールの読み込みと終了管理を再設計する

入口: [infinityScroll.ts](src/scraping/infinityScroll.ts)、[scraping.ts](src/scraping/scraping.ts)のloadChapterDocument、[query.ts](src/high/query.ts)。

構造確認:

- fetch後にresponse.okを確認せずHTMLとして扱う。タイムアウト・再試行・AbortSignalがない。
- intervalを取得開始前に停止し、appendNextPageのPromiseを扱わない。失敗時に監視を復帰する経路がない。
- disposeを返さず、不要になった監視を外から解除できない。
- 取得先/redirect後URLを基準に相対画像・リンクを解決しない。挿入後のdocument基準では別ディレクトリのページのURLが変わり得る。
- 同一URL、循環、複数回の初期化による二重取得/追加を防ぐ状態がない。
- 取得HTMLをホストDOMへ入れる境界として、onLoadと取り込む要素の契約を確認する。未検証の具体的脆弱性として断定しない。

作業:

- [ ] loading/failed/disposedと取得済みURLを管理し、失敗から復旧できるようにする。
- [ ] 章HTML取得のHTTP/timeout/retry/base解決を参考に、共通化できる部分を判断する。
- [ ] 取得をAbortSignalで中断し、監視の解除手段を公開する。
- [ ] 相対URL、redirect、循環、404/500、nav/contents欠落、detachをテストする。

完了条件: 復旧・中断・破棄が可能で、同じページを重複追加せず、URLが取得ページの基準で解決される。

## T11 — ZIPサンプルの資源管理を修正する

入口: [ZIPサンプル](examples/zip/index.html)、[Book.ts](src/book/Book.ts)、[BookLoader.ts](src/high/BookLoader.ts)、[MIGRATION.md](MIGRATION.md)。

構造確認:

- getEntries後のasync mapで全画像の展開が直ちに始まる。先読み範囲による制限はZIP展開自体には効かない。
- 作ったBlob URLをrevokeせず、ZipReaderをcloseしていない。ImageCacheのLRU退避はBlob URLの解放にはならない。
- filename.endsWith('jpg')のみで、並び順はZIP内順序。対応拡張子・順序はサンプルとして意図を明示する。
- getBookのsignalを使っていない。現行zip.jsの取得/中断APIは調査していないので、使うバージョンの一次資料で確認する。
- 全展開のPromiseが先にrejectした場合の扱いも確認する。今回unhandled rejectionの実行再現はしていない。

作業:

- [ ] ページ単位の遅延展開と重複取得共有を検討する。
- [ ] Book/章資源を解放する責務を定め、サンプル側でURLとreaderを管理する。
- [ ] 章キャッシュの退避・再取得・dispose時に資源を解放し、表示中のURLは早期revokeしない。

完了条件: 繰り返し章を開閉しても不要な展開・Blob URLが蓄積せず、表示と次章先読みを維持する。ブラウザーで寿命/メモリを確認する。

## T12 — ブラウザー回帰検証と利用文書を整備する

入口: [tests/helpers.cjs](tests/helpers.cjs)、[既存テスト](tests)、[サンプル](examples)、[AGENTS.md](AGENTS.md)、[MIGRATION.md](MIGRATION.md)。

構造確認:

- helpers.cjsはesbuildでTSをCJSへ束ね、フェイクDOM/画像で実行する。`Viewer.prototype.setDrawHandler = () => {}` でジェスチャー設定を無効化している。
- フェイクDOMのaddEventListenerは無操作、classListも通常は無操作。これらのテスト成功をクリック/フォーカス/描画の実ブラウザー成功とみなさない。
- フェイクbuttonにはremoveがなく、凍結PageDataの診断後にdisposeした際、診断用fixture側のTypeErrorが出た。実装の追加バグとして数えず、必要なfixtureを整える。
- READMEがない。通常利用者向け導入/操作/制約はAGENTS.md・MIGRATION.mdへ分散している。
- AGENTS.mdはmultiBook/scraipingの共有imageCacheについて同列に説明する箇所があるが、実装とMIGRATION.mdではscraipingは共有引数を公開しない。まず文書を実装へ合わせる。API拡張するなら明示的に設計する。

作業:

- [ ] 見開き、gesture、ズーム、フォーム操作、Fullscreen、retry、disposeのブラウザー回帰シナリオを継続実行可能にする。
- [ ] 各タスクで必要なブラウザー確認はT12の着手を待たずに実施する。
- [ ] READMEに導入、default export、操作、loading、対応環境、失敗/再試行、破棄/共有の例を記載する。
- [ ] 文書のAPI差分と実装を一致させ、サンプルが公開成果物で動くことを確認する。

完了条件: 文書だけで導入・再試行・破棄でき、代表シナリオが実ブラウザーで検証される。未確認ブラウザーを対応済みと記載しない。

## 参考：保持する設計・互換性

- 公開入口は `src/index.ts` のdefault export。公開キー `scraiping` を無断で改名・削除しない。
- `SpreadPages.image1()`は右、`image2()`は左。位置`-1`は右を空白、最初の画像を左に置く。末尾指定は `PageNumber` を確認する。
- `ActionController`は章取得中も入力を受け付け、相対移動を入力順に適用する。新しい章・open・setCurrentは古い移動要求を破棄する。
- 成功通知・ブックマークは現在の画像表示成功時。失敗、仮ページ、先読み、古い描画から通知しない。
- `Viewer.setCurrent()`は画像とレイアウト処理を待つ。Controllerのopen/setCurrentは失敗をUIで処理するため、Promiseの完了は表示成功を保証しない。
- 共有ImageCacheは作成側がdisposeする。各ビューアーは自分の要求とretainだけを解放し、他の利用者の要求を中断しない。
- 画像の重複要求共有、表示優先、並列制限、再試行、LRU、retainによる保護を保つ。
- ライブラリは利用側作成のBlob URLをrevokeしない。ZIPサンプルでは作成側の責任として解放する。
- 低レベルの `getSpreadPages` だけを持つ独自Bookも表示可能であることを保つ。
- 公開APIや動作契約を変更したらMIGRATION.mdと利用例を一緒に更新する。

## 参考：調査時点と検証結果

2026-10-02、基準コミット `5da4814c771a99627fcc2dae1aeedfd86dd0ca84`。実装修正は未着手。着手時はその後の差分を確認する。

環境はNode.js `v24.21.0`、npm `12.0.2`。依存関係は既に存在し、今回の調査では `npm ci` をやり直していない。

| 確認 | 結果 |
| --- | --- |
| `npm test` | 43件すべて成功、失敗・skipなし |
| `npm run build` | 成功 |
| 一時ディレクトリにsrc、tsconfig、tsbuildinfoをコピーした宣言生成 | 成功、`dist/types/src/index.d.ts`を生成。キャッシュがあると必ず宣言が欠落する、という問題は確認していない |
| `node_modules/.bin/eslint src/ -f unix` | 起動失敗。`@typescript-eslint` pluginロード中に `Cannot read properties of undefined (reading 'Any')` |
| `node_modules/.bin/prettier --check src/` | `src/view/event/DragHandler.ts`、`src/viewerDom/index.ts`、`src/viewerDom/vite-env.d.ts`に整形差分 |
| ESM外部利用側、strict + NodeNextの型チェック | TS7016。exports経由で型定義を解決できない |
| scrapingをソースから利用する型チェック | コールバックのbookがunknown、bookList省略が型エラー |
| `npm pack --dry-run --json --cache /tmp/manga-audit-npm-cache` | 成功。distのファイル0件、`index.js`なし、121ファイル、画像・ZIP57件。圧縮24,252,284 bytes、展開24,614,256 bytes |
| 実ブラウザーの操作・表示・メモリ測定 | 未実施 |

梱包サイズ・件数はこの文書を追加する前の値。npmの既定キャッシュへの書き込みは権限で失敗したため、調査では一時キャッシュへ切り替えた。リポジトリの不具合と混同せず、ユーザーのnpmディレクトリを変更しない。

`npm run lint` は `--fix` とPrettier `--write`でsrcを変更する。読み取り確認には上記のチェック専用コマンドを使う。

## 再現用の短い診断

以下はリポジトリルートで実行する。永続テストとして追加されたものではなく、調査結果を再確認するための診断。修正後は期待する正常挙動へassertするテストに置き換える。

### 表示・再試行・破棄・キャンセル

```sh
node <<'NODE'
const {
  Book, Viewer, ActionController, ImageCache, AutoImage, viewerDom, DragHandler,
} = require('./tests/helpers.cjs');
global.window = global;
global.Image = AutoImage;
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const wide = Book([Promise.resolve({src: 'wide', isWidePage: true})]);
  const view = new Viewer(viewerDom());
  const layout = [];
  view.inner.classList.toggle = (name, value) => layout.push({name, value});
  await view.setCurrent(wide.getSpreadPages(-1));
  console.log('先頭横長', view.rightPage.style.backgroundImage,
    view.leftPage.style.backgroundImage, layout);
  view.dispose();

  const a = Book([Promise.resolve({src: 'a', isWidePage: false})]);
  const b = Book([Promise.resolve({src: 'b', isWidePage: false})]);
  const v = new Viewer(viewerDom());
  const c = new ActionController(v, a.getSpreadPages(-1));
  let calls = 0;
  await c.open(async () => {calls++; return a.getSpreadPages(-1);}, -1);
  await c.setCurrent(b.getSpreadPages(-1));
  v.onRetry.trigger('data');
  await tick();
  console.log('再試行元', calls, (await c.current.image2())?.src);
  c.dispose();

  const cache = new ImageCache({imageFactory: () => new AutoImage()});
  const shared = new Viewer(viewerDom(), {imageCache: cache});
  shared.dispose();
  await shared.setCurrent(b.getSpreadPages(-1));
  console.log('破棄後背景', shared.leftPage.style.backgroundImage);
  cache.dispose();

  global.Element = class Element {};
  const gestures = [];
  const drag = new DragHandler({onPinch() {}, onDraw: e => gestures.push(e.gestures)});
  const point = x => ({pointerId: 1, clientX: x, clientY: 0,
    screenX: x, screenY: 0, target: null});
  drag.onPointerDown(point(0));
  drag.onPointerMove(point(30));
  // 実装がpointercancelを接続するのと同じ終了処理。
  drag.onPointerUp(point(30));
  console.log('キャンセル時のgesture', gestures);
})().catch(error => {console.error(error); process.exitCode = 1;});
NODE
```

調査時の出力: 先頭横長は右空/左URL/single=true、再試行元はcalls=2/src=a、破棄後背景はurl("b")、キャンセル時gestureは[['left']]。

### 外部ESM利用側の型チェック

1. `npm run build` を実行する。
2. 一時ディレクトリの `node_modules/manga-book-reader` にこのリポジトリへのsymlinkを作る。
3. `consumer.mts` に次を保存する。

```ts
import reader from 'manga-book-reader';
const book = reader.Book([]);
```

4. 一時ディレクトリをcwdにして、リポジトリ内のtsc実行ファイルで `--noEmit --strict --module nodenext --moduleResolution nodenext --target esnext consumer.mts` を実行する。

調査時はTS7016。リポジトリcwdでファイルを直接指定すると、TypeScript 7ではTS5112が先に出ることがある。その場合は一時cwdを使うか `--ignoreConfig` を指定し、exportsの問題と混同しない。T05の完了確認ではsymlinkだけでなく実際に梱包したパッケージも使う。

### scrapingの利用型

ソース入口をimportし、HTML/CSS宣言の `src/viewerDom/vite-env.d.ts` を型チェック対象に含めて次を確認する。

```ts
reader.scraiping({
  bookList: [{title: 't', url: 'https://example.test/'}],
  pageList: '.page img',
  onPageChanged: ({book}) => { console.log(book.title); },
});
reader.scraiping({pageList: '.page img'});
```

調査時は順にTS18046（bookはunknown）、TS2741（bookListが必須）。

## 実装後の引き継ぎ更新

各タスクを完了したら、この文書に以下を追記する。

- 実装した仕様と変更ファイル、公開APIへの影響。
- 実行したテスト/ブラウザーと結果。未検証事項は明示する。
- 残った判断事項・依存タスク。推測を再現済みに変更する際は条件を記載する。
- 完了条件を満たしたタスクと作業項目のチェック。

既存テストは `tests/chapter-race.test.cjs`（章/描画競合・入力順序・再試行）、`tests/image-cache.test.cjs`（共有・並列・LRU・再試行・中断）、`tests/multi-book-preload.test.cjs`（先読み・通知・共有・破棄）、`tests/chapter-loader.test.cjs`（HTTP分類・Retry-After・基準URL・中断）を参照する。修正した責務に対応するテストを追加し、最後に `npm test` と `npm run build` を実行する。

## T01 実装記録（2026-10-02）

T01完了。変更は `src/book/Book.ts`、`src/page/SpreadPages.ts`、`src/page/PageData.ts`、`src/view/Viewer.ts`、`src/viewerDom/view.css`、関連テストと利用文書。仕様と利用例は `MIGRATION.md` の節9、ブラウザー確認用の利用例は `tests/browser/spread-pages.html`。

PageDataの `isWidePage` 未指定は縦長として2画像を並行して表示し、0→2→4と移動する。移動はPageData・寸法判定・画像ロードを待たない。Viewerは描画で取得した実寸を `setImageSize` でBookへ通知する。Bookは入力データを書き換えず判定結果を保持し、明示指定を優先する。標準scraipingのURLのみのloaderと凍結データも扱える。

現在の見開きの右/左が横長と判明した場合のみ、左を外して表示を更新する。右が横長なら全面化し、左だけなら右の半幅表示を維持する。現在位置と右画像は固定し、位置-1の横長表紙は左の全面表示にする。縦長の確定、読み飛ばした画像や非表示画像の判定では現在の組み合わせを変更せず、過去の移動を補正しない。onLayoutChangedはその見開きの構成変更だけを通知し、Viewerは描画中断時に購読解除する。

| 入力（N=通常、W=横長） | -1からの順方向位置 | 表示対象（右/左） |
| --- | --- | --- |
| 空 | -1 | 空/空 |
| N | -1 | 空/0 |
| W | -1 | 空/0（左側を全面化） |
| NN | -1 → 1 | 空/0 → 1/空 |
| NNN | -1 → 1 | 空/0 → 1/2 |
| NNNN | -1 → 1 → 3 | 空/0 → 1/2 → 3/空 |
| NWN | -1 → 1 → 2 | 空/0 → 1/空（全面） → 2/空 |
| WNWNN | -1 → 1 → 2 → 3 | 空/0（全面） → 1/空 → 2/空（全面） → 3/4 |
| NWNを位置0から | 0 → 1 → 2 | 0/空 → 1/空（全面） → 2/空 |
| NNNの末尾指定 | last:0 = 1、last:-1 = 2 | 1/2、2/空 |

表は寸法判定済みの表示を示す。next/prevは通常の見開きを往復し、任意開始位置からnextPageした結果のprevPageは開始状態へ戻る。位置指定/半ページ移動で直接作った状態のprevPageは、その時点で既知の構成を表紙から辿って直前の位置に戻るため、範囲が重なる場合がある。hasNextは実際の次操作、hasPrevは空Book/-1以外、canMoveは相対量で判定する。moveは従来どおり範囲補正する。

検証: npm test 70件成功（追加27件）。長さ1〜6の通常/横長の全126組み合わせ、未判定の次/次の次、未解決データ/画像中の入力順序、横長の表紙、右横長で未完了左の排除、左横長で右/位置保持、非表示の遅い結果からの保護、縦長判定での構成保持、同一描画内の非同期レイアウト競合、凍結データ、相対移動・末尾指定を確認。通信並列数2で未完了画像から別の見開きへ切り替え、その画像が取得開始できることも確認。npm run build成功。Codex内蔵ブラウザーで11項目成功。寸法未指定の横長/通常ペア、未解決データからの位置2への操作、現在の左を横長と確定した際の位置0/右画像保持を確認した。Chrome/Firefox/Safari個別とタッチ操作は未検証。

残り: 数値入力検証はT04、ポインター操作はT03、ブラウザー回帰のCI統合はT12。凍結PageDataへの書き込みはなくなったが、T04全体は未完了。
