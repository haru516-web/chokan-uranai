'use dom';
import { StrictMode, useEffect } from 'react';
import App from './App';
import './styles.css';
import './magic.css';
import { startMagic } from './magic';
import { startCardGlow } from './cardGlow';
import { setHapticHandler } from './web/haptics';

const FONT_LINKS = [
  'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&display=swap&text=%E5%87%B1%E5%A4%A7%E6%BC%81%E9%A0%86%E9%A2%A8%E5%87%AA%E8%8D%92%E6%B3%A2%E8%BD%9F%E6%B2%88%E6%98%A5%E5%A4%8F%E7%A7%8B%E5%86%AC0123456789-.A%2B%E2%88%92',
];
let started = false;

/** Web 版の App をそのまま iOS ネイティブの WebView 内で動かす（Expo DOM コンポーネント）。 */
export default function DomApp({ onHaptic }: { onHaptic?: (kind: string) => Promise<void>; dom?: import('expo/dom').DOMProps }) {
  useEffect(() => {
    if (!started) {
      started = true;
      for (const href of FONT_LINKS) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
      document.documentElement.style.background = '#10172a';
      document.body.style.background = '#10172a';
      document.body.style.overscrollBehavior = 'none';
      startMagic();
      startCardGlow();
    }
    setHapticHandler(onHaptic);
    return () => setHapticHandler(undefined);
  }, [onHaptic]);
  return <StrictMode><App /></StrictMode>;
}
