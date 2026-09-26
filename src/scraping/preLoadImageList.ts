import { ImageCache } from "../page/ImageCache";

export const preLoadImageList = async (
  srcList: string[] | undefined,
  imageCache: ImageCache
) => {
  if (!srcList) return;
  await Promise.all(
    srcList
      .filter(Boolean)
      .map((src) =>
        imageCache.load(src, { priority: "preload" }).catch(() => undefined)
      )
  );
};
