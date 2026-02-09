// 消息缓存 - 用于防撤回功能，缓存最近的消息内容

export interface CachedMessage {
  text: string;
  userId: number;
  groupId?: number;
  time: number;
}

const cache = new Map<number, CachedMessage>();
const MAX_CACHE_SIZE = 500;

export function getMessageCache() {
  return {
    set(messageId: number, msg: CachedMessage) {
      if (cache.size >= MAX_CACHE_SIZE) {
        // 删除最早的条目
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) cache.delete(firstKey);
      }
      cache.set(messageId, msg);
    },
    get(messageId: number): CachedMessage | undefined {
      return cache.get(messageId);
    },
    size(): number {
      return cache.size;
    },
  };
}
