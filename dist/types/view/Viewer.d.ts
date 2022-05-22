import { SpreadPages } from "../page/SpreadPages";
import { EventHandler } from "./event/EventHandler";
import { KeyEvent } from "./event/KeyEvent";
import { EventEmitter } from "./event/Emitter";
export declare class Viewer {
    readonly div: HTMLElement;
    readonly rightPage: HTMLElement;
    readonly leftPage: HTMLElement;
    readonly pages: HTMLElement;
    readonly info: HTMLElement;
    readonly bookTitle: HTMLElement;
    private infoTimer;
    private zoom?;
    readonly onChanged: EventEmitter<SpreadPages>;
    constructor(div?: HTMLElement);
    /** DrawHandler は、ジェスチャ（ドラッグしながら一定距離動く）をハンドリングする */
    setDrawHandler(drawHandler: EventHandler<string>): void;
    /** クリックハンドラは、エレメントをクリックすることで発生するイベントをハンドリングする */
    setClickHandler(clickHandler: EventHandler<Element>): void;
    /** キーハンドラはキーボードイベントをハンドリングする */
    setKeyHandler(keyHandler: EventHandler<KeyEvent>): void;
    toggleControllers(): void;
    showControllers(): void;
    hideControllers(): void;
    zoomReset(): void;
    get fullScreen(): boolean;
    set fullScreen(set: boolean);
    setTitle(title: string | HTMLElement): void;
    private setPageImageType;
    private setPageTypeSingleUnit;
    setCurrent(pages: SpreadPages): Promise<void>;
}
//# sourceMappingURL=Viewer.d.ts.map