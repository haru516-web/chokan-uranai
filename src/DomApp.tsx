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
  dom?: import('expo/dom').DOMProps;
};

/** Web 版の App をそのまま iOS ネイティブの WebView 内で動かす（Expo DOM コンポーネント）。 */
export default function DomApp({ onHaptic, onOpenUrl, onShareImage, billing, onBuy, onRestore, onManage, onRequestReview }: Props) {
  useEffect(() => {
    if (!started) {
      started = true;
      installFonts();
      document.documentElement.style.background = '#10172a';
      document.body.style.background = '#10172a';
      document.body.style.overscrollBehavior = 'none';
      applyUiAssets();
      startMagic();
      startCardGlow();
    }
    setHapticHandler(onHaptic);
    setNativeBridge({ openUrl: onOpenUrl, shareImage: onShareImage, buy: onBuy, restore: onRestore, manage: onManage, requestReview: onRequestReview });
    return () => { setHapticHandler(undefined); setNativeBridge({}); };
  }, [onHaptic, onOpenUrl, onShareImage, onBuy, onRestore, onManage, onRequestReview]);
  // 購入状態は、変わるたびに、画面側へ反映する。
  useEffect(() => { setBilling(billing ?? noBilling); }, [billing]);
  return <StrictMode><App /></StrictMode>;
}
