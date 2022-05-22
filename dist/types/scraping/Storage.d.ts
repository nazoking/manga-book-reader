export interface Storage<T> {
    write(t: T): Promise<void>;
    read(): Promise<T | null>;
}
//# sourceMappingURL=Storage.d.ts.map