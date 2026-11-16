// App Store の評価依頼を出すか決める、条件のロジック（画面や保存には依存しない）。
// 押しつけにならないよう、「何日か使ってもらったあとの、今日の結果を見た直後」だけ、出す。
//   ・今日の結果を見た日が、3日以上
//   ・最初に見てから、3日以上たっている
//   ・前に依頼してから、90日以上あいている
//   ・依頼の回数は、通算3回まで（Apple 側も、1年に3回までに制限している）

export type ReviewState = {
  /** 今日の結果を見た日（YYYY-MM-DD）。古いものから、最大30日分。 */
  days: string[];
  /** 最初に結果を見た時刻（ミリ秒）。 */
  first: number | null;
  /** 評価を依頼した時刻（ミリ秒）。 */
  asked: number[];
};

export const emptyReviewState: ReviewState = { days: [], first: null, asked: [] };

export const REVIEW_RULES = { minDays: 3, minSinceFirstDays: 3, minSinceAskedDays: 90, maxAsks: 3 } as const;
const DAY = 86_400_000;

/** 今日の結果を見たことを、記録する。同じ日は、1回だけ数える。 */
export function recordView(state: ReviewState, day: string, now: number): ReviewState {
  const days = state.days.includes(day) ? state.days : [...state.days, day].slice(-30);
  return { ...state, days, first: state.first ?? now };
}

/** いま、評価を依頼してよいか。 */
export function shouldAsk(state: ReviewState, now: number): boolean {
  const { minDays, minSinceFirstDays, minSinceAskedDays, maxAsks } = REVIEW_RULES;
  if (state.days.length < minDays) return false;
  if (state.first === null || now - state.first < minSinceFirstDays * DAY) return false;
  if (state.asked.length >= maxAsks) return false;
  const last = state.asked[state.asked.length - 1];
  if (last !== undefined && now - last < minSinceAskedDays * DAY) return false;
  return true;
}

/** 依頼した、と記録する。 */
export function recordAsk(state: ReviewState, now: number): ReviewState {
  return { ...state, asked: [...state.asked, now] };
}

export function parseReviewState(raw: string | null): ReviewState {
  try {
    const data = raw ? JSON.parse(raw) : null;
    if (!data || !Array.isArray(data.days) || !Array.isArray(data.asked)) return emptyReviewState;
    return { days: data.days.filter((d: unknown) => typeof d === 'string').slice(-30), first: typeof data.first === 'number' ? data.first : null, asked: data.asked.filter((t: unknown) => typeof t === 'number') };
  } catch {
    return emptyReviewState;
  }
}
