import once from "./once";
type Size = { width: number; height: number };
export const loadImage = (src: string, onSizeDetected: (size: Size) => void) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const poll = setInterval(function () {
      if (image.naturalWidth) {
        clearInterval(poll);
        onSizeDetected({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      }
    }, 10);
    const ok = once(image, "load", () => {
      ng.cancel();
      resolve(image);
    });
    const ng = once(image, "error", () => {
      ok.cancel();
      reject(image);
    });
    image.src = src;
  });
