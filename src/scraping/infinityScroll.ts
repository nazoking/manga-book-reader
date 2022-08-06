import { query } from "../high/query";
export interface InfinityScroll {
  /** navigation. xpath or css-selector */
  nav: string;
  /** A tag that indicate next page. position from navigation element. xpath or css-selector */
  next: string;
  /** contents area from next page dom. xpath or css-selector */
  contents: string;
  /** event handler on load next page dom. you can modified next page dom */
  onLoad?: (document: DocumentFragment) => void;
}

export async function appendNextPage(
  url: string,
  nav: HTMLElement,
  config: InfinityScroll
) {
  console.log(`📖append ${url}`);
  nav.style.backgroundColor = "red";
  const f = await fetch(url)
    .then((a) => a.text())
    .then((a) => new DOMParser().parseFromString(a, "text/html"));
  const nextNav = query(config.nav, f)[0];
  if (!nextNav) {
    console.log(`📖not found nav ${config.nav} in next page ${url}`);
    return;
  }
  const contents = query(config.contents, f)[0];
  if (!contents) {
    console.log(`📖not found contents ${config.contents} in next page ${url}`);
    return;
  }
  const frag = document.createDocumentFragment();
  frag.appendChild(contents);
  frag.appendChild(nextNav);
  if (config.onLoad) {
    config.onLoad(frag);
  }
  const navParent = nav.parentElement;
  if (!navParent) throw new Error(`nav has not parent`);
  navParent.insertBefore(frag, nav);
  navParent.removeChild(nav);
  infinityScroll(config);
}
export function infinityScroll(config: InfinityScroll) {
  // bookmarkDetect();
  const nav = query<HTMLElement>(config.nav)[0];
  if (!nav) {
    console.log(`📖not found nav ${config.nav} in current page`);
    return;
  }
  const next = query<HTMLAnchorElement>(config.next, nav)[0];
  if (!next) {
    console.log(`📖not found next ${config.next} in current page`);
    return;
  }
  const timeerId = setInterval(() => {
    if (nav.getBoundingClientRect().top < window.innerHeight) {
      clearInterval(timeerId);
      appendNextPage(next.href, nav, config);
    }
  }, 500);
}
