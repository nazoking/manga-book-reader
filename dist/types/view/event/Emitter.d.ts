import { EventHandler } from "./EventHandler";
export declare class EventEmitter<T> {
    private handlers;
    constructor(handlers?: EventHandler<T>[]);
    trigger(action: T | null | undefined): boolean | void;
    add(handler: EventHandler<T>): void;
    remove(handler: EventHandler<T>): void;
}
//# sourceMappingURL=Emitter.d.ts.map