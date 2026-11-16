// Web では何もしない。iOS ネイティブ版では DomApp が setHapticHandler で expo-haptics につなぐ。
export enum NotificationFeedbackType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error'
}
type Handler = (kind: string) => Promise<void> | void;
let handler: Handler | undefined;
export function setHapticHandler(next?: Handler) { handler = next; }
export async function selectionAsync() { try { await handler?.('selection'); } catch {} }
export async function notificationAsync(type?: NotificationFeedbackType) { try { await handler?.(type ?? 'success'); } catch {} }
