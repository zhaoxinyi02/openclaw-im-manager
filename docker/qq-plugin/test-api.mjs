#!/usr/bin/env node
// 独立测试脚本：直接通过 WebSocket 调用 NapCat OneBot v11 API
// 用法: node test-api.mjs

import WebSocket from "ws";

const WS_URL = "ws://127.0.0.1:3001";
const ACCESS_TOKEN = "napcat_openclaw_token";
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

function log(label, data) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📋 ${label}`);
  console.log("=".repeat(60));
  console.log(JSON.stringify(data, null, 2));
}

function pass(label) {
  console.log(`  ✅ ${label}`);
}

function fail(label, err) {
  console.log(`  ❌ ${label}: ${err}`);
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  let total = 0;

  async function test(label, fn) {
    total++;
    try {
      await fn();
      pass(label);
      passed++;
    } catch (err) {
      fail(label, err.message || err);
      failed++;
    }
  }

  console.log("\n🚀 开始 NapCat OneBot v11 API 测试");
  console.log(`   WebSocket: ${WS_URL}`);
  console.log(`   测试群号: ${TEST_GROUP_ID}`);
  console.log("");

  // ==================== 1. 基础连接测试 ====================
  console.log("\n📦 [1/7] 基础连接测试");

  let selfId;
  await test("get_login_info - 获取登录信息", async () => {
    const res = await callApi("get_login_info");
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode} ${res.message || ""}`);
    selfId = res.data?.user_id;
    log("登录信息", res.data);
    if (!selfId) throw new Error("未获取到 user_id");
  });

  await test("get_version_info - 获取版本信息", async () => {
    const res = await callApi("get_version_info");
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    log("版本信息", res.data);
  });

  await test("get_status - 获取运行状态", async () => {
    const res = await callApi("get_status");
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    log("运行状态", res.data);
  });

  // ==================== 2. 好友相关 ====================
  console.log("\n📦 [2/7] 好友/联系人查询");

  await test("get_friend_list - 获取好友列表", async () => {
    const res = await callApi("get_friend_list");
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    const count = Array.isArray(res.data) ? res.data.length : 0;
    console.log(`      好友数量: ${count}`);
    if (count > 0) {
      console.log(`      前3个: ${res.data.slice(0, 3).map(f => `${f.nickname}(${f.user_id})`).join(", ")}`);
    }
  });

  await test("get_stranger_info - 获取陌生人信息(自己)", async () => {
    if (!selfId) throw new Error("无 selfId");
    const res = await callApi("get_stranger_info", { user_id: selfId });
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    log("自身信息", res.data);
  });

  // ==================== 3. 群相关查询 ====================
  console.log("\n📦 [3/7] 群相关查询");

  await test("get_group_list - 获取群列表", async () => {
    const res = await callApi("get_group_list");
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    const count = Array.isArray(res.data) ? res.data.length : 0;
    console.log(`      群数量: ${count}`);
    if (count > 0) {
      for (const g of res.data) {
        console.log(`      - ${g.group_name}(${g.group_id}) 成员:${g.member_count}`);
      }
    }
    // 检查测试群是否在列表中
    const found = res.data?.find(g => g.group_id === TEST_GROUP_ID);
    if (!found) {
      console.log(`      ⚠️  测试群 ${TEST_GROUP_ID} 不在群列表中`);
    } else {
      console.log(`      ✓ 找到测试群: ${found.group_name}`);
    }
  });

  await test("get_group_info - 获取测试群信息", async () => {
    const res = await callApi("get_group_info", { group_id: TEST_GROUP_ID });
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode} ${res.message || ""}`);
    log("测试群信息", res.data);
  });

  await test("get_group_member_list - 获取测试群成员列表", async () => {
    const res = await callApi("get_group_member_list", { group_id: TEST_GROUP_ID });
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    const count = Array.isArray(res.data) ? res.data.length : 0;
    console.log(`      成员数量: ${count}`);
    if (count > 0) {
      for (const m of res.data.slice(0, 5)) {
        console.log(`      - ${m.nickname}(${m.user_id}) role:${m.role} card:${m.card || "(无)"}`);
      }
    }
  });

  await test("get_group_member_info - 获取自己在群中的信息", async () => {
    if (!selfId) throw new Error("无 selfId");
    const res = await callApi("get_group_member_info", { group_id: TEST_GROUP_ID, user_id: selfId });
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    log("自己在群中的信息", res.data);
  });

  // ==================== 4. 消息发送测试 ====================
  console.log("\n📦 [4/7] 消息发送测试");

  let testMsgId;
  await test("send_group_msg - 发送群消息", async () => {
    const res = await callApi("send_group_msg", {
      group_id: TEST_GROUP_ID,
      message: [{ type: "text", data: { text: "🤖 [API测试] 这是一条自动化测试消息，请忽略。" } }],
    });
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode} ${res.message || ""}`);
    testMsgId = res.data?.message_id;
    console.log(`      message_id: ${testMsgId}`);
  });

  await test("get_msg - 获取刚发送的消息", async () => {
    if (!testMsgId) throw new Error("无 testMsgId");
    const res = await callApi("get_msg", { message_id: testMsgId });
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    log("获取到的消息", { message_id: res.data?.message_id, raw_message: res.data?.raw_message });
  });

  // 发送私聊消息给自己（可能不支持）
  await test("send_private_msg - 发送私聊消息(给自己)", async () => {
    if (!selfId) throw new Error("无 selfId");
    try {
      const res = await callApi("send_private_msg", {
        user_id: selfId,
        message: [{ type: "text", data: { text: "🤖 [API测试] 私聊测试" } }],
      });
      if (res.retcode !== 0) {
        console.log(`      ⚠️ 给自己发私聊可能不支持: retcode=${res.retcode}`);
        // 不算失败
      } else {
        console.log(`      message_id: ${res.data?.message_id}`);
      }
    } catch (e) {
      console.log(`      ⚠️ 给自己发私聊不支持，这是正常的`);
    }
  });

  // ==================== 5. 消息撤回测试 ====================
  console.log("\n📦 [5/7] 消息撤回测试");

  await test("delete_msg - 撤回刚发送的消息", async () => {
    if (!testMsgId) throw new Error("无 testMsgId");
    const res = await callApi("delete_msg", { message_id: testMsgId });
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    console.log(`      已撤回 message_id: ${testMsgId}`);
  });

  // ==================== 6. 扩展接口测试 ====================
  console.log("\n📦 [6/7] NapCat 扩展接口测试");

  await test("get_group_msg_history - 获取群历史消息", async () => {
    const res = await callApi("get_group_msg_history", { group_id: TEST_GROUP_ID, count: 5 });
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    const msgs = res.data?.messages || [];
    console.log(`      获取到 ${msgs.length} 条历史消息`);
    if (msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      console.log(`      最新一条: [${last.sender?.nickname}] ${(last.raw_message || "").substring(0, 50)}`);
    }
  });

  await test("get_recent_contact - 获取最近联系人", async () => {
    const res = await callApi("get_recent_contact", { count: 5 });
    // 某些版本可能不支持
    if (res.retcode !== 0) {
      console.log(`      ⚠️ 可能不支持: retcode=${res.retcode}`);
    } else {
      const count = Array.isArray(res.data) ? res.data.length : 0;
      console.log(`      最近联系人数: ${count}`);
    }
  });

  await test("get_group_honor_info - 获取群荣誉", async () => {
    const res = await callApi("get_group_honor_info", { group_id: TEST_GROUP_ID, type: "all" });
    if (res.retcode !== 0) {
      console.log(`      ⚠️ 可能不支持: retcode=${res.retcode}`);
    } else {
      log("群荣誉", res.data);
    }
  });

  await test("get_group_notice - 获取群公告", async () => {
    const res = await callApi("_get_group_notice", { group_id: TEST_GROUP_ID });
    if (res.retcode !== 0) {
      console.log(`      ⚠️ retcode=${res.retcode} (新群可能无公告)`);
    } else {
      const count = Array.isArray(res.data) ? res.data.length : 0;
      console.log(`      群公告数: ${count}`);
    }
  });

  await test("get_group_root_files - 获取群文件根目录", async () => {
    const res = await callApi("get_group_root_files", { group_id: TEST_GROUP_ID });
    if (res.retcode !== 0) {
      console.log(`      ⚠️ retcode=${res.retcode}`);
    } else {
      const files = res.data?.files || [];
      const folders = res.data?.folders || [];
      console.log(`      文件: ${files.length}, 文件夹: ${folders.length}`);
    }
  });

  await test("ArkSharePeer - 分享群卡片(获取ark)", async () => {
    const res = await callApi("ArkSharePeer", { group_id: String(TEST_GROUP_ID) });
    if (res.retcode !== 0) {
      console.log(`      ⚠️ retcode=${res.retcode} (可能不支持)`);
    } else {
      console.log(`      arkMsg 长度: ${(res.data?.arkMsg || "").length}`);
    }
  });

  // ==================== 7. 群管理测试（安全操作） ====================
  console.log("\n📦 [7/7] 群管理接口测试（安全操作）");

  await test("set_group_name - 设置群名(改回原名)", async () => {
    // 先获取当前群名
    const infoRes = await callApi("get_group_info", { group_id: TEST_GROUP_ID });
    const originalName = infoRes.data?.group_name || "测试群";
    console.log(`      当前群名: ${originalName}`);

    // 改名
    const res = await callApi("set_group_name", { group_id: TEST_GROUP_ID, group_name: originalName + " ✓" });
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    console.log(`      已改名为: ${originalName} ✓`);

    // 改回
    await callApi("set_group_name", { group_id: TEST_GROUP_ID, group_name: originalName });
    console.log(`      已恢复群名: ${originalName}`);
  });

  await test("set_group_card - 设置自己的群名片", async () => {
    if (!selfId) throw new Error("无 selfId");
    const res = await callApi("set_group_card", {
      group_id: TEST_GROUP_ID,
      user_id: selfId,
      card: "🤖 API测试Bot",
    });
    if (res.retcode !== 0) throw new Error(`retcode=${res.retcode}`);
    console.log(`      已设置群名片: 🤖 API测试Bot`);

    // 恢复
    await callApi("set_group_card", { group_id: TEST_GROUP_ID, user_id: selfId, card: "" });
    console.log(`      已清除群名片`);
  });

  await test("group_sign - 群签到/打卡", async () => {
    const res = await callApi("set_group_sign", { group_id: TEST_GROUP_ID });
    if (res.retcode !== 0) {
      console.log(`      ⚠️ retcode=${res.retcode} (可能已签到或不支持)`);
    } else {
      console.log(`      签到成功`);
    }
  });

  // ==================== 汇总 ====================
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 测试结果汇总`);
  console.log(`${"=".repeat(60)}`);
  console.log(`   总计: ${total}`);
  console.log(`   ✅ 通过: ${passed}`);
  console.log(`   ❌ 失败: ${failed}`);
  console.log(`   通过率: ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`${"=".repeat(60)}\n`);

  return failed === 0;
}

// 主流程
console.log("🔌 正在连接 NapCat WebSocket...");

const wsUrl = ACCESS_TOKEN ? `${WS_URL}?access_token=${ACCESS_TOKEN}` : WS_URL;
ws = new WebSocket(wsUrl);

ws.on("open", async () => {
  console.log("✅ WebSocket 连接成功！\n");
  try {
    const allPassed = await runTests();
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error("💥 测试过程出错:", err);
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
  } catch (e) {
    // ignore non-JSON
  }
});

ws.on("error", (err) => {
  console.error("❌ WebSocket 连接失败:", err.message);
  console.error("   请确认 NapCat 是否在运行，以及 ws://127.0.0.1:3001 是否正确");
  process.exit(1);
});

ws.on("close", () => {
  console.log("🔌 WebSocket 已断开");
});
