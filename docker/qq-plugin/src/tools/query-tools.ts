// 信息查询工具 - 群信息、成员信息、好友列表、聊天记录等

import type { ToolDefinition } from "./index.js";

export const queryTools: ToolDefinition[] = [
  {
    name: "qq_get_group_info",
    description: "获取群信息，包括群名、成员数、最大成员数等。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        no_cache: { type: "boolean", description: "是否不使用缓存，默认false" },
      },
      required: ["group_id"],
    },
    execute: async (client, params) => {
      const result = await client.getGroupInfo(params.group_id, params.no_cache || false);
      return result.data;
    },
  },
  {
    name: "qq_get_group_list",
    description: "获取机器人加入的所有群列表。",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (client) => {
      const result = await client.getGroupList();
      return result.data;
    },
  },
  {
    name: "qq_get_group_member_info",
    description: "获取群成员详细信息，包括昵称、群名片、角色、加群时间等。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        user_id: { type: "number", description: "QQ号" },
        no_cache: { type: "boolean", description: "是否不使用缓存，默认false" },
      },
      required: ["group_id", "user_id"],
    },
    execute: async (client, params) => {
      const result = await client.getGroupMemberInfo(params.group_id, params.user_id, params.no_cache || false);
      return result.data;
    },
  },
  {
    name: "qq_get_group_member_list",
    description: "获取群全部成员列表。注意：大群可能返回数据量较大。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
      },
      required: ["group_id"],
    },
    execute: async (client, params) => {
      const result = await client.getGroupMemberList(params.group_id);
      const members = result.data;
      if (Array.isArray(members)) {
        return {
          total: members.length,
          members: members.map((m: any) => ({
            user_id: m.user_id,
            nickname: m.nickname,
            card: m.card,
            role: m.role,
            join_time: m.join_time,
            last_sent_time: m.last_sent_time,
          })),
        };
      }
      return result.data;
    },
  },
  {
    name: "qq_get_friend_list",
    description: "获取机器人的好友列表。",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (client) => {
      const result = await client.getFriendList();
      return result.data;
    },
  },
  {
    name: "qq_get_stranger_info",
    description: "获取陌生人（非好友）的基本信息，包括昵称、性别、年龄。",
    parameters: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "QQ号" },
        no_cache: { type: "boolean", description: "是否不使用缓存，默认false" },
      },
      required: ["user_id"],
    },
    execute: async (client, params) => {
      const result = await client.getStrangerInfo(params.user_id, params.no_cache || false);
      return result.data;
    },
  },
  {
    name: "qq_get_group_honor",
    description: "获取群荣誉信息，如龙王、群聊之火等。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        type: {
          type: "string",
          enum: ["talkative", "performer", "legend", "strong_newbie", "emotion", "all"],
          description: "荣誉类型，all=获取全部",
        },
      },
      required: ["group_id", "type"],
    },
    execute: async (client, params) => {
      const result = await client.getGroupHonorInfo(params.group_id, params.type);
      return result.data;
    },
  },
  {
    name: "qq_get_group_notices",
    description: "获取群公告列表。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
      },
      required: ["group_id"],
    },
    execute: async (client, params) => {
      const result = await client.callApi("_get_group_notice", { group_id: params.group_id });
      return result.data;
    },
  },
  {
    name: "qq_get_essence_list",
    description: "获取群精华消息列表。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
      },
      required: ["group_id"],
    },
    execute: async (client, params) => {
      const result = await client.callApi("get_essence_msg_list", { group_id: params.group_id });
      return result.data;
    },
  },
  {
    name: "qq_get_chat_history",
    description: "获取聊天历史记录。支持私聊和群聊。",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["private", "group"], description: "聊天类型" },
        id: { type: "number", description: "QQ号（私聊）或群号（群聊）" },
        count: { type: "number", description: "获取条数，默认20" },
        message_seq: { type: "number", description: "起始消息序号，0=最新，默认0" },
      },
      required: ["type", "id"],
    },
    execute: async (client, params) => {
      const count = params.count || 20;
      const seq = params.message_seq || 0;

      if (params.type === "private") {
        const result = await client.getFriendMsgHistory(String(params.id), String(seq), count);
        return result.data;
      } else {
        const result = await client.getGroupMsgHistory(params.id, seq, count);
        return result.data;
      }
    },
  },
  {
    name: "qq_get_recent_contacts",
    description: "获取最近的会话列表（最近联系人）。",
    parameters: {
      type: "object",
      properties: {
        count: { type: "number", description: "获取数量，默认10" },
      },
    },
    execute: async (client, params) => {
      const result = await client.getRecentContact(params.count || 10);
      return result.data;
    },
  },
  {
    name: "qq_get_group_system_msg",
    description: "获取群系统消息（待处理的加群请求、邀请等）。",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (client) => {
      const result = await client.callApi("get_group_system_msg");
      return result.data;
    },
  },
  {
    name: "qq_get_group_ban_list",
    description: "获取群禁言列表。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
      },
      required: ["group_id"],
    },
    execute: async (client, params) => {
      const result = await client.callApi("get_group_shut_list", { group_id: params.group_id });
      return result.data;
    },
  },
  {
    name: "qq_get_login_info",
    description: "获取当前登录的QQ号信息（QQ号和昵称）。",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (client) => {
      const result = await client.getLoginInfo();
      return result.data;
    },
  },
];
