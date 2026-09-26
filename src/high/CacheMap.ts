export class CacheMap<KEY, VALUE> {
  private map = new Map<
    KEY,
    {
      promise: Promise<VALUE>;
      pending: boolean;
      controller: AbortController;
    }
  >();
  private protectedKeys = new Set<KEY>();

  constructor(private readonly maxEntries = 3) {}

  async getOr(
    key: KEY,
    value: (key: KEY, signal: AbortSignal) => Promise<VALUE>
  ): Promise<VALUE> {
    const c = this.map.get(key);
    if (c) {
      this.map.delete(key);
      this.map.set(key, c);
      return c.promise;
    }
    const controller = new AbortController();
    const entry = {
      promise: Promise.resolve().then(() => value(key, controller.signal)),
      pending: true,
      controller,
    };
    this.map.set(key, entry);
    try {
      const result = await entry.promise;
      entry.pending = false;
      this.trim();
      return result;
    } catch (error) {
      if (this.map.get(key) === entry) this.map.delete(key);
      throw error;
    }
  }

  protect(keys: KEY[]): void {
    this.protectedKeys = new Set(keys);
    for (const [key, entry] of this.map) {
      if (entry.pending && !this.protectedKeys.has(key)) {
        entry.controller.abort();
        this.map.delete(key);
      }
    }
    this.trim();
  }

  clear(): void {
    for (const entry of this.map.values()) entry.controller.abort();
    this.map.clear();
    this.protectedKeys.clear();
  }

  delete(key: KEY): void {
    this.map.get(key)?.controller.abort();
    this.map.delete(key);
  }

  private trim(): void {
    while (this.map.size > this.maxEntries) {
      const candidate = [...this.map.entries()].find(
        ([key, entry]) => !entry.pending && !this.protectedKeys.has(key)
      );
      if (!candidate) return;
      this.map.delete(candidate[0]);
    }
  }
}
