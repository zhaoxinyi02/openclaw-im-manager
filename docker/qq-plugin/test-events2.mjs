#!/usr/bin/env node
// 精确事件推送测试：先监听，再触发
import WebSocket from "ws";

const WS_URL = "ws://127.0.0.1:3001";
const ACCESS_TOKEN = "napcat_openclaw_token";
const OWNER_QQ = 3113058188;
const TEST_GROUP_ID = 879262835;

let requestId = 1;
const pendingRequests = new Map();
const events = [];

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

console.log("🔌 连接 NapCat WebSocket...");
const wsUrl = ACCESS_TOKEN ? `${WS_URL}?access_token=${ACCESS_TOKEN}` : WS_URL;
const ws = new WebSocket(wsUrl);

ws.on("open", async () => {
  console.log("✅ 已连接\n");

  // 立即开始监听所有事件
  console.log("👂 开始监听所有推送事件...");
  console.log("   等待3秒让连接稳定...\n");
  await new Promise(r => setTimeout(r, 3000));

  // 先测试给主人发消息
  console.log("📤 测试1: 给主人(3113058188)发私聊...");
  try {
    const r = await callApi(ws, "send_private_msg", {
      user_id: OWNER_QQ,
      message: [{ type: "text", data: { text: "🤖 事件推送测试：如果你收到这条消息，请在群里发一条消息，然后撤回它，再戳一下Bot。" } }],
    });
    console.log(`   结果: retcode=${r.retcode} message_id=${r.data?.message_id || "无"}\n`);
  } catch (e) {
    console.log(`   失败: ${e.message}\n`);
  }

  // 自己发一条群消息并撤回，测试自身撤回事件
  console.log("📤 测试2: Bot自己发群消息并撤回...");
  try {
    const sendRes = await callApi(ws, "send_group_msg", {
      group_id: TEST_GROUP_ID,
      message: [{ type: "text", data: { text: "🔥 这条消息将在3秒后被撤回" } }],
    });
    const msgId = sendRes.data?.message_id;
    console.log(`   已发送 message_id=${msgId}`);
    
    await new Promise(r => setTimeout(r, 3000));
    
    await callApi(ws, "delete_msg", { message_id: msgId });
    console.log(`   已撤回\n`);
  } catch (e) {
    console.log(`   失败: ${e.message}\n`);
  }

  // 等待60秒收集事件
  console.log("⏳ 等待60秒收集推送事件...");
  console.log("   请在群里操作（发消息/撤回/戳Bot）\n");
  
  await new Promise(r => setTimeout(r, 60000));

  console.log("\n" + "=".repeat(60));
  console.log(`📊 共收到 ${events.length} 个推送事件:`);
  console.log("=".repeat(60));
  
  if (events.length === 0) {
    console.log("\n❌ 没有收到任何推送事件！");
    console.log("   可能的原因:");
    console.log("   1. NapCat WebSocket Server 的事件推送有问题");
    console.log("   2. 需要检查 NapCat Docker 容器日志");
    console.log("   3. reportSelfMessage=false 导致自身操作不推送\n");
    console.log("   建议: 检查 NapCat 日志:");
    console.log("   docker logs napcat --tail 50\n");
  } else {
    events.forEach((e, i) => {
      console.log(`\n--- 事件 #${i + 1} ---`);
      console.log(JSON.stringify(e, null, 2));
    });
  }

  ws.close();
  process.exit(0);
});

ws.on("message", (data) => {
  try {
    const msg = JSON.parse(data.toString());
    
    // 处理API响应
    if (msg.echo && pendingRequests.has(msg.echo)) {
      const { resolve } = pendingRequests.get(msg.echo);
      pendingRequests.delete(msg.echo);
      resolve(msg);
      return;
    }
    
    // 跳过心跳
    if (msg.post_type === "meta_event") return;
    
    // 记录所有非心跳事件
    const ts = new Date().toLocaleTimeString();
    console.log(`   📨 [${ts}] post_type=${msg.post_type} | ${msg.notice_type || msg.message_type || msg.request_type || ""} | sub=${msg.sub_type || ""}`);
    events.push(msg);
  } catch (e) {}
});

ws.on("error", (err) => {
  console.error("❌ 连接失败:", err.message);
  process.exit(1);
});
