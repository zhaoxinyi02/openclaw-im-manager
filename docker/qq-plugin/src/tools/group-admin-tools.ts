// 群管理工具 - 踢人、禁言、管理员、群名片、公告、精华消息等

import type { ToolDefinition } from "./index.js";

export const groupAdminTools: ToolDefinition[] = [
  {
    name: "qq_kick_member",
    description: "将成员踢出群聊。需要机器人是管理员或群主。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        user_id: { type: "number", description: "要踢的QQ号" },
        reject_add: { type: "boolean", description: "是否拒绝此人再次加群，默认false" },
      },
      required: ["group_id", "user_id"],
    },
    execute: async (client, params) => {
      await client.setGroupKick(params.group_id, params.user_id, params.reject_add || false);
      return { success: true, message: `已将 ${params.user_id} 踢出群 ${params.group_id}` };
    },
  },
  {
    name: "qq_ban_member",
    description: "禁言群成员。duration=0 表示解除禁言。需要机器人是管理员或群主。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        user_id: { type: "number", description: "要禁言的QQ号" },
        duration: { type: "number", description: "禁言时长（秒），0=解除禁言，默认600秒（10分钟）" },
      },
      required: ["group_id", "user_id"],
    },
    execute: async (client, params) => {
      const duration = params.duration !== undefined ? params.duration : 600;
      await client.setGroupBan(params.group_id, params.user_id, duration);
      const action = duration === 0 ? "已解除禁言" : `已禁言 ${duration}秒`;
      return { success: true, message: `${action}: ${params.user_id} 在群 ${params.group_id}` };
    },
  },
  {
    name: "qq_whole_ban",
    description: "开启或关闭群全员禁言。需要机器人是管理员或群主。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        enable: { type: "boolean", description: "true=开启全员禁言, false=关闭全员禁言" },
      },
      required: ["group_id", "enable"],
    },
    execute: async (client, params) => {
      await client.setGroupWholeBan(params.group_id, params.enable);
      const action = params.enable ? "已开启" : "已关闭";
      return { success: true, message: `${action}群 ${params.group_id} 全员禁言` };
    },
  },
  {
    name: "qq_set_admin",
    description: "设置或取消群管理员。需要机器人是群主。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        user_id: { type: "number", description: "目标QQ号" },
        enable: { type: "boolean", description: "true=设为管理员, false=取消管理员" },
      },
      required: ["group_id", "user_id", "enable"],
    },
    execute: async (client, params) => {
      await client.setGroupAdmin(params.group_id, params.user_id, params.enable);
      const action = params.enable ? "设为管理员" : "取消管理员";
      return { success: true, message: `已将 ${params.user_id} ${action}` };
    },
  },
  {
    name: "qq_set_group_card",
    description: "设置群成员的群名片（群备注）。空字符串表示删除群名片。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        user_id: { type: "number", description: "目标QQ号" },
        card: { type: "string", description: "新群名片内容，空字符串=删除群名片" },
      },
      required: ["group_id", "user_id", "card"],
    },
    execute: async (client, params) => {
      await client.setGroupCard(params.group_id, params.user_id, params.card);
      return { success: true, message: `已设置 ${params.user_id} 的群名片为: ${params.card || "(已删除)"}` };
    },
  },
  {
    name: "qq_set_group_name",
    description: "修改群名称。需要机器人是管理员或群主。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        group_name: { type: "string", description: "新群名" },
      },
      required: ["group_id", "group_name"],
    },
    execute: async (client, params) => {
      await client.setGroupName(params.group_id, params.group_name);
      return { success: true, message: `已将群 ${params.group_id} 改名为: ${params.group_name}` };
    },
  },
  {
    name: "qq_set_special_title",
    description: "设置群成员的专属头衔。仅群主可用。空字符串表示删除头衔。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        user_id: { type: "number", description: "目标QQ号" },
        title: { type: "string", description: "专属头衔内容，空字符串=删除头衔" },
      },
      required: ["group_id", "user_id", "title"],
    },
    execute: async (client, params) => {
      await client.setGroupSpecialTitle(params.group_id, params.user_id, params.title);
      return { success: true, message: `已设置 ${params.user_id} 的专属头衔为: ${params.title || "(已删除)"}` };
    },
  },
  {
    name: "qq_leave_group",
    description: "退出群聊。如果机器人是群主且is_dismiss=true则解散群。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        is_dismiss: { type: "boolean", description: "是否解散群（仅群主有效），默认false" },
      },
      required: ["group_id"],
    },
    execute: async (client, params) => {
      await client.setGroupLeave(params.group_id, params.is_dismiss || false);
      return { success: true, message: `已退出群 ${params.group_id}` };
    },
  },
  {
    name: "qq_handle_group_request",
    description: "手动处理加群请求或邀请。flag从待审核通知中获取。",
    parameters: {
      type: "object",
      properties: {
        flag: { type: "string", description: "请求标识（从通知消息中获取）" },
        sub_type: { type: "string", enum: ["add", "invite"], description: "请求类型：add=主动申请, invite=被邀请" },
        approve: { type: "boolean", description: "是否同意" },
        reason: { type: "string", description: "拒绝理由（仅拒绝时有效）" },
      },
      required: ["flag", "sub_type", "approve"],
    },
    execute: async (client, params) => {
      await client.setGroupAddRequest(params.flag, params.sub_type, params.approve, params.reason || "");
      const action = params.approve ? "已同意" : "已拒绝";
      return { success: true, message: `${action}入群请求` };
    },
  },
  {
    name: "qq_handle_friend_request",
    description: "手动处理加好友请求。flag从待审核通知中获取。",
    parameters: {
      type: "object",
      properties: {
        flag: { type: "string", description: "请求标识（从通知消息中获取）" },
        approve: { type: "boolean", description: "是否同意" },
        remark: { type: "string", description: "好友备注（仅同意时有效）" },
      },
      required: ["flag", "approve"],
    },
    execute: async (client, params) => {
      await client.setFriendAddRequest(params.flag, params.approve, params.remark || "");
      const action = params.approve ? "已同意" : "已拒绝";
      return { success: true, message: `${action}好友请求` };
    },
  },
  {
    name: "qq_send_group_notice",
    description: "发布群公告。需要机器人是管理员或群主。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        content: { type: "string", description: "公告内容" },
        image: { type: "string", description: "公告图片URL（可选）" },
      },
      required: ["group_id", "content"],
    },
    execute: async (client, params) => {
      await client.callApi("_send_group_notice", {
        group_id: params.group_id,
        content: params.content,
        image: params.image,
      });
      return { success: true, message: `已发布群 ${params.group_id} 公告` };
    },
  },
  {
    name: "qq_delete_group_notice",
    description: "删除群公告。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        notice_id: { type: "string", description: "公告ID" },
      },
      required: ["group_id", "notice_id"],
    },
    execute: async (client, params) => {
      await client.callApi("_del_group_notice", {
        group_id: params.group_id,
        notice_id: params.notice_id,
      });
      return { success: true, message: "已删除群公告" };
    },
  },
  {
    name: "qq_set_essence_msg",
    description: "将一条消息设为群精华消息。",
    parameters: {
      type: "object",
      properties: {
        message_id: { type: "number", description: "消息ID" },
      },
      required: ["message_id"],
    },
    execute: async (client, params) => {
      await client.callApi("set_essence_msg", { message_id: params.message_id });
      return { success: true, message: "已设为精华消息" };
    },
  },
  {
    name: "qq_delete_essence_msg",
    description: "移除一条群精华消息。",
    parameters: {
      type: "object",
      properties: {
        message_id: { type: "number", description: "消息ID" },
      },
      required: ["message_id"],
    },
    execute: async (client, params) => {
      await client.callApi("delete_essence_msg", { message_id: params.message_id });
      return { success: true, message: "已移除精华消息" };
    },
  },
  {
    name: "qq_group_sign",
    description: "群打卡/签到。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
      },
      required: ["group_id"],
    },
    execute: async (client, params) => {
      await client.setGroupSign(String(params.group_id));
      return { success: true, message: `已在群 ${params.group_id} 签到` };
    },
  },
];
