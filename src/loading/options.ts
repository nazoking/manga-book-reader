export interface RequestOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelaysMs?: number[];
}

export interface CacheOptions extends RequestOptions {
  maxConcurrent?: number;
  maxPreloadConcurrent?: number;
  maxEntries?: number;
  maxBytes?: number;
}

export interface PreloadOptions {
  preloadAhead?: number;
  preloadBehind?: number;
  preloadNextBook?: boolean;
  nextBookThreshold?: number;
  nextBookPages?: number;
}

export interface LoadingOptions extends CacheOptions, PreloadOptions {}

const integer = (value: number | undefined, fallback: number, min = 0) =>
  Math.floor(Math.max(min, value ?? fallback));

export const resolveRequestOptions = (
  options: RequestOptions = {}
): Required<RequestOptions> => ({
  timeoutMs: integer(options.timeoutMs, 20_000, 1),
  retries: integer(options.retries, 2),
  retryDelaysMs: (options.retryDelaysMs ?? [500, 1500]).map((ms) =>
    integer(ms, 0)
  ),
});

export const resolveCacheOptions = (
  options: CacheOptions = {}
): Required<CacheOptions> => ({
  ...resolveRequestOptions(options),
  maxConcurrent: integer(options.maxConcurrent, 4, 1),
  maxPreloadConcurrent: integer(options.maxPreloadConcurrent, 2),
  maxEntries: integer(options.maxEntries, 24),
  maxBytes: integer(options.maxBytes, 96 * 1024 * 1024),
});

export const resolvePreloadOptions = (
  options: PreloadOptions = {}
): Required<PreloadOptions> => ({
  preloadAhead: integer(options.preloadAhead, 6),
  preloadBehind: integer(options.preloadBehind, 2),
  preloadNextBook: options.preloadNextBook ?? true,
  nextBookThreshold: integer(options.nextBookThreshold, 6),
  nextBookPages: integer(options.nextBookPages, 2),
});
