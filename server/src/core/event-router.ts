import { OneBotClient } from './onebot-client.js';
import { AdminConfigData } from './admin-config.js';

interface MessageCache {
  text: string;
  userId: number;
  groupId?: number;
  time: number;
}

const msgCache = new Map<number, MessageCache>();
const MAX_CACHE = 500;

export function cacheMessage(msgId: number, msg: MessageCache) {
  if (msgCache.size >= MAX_CACHE) {
    const first = msgCache.keys().next().value;
    if (first !== undefined) msgCache.delete(first);
  }
  msgCache.set(msgId, msg);
}

export function getCachedMessage(msgId: number) {
  return msgCache.get(msgId);
}

// Pending requests for approval
const pendingRequests = new Map<string, any>();
export function getPendingRequests() { return pendingRequests; }

export function createEventRouter(client: OneBotClient, qqConfig: AdminConfigData['qq']) {
  const notifyOwner = async (text: string) => {
    if (!qqConfig.ownerQQ) return;
    try {
      await client.sendPrivateMsg(qqConfig.ownerQQ, [{ type: 'text', data: { text } }]);
    } catch (err) {
      console.error('[Events] Failed to notify owner:', err);
    }
  };

  return async (event: any) => {
    try {
      // Cache messages for anti-recall
      if (event.post_type === 'message' && event.message_id && event.raw_message) {
        cacheMessage(event.message_id, {
          text: event.raw_message,
          userId: event.user_id || 0,
          groupId: event.group_id,
          time: event.time,
        });
      }

      if (event.post_type === 'notice') {
        if (event.notice_type === 'notify') {
          await handleNotify(event, client, qqConfig, notifyOwner);
        } else {
          await handleNotice(event, client, qqConfig, notifyOwner);
        }
      } else if (event.post_type === 'request') {
        await handleRequest(event, client, qqConfig, notifyOwner);
      }
    } catch (err) {
      console.error('[Events] Error:', err);
    }
  };
}

// === Notice events ===
async function handleNotice(event: any, client: OneBotClient, cfg: AdminConfigData['qq'], notifyOwner: (t: string) => Promise<void>) {
  switch (event.notice_type) {
    case 'group_increase': {
      const { group_id, user_id, sub_type } = event;
      if (!group_id || !user_id) return;
      if (user_id === client.selfId) {
        await notifyOwner(`🤖 机器人已加入群 ${group_id}`);
        return;
      }
      // Welcome message
      if (cfg.welcome.enabled) {
        try {
          let nickname = String(user_id);
          try { const info = await client.getStrangerInfo(user_id); nickname = info.data?.nickname || nickname; } catch {}
          const text = cfg.welcome.template.replace(/\{nickname\}/g, nickname).replace(/\{user_id\}/g, String(user_id));
          setTimeout(async () => {
            await client.sendGroupMsg(group_id, [
              { type: 'at', data: { qq: String(user_id) } },
              { type: 'text', data: { text: ' ' + text } },
            ]);
          }, cfg.welcome.delayMs || 1500);
        } catch {}
      }
      if (cfg.notifications.memberChange !== false) {
        const action = sub_type === 'invite' ? '被邀请加入' : '加入了';
        await notifyOwner(`👋 ${user_id} ${action}群 ${group_id}`);
      }
      break;
    }
    case 'group_decrease': {
      if (cfg.notifications.memberChange === false) return;
      const { group_id, user_id, operator_id, sub_type } = event;
      if (sub_type === 'kick_me') await notifyOwner(`⚠️ 机器人被踢出群 ${group_id}，操作者: ${operator_id}`);
      else if (sub_type === 'kick') await notifyOwner(`🚫 ${user_id} 被 ${operator_id} 踢出群 ${group_id}`);
      else await notifyOwner(`👤 ${user_id} 退出了群 ${group_id}`);
      break;
    }
    case 'group_recall': {
      if (cfg.notifications.antiRecall === false) return;
      const { group_id, user_id, operator_id, message_id } = event;
      if (!message_id || operator_id === client.selfId) return;
      const cached = getCachedMessage(message_id);
      const content = cached ? cached.text : '(消息内容未缓存)';
      const opInfo = operator_id === user_id ? '' : `\n操作者: ${operator_id}`;
      await notifyOwner(`🔄 群 ${group_id} 消息撤回\n发送者: ${user_id}${opInfo}\n内容: ${content}`);
      break;
    }
    case 'friend_recall': {
      if (cfg.notifications.antiRecall === false) return;
      const { user_id, message_id } = event;
      if (!message_id) return;
      const cached = getCachedMessage(message_id);
      await notifyOwner(`🔄 好友 ${user_id} 撤回了消息\n内容: ${cached ? cached.text : '(未缓存)'}`);
      break;
    }
    case 'group_admin': {
      if (cfg.notifications.adminChange === false) return;
      const action = event.sub_type === 'set' ? '被设为管理员 👑' : '被取消管理员';
      await notifyOwner(`群 ${event.group_id}: ${event.user_id} ${action}`);
      break;
    }
    case 'group_ban': {
      if (cfg.notifications.banNotice === false) return;
      const { group_id, user_id, operator_id, duration, sub_type } = event;
      if (sub_type === 'ban') {
        const dur = duration ? `${duration}秒` : '未知时长';
        if (user_id === client.selfId) await notifyOwner(`⚠️ 机器人在群 ${group_id} 被 ${operator_id} 禁言 ${dur}`);
        else await notifyOwner(`🔇 群 ${group_id}: ${user_id} 被 ${operator_id} 禁言 ${dur}`);
      } else if (sub_type === 'lift_ban') {
        await notifyOwner(`🔊 群 ${group_id}: ${user_id} 被 ${operator_id} 解除禁言`);
      }
      break;
    }
  }
}

