#!/usr/bin/env node
// 测试被动事件：监听 NapCat WebSocket 推送的 notice/request 事件
// 同时测试主人通知功能
// 用法: node test-events.mjs

import WebSocket from "ws";

const WS_URL = "ws://127.0.0.1:3001";
const ACCESS_TOKEN = "napcat_openclaw_token";
const OWNER_QQ = 3113058188;
const TEST_GROUP_ID = 879262835;

let ws;
let requestId = 1;
const pendingRequests = new Map();

function callApi(action, params = {}) {
  return new Promise((resolve, reject) => {
    const echo = String(requestId++);
    const payload = { action, params, echo };
    pendingRequests.set(echo, { resolve, reject });
    ws.send(JSON.stringify(payload));
    setTimeout(() => {
      if (pendingRequests.has(echo)) {
        pendingRequests.delete(echo);
        reject(new Error(`Timeout: ${action}`));
      }
    }, 30000);
  });
}

async function sendToOwner(text) {
  try {
    const res = await callApi("send_private_msg", {
      user_id: OWNER_QQ,
      message: [{ type: "text", data: { text } }],
    });
    if (res.retcode === 0) {
      console.log(`✅ 已发送私聊给主人: ${text.substring(0, 60)}`);
    } else {
      console.log(`❌ 发送失败: retcode=${res.retcode} ${res.message || ""}`);
    }
    return res;
  } catch (err) {
    console.log(`❌ 发送异常: ${err.message}`);
    return null;
  }
}

async function runEventTest() {
  console.log("\n🚀 被动事件测试");
  console.log(`   主人QQ: ${OWNER_QQ}`);
  console.log(`   测试群: ${TEST_GROUP_ID}\n`);

  // 测试1: 能否给主人发私聊
  console.log("📦 [测试1] 给主人发私聊消息");
  const r1 = await sendToOwner("🤖 [事件测试] 这是一条测试消息，验证Bot能否给主人发私聊通知。如果你收到了这条消息，说明通知功能正常！");
  if (!r1 || r1.retcode !== 0) {
    console.log("\n❌ 无法给主人发私聊！请确认:");
    console.log("   1. 主人QQ号 3113058188 是否是Bot的好友");
    console.log("   2. 检查好友列表...");
    const friendRes = await callApi("get_friend_list");
    if (friendRes.retcode === 0) {
      const friends = friendRes.data || [];
      const found = friends.find(f => f.user_id === OWNER_QQ);
      if (found) {
        console.log(`   ✓ 主人在好友列表中: ${found.nickname}(${found.user_id})`);
      } else {
        console.log(`   ✗ 主人不在好友列表中！好友列表:`);
        friends.forEach(f => console.log(`     - ${f.nickname}(${f.user_id})`));
        console.log("\n   ⚠️ 主人需要先加Bot为好友才能收到私聊通知");
      }
    }
  }

  // 测试2: 发送群消息然后撤回，模拟防撤回场景
  console.log("\n📦 [测试2] 模拟防撤回：发消息→撤回→通知主人");
  const sendRes = await callApi("send_group_msg", {
    group_id: TEST_GROUP_ID,
    message: [{ type: "text", data: { text: "这是一条即将被撤回的测试消息 🔥" } }],
  });
  if (sendRes.retcode === 0) {
    const msgId = sendRes.data?.message_id;
    console.log(`   已发送消息 message_id: ${msgId}`);
    
    // 等2秒再撤回
    await new Promise(r => setTimeout(r, 2000));
    
    const delRes = await callApi("delete_msg", { message_id: msgId });
    if (delRes.retcode === 0) {
      console.log(`   已撤回消息`);
      console.log(`   ⏳ 等待5秒看是否收到撤回事件...`);
    }
  }

  // 测试3: 监听所有事件并打印
  console.log("\n📦 [测试3] 开始监听所有推送事件（30秒）");
  console.log("   请在这30秒内在群里做以下操作:");
  console.log("   - 发一条消息");
  console.log("   - 撤回一条消息");
  console.log("   - 戳一下Bot");
  console.log("   等待中...\n");

  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 30000);
    let eventCount = 0;

    const originalHandler = ws._events?.message;

    // 临时添加事件监听
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        // 跳过API响应和心跳
        if (msg.echo) return;
        if (msg.post_type === "meta_event") return;

        eventCount++;
        console.log(`   📨 事件 #${eventCount}: post_type=${msg.post_type}`);
        
        if (msg.post_type === "message") {
          console.log(`      类型: ${msg.message_type} | 发送者: ${msg.sender?.nickname}(${msg.user_id})`);
          console.log(`      内容: ${(msg.raw_message || "").substring(0, 80)}`);
        } else if (msg.post_type === "notice") {
          console.log(`      notice_type: ${msg.notice_type} | sub_type: ${msg.sub_type || "无"}`);
          console.log(`      group_id: ${msg.group_id || "无"} | user_id: ${msg.user_id || "无"}`);
          if (msg.notice_type === "group_recall") {
            console.log(`      ✓ 检测到撤回事件! message_id: ${msg.message_id} operator_id: ${msg.operator_id}`);
          }
          if (msg.notice_type === "notify" && msg.sub_type === "poke") {
            console.log(`      ✓ 检测到戳一戳! target_id: ${msg.target_id} sender_id: ${msg.user_id}`);
          }
        } else if (msg.post_type === "request") {
          console.log(`      request_type: ${msg.request_type} | sub_type: ${msg.sub_type || "无"}`);
          console.log(`      flag: ${msg.flag}`);
        }
        console.log(`      完整数据: ${JSON.stringify(msg).substring(0, 200)}`);
        console.log("");
      } catch (e) {}
    });
  });

  console.log("\n⏰ 30秒监听结束");
  console.log("============================================================");
  console.log("📊 测试完成！请检查:");
  console.log("   1. 主人QQ是否收到了私聊测试消息");
  console.log("   2. 上面是否打印了你操作触发的事件");
  console.log("   3. 如果收到了事件，说明NapCat推送正常，");
  console.log("      只需重启OpenClaw Gateway让新配置生效即可");
  console.log("============================================================\n");
}

// 主流程
console.log("🔌 正在连接 NapCat WebSocket...");
const wsUrl = ACCESS_TOKEN ? `${WS_URL}?access_token=${ACCESS_TOKEN}` : WS_URL;
ws = new WebSocket(wsUrl);

ws.on("open", async () => {
  console.log("✅ WebSocket 连接成功！");
  try {
    await runEventTest();
    process.exit(0);
  } catch (err) {
    console.error("💥 测试出错:", err);
    process.exit(1);
  } finally {
    ws.close();
  }
});

ws.on("message", (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.echo && pendingRequests.has(msg.echo)) {
      const { resolve } = pendingRequests.get(msg.echo);
      pendingRequests.delete(msg.echo);
      resolve(msg);
    }
  } catch (e) {}
});

ws.on("error", (err) => {
  console.error("❌ WebSocket 连接失败:", err.message);
  process.exit(1);
});
