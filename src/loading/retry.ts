export const abortError = () =>
  new DOMException("The operation was aborted", "AbortError");

export const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      if (signal?.aborted) reject(abortError());
      else resolve();
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener("abort", finish, { once: true });
  });

/** Retry policy is shared; each transport owns its timeout and error classification. */
export async function retry<T>(
  operation: () => Promise<T>,
  options: { retries: number; retryDelaysMs: number[] },
  signal?: AbortSignal,
  retryDelay: (error: unknown, delay: number) => number | false = (_, ms) => ms
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw abortError();
    try {
      const result = await operation();
      if (signal?.aborted) throw abortError();
      return result;
    } catch (error) {
      if (signal?.aborted) throw abortError();
      if (attempt >= options.retries) throw error;
      const ms = retryDelay(
        error,
        options.retryDelaysMs[attempt] ?? options.retryDelaysMs.at(-1) ?? 0
      );
      if (ms === false) throw error;
      await delay(ms, signal);
    }
  }
}
