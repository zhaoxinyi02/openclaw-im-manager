#!/usr/bin/env node
// 完整事件处理链路测试：模拟 channel.ts 的事件路由逻辑
import WebSocket from "ws";

const WS_URL = "ws://127.0.0.1:3001";
const ACCESS_TOKEN = "napcat_openclaw_token";
const OWNER_QQ = 3113058188;
const TEST_GROUP_ID = 879262835;

let requestId = 1;
const pendingRequests = new Map();

// 简易消息缓存（模拟 message-cache.ts）
const messageCache = new Map();

function callApi(ws, action, params = {}) {
  return new Promise((resolve, reject) => {
    const echo = String(requestId++);
    pendingRequests.set(echo, { resolve, reject });
    ws.send(JSON.stringify({ action, params, echo }));
    setTimeout(() => {
      if (pendingRequests.has(echo)) {
        pendingRequests.delete(echo);
        reject(new Error(`Timeout: ${action}`));
      }
    }, 30000);
  });
}

async function notifyOwner(ws, text) {
  try {
    await callApi(ws, "send_private_msg", {
      user_id: OWNER_QQ,
      message: [{ type: "text", data: { text } }],
    });
    console.log(`  📤 已通知主人: ${text.substring(0, 80)}`);
  } catch (e) {
    console.log(`  ❌ 通知主人失败: ${e.message}`);
  }
}

// 模拟事件处理（和我们的 events/ 模块逻辑一致）
async function handleEvent(ws, event) {
  const postType = event.post_type;

  if (postType === "notice") {
    const noticeType = event.notice_type;

    // 群消息撤回 → 防撤回通知
    if (noticeType === "group_recall") {
      const cached = messageCache.get(event.message_id);
      const operatorId = event.operator_id;
      const groupId = event.group_id;
      if (cached) {
        const text = `🔔 防撤回通知\n群: ${groupId}\n操作者: ${operatorId}\n原消息: ${cached.text}`;
        await notifyOwner(ws, text);
      } else {
        await notifyOwner(ws, `🔔 群 ${groupId} 中 ${operatorId} 撤回了一条消息(message_id=${event.message_id})，但缓存中没有原文`);
      }
      return true;
    }

    // 戳一戳
    if (noticeType === "notify" && event.sub_type === "poke") {
      const targetId = event.target_id;
      const selfId = event.self_id;
      if (targetId === selfId) {
        // Bot被戳了，回复
        const replies = ["别戳我啦！🙈", "戳我干嘛~", "你再戳我我就要生气了！😤", "嘿嘿，被你发现了~", "干嘛戳我！💢"];
        const reply = replies[Math.floor(Math.random() * replies.length)];
        const groupId = event.group_id;
        if (groupId) {
          await callApi(ws, "send_group_msg", {
            group_id: groupId,
            message: [{ type: "text", data: { text: reply } }],
          });
          console.log(`  📤 戳一戳回复: ${reply}`);
        }
      }
      return true;
    }

    // 群成员增加
    if (noticeType === "group_increase") {
      const userId = event.user_id;
      const groupId = event.group_id;
      await notifyOwner(ws, `🔔 群 ${groupId} 新成员加入: ${userId}`);
      // 发送欢迎消息
      try {
        // 获取新成员昵称
        const memberRes = await callApi(ws, "get_group_member_info", { group_id: groupId, user_id: userId });
        const nickname = memberRes.data?.nickname || String(userId);
        await callApi(ws, "send_group_msg", {
          group_id: groupId,
          message: [{ type: "text", data: { text: `欢迎 ${nickname} 加入本群！` } }],
        });
        console.log(`  📤 已发送欢迎消息给 ${nickname}`);
      } catch (e) {
        console.log(`  ⚠️ 发送欢迎消息失败: ${e.message}`);
      }
      return true;
    }

    console.log(`  ℹ️ 未处理的 notice: ${noticeType}/${event.sub_type || ""}`);
    return false;
  }

  if (postType === "request") {
    await notifyOwner(ws, `🔔 收到请求: ${event.request_type}/${event.sub_type || ""}\nflag: ${event.flag}\ncomment: ${event.comment || ""}`);
    return true;
  }

  return false;
}

console.log("🔌 连接 NapCat...");
const wsUrl = ACCESS_TOKEN ? `${WS_URL}?access_token=${ACCESS_TOKEN}` : WS_URL;
const ws = new WebSocket(wsUrl);

ws.on("open", async () => {
  console.log("✅ 已连接\n");

  // 通知主人测试开始
  await notifyOwner(ws, "🤖 [完整事件测试] 开始！\n\n请在群里执行以下操作：\n1. 发一条消息然后撤回 → 测试防撤回\n2. 戳一下Bot → 测试戳一戳回复\n\n测试将持续90秒。");

  console.log("\n⏳ 监听90秒，等待你在群里操作...\n");

  setTimeout(() => {
    console.log("\n⏰ 测试结束");
    ws.close();
    process.exit(0);
  }, 90000);
});

ws.on("message", async (data) => {
  try {
    const msg = JSON.parse(data.toString());

    // API响应
    if (msg.echo && pendingRequests.has(msg.echo)) {
      const { resolve } = pendingRequests.get(msg.echo);
      pendingRequests.delete(msg.echo);
      resolve(msg);
      return;
    }

    // 心跳
    if (msg.post_type === "meta_event") return;

    const ts = new Date().toLocaleTimeString();
    console.log(`📨 [${ts}] ${msg.post_type}/${msg.notice_type || msg.message_type || msg.request_type || ""}/${msg.sub_type || ""}`);

    // 缓存群消息
    if (msg.post_type === "message" && msg.message_id && msg.raw_message) {
      messageCache.set(msg.message_id, {
        text: msg.raw_message,
        userId: msg.user_id || 0,
        groupId: msg.group_id,
        time: msg.time,
      });
      console.log(`  💾 已缓存消息: "${msg.raw_message.substring(0, 50)}" (id=${msg.message_id})`);
    }

    // 处理非message事件
    if (msg.post_type !== "message") {
      await handleEvent(ws, msg);
    }
  } catch (e) {
    console.error("处理事件出错:", e.message);
  }
});

ws.on("error", (err) => {
  console.error("❌ 连接失败:", err.message);
  process.exit(1);
});
