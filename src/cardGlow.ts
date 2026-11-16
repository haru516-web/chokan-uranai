// 全カードの縁を光らせ、その光が縁をなぞって一周する。
// カードは共通の見た目（パネル色・角丸20・はみ出し隠し）なので、描画された要素を見つけて印（data-glow-card）を付ける。
// 光る線そのものは magic.css（[data-glow-card]::before / ::after）が描く。
const PANEL = 'rgb(26, 36, 60)';

// 部品の形（縦横比）に合わせて、背景の画像を使い分ける。画像ごとの縦横比（横÷縦）の中間を、境目にしている。
//   カード　：横長 750×150（5.0）／ ふつう 750×420（1.8）／ 縦長 750×1150（0.65）
//   金ボタン：幅広 600×104（5.8）／ 幅が狭い 450×156（2.9）　控えめなボタン・チップ：幅広 480×84（5.7）／ 狭い 360×126（2.9）
//   入力欄　：幅広 700×96（7.3）／ 幅が狭い 300×144（2.1）
const SHAPED = '[data-glow-card], [data-tinted], [data-inset], [data-ui="gold"], [data-ui="quiet"], [data-ui="chip"], [data-ui="field"]';
/** 専用の画像を持つ部品（ボタン・入力欄・ナビなど）は、カードとして扱わない。 */
const OWN_SKIN = new Set(['gold', 'quiet', 'chip', 'field', 'tab', 'help', 'round', 'header', 'badge', 'icon-frame', 'seal', 'art']);
/** 色つきのカード（data-tinted）か、カードの中の暗い小パネル（data-inset）か、どちらでもないか。大きな結果ポスター（角の丸み28）は、色が命なので、対象にしない。 */
function panelKind(el: Element, s: CSSStyleDeclaration): 'data-tinted' | 'data-inset' | null {
  const radius = parseFloat(s.borderTopLeftRadius);
  if (!(radius >= 14 && radius <= 26) || !(parseFloat(s.borderTopWidth) >= 1)) return null;
  if (OWN_SKIN.has(el.getAttribute('data-ui') ?? '') || el.hasAttribute('data-skin')) return null;
  const box = el.getBoundingClientRect();
  if (box.width < 60 || box.height < 56) return null;
  // 自分で色のグラデーションを持つものは、色つきのカード
  if ((el as HTMLElement).style.backgroundImage) return 'data-tinted';
  // カードの中に置く、いちだん暗い小パネル（背景が、パネル色より暗い）
  if (/^rgba?\((17, 26, 49|15, 24, 48)/.test(s.backgroundColor)) return 'data-inset';
  return 'data-tinted';
}
/** 結果ポスター・丸いメダル・カレンダーのマス・小さなラベル。それぞれ、専用の画像（枠）を重ねる。 */
function specialKind(el: Element, s: CSSStyleDeclaration): string | null {
  const box = el.getBoundingClientRect();
  const radius = parseFloat(s.borderTopLeftRadius) || 0;
  const border = parseFloat(s.borderTopWidth) || 0;
  if (radius >= 27 && radius <= 29 && border >= 3 && box.width >= 300) return 'data-poster';
  if (radius >= 40 && s.overflow === 'hidden' && box.width >= 76 && box.width <= 96 && Math.abs(box.width - box.height) <= 2) return 'data-medal';
  if (el.tagName === 'BUTTON' && radius >= 7 && radius <= 9 && border === 0 && box.width >= 36 && box.width <= 70 && box.height >= 38 && box.height <= 52) return 'data-cell';
  if (radius >= 10 && radius <= 14 && box.height >= 18 && box.height <= 34 && box.width >= 36 && box.width <= 140 && /^rgb(22, 33, 59)/.test(s.backgroundColor)) return 'data-label';
  return null;
}
/** 小さな枠つきの四角・丸（アイコンの枠、「序」などの番号の丸）。画像で隠れないよう、絵を中に入れた丸（はみ出し隠し）は除く。 */
function isIconFrame(el: Element, s: CSSStyleDeclaration) {
  if (OWN_SKIN.has(el.getAttribute('data-ui') ?? '') || el.hasAttribute('data-skin') || el.classList.contains('to-top') || s.overflow === 'hidden') return false;
  const box = el.getBoundingClientRect();
  const radius = parseFloat(s.borderTopLeftRadius) || 0;
  return box.width >= 30 && box.width <= 52 && Math.abs(box.width - box.height) <= 2 && radius >= 10 && parseFloat(s.borderTopWidth) >= 1;
}
function shapeOf(el: Element, ratio: number): string | null {
  if (el.hasAttribute('data-glow-card') || el.hasAttribute('data-tinted') || el.hasAttribute('data-inset') || el.getAttribute('data-ui') === 'card') return ratio >= 3 ? 'wide' : ratio <= 1.08 ? 'tall' : null;
  const kind = el.getAttribute('data-ui');
  if (kind === 'gold' || kind === 'quiet' || kind === 'chip') return ratio < 4.05 ? 'short' : null;
  if (kind === 'field') return ratio < 3.9 ? 'short' : null;
  return null;
}

export function startCardGlow() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return () => {};
  const done = new WeakSet<Element>();
  const sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
    for (const entry of entries) {
      const el = entry.target;
      if (!el.isConnected) { sizes?.unobserve(el); continue; }
      const { width, height } = entry.contentRect;
      const shape = height > 0 ? shapeOf(el, width / height) : null;
      if (shape) el.setAttribute('data-shape', shape); else el.removeAttribute('data-shape');
    }
  });
  const watched = new WeakSet<Element>();
  const watch = (el: Element) => { if (sizes && !watched.has(el)) { watched.add(el); sizes.observe(el); } };
  let pending: Node[] = [];
  let frame = 0;

  const tag = (el: Element) => {
    if (done.has(el)) return;
    done.add(el);
    const s = getComputedStyle(el);
    if (s.backgroundColor !== PANEL || s.borderTopLeftRadius !== '20px' || s.overflow !== 'hidden') {
      // 色つきの背景を、自分で持っているカード（問いの引用カード・住人の色つきの札など）。画像を、色の上に敷く。
      const special = specialKind(el, s);
      if (special) { el.setAttribute(special, ''); return; }
      if (isIconFrame(el, s)) { el.setAttribute('data-icon-frame', ''); return; }
      const kind = panelKind(el, s);
      if (kind) el.setAttribute(kind, '');
      return;
    }
    el.setAttribute('data-glow-card', '');
    if ((el as HTMLElement).style.backgroundImage) el.setAttribute('data-tinted', '');
    // カードごとに一周する速さと始まりの位置をずらして、同時に光らないようにする。
    const h = el as HTMLElement;
    h.style.setProperty('--glow-dur', 5.5 + Math.random() * 3 + 's');
    h.style.setProperty('--glow-delay', -Math.random() * 8 + 's');
  };
  const scan = (node: Node) => {
    if (node.nodeType !== 1) return;
    const el = node as Element;
    tag(el);
    el.querySelectorAll('div, button').forEach(tag);
    // 形を測る対象（カード・ボタン・チップ・入力欄）
    if (el.matches(SHAPED)) watch(el);
    el.querySelectorAll(SHAPED).forEach(watch);
  };
  const flush = () => { frame = 0; const batch = pending; pending = []; batch.forEach(scan); };

  const observer = new MutationObserver(mutations => {
    for (const m of mutations) m.addedNodes.forEach(n => pending.push(n));
    if (pending.length && !frame) frame = requestAnimationFrame(flush);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scan(document.body);
  return () => { observer.disconnect(); sizes?.disconnect(); if (frame) cancelAnimationFrame(frame); };
}
