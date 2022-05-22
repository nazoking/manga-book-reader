export default function once(
  e: HTMLElement,
  type: string,
  f: (event: Event) => void
): { cancel: () => void } {
  const cancel = () => e.removeEventListener(type, handler);
  const handler = (event: Event) => {
    cancel();
    f(event);
  };
  e.addEventListener(type, handler);
  return { cancel };
}
