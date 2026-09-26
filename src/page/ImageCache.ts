import { abortError, retry } from "../loading/retry";
import { CacheOptions, resolveCacheOptions } from "../loading/options";

type Priority = "display" | "preload";
type Subscriber = {
  priority: Priority;
  signal?: AbortSignal;
  abort?: () => void;
  resolve: (image: HTMLImageElement) => void;
  reject: (error: unknown) => void;
};
type Entry = {
  src: string;
  image?: HTMLImageElement;
  bytes: number;
  lastUsed: number;
  subscribers: Set<Subscriber>;
  controller?: AbortController;
};

export interface ImageCacheOptions extends CacheOptions {
  imageFactory?: () => HTMLImageElement;
}

/** Shares image requests between rendering and preloading, with bounded concurrency and memory. */
export class ImageCache {
  readonly options: Required<CacheOptions>;
  private readonly entries = new Map<string, Entry>();
  private readonly retained = new Map<string, number>();
  private readonly imageFactory: () => HTMLImageElement;
  private active = 0;
  private activePreloads = 0;
  private access = 0;
  private disposed = false;

  constructor(options: ImageCacheOptions = {}) {
    this.options = resolveCacheOptions(options);
    this.imageFactory = options.imageFactory ?? (() => new Image());
  }

  load(
    src: string,
    options: {
      priority?: Priority;
      signal?: AbortSignal;
    } = {}
  ): Promise<HTMLImageElement> {
    const priority = options.priority ?? "display";
    if (this.disposed) return Promise.reject(abortError());
    if (options.signal?.aborted) return Promise.reject(abortError());
    if (priority === "preload" && this.options.maxPreloadConcurrent === 0) {
      return Promise.reject(new Error("Image preloading is disabled"));
    }
    let entry = this.entries.get(src);
    if (entry?.image) {
      entry.lastUsed = ++this.access;
      return Promise.resolve(entry.image);
    }
    if (!entry) {
      entry = {
        src,
        bytes: 0,
        lastUsed: ++this.access,
        subscribers: new Set(),
      };
      this.entries.set(src, entry);
    }

    return new Promise<HTMLImageElement>((resolve, reject) => {
      const subscriber: Subscriber = {
        priority,
        signal: options.signal,
        resolve,
        reject,
      };
      subscriber.abort = () => {
        this.detach(entry!, subscriber);
        if (
          entry!.subscribers.size === 0 &&
          !entry!.image &&
          this.entries.get(src) === entry
        ) {
          this.entries.delete(src);
          entry!.controller?.abort();
        }
        reject(abortError());
      };
      entry!.subscribers.add(subscriber);
      options.signal?.addEventListener("abort", subscriber.abort, {
        once: true,
      });
      this.pump();
    });
  }

  /** Keep a resource resident until the caller releases it (safe before load). */
  retain(src: string): () => void {
    this.retained.set(src, (this.retained.get(src) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const count = (this.retained.get(src) ?? 1) - 1;
      if (count) this.retained.set(src, count);
      else this.retained.delete(src);
      this.trim();
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.entries.values()) {
      entry.controller?.abort();
      for (const subscriber of [...entry.subscribers]) subscriber.abort?.();
    }
    this.entries.clear();
    this.retained.clear();
  }

  private isPreload(entry: Entry): boolean {
    return ![...entry.subscribers].some((s) => s.priority === "display");
  }

  private pump(): void {
    if (this.disposed) return;
    while (this.active < this.options.maxConcurrent) {
      const waiting = [...this.entries.values()].filter(
        (entry) => !entry.image && !entry.controller
      );
      const entry =
        waiting.find((entry) => !this.isPreload(entry)) ??
        (this.activePreloads < this.options.maxPreloadConcurrent
          ? waiting[0]
          : undefined);
      if (!entry) return;
      const preload = this.isPreload(entry);
      const controller = new AbortController();
      entry.controller = controller;
      this.active++;
      if (preload) this.activePreloads++;
      void this.run(entry, controller.signal).finally(() => {
        this.active--;
        if (preload) this.activePreloads--;
        this.pump();
      });
    }
  }

  private async run(entry: Entry, signal: AbortSignal): Promise<void> {
    try {
      const image = await retry(
        () => this.loadOnce(entry.src, signal),
        this.options,
        signal
      );
      entry.image = image;
      entry.bytes = image.naturalWidth * image.naturalHeight * 4;
      entry.lastUsed = ++this.access;
      for (const subscriber of [...entry.subscribers]) {
        this.detach(entry, subscriber);
        subscriber.resolve(image);
      }
      this.trim();
    } catch (error) {
      if (this.entries.get(entry.src) === entry) this.entries.delete(entry.src);
      for (const subscriber of [...entry.subscribers]) {
        this.detach(entry, subscriber);
        subscriber.reject(error);
      }
    } finally {
      entry.controller = undefined;
    }
  }

  private detach(entry: Entry, subscriber: Subscriber): void {
    entry.subscribers.delete(subscriber);
    if (subscriber.signal && subscriber.abort) {
      subscriber.signal.removeEventListener("abort", subscriber.abort);
    }
  }

  private async loadOnce(
    src: string,
    signal: AbortSignal
  ): Promise<HTMLImageElement> {
    const image = this.imageFactory();
    image.decoding = "async";
    return new Promise<HTMLImageElement>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        clearTimeout(timeout);
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
        signal.removeEventListener("abort", aborted);
      };
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve(image);
      };
      const loaded = async () => {
        try {
          if (typeof image.decode === "function") await image.decode();
          if (signal.aborted) throw abortError();
          finish();
        } catch (error) {
          finish(error);
        }
      };
      const failed = () => finish(new Error(`Failed to load image: ${src}`));
      const aborted = () => {
        image.src = "";
        finish(abortError());
      };
      const timeout = setTimeout(() => {
        image.src = "";
        finish(
          new Error(
            `Image load timed out after ${this.options.timeoutMs}ms: ${src}`
          )
        );
      }, this.options.timeoutMs);
      image.addEventListener("load", loaded, { once: true });
      image.addEventListener("error", failed, { once: true });
      signal.addEventListener("abort", aborted, { once: true });
      image.src = src;
      if (image.complete && image.naturalWidth > 0) void loaded();
    });
  }

  private trim(): void {
    const ready = [...this.entries.values()].filter((entry) => entry.image);
    let bytes = ready.reduce((total, entry) => total + entry.bytes, 0);
    let count = ready.length;
    const candidates = ready
      .filter((entry) => !this.retained.has(entry.src))
      .sort((a, b) => a.lastUsed - b.lastUsed);
    while (
      (count > this.options.maxEntries || bytes > this.options.maxBytes) &&
      candidates.length
    ) {
      const entry = candidates.shift()!;
      if (this.entries.get(entry.src) !== entry) continue;
      this.entries.delete(entry.src);
      bytes -= entry.bytes;
      count--;
    }
  }
}
