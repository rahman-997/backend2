export const EVENT_CACHE_LIST_VERSION_KEY = "eventify:cache:events:version";
export const EVENT_CACHE_DETAIL_PREFIX = "eventify:cache:event:";

export function eventCacheDetailKey(id: string): string {
  return `${EVENT_CACHE_DETAIL_PREFIX}${id}`;
}
