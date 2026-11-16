// 有料版の状態を、画面に見せる。ネイティブ（src/billing.ts）から渡された購入状態を受け取り、plan.ts の「有料／無料」を決める。
//   課金が使えない環境（ブラウザーでの確認など）では、有料の枠は開いたまま。
import { useSyncExternalStore } from 'react';
import { applyPlan, rememberPlan } from './plan';
import { noBilling, type BillingState } from './web/native';

const UPGRADE_EVENT = 'chokan:upgrade';

let account: BillingState = noBilling;
const listeners = new Set<() => void>();

/** ネイティブから、最新の購入状態を受け取る（DomApp が呼ぶ）。 */
export function setBilling(next: BillingState) {
  account = next;
  if (!next.available) applyPlan('paid');
  else if (next.ready) { applyPlan(next.active ? 'paid' : 'free'); rememberPlan(next.active); }
  listeners.forEach(listener => listener());
}

export const useAccount = () => useSyncExternalStore(
  listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => account, () => account,
);

/** 画面のどこからでも、有料版のご案内を開く（App が受け取る）。 */
export const requestUpgrade = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(UPGRADE_EVENT)); };
export const UPGRADE = UPGRADE_EVENT;
