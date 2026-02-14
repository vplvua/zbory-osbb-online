export const TOAST_EVENT_NAME = 'zbory:toast';
export const TOAST_FLASH_COOKIE_NAME = 'zbory_toast_flash';
export const TOAST_QUERY_TYPE_KEY = 'zbory_toast_type';
export const TOAST_QUERY_MESSAGE_KEY = 'zbory_toast_message';
export const TOAST_QUERY_DURATION_KEY = 'zbory_toast_duration';

export type ToastType = 'success' | 'error' | 'info';

export type ToastPayload = {
  type: ToastType;
  message: string;
  durationMs?: number;
};
