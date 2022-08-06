export class CacheMap<KEY, VALUE> {
  private map = new Map<KEY, VALUE>();
  async getOr(key: KEY, value: (key: KEY) => Promise<VALUE>): Promise<VALUE> {
    const c = this.map.get(key);
    if (c) return c;
    const r = await value(key);
    this.map.set(key, r);
    return r;
  }
}
