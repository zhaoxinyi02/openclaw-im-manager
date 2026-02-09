// 通知事件处理器 - 处理群成员变动、消息撤回、管理变动、禁言、文件上传等

import type { OneBotEvent } from "../types.js";
import type { EventContext } from "./index.js";
import { getMessageCache } from "../utils/message-cache.js";

export async function handleNotice(event: OneBotEvent, ctx: EventContext) {
  switch (event.notice_type) {
    case "group_increase":
      await handleGroupIncrease(event, ctx);
      break;
    case "group_decrease":
      await handleGroupDecrease(event, ctx);
      break;
    case "group_recall":
      await handleGroupRecall(event, ctx);
      break;
    case "friend_recall":
      await handleFriendRecall(event, ctx);
      break;
    case "group_admin":
      await handleGroupAdmin(event, ctx);
      break;
    case "group_ban":
      await handleGroupBan(event, ctx);
      break;
    case "group_upload":
      await handleGroupUpload(event, ctx);
      break;
    default:
      console.log("[QQ Events] 未处理的通知类型:", event.notice_type);
      break;
  }
}

// 群成员增加
async function handleGroupIncrease(event: OneBotEvent, ctx: EventContext) {
  const { group_id, user_id, sub_type } = event;
  if (!group_id || !user_id) return;

  // 如果是机器人自己加入群，不发欢迎消息
  if (user_id === ctx.selfId) {
    await ctx.notifyOwner(`🤖 机器人已加入群 ${group_id}`);
    return;
  }

  console.log(`[QQ Events] 群成员增加: group=${group_id}, user=${user_id}, sub_type=${sub_type}`);

  // 发送欢迎消息
  if (ctx.config.welcome?.enabled) {
    try {
      // 查找该群的自定义欢迎语
      const groupRule = ctx.config.autoApprove?.group?.rules?.find(r => r.groupId === group_id);
      const template = groupRule?.welcomeMessage || ctx.config.welcome.template || "欢迎 {nickname} 加入本群！";

      // 获取新成员昵称
      let nickname = String(user_id);
      try {
        const info = await ctx.client.getStrangerInfo(user_id);
        nickname = info.data?.nickname || nickname;
      } catch (_) {}

      const text = template.replace(/\{nickname\}/g, nickname).replace(/\{user_id\}/g, String(user_id));

      await ctx.client.sendGroupMsg(group_id, [
        { type: "at", data: { qq: String(user_id) } },
        { type: "text", data: { text: " " + text } },
      ]);
    } catch (err) {
      console.error("[QQ Events] 发送欢迎消息失败:", err);
    }
  }

  // 通知主人
  if (ctx.config.notifications?.memberChange !== false) {
    const action = sub_type === "invite" ? "被邀请加入" : "加入了";
    await ctx.notifyOwner(`👋 ${user_id} ${action}群 ${group_id}`);
  }
}

// 群成员减少
async function handleGroupDecrease(event: OneBotEvent, ctx: EventContext) {
  const { group_id, user_id, operator_id, sub_type } = event;
  if (!group_id || !user_id) return;

  console.log(`[QQ Events] 群成员减少: group=${group_id}, user=${user_id}, sub_type=${sub_type}`);

  if (ctx.config.notifications?.memberChange === false) return;

  if (sub_type === "kick_me") {
    // 机器人被踢 → 紧急通知
    await ctx.notifyOwner(`⚠️ 机器人被踢出群 ${group_id}，操作者: ${operator_id}`);
  } else if (sub_type === "kick") {
    await ctx.notifyOwner(`🚫 ${user_id} 被 ${operator_id} 踢出群 ${group_id}`);
  } else {
    await ctx.notifyOwner(`👤 ${user_id} 退出了群 ${group_id}`);
  }
}

// 群消息撤回
async function handleGroupRecall(event: OneBotEvent, ctx: EventContext) {
  if (ctx.config.notifications?.antiRecall === false) return;

  const { group_id, user_id, operator_id, message_id } = event;
  if (!message_id) return;

  console.log(`[QQ Events] 群消息撤回: group=${group_id}, user=${user_id}, message_id=${message_id}`);

  // 从缓存中获取原消息内容
  const cached = getMessageCache().get(message_id);
  const content = cached ? cached.text : "(消息内容未缓存)";

  // 如果是机器人自己撤回的，不通知
  if (operator_id === ctx.selfId) return;

  const operatorInfo = operator_id === user_id ? "" : `\n操作者: ${operator_id}`;
  await ctx.notifyOwner(
    `🔄 群 ${group_id} 消息撤回\n发送者: ${user_id}${operatorInfo}\n内容: ${content}`
  );
}

// 私聊消息撤回
async function handleFriendRecall(event: OneBotEvent, ctx: EventContext) {
  if (ctx.config.notifications?.antiRecall === false) return;

  const { user_id, message_id } = event;
  if (!message_id) return;

  console.log(`[QQ Events] 私聊消息撤回: user=${user_id}, message_id=${message_id}`);

  const cached = getMessageCache().get(message_id);
  const content = cached ? cached.text : "(消息内容未缓存)";

  await ctx.notifyOwner(`🔄 好友 ${user_id} 撤回了消息\n内容: ${content}`);
}

// 群管理员变动
async function handleGroupAdmin(event: OneBotEvent, ctx: EventContext) {
  if (ctx.config.notifications?.adminChange === false) return;

  const { group_id, user_id, sub_type } = event;
  if (!group_id || !user_id) return;

  const action = sub_type === "set" ? "被设为管理员 👑" : "被取消管理员";
  await ctx.notifyOwner(`群 ${group_id}: ${user_id} ${action}`);
}

// 群禁言
async function handleGroupBan(event: OneBotEvent, ctx: EventContext) {
  if (ctx.config.notifications?.banNotice === false) return;

  const { group_id, user_id, operator_id, duration, sub_type } = event;
  if (!group_id) return;

  if (sub_type === "ban") {
    const durationText = duration ? `${duration}秒` : "未知时长";
    // 如果是机器人被禁言，紧急通知
    if (user_id === ctx.selfId) {
      await ctx.notifyOwner(`⚠️ 机器人在群 ${group_id} 被 ${operator_id} 禁言 ${durationText}`);
    } else {
      await ctx.notifyOwner(`🔇 群 ${group_id}: ${user_id} 被 ${operator_id} 禁言 ${durationText}`);
    }
  } else if (sub_type === "lift_ban") {
    await ctx.notifyOwner(`🔊 群 ${group_id}: ${user_id} 被 ${operator_id} 解除禁言`);
  }
}

// 群文件上传
async function handleGroupUpload(event: OneBotEvent, ctx: EventContext) {
  if (ctx.config.notifications?.fileUpload === false) return;

  const { group_id, user_id, file } = event;
  if (!group_id || !file) return;

  const sizeText = file.size > 1024 * 1024
    ? `${(file.size / 1024 / 1024).toFixed(1)}MB`
    : `${(file.size / 1024).toFixed(1)}KB`;

  await ctx.notifyOwner(`📁 群 ${group_id}: ${user_id} 上传了文件\n文件名: ${file.name}\n大小: ${sizeText}`);
}
