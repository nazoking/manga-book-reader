import { ImageCache } from "../page/ImageCache";

/** One reader's moving set of requests; shared cache entries belong to the cache. */
export class ImagePrefetch {
  private readonly pending = new Map<string, AbortController>();

  constructor(private readonly cache: ImageCache) {}

  update(sources: string[]): void {
    const wanted = new Set(sources.filter(Boolean));
    for (const [src, request] of this.pending) {
      if (wanted.has(src)) continue;
      request.abort();
      this.pending.delete(src);
    }
    for (const src of wanted) {
      if (this.pending.has(src)) continue;
      const request = new AbortController();
      this.pending.set(src, request);
      void this.cache
        .load(src, { priority: "preload", signal: request.signal })
        .catch(() => {})
        .finally(() => {
          if (this.pending.get(src) === request) this.pending.delete(src);
        });
    }
  }

  clear(): void {
    this.update([]);
  }
}
