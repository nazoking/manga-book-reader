import viewHtml from "./view.html";
import viewCss from "./view.css";

export const viewerDom = (doc: Document = document) => {
  const div = doc.createElement("div");
  div.innerHTML =
    viewHtml + `<style>${viewCss}</style>`;
  return div;
};
