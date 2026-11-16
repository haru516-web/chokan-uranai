// App Store の評価依頼（アプリ内のダイアログ）。画面側（WebView の中）から、ネイティブへ頼む。
// 出す条件は reviewLogic.ts。端末の中の記録だけを使い、外部には、何も送らない。
import { dateKey } from './domain';
import { emptyReviewState, parseReviewState, recordAsk, recordView, shouldAsk, type ReviewState } from './reviewLogic';
import { requestNativeReview } from './web/native';

const KEY = 'chokan/review';
let timer: ReturnType<typeof setTimeout> | undefined;
let askedThisSession = false;

const load = (): ReviewState => { try { return parseReviewState(window.localStorage.getItem(KEY)); } catch { return emptyReviewState; } };
const save = (state: ReviewState) => { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 保存できなくても動く */ } };

/** 「今日」の結果を見たときに呼ぶ。条件がそろっていれば、少し間をおいて、評価をお願いする。 */
export function noteResultViewed(today: Date) {
  let state = recordView(load(), dateKey(today), Date.now());
  save(state);
  if (askedThisSession || !shouldAsk(state, Date.now())) return;
  clearTimeout(timer);
  // 結果の演出が終わって、読み始めたころに出す（見ているあいだは、邪魔をしない）。
  timer = setTimeout(async () => {
    if (askedThisSession) return;
    const asked = await requestNativeReview();
    if (!asked) return; // iPhoneのアプリ以外（ブラウザーなど）では、何もしない
    askedThisSession = true;
    state = recordAsk(load(), Date.now());
    save(state);
  }, 9000);
}
