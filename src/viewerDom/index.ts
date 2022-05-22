export const viewerDom = (doc: Document = document) => {
  const div = doc.createElement("div");
  const id = "bookview-" + Math.random().toString(36).replace(/0\./, "");
  div.id = id;
  div.tabIndex = 0;
  div.innerHTML =
    require("./view.html") +
    `<style>${require("./view.css")
      .replace(/#id/g, `#${id}`)}</style>`;
  return div; 
}
