// ページ最上部へ戻るボタン。どのタブ・どの詳細画面でも、少し下へ進むと右下に現れる。
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SHOW_AFTER = 360;

/** resetKey が変わる（タブや画面が切り替わる）たびに、ボタンはいったん隠れる。 */
export function ToTop({ resetKey }: { resetKey: string }) {
  const [show, setShow] = useState(false);
  const target = useRef<HTMLElement | null>(null);

  useEffect(() => { target.current = null; setShow(false); }, [resetKey]);

  useEffect(() => {
    const onScroll = (event: Event) => {
      // ページ全体のスクロールと、画面本体（data-layer）のスクロールだけを見る。
      const raw = event.target as HTMLElement | Document;
      const el = (raw === document ? document.scrollingElement : raw) as HTMLElement | null;
      if (!el || (el !== document.scrollingElement && !el.dataset?.layer)) return;
      if (el.scrollTop > SHOW_AFTER) { target.current = el; setShow(true); }
      else if (target.current === el) setShow(false);
    };
    document.addEventListener('scroll', onScroll, true);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, []);

  const goTop = () => {
    const el = target.current;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  };

  return createPortal(
    <button type="button" aria-label="ページの先頭へ戻る" tabIndex={show ? 0 : -1} onClick={goTop} className="to-top" data-show={show}>
      <span aria-hidden="true">↑</span><small>先頭へ</small>
    </button>, document.body);
}
