// 事件路由器 - 统一分发 OneBot 事件到各处理器

import type { OneBotClient } from "../client.js";
import type { OneBotEvent } from "../types.js";
import type { QQConfig } from "../config.js";
import { handleRequest } from "./request-handler.js";
import { handleNotice } from "./notice-handler.js";
import { handleNotify } from "./notify-handler.js";

export interface EventContext {
  client: OneBotClient;
  config: QQConfig;
  selfId: number;
  notifyOwner: (text: string) => Promise<void>;
}

export function createEventRouter(ctx: EventContext) {
  return async (event: OneBotEvent) => {
    try {
      switch (event.post_type) {
        case "request":
          await handleRequest(event, ctx);
          break;
        case "notice":
          if (event.notice_type === "notify") {
            await handleNotify(event, ctx);
          } else {
            await handleNotice(event, ctx);
          }
          break;
        // message 事件由 channel.ts 原有逻辑处理，不在此路由
        // meta_event (heartbeat/lifecycle) 由 client.ts 内部处理
      }
    } catch (err) {
      console.error("[QQ Events] Error handling event:", event.post_type, event.notice_type || event.request_type, err);
    }
  };
}
