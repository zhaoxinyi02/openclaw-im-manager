import WebSocket from "ws";
import EventEmitter from "events";
import type { OneBotEvent, OneBotMessage, OneBotResponse } from "./types.js";

interface OneBotClientOptions {
  wsUrl: string;
  accessToken?: string;
}

export class OneBotClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: OneBotClientOptions;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isAlive = false;
  private echoCounter = 0;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  constructor(options: OneBotClientOptions) {
    super();
    this.options = options;
  }

  connect() {
    const headers: Record<string, string> = {};
    if (this.options.accessToken) {
      headers["Authorization"] = "Bearer " + this.options.accessToken;
    }

    this.ws = new WebSocket(this.options.wsUrl, { headers });

    this.ws.on("open", () => {
      this.isAlive = true;
      this.emit("connect");
      console.log("[QQ] Connected to OneBot server");
    });

    this.ws.on("message", (data) => {
      try {
        const payload = JSON.parse(data.toString());
        
        // 处理API响应
        if (payload.echo) {
          const pending = this.pendingRequests.get(payload.echo);
          if (pending) {
            this.pendingRequests.delete(payload.echo);
            if (payload.status === "ok") {
              pending.resolve(payload);
            } else {
              pending.reject(new Error(payload.message || "API call failed"));
            }
          }
          return;
        }
        
        // 处理事件
        const event = payload as OneBotEvent;
        if (event.post_type === "meta_event" && event.meta_event_type === "heartbeat") {
          this.isAlive = true;
          return;
        }
        this.emit("message", event);
      } catch (err) {
        console.error("[QQ] Failed to parse message:", err);
      }
    });

    this.ws.on("close", () => {
      this.isAlive = false;
      this.emit("disconnect");
      console.log("[QQ] Disconnected. Reconnecting in 5s...");
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    });

    this.ws.on("error", (err) => {
      console.error("[QQ] WebSocket error:", err);
      this.ws?.close();
    });
  }

  // 通用API调用方法
  async callApi<T = any>(action: string, params: any = {}): Promise<OneBotResponse<T>> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      const echo = "req_" + (++this.echoCounter) + "_" + Date.now();
      this.pendingRequests.set(echo, { resolve, reject });

      const payload = JSON.stringify({ action, params, echo });
      console.log("[QQ] API call: " + action);
      this.ws.send(payload);

      // 超时处理
      setTimeout(() => {
        if (this.pendingRequests.has(echo)) {
          this.pendingRequests.delete(echo);
          reject(new Error("API call timeout: " + action));
        }
      }, 30000);
    });
  }

  // ========== 消息接口 ==========
  
  // 发送私聊消息
  async sendPrivateMsg(userId: number, message: OneBotMessage, autoEscape = false) {
    console.log("[QQ] sendPrivateMsg: userId=" + userId + ", message=" + JSON.stringify(message));
    return this.callApi("send_private_msg", { user_id: userId, message, auto_escape: autoEscape });
  }

  // 发送群消息
  async sendGroupMsg(groupId: number, message: OneBotMessage, autoEscape = false) {
    console.log("[QQ] sendGroupMsg: groupId=" + groupId + ", message=" + JSON.stringify(message));
    return this.callApi("send_group_msg", { group_id: groupId, message, auto_escape: autoEscape });
  }

  // 发送消息（通用）
  async sendMsg(messageType: "private" | "group", id: number, message: OneBotMessage) {
    if (messageType === "private") {
      return this.sendPrivateMsg(id, message);
    } else {
      return this.sendGroupMsg(id, message);
    }
  }

  // 撤回消息
  async deleteMsg(messageId: number) {
    return this.callApi("delete_msg", { message_id: messageId });
  }

  // 获取消息
  async getMsg(messageId: number) {
    return this.callApi("get_msg", { message_id: messageId });
  }

  // 获取合并转发消息
  async getForwardMsg(id: string) {
    return this.callApi("get_forward_msg", { id });
  }

  // 发送合并转发消息
  async sendForwardMsg(messageType: "private" | "group", id: number, messages: any[]) {
    return this.callApi("send_forward_msg", {
      message_type: messageType,
      user_id: messageType === "private" ? id : undefined,
      group_id: messageType === "group" ? id : undefined,
      messages
    });
  }

  // ========== 好友操作 ==========

  // 发送好友赞
  async sendLike(userId: number, times = 1) {
    return this.callApi("send_like", { user_id: userId, times });
  }

  // 获取好友列表
  async getFriendList() {
    return this.callApi("get_friend_list");
  }

  // 获取陌生人信息
  async getStrangerInfo(userId: number, noCache = false) {
    return this.callApi("get_stranger_info", { user_id: userId, no_cache: noCache });
  }

  // 处理加好友请求
  async setFriendAddRequest(flag: string, approve = true, remark = "") {
    return this.callApi("set_friend_add_request", { flag, approve, remark });
  }

  // ========== 群操作 ==========

  // 群组踢人
  async setGroupKick(groupId: number, userId: number, rejectAddRequest = false) {
    return this.callApi("set_group_kick", { group_id: groupId, user_id: userId, reject_add_request: rejectAddRequest });
  }

  // 群组禁言
  async setGroupBan(groupId: number, userId: number, duration = 1800) {
    return this.callApi("set_group_ban", { group_id: groupId, user_id: userId, duration });
  }

  // 群组全员禁言
  async setGroupWholeBan(groupId: number, enable = true) {
    return this.callApi("set_group_whole_ban", { group_id: groupId, enable });
  }

  // 设置群管理员
  async setGroupAdmin(groupId: number, userId: number, enable = true) {
    return this.callApi("set_group_admin", { group_id: groupId, user_id: userId, enable });
  }

  // 设置群名片
  async setGroupCard(groupId: number, userId: number, card = "") {
    return this.callApi("set_group_card", { group_id: groupId, user_id: userId, card });
  }

  // 设置群名
  async setGroupName(groupId: number, groupName: string) {
    return this.callApi("set_group_name", { group_id: groupId, group_name: groupName });
  }

  // 退出群组
  async setGroupLeave(groupId: number, isDismiss = false) {
    return this.callApi("set_group_leave", { group_id: groupId, is_dismiss: isDismiss });
  }

  // 设置群专属头衔
  async setGroupSpecialTitle(groupId: number, userId: number, specialTitle = "", duration = -1) {
    return this.callApi("set_group_special_title", { group_id: groupId, user_id: userId, special_title: specialTitle, duration });
  }

  // 处理加群请求
  async setGroupAddRequest(flag: string, subType: string, approve = true, reason = "") {
    return this.callApi("set_group_add_request", { flag, sub_type: subType, approve, reason });
  }

  // 获取群信息
  async getGroupInfo(groupId: number, noCache = false) {
    return this.callApi("get_group_info", { group_id: groupId, no_cache: noCache });
  }

  // 获取群列表
  async getGroupList() {
    return this.callApi("get_group_list");
  }

  // 获取群成员信息
  async getGroupMemberInfo(groupId: number, userId: number, noCache = false) {
    return this.callApi("get_group_member_info", { group_id: groupId, user_id: userId, no_cache: noCache });
  }

  // 获取群成员列表
  async getGroupMemberList(groupId: number) {
    return this.callApi("get_group_member_list", { group_id: groupId });
  }

  // 获取群荣誉信息
  async getGroupHonorInfo(groupId: number, type: string) {
    return this.callApi("get_group_honor_info", { group_id: groupId, type });
  }

  // ========== 文件操作 ==========

  // 上传群文件
  async uploadGroupFile(groupId: number, file: string, name: string, folder = "") {
    return this.callApi("upload_group_file", { group_id: groupId, file, name, folder });
  }

  // 上传私聊文件
  async uploadPrivateFile(userId: number, file: string, name: string) {
    return this.callApi("upload_private_file", { user_id: userId, file, name });
  }

  // 获取图片信息
  async getImage(file: string) {
    return this.callApi("get_image", { file });
  }

  // 获取语音信息
  async getRecord(file: string, outFormat: string) {
    return this.callApi("get_record", { file, out_format: outFormat });
  }

  // 获取文件信息
  async getFile(fileId: string) {
    return this.callApi("get_file", { file_id: fileId });
  }

  // ========== 系统接口 ==========

  // 获取登录号信息
  async getLoginInfo() {
    return this.callApi("get_login_info");
  }

  // 获取版本信息
  async getVersionInfo() {
    return this.callApi("get_version_info");
  }

  // 获取运行状态
  async getStatus() {
    return this.callApi("get_status");
  }

  // 检查是否可以发送图片
  async canSendImage() {
    return this.callApi("can_send_image");
  }

  // 检查是否可以发送语音
  async canSendRecord() {
    return this.callApi("can_send_record");
  }

  // 清理缓存
  async cleanCache() {
    return this.callApi("clean_cache");
  }

  // ========== NapCat扩展接口 ==========

  // 群聊戳一戳
  async groupPoke(groupId: number, userId: number) {
    return this.callApi("group_poke", { group_id: groupId, user_id: userId });
  }

  // 私聊戳一戳
  async friendPoke(userId: number) {
    return this.callApi("friend_poke", { user_id: userId });
  }

  // 发送戳一戳（通用）
  async sendPoke(userId: number, groupId?: number) {
    if (groupId) {
      return this.groupPoke(groupId, userId);
    } else {
      return this.friendPoke(userId);
    }
  }

  // 设置QQ头像
  async setQQAvatar(file: string) {
    return this.callApi("set_qq_avatar", { file });
  }

  // 设置签名
  async setSelfLongnick(longNick: string) {
    return this.callApi("set_self_longnick", { longNick });
  }

  // 设置在线状态
  async setOnlineStatus(status: number, extStatus: number, batteryStatus = 0) {
    return this.callApi("set_online_status", { status, ext_status: extStatus, battery_status: batteryStatus });
  }

  // 获取分类好友列表
  async getFriendsWithCategory() {
    return this.callApi("get_friends_with_category");
  }

  // 设置消息表情回复
  async setMsgEmojiLike(messageId: number, emojiId: string) {
    return this.callApi("set_msg_emoji_like", { message_id: messageId, emoji_id: emojiId });
  }

  // 标记私聊已读
  async markPrivateMsgAsRead(userId: number) {
    return this.callApi("mark_private_msg_as_read", { user_id: userId });
  }

  // 标记群聊已读
  async markGroupMsgAsRead(groupId: number) {
    return this.callApi("mark_group_msg_as_read", { group_id: groupId });
  }

  // 获取私聊历史记录
  async getFriendMsgHistory(userId: string, messageSeq = "0", count = 20) {
    return this.callApi("get_friend_msg_history", { user_id: userId, message_seq: messageSeq, count });
  }

  // 获取群聊历史记录
  async getGroupMsgHistory(groupId: number, messageSeq = 0, count = 20) {
    return this.callApi("get_group_msg_history", { group_id: groupId, message_seq: messageSeq, count });
  }

  // 获取最近会话
  async getRecentContact(count = 10) {
    return this.callApi("get_recent_contact", { count });
  }

  // AI文字转语音
  async getAiRecord(character: string, groupId: number, text: string) {
    return this.callApi("get_ai_record", { character, group_id: groupId, text });
  }

  // 获取AI语音角色列表
  async getAiCharacters(groupId: number) {
    return this.callApi("get_ai_characters", { group_id: groupId });
  }

  // 发送群AI语音
  async sendGroupAiRecord(character: string, groupId: number, text: string) {
    return this.callApi("send_group_ai_record", { character, group_id: groupId, text });
  }

  // 群签到
  async setGroupSign(groupId: string) {
    return this.callApi("set_group_sign", { group_id: groupId });
  }

  // ========== 补充接口 ==========

  // 转发单条消息到私聊
  async forwardFriendSingleMsg(messageId: number, userId: number) {
    return this.callApi("forward_friend_single_msg", { message_id: messageId, user_id: userId });
  }

  // 转发单条消息到群聊
  async forwardGroupSingleMsg(messageId: number, groupId: number) {
    return this.callApi("forward_group_single_msg", { message_id: messageId, group_id: groupId });
  }

  // 发送群公告
  async sendGroupNotice(groupId: number, content: string, image?: string) {
    return this.callApi("_send_group_notice", { group_id: groupId, content, image });
  }

  // 获取群公告
  async getGroupNotice(groupId: number) {
    return this.callApi("_get_group_notice", { group_id: groupId });
  }

  // 删除群公告
  async deleteGroupNotice(groupId: number, noticeId: string) {
    return this.callApi("_del_group_notice", { group_id: groupId, notice_id: noticeId });
  }

  // 设置精华消息
  async setEssenceMsg(messageId: number) {
    return this.callApi("set_essence_msg", { message_id: messageId });
  }

  // 移除精华消息
  async deleteEssenceMsg(messageId: number) {
    return this.callApi("delete_essence_msg", { message_id: messageId });
  }

  // 获取精华消息列表
  async getEssenceMsgList(groupId: number) {
    return this.callApi("get_essence_msg_list", { group_id: groupId });
  }

  // 获取群根目录文件列表
  async getGroupRootFiles(groupId: number) {
    return this.callApi("get_group_root_files", { group_id: groupId });
  }

  // 获取群文件夹内文件列表
  async getGroupFilesByFolder(groupId: number, folderId: string) {
    return this.callApi("get_group_files_by_folder", { group_id: groupId, folder_id: folderId });
  }

  // 获取群文件下载链接
  async getGroupFileUrl(groupId: number, fileId: string, busid: number) {
    return this.callApi("get_group_file_url", { group_id: groupId, file_id: fileId, busid });
  }

  // 删除群文件
  async deleteGroupFile(groupId: number, fileId: string, busid: number) {
    return this.callApi("delete_group_file", { group_id: groupId, file_id: fileId, busid });
  }

  // 创建群文件夹
  async createGroupFileFolder(groupId: number, name: string, parentId = "/") {
    return this.callApi("create_group_file_folder", { group_id: groupId, name, parent_id: parentId });
  }

  // 获取群系统消息
  async getGroupSystemMsg() {
    return this.callApi("get_group_system_msg");
  }

  // 获取群禁言列表
  async getGroupShutList(groupId: number) {
    return this.callApi("get_group_shut_list", { group_id: groupId });
  }

  // 标记所有消息已读
  async markAllAsRead() {
    return this.callApi("_mark_all_as_read");
  }

  // 获取自身点赞列表
  async getProfileLike() {
    return this.callApi("get_profile_like");
  }

  // 获取自定义表情
  async fetchCustomFace(count = 48) {
    return this.callApi("fetch_custom_face", { count });
  }

  // 获取推荐好友/群聊卡片
  async getArkSharePeer(params: { user_id?: string; group_id?: string }) {
    return this.callApi("ArkSharePeer", params);
  }

  // 删除好友
  async deleteFriend(userId: number) {
    return this.callApi("delete_friend", { user_id: userId });
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
