import { query } from '../high/query';
export interface InfinityScroll{
  /** ナビゲーションの位置。xpath か css-selector */
  nav: string;
  /** ナビゲーションから次ページ a タグの位置。xpath か css-selector */
  next: string;
  /** 次ページ dom から コンテンツエリアの位置。xpath か css-selector */
  contents: string;
  /** つぎ足す前にコンテンツに何かする場合 */
  onLoad?: (document:DocumentFragment) => void;
}

export async function appendNextPage(url:string, nav:HTMLElement, config: InfinityScroll){
  console.log(`継ぎ足し ${url}`);
  nav.style.backgroundColor = 'red';
  const f = await fetch(url).then(a => a.text()).then(a => new DOMParser().parseFromString(a,"text/html"));
  const nextNav = query(config.nav, f)[0];
  if(!nextNav){ console.log(`次ページ ${url} の継ぎ足し部分 ${config.nav} が見つからない`); return; }
  const contents = f.querySelector(config.contents);
  if(!contents){ console.log(`次ページ ${url} の継ぎ足し部分 ${config.contents} が見つからない`); return; }
  let frag = document.createDocumentFragment();
  frag.appendChild(contents);
  frag.appendChild(nextNav);
  if(config.onLoad){
    config.onLoad(frag);
  }
  const navParent = nav.parentElement!;
  navParent.insertBefore(frag ,nav);
  navParent.removeChild(nav);
  infinityScroll(config);
}
export function infinityScroll(config:InfinityScroll){
  // bookmarkDetect();
  const nav = query<HTMLElement>(config.nav)[0];
  if(!nav){ console.log(`現ページの nav ${config.nav} が見つからない`); return; }
  const next = query<HTMLAnchorElement>(config.next, nav)[0];
  if(!next){ console.log(`現ページの 「次のページ」リンク ${config.next} が見つからない`); return; }
  const timeerId = setInterval(() => {
    if(nav.getBoundingClientRect().top < window.innerHeight){
      clearInterval(timeerId);
      appendNextPage(next.href, nav, config);
    }
  }, 500);
}
