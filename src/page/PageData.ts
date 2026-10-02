export interface PageData {
  readonly src: string;
  /** Full-width single image. Omitted values are inferred from loaded dimensions. */
  isWidePage?: boolean;
}
