type StoreEventName = 'view_item' | 'add_to_cart' | 'begin_checkout' | 'click_whatsapp';

type StoreEventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackStoreEvent(name: StoreEventName, data: StoreEventData = {}): void {
  const detail = { event: name, ...data };
  window.dataLayer?.push(detail);
  window.dispatchEvent(new CustomEvent('clube-do-leo:analytics', { detail }));
}
