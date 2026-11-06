// 알림을 읽거나 지우면 이 이름으로 알려 준다 → 아래 탭(Layout) 배지 숫자를 다시 받는다
export const NOTIFICATIONS_CHANGED = 'notifications-changed';

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}
