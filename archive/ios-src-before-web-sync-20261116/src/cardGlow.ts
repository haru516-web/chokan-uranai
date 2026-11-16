// 全カードの縁を光らせ、その光が縁をなぞって一周する。
// カードは共通の見た目（パネル色・角丸20・はみ出し隠し）なので、描画された要素を見つけて印（data-glow-card）を付ける。
// 光る線そのものは magic.css（[data-glow-card]::before / ::after）が描く。
const PANEL = 'rgb(26, 36, 60)';

export function startCardGlow() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return () => {};
  const done = new WeakSet<Element>();
  let pending: Node[] = [];
  let frame = 0;

  const tag = (el: Element) => {
    if (done.has(el)) return;
    done.add(el);
    const s = getComputedStyle(el);
    if (s.backgroundColor !== PANEL || s.borderTopLeftRadius !== '20px' || s.overflow !== 'hidden') return;
    el.setAttribute('data-glow-card', '');
    // カードごとに一周する速さと始まりの位置をずらして、同時に光らないようにする。
    const h = el as HTMLElement;
    h.style.setProperty('--glow-dur', 5.5 + Math.random() * 3 + 's');
    h.style.setProperty('--glow-delay', -Math.random() * 8 + 's');
  };
  const scan = (node: Node) => {
    if (node.nodeType !== 1) return;
    const el = node as Element;
    tag(el);
    el.querySelectorAll('div').forEach(tag);
  };
  const flush = () => { frame = 0; const batch = pending; pending = []; batch.forEach(scan); };

  const observer = new MutationObserver(mutations => {
    for (const m of mutations) m.addedNodes.forEach(n => pending.push(n));
    if (pending.length && !frame) frame = requestAnimationFrame(flush);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scan(document.body);
  return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
}
