// iOS ネイティブ版とのつなぎ。DomApp（WebView の中）が、ネイティブ側の関数や状態をここに登録する。
// Web 版（ブラウザー）では何も登録されないので、それぞれ Web のやり方で動く。

/** 規約などのページを置いている公開サイト。アプリの中には無いので、Safari で開く。 */
export const SITE_URL = 'https://chokan-uranai-site.chokanuranai.workers.dev/';

/** お問い合わせ先。設定画面に出す。 */
export const CONTACT_EMAIL = 'chokanuranai@gmail.com';

/** App Store Connect で作る、自動更新サブスクリプションの商品ID。ここと同じIDで登録する。 */
export const PRODUCT_ID = 'jp.chokanuranai.app.premium.monthly';

/** 有料版（サブスク）の状態。ネイティブ側（src/billing.ts）が決めて、画面側へ渡す。 */
export type BillingState = {
  /** 課金が使える環境か（iPhoneのアプリ）。false なら、有料の枠は開いたまま。 */
  available: boolean;
  /** 購入状態の確認が終わったか。 */
  ready: boolean;
  /** いま、有効なサブスクがあるか。 */
  active: boolean;
  /** ストアが返した、表示用の価格（例「￥450」）。取れないあいだは空。 */
  price: string;
  /** 次の更新日（または終了日）。秒。 */
  periodEnd: number | null;
  /** 次の更新日に、自動で更新されるか。 */
  willRenew: boolean;
  busy: boolean;
  error: string;
  notice: string;
};

export const noBilling: BillingState = {
  available: false, ready: true, active: false, price: '', periodEnd: null, willRenew: true, busy: false, error: '', notice: '',
};

type Bridge = {
  openUrl?: (url: string) => Promise<void> | void;
  shareImage?: (dataUrl: string) => Promise<void> | void;
  buy?: () => Promise<void> | void;
  restore?: () => Promise<void> | void;
  manage?: () => Promise<void> | void;
  requestReview?: () => Promise<void> | void;
  updateWidget?: (entries: import('../widgetPayload').WidgetEntry[]) => Promise<void> | void;
};
let bridge: Bridge = {};
export function setNativeBridge(next: Bridge) { bridge = next; }
export const nativeBilling = {
  buy: () => bridge.buy?.(),
  restore: () => bridge.restore?.(),
  manage: () => bridge.manage?.(),
};

/** ホーム画面ウィジェットの内容を、ネイティブに渡す（iPhoneのアプリ以外では、何もしない）。 */
export function updateNativeWidget(entries: import('../widgetPayload').WidgetEntry[]) {
  try { void Promise.resolve(bridge.updateWidget?.(entries)).catch(() => {}); } catch { /* ウィジェットが使えなくても、占いは動く */ }
}

/** App Store の評価依頼を、ネイティブに頼む。頼めたら true（iPhoneのアプリ以外では false）。 */
export async function requestNativeReview(): Promise<boolean> {
  if (!bridge.requestReview) return false;
  try { await bridge.requestReview(); return true; } catch { return false; }
}

/** App Store の、このアプリの「レビューを書く」画面。公開されてから、開ける。 */
export const WRITE_REVIEW_URL = 'https://apps.apple.com/app/id6835385589?action=write-review';

/** 外部のページを開く。ネイティブ版では Safari、Web 版ではそのページへ移る。 */
export function openLink(href: string) {
  const url = new URL(href, bridge.openUrl ? SITE_URL : document.baseURI).toString();
  if (bridge.openUrl) void bridge.openUrl(url);
  else window.location.href = url;
}

/** ネイティブの共有シート（写真に保存・SNSへ送る）が使えるか。 */
export const canShareNatively = () => !!bridge.shareImage;

/** 画像（PNG の data URL）を、ネイティブの共有シートで渡す。 */
export async function shareImage(dataUrl: string) {
  await bridge.shareImage?.(dataUrl);
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
