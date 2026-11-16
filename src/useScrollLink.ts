// スクロール連動 ＋ 自動再生。
// 要素が画面の下から入ってきて中ほどへ来るまでを 0→1 の進み具合にする。戻せば逆再生になる。
// さらに、見え始めた瞬間に「時間で進む 0→1」も走らせ、実際の進み具合は小さいほうを採る。
// → 最初から画面に全部入っている大きな画面でも、必ず回ってから止まる。スクロールで戻せば巻き戻る。
import { useEffect, useRef, useState } from 'react';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t: number) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

const AUTO_MS = 3200;

/**
 * p … 進み具合（0〜1）。スクロール由来と自動再生のうち小さいほう。
 * y … ページのスクロール量（輪をスクロールに合わせて回すのに使う）。
 */
export function useScrollLink() {
  const ref = useRef<unknown>(null);
  const [scroll, setScroll] = useState({ p: 0, y: 0 });
  const [auto, setAuto] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const node = ref.current as Element | null;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.95, end = vh * 0.35;
      const p = Math.round(clamp01((start - rect.top) / (start - end)) * 1000) / 1000;
      const y = Math.round(window.scrollY);
      setScroll(prev => prev.p === p && prev.y === y ? prev : { p, y });
      // 見え始めた最初の一度だけ、時間で進む 0→1 を走らせる。
      if (!started.current && rect.top < vh * 0.98 && rect.bottom > 0) {
        started.current = true;
        const t0 = performance.now();
        const tick = (now: number) => {
          const a = clamp01((now - t0) / AUTO_MS);
          setAuto(a);
          if (a < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    document.addEventListener('scroll', schedule, true); // ページ全体でも、画面内のスクロール枠でも拾う
    window.addEventListener('resize', schedule);
    return () => { document.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); if (frame) cancelAnimationFrame(frame); };
  }, []);

  return [ref, Math.min(scroll.p, auto), scroll.y] as const;
}
