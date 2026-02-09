// 消息操作工具 - 撤回、转发、合并转发、表情回应等

import type { ToolDefinition } from "./index.js";

export const messageTools: ToolDefinition[] = [
  {
    name: "qq_recall_message",
    description: "撤回一条QQ消息。机器人只能撤回自己发送的消息（2分钟内），或以管理员身份撤回群成员消息。",
    parameters: {
      type: "object",
      properties: {
        message_id: { type: "number", description: "要撤回的消息ID" },
      },
      required: ["message_id"],
    },
    execute: async (client, params) => {
      await client.deleteMsg(params.message_id);
      return { success: true, message: "消息已撤回" };
    },
  },
  {
    name: "qq_get_message",
    description: "获取一条消息的详细信息，包括发送者、内容、时间等。",
    parameters: {
      type: "object",
      properties: {
        message_id: { type: "number", description: "消息ID" },
      },
      required: ["message_id"],
    },
    execute: async (client, params) => {
      const result = await client.getMsg(params.message_id);
      return result.data;
    },
  },
  {
    name: "qq_forward_to_private",
    description: "将一条消息转发到私聊。",
    parameters: {
      type: "object",
      properties: {
        message_id: { type: "number", description: "要转发的消息ID" },
        user_id: { type: "number", description: "目标QQ号" },
      },
      required: ["message_id", "user_id"],
    },
    execute: async (client, params) => {
      await client.callApi("forward_friend_single_msg", {
        message_id: params.message_id,
        user_id: params.user_id,
      });
      return { success: true, message: "消息已转发到私聊" };
    },
  },
  {
    name: "qq_forward_to_group",
    description: "将一条消息转发到群聊。",
    parameters: {
      type: "object",
      properties: {
        message_id: { type: "number", description: "要转发的消息ID" },
        group_id: { type: "number", description: "目标群号" },
      },
      required: ["message_id", "group_id"],
    },
    execute: async (client, params) => {
      await client.callApi("forward_group_single_msg", {
        message_id: params.message_id,
        group_id: params.group_id,
      });
      return { success: true, message: "消息已转发到群聊" };
    },
  },
  {
    name: "qq_send_forward_msg",
    description: "发送合并转发消息，将多条消息打包成一条转发消息发送。适合发送长文本或多段内容避免刷屏。",
    parameters: {
      type: "object",
      properties: {
        target_type: { type: "string", enum: ["private", "group"], description: "目标类型：private=私聊, group=群聊" },
        target_id: { type: "number", description: "目标QQ号（私聊）或群号（群聊）" },
        messages: {
          type: "array",
          description: "消息列表",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "显示的发送者名称" },
              content: { type: "string", description: "消息内容" },
            },
            required: ["content"],
          },
        },
      },
      required: ["target_type", "target_id", "messages"],
    },
    execute: async (client, params) => {
      const nodes = params.messages.map((m: any) => ({
        type: "node",
        data: {
          nickname: m.name || "Bot",
          user_id: "0",
          content: [{ type: "text", data: { text: m.content } }],
        },
      }));
      const result = await client.sendForwardMsg(params.target_type, params.target_id, nodes);
      return { success: true, message_id: result.data?.message_id };
    },
  },
  {
    name: "qq_send_poke",
    description: "发送戳一戳。可以在群聊中戳某人，也可以在私聊中戳好友。",
    parameters: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "目标QQ号" },
        group_id: { type: "number", description: "群号（传入则为群内戳一戳，不传则为私聊戳一戳）" },
      },
      required: ["user_id"],
    },
    execute: async (client, params) => {
      await client.sendPoke(params.user_id, params.group_id);
      return { success: true, message: "已发送戳一戳" };
    },
  },
  {
    name: "qq_set_emoji_reaction",
    description: "给一条消息贴表情回应（类似微信的消息回应功能）。",
    parameters: {
      type: "object",
      properties: {
        message_id: { type: "number", description: "消息ID" },
        emoji_id: { type: "string", description: "表情ID" },
      },
      required: ["message_id", "emoji_id"],
    },
    execute: async (client, params) => {
      await client.setMsgEmojiLike(params.message_id, params.emoji_id);
      return { success: true, message: "已添加表情回应" };
    },
  },
  {
    name: "qq_mark_as_read",
    description: "标记私聊或群聊消息为已读。",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["private", "group"], description: "消息类型" },
        id: { type: "number", description: "QQ号（私聊）或群号（群聊）" },
      },
      required: ["type", "id"],
    },
    execute: async (client, params) => {
      if (params.type === "private") {
        await client.markPrivateMsgAsRead(params.id);
      } else {
        await client.markGroupMsgAsRead(params.id);
      }
      return { success: true, message: "已标记为已读" };
    },
  },
  {
    name: "qq_mark_all_as_read",
    description: "标记所有消息为已读。",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (client) => {
      await client.callApi("_mark_all_as_read");
      return { success: true, message: "已标记所有消息为已读" };
    },
  },
];
