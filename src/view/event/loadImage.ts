import once from "./once";
type Size={width:number, height:number};
export const loadImage = (src: string, onSizeDetected:(size:Size) => void) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  var poll = setInterval(function () {
    if (image.naturalWidth) {
        clearInterval(poll);
        onSizeDetected({
          width:image.naturalWidth,
          height:image.naturalHeight,
        });
    }
}, 10);
  const ok = once(image, "load", (_event) => {
    ng.cancel();
    resolve(image);
  });
  const ng = once(image, "error", (_event) => {
    ok.cancel();
    reject(image);
  });
  image.src = src;
});
