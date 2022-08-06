export const viewerDom = (doc: Document = document) => {
  const div = doc.createElement("div");
  div.innerHTML =
    require("./view.html") + `<style>${require("./view.css")}</style>`;
  return div;
};
