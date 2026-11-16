// 有料版（月額サブスク）の、ネイティブ側の処理。AppleのStoreKit（expo-iap）で、購入・復元・確認をする。
// ここで決めた状態（BillingState）を、App.tsx が画面側（WebView）へ渡す。画面側は、この状態だけを見て、有料の枠を開け閉めする。
// 確認は、端末の中でAppleの署名つきの取引を見て行う（サーバーは持たない）。
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import * as IAP from 'expo-iap';
import { noBilling, PRODUCT_ID, type BillingState } from './web/native';

// 開発用：ブラウザーで ?mockbilling=free または ?mockbilling=paid を付けて開くと、課金の画面を、iPhoneなしで確認できる（本番のアプリでは働かない）。
const mock = Platform.OS === 'web' && __DEV__ && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('mockbilling') : null;
let state: BillingState = mock
  ? { ...noBilling, available: true, price: '￥450', active: mock === 'paid', periodEnd: Math.round(Date.now() / 1000) + 30 * 86400 }
  : Platform.OS === 'ios' ? { ...noBilling, available: true, ready: false } : noBilling;
const listeners = new Set<() => void>();
const set = (patch: Partial<BillingState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };

export const useBilling = () => useSyncExternalStore(
  listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => state, () => state,
);

const toSeconds = (value?: number | null) => value ? Math.round(value > 1e12 ? value / 1000 : value) : null;

/** いまの購入状態を、ストアに確かめて反映する。 */
async function refresh() {
  try {
    const subs = await IAP.getActiveSubscriptions([PRODUCT_ID]);
    const sub = subs.find(item => item.productId === PRODUCT_ID && item.isActive);
    set({
      ready: true, active: !!sub, periodEnd: toSeconds(sub?.expirationDateIOS),
      willRenew: sub?.renewalInfoIOS?.willAutoRenew ?? true,
    });
  } catch {
    // 確認できないとき：前回の結果（画面側が端末に覚えている）を使うため、ready にして、状態は変えない。
    set({ ready: true });
  }
}

let started = false;
/** アプリの起動時に、一度だけ呼ぶ。 */
export async function startBilling() {
  if (Platform.OS !== 'ios' || started) return;
  started = true;
  try {
    await IAP.initConnection();
    IAP.purchaseUpdatedListener(async purchase => {
      try { await IAP.finishTransaction({ purchase, isConsumable: false }); } catch { /* 次の起動で、もう一度終える */ }
      await refresh();
      set({ busy: false, error: '', notice: purchase.productId === PRODUCT_ID ? '有料版のお申込みが完了しました。ありがとうございます。' : '' });
    });
    IAP.purchaseErrorListener(error => {
      set({ busy: false, error: IAP.isUserCancelledError(error) ? '' : 'お申込みを完了できませんでした。少し待ってから、もう一度、お試しください。' });
    });
    try {
      const products = await IAP.fetchProducts({ skus: [PRODUCT_ID], type: 'subs' });
      const product = products?.[0];
      if (product && 'displayPrice' in product) set({ price: String(product.displayPrice) });
      else set({ error: '現在、お申込みの準備ができていません。通信をお確かめのうえ、しばらくしてから、もう一度、開いてください。' });
    } catch {
      // 価格が取れなくても、確認は進める。申込みの画面には、理由を出す。
      set({ error: '価格を読み込めませんでした。通信をお確かめのうえ、しばらくしてから、もう一度、開いてください。' });
    }
    // アプリに戻ってきたときにも確かめる（開いたまま期限が切れた・更新された場合のため）。
    AppState.addEventListener('change', status => { if (status === 'active') void refresh(); });
    await refresh();
  } catch {
    // ストアに接続できない（機内モードなど）。前回の結果で動く。
    set({ ready: true });
  }
}

export async function buy() {
  if (state.busy) return;
  set({ busy: true, error: '', notice: '' });
  if (mock) { set({ busy: false, active: true, notice: '（確認用）有料版のお申込みが完了しました。' }); return; }
  try {
    await IAP.requestPurchase({ request: { apple: { sku: PRODUCT_ID } }, type: 'subs' });
    // 結果は purchaseUpdatedListener / purchaseErrorListener に届く。
  } catch (error) {
    set({ busy: false, error: IAP.isUserCancelledError(error) ? '' : 'お申込みを始められませんでした。少し待ってから、もう一度、お試しください。' });
  }
}

export async function restore() {
  if (state.busy) return;
  set({ busy: true, error: '', notice: '' });
  if (mock) { set({ busy: false, error: '（確認用）復元できる有料版が見つかりませんでした。' }); return; }
  try {
    await IAP.restorePurchases();
    await refresh();
    set({ busy: false, ...(state.active ? { notice: '有料版を復元しました。' } : { error: '復元できる有料版が見つかりませんでした。購入した Apple アカウントでサインインしているか、お確かめください。' }) });
  } catch {
    set({ busy: false, error: '復元できませんでした。通信をお確かめのうえ、もう一度、お試しください。' });
  }
}

/** 解約・変更は、iOS 標準の「サブスクリプション」の画面で行う。 */
export async function manage() {
  if (mock) { set({ active: false, notice: '（確認用）解約しました。' }); return; }
  try { await IAP.deepLinkToSubscriptions(); } catch { set({ error: '管理の画面を開けませんでした。iPhoneの「設定」→ 自分の名前 →「サブスクリプション」からお開きください。' }); }
}
