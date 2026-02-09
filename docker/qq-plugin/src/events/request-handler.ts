// 请求事件处理器 - 处理加群/加好友请求

import type { OneBotEvent } from "../types.js";
import type { EventContext } from "./index.js";
import { getPendingRequests } from "../utils/pending-requests.js";

export async function handleRequest(event: OneBotEvent, ctx: EventContext) {
  if (event.request_type === "group") {
    await handleGroupAddRequest(event, ctx);
  } else if (event.request_type === "friend") {
    await handleFriendAddRequest(event, ctx);
  }
}

async function handleGroupAddRequest(event: OneBotEvent, ctx: EventContext) {
  const { flag, user_id, group_id, comment, sub_type } = event;
  if (!flag) return;

  console.log(`[QQ Events] 收到入群请求: user=${user_id}, group=${group_id}, sub_type=${sub_type}, comment=${comment}`);

  // 邀请机器人入群 → 直接通知主人决定
  if (sub_type === "invite") {
    getPendingRequests().set(flag, {
      type: "group",
      subType: "invite",
      userId: user_id,
      groupId: group_id,
      comment,
      flag,
      time: Date.now(),
    });
    await ctx.notifyOwner(
      `📨 收到入群邀请\n邀请人: ${user_id}\n群号: ${group_id}\n\n回复「同意入群 ${flag}」或「拒绝入群 ${flag}」`
    );
    return;
  }

  // 有人申请加群 → 检查验证信息
  const autoApproveConfig = ctx.config.autoApprove?.group;
  if (!autoApproveConfig?.enabled) {
    // 未开启自动审核，全部转给主人
    getPendingRequests().set(flag, {
      type: "group",
      subType: "add",
      userId: user_id,
      groupId: group_id,
      comment,
      flag,
      time: Date.now(),
    });
    await ctx.notifyOwner(
      `📋 入群申请待审核\n申请人: ${user_id}\n群号: ${group_id}\n验证信息: ${comment || "(空)"}\n\n回复「同意入群 ${flag}」或「拒绝入群 ${flag} 理由」`
    );
    return;
  }

  // 查找该群的专属规则
  const groupRule = autoApproveConfig.rules?.find(r => r.groupId === group_id);
  const pattern = groupRule?.autoApprovePattern || autoApproveConfig.pattern;

  // 有正则规则 → 检查验证信息
  if (pattern && comment) {
    try {
      if (new RegExp(pattern).test(comment)) {
        // 匹配 → 自动同意
        await ctx.client.setGroupAddRequest(flag, "add", true);
        console.log(`[QQ Events] 自动同意入群: user=${user_id}, group=${group_id}`);
        await ctx.notifyOwner(
          `✅ 已自动同意入群申请\n申请人: ${user_id}\n群号: ${group_id}\n验证信息: ${comment}`
        );
        return;
      }
    } catch (err) {
      console.error("[QQ Events] 正则匹配错误:", err);
    }
  }

  // 不匹配或无规则 → 存入待处理，通知主人
  getPendingRequests().set(flag, {
    type: "group",
    subType: "add",
    userId: user_id,
    groupId: group_id,
    comment,
    flag,
    time: Date.now(),
  });
  await ctx.notifyOwner(
    `📋 入群申请待审核\n申请人: ${user_id}\n群号: ${group_id}\n验证信息: ${comment || "(空)"}\n\n回复「同意入群 ${flag}」或「拒绝入群 ${flag} 理由」`
  );
}

async function handleFriendAddRequest(event: OneBotEvent, ctx: EventContext) {
  const { flag, user_id, comment } = event;
  if (!flag) return;

  console.log(`[QQ Events] 收到好友申请: user=${user_id}, comment=${comment}`);

  const autoApproveConfig = ctx.config.autoApprove?.friend;
  if (!autoApproveConfig?.enabled) {
    // 未开启自动审核，全部转给主人
    getPendingRequests().set(flag, {
      type: "friend",
      userId: user_id,
      comment,
      flag,
      time: Date.now(),
    });
    await ctx.notifyOwner(
      `📋 好友申请待审核\n申请人: ${user_id}\n验证信息: ${comment || "(空)"}\n\n回复「同意好友 ${flag}」或「拒绝好友 ${flag}」`
    );
    return;
  }

  // 有正则规则 → 检查验证信息
  const pattern = autoApproveConfig.pattern;
  if (pattern && comment) {
    try {
      if (new RegExp(pattern).test(comment)) {
        await ctx.client.setFriendAddRequest(flag, true);
        console.log(`[QQ Events] 自动同意好友申请: user=${user_id}`);
        await ctx.notifyOwner(
          `✅ 已自动同意好友申请\n申请人: ${user_id}\n验证信息: ${comment}`
        );
        return;
      }
    } catch (err) {
      console.error("[QQ Events] 正则匹配错误:", err);
    }
  }

  // 不匹配 → 存入待处理，通知主人
  getPendingRequests().set(flag, {
    type: "friend",
    userId: user_id,
    comment,
    flag,
    time: Date.now(),
  });
  await ctx.notifyOwner(
    `📋 好友申请待审核\n申请人: ${user_id}\n验证信息: ${comment || "(空)"}\n\n回复「同意好友 ${flag}」或「拒绝好友 ${flag}」`
  );
}
