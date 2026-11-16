'use dom';
import { StrictMode, useEffect } from 'react';
import App from './App';
import './styles.css';
import './magic.css';
import './ui-assets.css';
import { startMagic } from './magic';
import { startCardGlow } from './cardGlow';
import { setHapticHandler } from './web/haptics';
import { applyUiAssets } from './uiAssets';
import { fontFiles } from './artFiles';
import { setNativeBridge, noBilling, type BillingState } from './web/native';
import { setBilling } from './entitlement';

/** Expo が作る HTML の viewport には viewport-fit=cover が無く、iPhone の WebView で、ノッチ・ホームバーの余白（env(safe-area-inset-*)）が 0 になる。
 *  そのため、上部の見出しがステータスバーの下に隠れ、下部ナビバーがホームバーに重なっていた。ここで足す。 */
function allowSafeArea() {
  if (typeof document === 'undefined') return;
  const meta = document.querySelector('meta[name="viewport"]');
  const content = meta?.getAttribute('content') ?? '';
  if (meta && !/viewport-fit/.test(content)) meta.setAttribute('content', (content ? content + ', ' : '') + 'viewport-fit=cover');
}
allowSafeArea();

/** 同梱したフォントを登録する（外部のサーバーへは、通信しない）。 */
function installFonts() {
  const face = (family: string, weight: number, url: string) => `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;font-display:swap;src:url("${url}") format("woff2");}`;
  const style = document.createElement('style');
  style.textContent = [
    face('Zen Maru Gothic', 500, fontFiles.zen500), face('Zen Maru Gothic', 700, fontFiles.zen700), face('Zen Maru Gothic', 900, fontFiles.zen900),
    face('Dela Gothic One', 400, fontFiles.dela),
  ].join(' ');
  document.head.appendChild(style);
}
/** 画面の枠（html・body・外側の枠など、スクロールしない部分）が、scrollIntoView などでずらされたら、すぐ元に戻す。
 *  見出しと下部ナビバーが、画面の外へ流れないようにする。スクロールしてよいのは、画面ごとの枠（data-layer）だけ。 */
function keepFrameStill() {
  document.addEventListener('scroll', event => {
    const raw = event.target as HTMLElement | Document;
    const el = (raw === document ? document.scrollingElement : raw) as HTMLElement | null;
    if (!el || el.dataset?.layer) return;
    if (el === document.scrollingElement || getComputedStyle(el).overflowY === 'hidden') {
      if (el.scrollTop !== 0) el.scrollTop = 0;
      if (el.scrollLeft !== 0) el.scrollLeft = 0;
    }
  }, true);
}

let started = false;

type Props = {
  onHaptic?: (kind: string) => Promise<void>;
  onOpenUrl?: (url: string) => Promise<void>;
  onShareImage?: (dataUrl: string) => Promise<void>;
  billing?: BillingState;
  onBuy?: () => Promise<void>;
  onRestore?: () => Promise<void>;
  onManage?: () => Promise<void>;
  onRequestReview?: () => Promise<void>;
  onUpdateWidget?: (entries: import('./widgetPayload').WidgetEntry[]) => Promise<void>;
  dom?: import('expo/dom').DOMProps;
};

/** Web 版の App をそのまま iOS ネイティブの WebView 内で動かす（Expo DOM コンポーネント）。 */
export default function DomApp({ onHaptic, onOpenUrl, onShareImage, billing, onBuy, onRestore, onManage, onRequestReview, onUpdateWidget }: Props) {
  useEffect(() => {
    if (!started) {
      started = true;
      installFonts();
      document.documentElement.style.background = '#10172a';
      document.body.style.background = '#10172a';
      document.body.style.overscrollBehavior = 'none';
      applyUiAssets();
      keepFrameStill();
      startMagic();
      startCardGlow();
    }
    setHapticHandler(onHaptic);
    setNativeBridge({ openUrl: onOpenUrl, shareImage: onShareImage, buy: onBuy, restore: onRestore, manage: onManage, requestReview: onRequestReview, updateWidget: onUpdateWidget });
    return () => { setHapticHandler(undefined); setNativeBridge({}); };
  }, [onHaptic, onOpenUrl, onShareImage, onBuy, onRestore, onManage, onRequestReview, onUpdateWidget]);
  // 購入状態は、変わるたびに、画面側へ反映する。
  useEffect(() => { setBilling(billing ?? noBilling); }, [billing]);
  return <StrictMode><App /></StrictMode>;
}
