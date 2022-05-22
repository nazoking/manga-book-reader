export declare class CacheMap<KEY, VALUE> {
    private map;
    getOr(key: KEY, value: (key: KEY) => Promise<VALUE>): Promise<VALUE>;
}
//# sourceMappingURL=CacheMap.d.ts.map