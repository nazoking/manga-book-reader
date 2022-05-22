export declare class EventCache {
    private map;
    constructor(map?: Map<number, PointerEvent>);
    put(ev: PointerEvent): PointerEvent | undefined;
    update(ev: PointerEvent): PointerEvent | undefined;
    delete(ev: PointerEvent): PointerEvent | undefined;
    get size(): number;
    values(): PointerEvent[];
}
//# sourceMappingURL=EventCache.d.ts.map