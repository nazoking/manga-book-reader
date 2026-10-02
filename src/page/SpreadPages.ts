import { PageData } from "./PageData";

/** Page acquisition status */
export interface SpreadPages {
  /** True if nextPage reveals another composition; false at the end. */
  hasNext(): Promise<boolean>;
  /** Returns the state of moving to the next page. */
  nextPage(): Promise<SpreadPages>;
  /** Returns the state of moving to the previous page. */
  prevPage(): Promise<SpreadPages>;
  /** True if prevPage changes position, including 0 to the cover at -1. */
  hasPrev(): Promise<boolean>;
  /** Move by a relative image-index delta, clamped to [-1, pageMax - 1]. */
  move(num: number): Promise<SpreadPages>;
  pageNumber(): number;
  /** True for a nonzero relative delta whose destination is within range. */
  canMove(num: number): Promise<boolean>;
  /** right page */
  image1(): Promise<PageData | null> | null;
  /** left page */
  image2(): Promise<PageData | null> | null;
  /** True when one wide image occupies the full viewer width. */
  isSingleUnit(): Promise<boolean>;
  /** Record a displayed image's dimensions; explicit PageData metadata wins. */
  setImageSize?(side: "right" | "left", width: number, height: number): void;
  /** Notify when this spread changes from a portrait pair to a wide layout. */
  onLayoutChanged?(listener: () => void): () => void;
  pageMax?: number;
}
