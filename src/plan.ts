// いま「有料版」か「無料版」か。画面は、ここだけを見る。
//   iPhoneのアプリでは、購入状態（entitlement.ts が、ネイティブの src/billing.ts から受け取る）だけが、これを変える。
//   課金が使えない環境（ブラウザーでの確認など）では、有料の枠を開いたままにする。
import { useSyncExternalStore } from 'react';

export type Plan = 'free' | 'paid';

const CACHE_KEY = 'chokan/entitlement';
const CACHE_DAYS = 7;
const listeners = new Set<() => void>();

/** iPhoneのアプリ（WebView）の中か。ここでは、購入状態がわかるまで、無料として扱う。 */
const inApp = typeof window !== 'undefined' && !!(window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;

function initial(): Plan {
  if (!inApp) return 'paid';
  // 購入状態の確認が終わるまでの間は、前回の確認結果（端末に残したもの、7日以内）を使い、画面を安定させる。
  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? 'null');
    const fresh = cached && Date.now() - cached.at < CACHE_DAYS * 86_400_000;
    return fresh && cached.active ? 'paid' : 'free';
  } catch {
    return 'free';
  }
}

let current: Plan = typeof window === 'undefined' ? 'paid' : initial();

export function applyPlan(next: Plan) {
  if (next === current) return;
  current = next;
  listeners.forEach(listener => listener());
}

/** 確認した結果を、端末に覚えておく（次の起動で、確認が終わるまでの間に使う）。 */
export function rememberPlan(active: boolean) {
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ active, at: Date.now() })); } catch { /* 保存できなくても動く */ }
}

export function usePlan(): Plan {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => current, () => 'paid' as Plan);
}
