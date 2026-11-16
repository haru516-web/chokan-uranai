// 画面全体にかかる「魔力」の演出。タップした場所から光の輪と星が散る。DOM に直接描くので、どの画面でも働く。
const MARKS = ['✦', '✧', '⋆'];

export function startMagic() {
  if (typeof document === 'undefined') return () => {};
  const layer = document.createElement('div');
  layer.className = 'magic-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  let last = 0;

  const onDown = (event: PointerEvent) => {
    const now = performance.now();
    if (now - last < 90) return;
    last = now;
    const ring = document.createElement('span');
    ring.className = 'magic-ring';
    ring.style.left = event.clientX + 'px';
    ring.style.top = event.clientY + 'px';
    layer.appendChild(ring);
    for (let i = 0; i < 6; i++) {
      const spark = document.createElement('span');
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.8;
      const reach = 26 + Math.random() * 30;
      spark.className = 'magic-spark';
      spark.textContent = MARKS[i % MARKS.length];
      spark.style.left = event.clientX + 'px';
      spark.style.top = event.clientY + 'px';
      spark.style.setProperty('--mx', Math.cos(angle) * reach + 'px');
      spark.style.setProperty('--my', Math.sin(angle) * reach + 'px');
      spark.style.fontSize = 9 + Math.random() * 8 + 'px';
      layer.appendChild(spark);
      setTimeout(() => spark.remove(), 760);
    }
    setTimeout(() => ring.remove(), 760);
  };
  window.addEventListener('pointerdown', onDown, { passive: true });
  return () => { window.removeEventListener('pointerdown', onDown); layer.remove(); };
}
