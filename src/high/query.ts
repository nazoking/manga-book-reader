type Query = (
  (<T extends Node> (selector: XPath, contextNode?: Node) => Array<T>) &
  (<T extends Element> (selector: string, contextNode?: ParentNode) => Array<T>)
) & {
  context: (contextNode: Node | ParentNode) => (selector: string) => Node[];
};
type XPath = `/${string}`
function isXPath(selector: string): selector is XPath{
  return selector.startsWith("/");
}
/** select dom. selector is css-selector or xpath */
const queryi = <T extends Node> (selector: string, contextNode?: Node | ParentNode): Array<T> => {
  const context = contextNode || document;
  if(isXPath(selector)){
    const result = document.evaluate(selector, context);
    if(result.resultType == XPathResult.ORDERED_NODE_ITERATOR_TYPE ||
      result.resultType == XPathResult.UNORDERED_NODE_ITERATOR_TYPE){
      let i = result.iterateNext();
      const ret : Array<T>= [];
      while (i) {
        ret.push(i as T);
        i = result.iterateNext();
      }
      return ret;
    }
    if(result.resultType == XPathResult.ORDERED_NODE_SNAPSHOT_TYPE ||
      result.resultType == XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE){
        const ret: Array<T> = [];
        for (let i=0 ; i < result.snapshotLength; i++ ){
          ret.push(result.snapshotItem(i) as T);
      }
      return ret;
    }
    throw new Error(`unsupported result type ${result.resultType} by ${selector}`);
  }else{
    return Array.from((context as ParentNode).querySelectorAll(selector)) as unknown as Array<T>;    
  }
};
queryi.context = (contextNode: Node | ParentNode) => (selector: string) => queryi(selector, contextNode);

export const query: Query = queryi