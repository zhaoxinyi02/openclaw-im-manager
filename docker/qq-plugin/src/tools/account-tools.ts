// 账号/个人设置工具 - 头像、签名、在线状态、点赞、AI语音等

import type { ToolDefinition } from "./index.js";

export const accountTools: ToolDefinition[] = [
  {
    name: "qq_set_avatar",
    description: "设置机器人的QQ头像。支持本地文件路径或HTTP URL。",
    parameters: {
      type: "object",
      properties: {
        file: { type: "string", description: "图片路径或URL" },
      },
      required: ["file"],
    },
    execute: async (client, params) => {
      await client.setQQAvatar(params.file);
      return { success: true, message: "已更新QQ头像" };
    },
  },
  {
    name: "qq_set_signature",
    description: "设置机器人的个性签名。",
    parameters: {
      type: "object",
      properties: {
        signature: { type: "string", description: "签名内容" },
      },
      required: ["signature"],
    },
    execute: async (client, params) => {
      await client.setSelfLongnick(params.signature);
      return { success: true, message: `已设置签名: ${params.signature}` };
    },
  },
  {
    name: "qq_set_online_status",
    description: "设置机器人的在线状态。常用状态: status=10(在线), status=30(离开), status=50(忙碌), status=60(Q我吧), status=70(隐身)。",
    parameters: {
      type: "object",
      properties: {
        status: { type: "number", description: "主状态码" },
        ext_status: { type: "number", description: "扩展状态码" },
        battery_status: { type: "number", description: "电量（模拟手机端），默认0" },
      },
      required: ["status", "ext_status"],
    },
    execute: async (client, params) => {
      await client.setOnlineStatus(params.status, params.ext_status, params.battery_status || 0);
      return { success: true, message: "已更新在线状态" };
    },
  },
  {
    name: "qq_send_like",
    description: "给某人点赞（赞名片）。每个好友每天最多10次。",
    parameters: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "目标QQ号" },
        times: { type: "number", description: "点赞次数（1-10），默认1" },
      },
      required: ["user_id"],
    },
    execute: async (client, params) => {
      const times = Math.min(Math.max(params.times || 1, 1), 10);
      await client.sendLike(params.user_id, times);
      return { success: true, message: `已给 ${params.user_id} 点赞 ${times} 次` };
    },
  },
  {
    name: "qq_get_profile_like",
    description: "获取自身收到的点赞列表。",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (client) => {
      const result = await client.callApi("get_profile_like");
      return result.data;
    },
  },
  {
    name: "qq_get_friends_with_category",
    description: "获取分类的好友列表（按好友分组显示）。",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (client) => {
      const result = await client.getFriendsWithCategory();
      return result.data;
    },
  },
  {
    name: "qq_ai_tts",
    description: "使用QQ AI将文字转为语音。需要指定AI角色和群号。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号（AI语音需要群上下文）" },
        text: { type: "string", description: "要转换的文字" },
        character: { type: "string", description: "AI角色编号（可通过 qq_get_ai_characters 获取）" },
      },
      required: ["group_id", "text", "character"],
    },
    execute: async (client, params) => {
      const result = await client.getAiRecord(params.character, params.group_id, params.text);
      return result.data;
    },
  },
  {
    name: "qq_send_group_ai_voice",
    description: "在群聊中发送AI语音消息。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        text: { type: "string", description: "要转换的文字" },
        character: { type: "string", description: "AI角色编号" },
      },
      required: ["group_id", "text", "character"],
    },
    execute: async (client, params) => {
      const result = await client.sendGroupAiRecord(params.character, params.group_id, params.text);
      return { success: true, message_id: result.data?.message_id };
    },
  },
  {
    name: "qq_get_ai_characters",
    description: "获取可用的AI语音角色列表。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
      },
      required: ["group_id"],
    },
    execute: async (client, params) => {
      const result = await client.getAiCharacters(params.group_id);
      return result.data;
    },
  },
  {
    name: "qq_fetch_custom_face",
    description: "获取自定义表情列表。",
    parameters: {
      type: "object",
      properties: {
        count: { type: "number", description: "获取数量，默认48" },
      },
    },
    execute: async (client, params) => {
      const result = await client.callApi("fetch_custom_face", { count: params.count || 48 });
      return result.data;
    },
  },
  {
    name: "qq_get_ark_card",
    description: "获取推荐好友/群聊的Ark卡片JSON（可用于分享联系人/群）。好友和群聊二选一。",
    parameters: {
      type: "object",
      properties: {
        user_id: { type: "string", description: "好友QQ号（与group_id二选一）" },
        group_id: { type: "string", description: "群号（与user_id二选一）" },
      },
    },
    execute: async (client, params) => {
      const result = await client.callApi("ArkSharePeer", {
        user_id: params.user_id,
        group_id: params.group_id,
      });
      return result.data;
    },
  },
];
