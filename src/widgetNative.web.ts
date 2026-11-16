// Web（ブラウザー）では、ホーム画面ウィジェットは使えないので、何もしない。
// iPhone のアプリでは、src/widgetNative.ts が使われる。
import type { WidgetEntry } from './widgetPayload';

export async function updateWidget(_entries: WidgetEntry[]) {}
