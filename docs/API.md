# API 接口文档

所有接口需要 JWT 认证（除 `/api/auth/login`），请在请求头中添加：
```
Authorization: Bearer <token>
```

## 认证

### POST `/api/auth/login`
登录获取 JWT Token。

**请求体：**
```json
{ "token": "你的 ADMIN_TOKEN" }
```

**响应：**
```json
{ "ok": true, "token": "eyJhbGci..." }
```

## 系统状态

### GET `/api/status`
获取系统整体状态。

**响应：**
```json
{
  "ok": true,
  "napcat": {
    "connected": true,
    "selfId": 123456789,
    "nickname": "Bot",
    "groupCount": 5,
    "friendCount": 20
  },
  "wechat": {
    "connected": true,
    "loggedIn": true,
    "name": "微信昵称"
  },
  "openclaw": {
    "configured": true,
    "qqPluginEnabled": true,
    "qqChannelEnabled": true,
    "currentModel": "openai/gpt-4o"
  },
  "admin": {
    "uptime": 3600,
    "memoryMB": 128
  }
}
```

## QQ 登录（NapCat 代理）

### POST `/api/napcat/login-status`
获取 QQ 登录状态。

### POST `/api/napcat/qrcode`
获取 QQ 登录二维码 URL。

### POST `/api/napcat/qrcode/refresh`
刷新二维码。

### GET `/api/napcat/quick-login-list`
获取可快速登录的 QQ 账号列表。

### POST `/api/napcat/quick-login`
快速登录。

**请求体：**
```json
{ "uin": "QQ号" }
```

### POST `/api/napcat/password-login`
账密登录。

**请求体：**
```json
{ "uin": "QQ号", "password": "密码" }
```

## QQ Bot 操作

### GET `/api/bot/groups`
获取群列表。

### GET `/api/bot/friends`
获取好友列表。

### POST `/api/bot/send`
发送 QQ 消息。

**请求体：**
```json
{
  "type": "private",
  "id": 123456789,
  "message": [{ "type": "text", "data": { "text": "Hello" } }]
}
```

### POST `/api/bot/reconnect`
重连 NapCat OneBot WebSocket。

## 微信

### GET `/api/wechat/status`
获取微信连接和登录状态。

**响应：**
```json
{
  "ok": true,
  "connected": true,
  "loggedIn": true,
  "name": "微信昵称"
}
```

### GET `/api/wechat/login-url`
获取微信扫码登录页面地址。

**响应：**
```json
{
  "ok": true,
  "url": "http://wechat:3001/login?token=xxx"
}
```

### POST `/api/wechat/send`
发送微信文本消息。

**请求体：**
```json
{
  "to": "wxid_xxx 或群名",
  "content": "消息内容",
  "isRoom": false
}
```

### POST `/api/wechat/send-file`
发送微信文件。

**请求体：**
```json
{
  "to": "wxid_xxx",
  "fileUrl": "https://example.com/file.pdf",
  "isRoom": false
}
```

### GET `/api/wechat/config`
获取微信相关配置。

### PUT `/api/wechat/config`
更新微信配置。

**请求体：**
```json
{
  "enabled": true,
  "autoReply": true
}
```

## OpenClaw 配置

### GET `/api/openclaw/config`
获取完整 openclaw.json 配置。

### PUT `/api/openclaw/config`
更新完整配置。

**请求体：**
```json
{ "config": { ... } }
```

### GET `/api/openclaw/models`
获取模型配置。

### PUT `/api/openclaw/models`
更新模型配置。

## 管理配置

### GET `/api/admin/config`
获取管理后台配置（防撤回、戳一戳、欢迎语等）。

### PUT `/api/admin/config`
更新管理后台配置。

### PUT `/api/admin/config/:section`
更新指定配置段（如 `qq`、`wechat`）。

## 审核

### GET `/api/requests`
获取待审核的好友/入群请求列表。

### POST `/api/requests/:flag/approve`
同意请求。

### POST `/api/requests/:flag/reject`
拒绝请求。

**请求体（可选）：**
```json
{ "reason": "拒绝原因" }
```

## WebSocket

### `/ws?token=<JWT>`
管理后台实时事件推送。

**消息类型：**
| type | 说明 |
|------|------|
| `napcat-status` | QQ 连接状态变更 |
| `wechat-status` | 微信连接状态变更 |
| `event` | QQ 事件（消息、通知等） |
| `wechat-event` | 微信事件（消息等） |

### `/onebot`
OneBot11 WebSocket 代理，供宿主机 OpenClaw 连接到容器内 NapCat。
