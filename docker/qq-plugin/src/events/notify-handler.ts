// 提醒事件处理器 - 处理戳一戳、群荣誉变更等 notify 子类型

import type { OneBotEvent } from "../types.js";
import type { EventContext } from "./index.js";

export async function handleNotify(event: OneBotEvent, ctx: EventContext) {
  const subType = event.sub_type;

  switch (subType) {
    case "poke":
      await handlePoke(event, ctx);
      break;
    case "honor":
      await handleHonor(event, ctx);
      break;
    case "lucky_king":
      await handleLuckyKing(event, ctx);
      break;
    default:
      console.log("[QQ Events] 未处理的 notify 子类型:", subType);
      break;
  }
}

// 戳一戳
async function handlePoke(event: OneBotEvent, ctx: EventContext) {
  if (ctx.config.notifications?.pokeReply === false) return;

  const { group_id, user_id, target_id } = event;

  // 只处理戳机器人的情况
  if (target_id !== ctx.selfId) return;

  console.log(`[QQ Events] 被戳一戳: user=${user_id}, group=${group_id}`);

  const replies = [
    "别戳了！🙈",
    "戳我干嘛~",
    "再戳我就要生气了！😤",
    "嘿嘿嘿~",
    "你好呀！👋",
    "干嘛戳我！💢",
    "我在呢~有什么事吗？",
    "戳戳戳，你就知道戳！",
    "哎呀，被发现了~",
    "请不要骚扰机器人 🤖",
  ];
  const reply = replies[Math.floor(Math.random() * replies.length)];

  if (group_id) {
    await ctx.client.sendGroupMsg(group_id, [{ type: "text", data: { text: reply } }]);
  } else if (user_id) {
    await ctx.client.sendPrivateMsg(user_id, [{ type: "text", data: { text: reply } }]);
  }
}

// 群荣誉变更
async function handleHonor(event: OneBotEvent, ctx: EventContext) {
  if (ctx.config.notifications?.honorNotice === false) return;

  const { group_id, user_id, honor_type } = event;
  if (!group_id || !user_id) return;

  const honorNames: Record<string, string> = {
    talkative: "龙王 🐉",
    performer: "群聊之火 🔥",
    legend: "群聊炽焰 🌟",
    strong_newbie: "冒尖小春笋 🌱",
    emotion: "快乐源泉 😄",
  };

  const name = honorNames[honor_type || ""] || honor_type || "未知荣誉";

  await ctx.client.sendGroupMsg(group_id, [
    { type: "at", data: { qq: String(user_id) } },
    { type: "text", data: { text: ` 恭喜获得「${name}」荣誉！🎉` } },
  ]);
}

// 红包运气王
async function handleLuckyKing(event: OneBotEvent, ctx: EventContext) {
  const { group_id, target_id } = event;
  if (!group_id || !target_id) return;

  await ctx.client.sendGroupMsg(group_id, [
    { type: "at", data: { qq: String(target_id) } },
    { type: "text", data: { text: " 恭喜成为运气王！🧧" } },
  ]);
}