// === Notify events (poke, honor, etc.) ===
async function handleNotify(event: any, client: OneBotClient, cfg: AdminConfigData['qq'], notifyOwner: (t: string) => Promise<void>) {
  if (event.sub_type === 'poke') {
    if (cfg.notifications.pokeReply === false) return;
    if (event.target_id !== client.selfId) return;
    if (cfg.poke.enabled && cfg.poke.replies.length > 0) {
      const reply = cfg.poke.replies[Math.floor(Math.random() * cfg.poke.replies.length)];
      if (event.group_id) await client.sendGroupMsg(event.group_id, [{ type: 'text', data: { text: reply } }]);
      else if (event.user_id) await client.sendPrivateMsg(event.user_id, [{ type: 'text', data: { text: reply } }]);
    }
  } else if (event.sub_type === 'honor') {
    if (cfg.notifications.honorNotice === false) return;
    const honorNames: Record<string, string> = { talkative: '龙王 🐉', performer: '群聊之火 🔥', legend: '群聊炽焰 🌟', strong_newbie: '冒尖小春笋 🌱', emotion: '快乐源泉 😄' };
    const name = honorNames[event.honor_type || ''] || event.honor_type || '未知荣誉';
    if (event.group_id && event.user_id) {
      await client.sendGroupMsg(event.group_id, [
        { type: 'at', data: { qq: String(event.user_id) } },
        { type: 'text', data: { text: ` 恭喜获得「${name}」荣誉！🎉` } },
      ]);
    }
  }
}

// === Request events (friend/group add) ===
async function handleRequest(event: any, client: OneBotClient, cfg: AdminConfigData['qq'], notifyOwner: (t: string) => Promise<void>) {
  const { flag, user_id, group_id, comment, sub_type, request_type } = event;
  if (!flag) return;

  if (request_type === 'group') {
    if (sub_type === 'invite') {
      pendingRequests.set(flag, { type: 'group', subType: 'invite', userId: user_id, groupId: group_id, comment, flag, time: Date.now() });
      await notifyOwner(`📨 收到入群邀请\n邀请人: ${user_id}\n群号: ${group_id}\n\n回复「同意入群 ${flag}」或「拒绝入群 ${flag}」`);
      return;
    }
    const groupCfg = cfg.autoApprove.group;
    if (groupCfg.enabled && groupCfg.pattern && comment) {
      try {
        if (new RegExp(groupCfg.pattern).test(comment)) {
          await client.setGroupAddRequest(flag, 'add', true);
          await notifyOwner(`✅ 已自动同意入群申请\n申请人: ${user_id}\n群号: ${group_id}\n验证: ${comment}`);
          return;
        }
      } catch {}
    }
    pendingRequests.set(flag, { type: 'group', subType: 'add', userId: user_id, groupId: group_id, comment, flag, time: Date.now() });
    await notifyOwner(`📋 入群申请待审核\n申请人: ${user_id}\n群号: ${group_id}\n验证: ${comment || '(空)'}\n\n回复「同意入群 ${flag}」或「拒绝入群 ${flag} 理由」`);
  } else if (request_type === 'friend') {
    const friendCfg = cfg.autoApprove.friend;
    if (friendCfg.enabled && friendCfg.pattern && comment) {
      try {
        if (new RegExp(friendCfg.pattern).test(comment)) {
          await client.setFriendAddRequest(flag, true);
          await notifyOwner(`✅ 已自动同意好友申请\n申请人: ${user_id}\n验证: ${comment}`);
          return;
        }
      } catch {}
    }
    pendingRequests.set(flag, { type: 'friend', userId: user_id, comment, flag, time: Date.now() });
    await notifyOwner(`📋 好友申请待审核\n申请人: ${user_id}\n验证: ${comment || '(空)'}\n\n回复「同意好友 ${flag}」或「拒绝好友 ${flag}」`);
  }
}
