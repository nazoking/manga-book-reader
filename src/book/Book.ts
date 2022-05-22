import { PageData } from "../page/PageData";
import { SpreadPages } from "../page/SpreadPages";
import { PageNumber } from "../page/PageNumber";


export interface Book {
  getSpreadPages(pageA: PageNumber): SpreadPages
}
export const Book = (pages: Promise<PageData>[]): Book => {
  const book = {
    getSpreadPages(pageA: PageNumber = 0): SpreadPages {
      let page: number = PageNumber.inRange(pageA, pages.length);
      const image1 = pages[page] || null;
      const image2 = pages[page + 1] || null;
      const spread = {
        image1: () => image1,
        image2: () => image2,
        hasNext: async () => page < pages.length - 1,
        nextPage: async () => book.getSpreadPages(page + (await spread.isSingleUnit() ? 1 : 2)),
        hasPrev: async () => page > 0,
        prevPage: async () => book.getSpreadPages(page - ((await pages[page -1])?.isWidePage ? 1 : 2)),
        move: async (num: number) => book.getSpreadPages(page + num),
        canMove: async (num: number) => pages[num] !== undefined,
        pageNumber: () => page,
        isSingleUnit: async () => (await image1)?.isWidePage || (await image2)?.isWidePage || false,
      };
      return spread;
    }
  };
  return book;
}
