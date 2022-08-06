export const preLoadImageList = async (srcList: string[] | undefined) => {
  if (!srcList) return;
  const f = document.head.firstChild;
  for (const src of srcList) {
    await new Promise<void>((resolve) => {
      const link = document.createElement("link");
      link.setAttribute("rel", "preload");
      link.setAttribute("as", "image");
      link.setAttribute("href", src);
      const next = (message: string) => {
        document.head.removeChild(link);
        if (message == "load error") {
          console.log(`load error ${src}`);
        }
        resolve();
      };
      link.onload = () => next("loaded");
      link.onerror = () => next("load error");
      document.head.insertBefore(link, f);
    });
  }
};
