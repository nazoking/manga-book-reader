import { PageData } from "../page/PageData";
import { SpreadPages } from "../page/SpreadPages";
import { PageNumber } from "../page/PageNumber";

export interface Book {
  getSpreadPages(pageA: PageNumber): SpreadPages;
  /** Optional page-level access used by the reader's bounded preloader. */
  readonly pageCount?: number;
  getPage?(index: number): Promise<PageData | null>;
}
export const Book = (pages: Promise<PageData>[]): Book => {
  const metadata = new Map<number, PageData>();
  const wideIndices = new Set<number>();
  const listeners = new Map<number, Set<() => void>>();
  const notify = (index: number) => listeners.get(index)?.forEach((fn) => fn());
  const recordWide = (index: number) => {
    if (wideIndices.has(index)) return;
    wideIndices.add(index);
    notify(index);
  };
  pages.forEach((promise, index) => {
    void promise.then(
      (data) => {
        metadata.set(index, data);
        if (data.isWidePage === true) recordWide(index);
      },
      () => {}
    );
  });
  // Unknown dimensions are portrait. Never wait for acquisition to navigate.
  const isWide = (index: number) => {
    const data = metadata.get(index);
    return data ? data.isWidePage ?? wideIndices.has(index) : false;
  };
  const step = (index: number) => (isWide(index) || isWide(index + 1) ? 1 : 2);
  const spreadAt = (pageA: PageNumber, previous?: SpreadPages): SpreadPages => {
    const page = PageNumber.inRange(pageA, pages.length);
    const hasLeft = () => page === -1 || (!isWide(page) && !isWide(page + 1));
    const nextPosition = () => (page === -1 ? 1 : page + step(page));
    const spread: SpreadPages = {
      setImageSize: (side, width, height) => {
        const index = side === "right" ? page : page + 1;
        if (metadata.get(index)?.isWidePage === undefined && width > height)
          recordWide(index);
      },
      onLayoutChanged: (listener) => {
        const indices = [page, page + 1].filter(
          (index) => index >= 0 && index < pages.length
        );
        let single = isWide(page === -1 ? 0 : page);
        let leftVisible = hasLeft();
        const changed = () => {
          const nextSingle = isWide(page === -1 ? 0 : page);
          const nextLeft = hasLeft();
          if (single === nextSingle && leftVisible === nextLeft) return;
          single = nextSingle;
          leftVisible = nextLeft;
          listener();
        };
        for (const index of indices) {
          let set = listeners.get(index);
          if (!set) listeners.set(index, (set = new Set()));
          set.add(changed);
        }
        return () => {
          for (const index of indices) {
            const set = listeners.get(index);
            set?.delete(changed);
            if (!set?.size) listeners.delete(index);
          }
        };
      },
      image1: () => pages[page] ?? null,
      image2: () => (hasLeft() ? pages[page + 1] ?? null : null),
      hasNext: async () => nextPosition() < pages.length,
      nextPage: async () => {
        const next = nextPosition();
        return next < pages.length ? spreadAt(next, spread) : spread;
      },
      hasPrev: async () => pages.length > 0 && page > -1,
      prevPage: async () => {
        if (page <= -1 || !pages.length) return spread;
        if (previous) return previous;
        let preceding = -1;
        while (true) {
          const next = preceding === -1 ? 1 : preceding + step(preceding);
          if (next >= page) break;
          preceding = next;
        }
        return spreadAt(preceding);
      },
      move: async (num: number) => spreadAt(page + num),
      canMove: async (num: number) =>
        num !== 0 && page + num >= -1 && page + num < pages.length,
      pageNumber: () => page,
      isSingleUnit: async () => isWide(page === -1 ? 0 : page),
      pageMax: pages.length,
    };
    return spread;
  };
  return {
    pageCount: pages.length,
    getPage: async (index: number) => pages[index] ?? null,
    getSpreadPages: (page: PageNumber = 0) => spreadAt(page),
  };
};
