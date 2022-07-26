import { SpreadPages } from "../page/SpreadPages";
import { EventHandler } from "./event/EventHandler";
import { KeyEvent } from "./event/KeyEvent";
import { EventEmitter } from "./event/Emitter";
export declare class Viewer {
    readonly rightPage: HTMLElement;
    readonly leftPage: HTMLElement;
    readonly pages: HTMLElement;
    readonly info: HTMLElement;
    readonly bookTitle: HTMLElement;
    private infoTimer;
    private zoom?;
    readonly onChanged: EventEmitter<SpreadPages>;
    wrapper: HTMLElement;
    root: ShadowRoot;
    inner: HTMLElement;
    constructor(div?: HTMLElement);
    /** DrawHandler handles gestures (moving a certain distance while dragging) */
    setDrawHandler(drawHandler: EventHandler<string>): void;
    /** Click handlers handle events that occur when you click on an element */
    setClickHandler(clickHandler: EventHandler<Element>): void;
    /** Key handlers handle keyboard events */
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