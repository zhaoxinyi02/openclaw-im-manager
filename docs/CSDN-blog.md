# OpenClaw QQ Manager v2.0：Docker 一键部署，让你的 QQ 个人号秒变 AI 助手

## 前言

想让你的 QQ 个人号拥有 AI 对话能力？私聊自动回复、群聊 @回复、防撤回、入群欢迎……这些功能只需要一个 Docker 容器就能全部搞定。

**OpenClaw QQ Manager v2.0** 是一个开源项目，将 NapCat（QQ 协议层）、OpenClaw（AI 引擎）和管理后台整合到一个 Docker 容器中，实现真正的一键部署。

**GitHub 地址**：[https://github.com/zhaoxinyi02/openclaw-qq-plugin](https://github.com/zhaoxinyi02/openclaw-qq-plugin)

## v2.0 新特性

相比 v1.0，v2.0 做了大量改进：

| 功能 | v1.0 | v2.0 |
|------|------|------|
| QQ 登录 | 需要单独访问 NapCat WebUI | 管理后台内集成，扫码/快速/账密三种方式 |
| 连接状态 | 不准确 | 实时轮询 + WebSocket 双通道 |
| 登录持久化 | 重启需重新扫码 | Session 持久化到 Docker Volume |
| 网络连通 | Docker 端口映射问题 | 内置 WS 代理，完美解决 |
| 二维码显示 | 依赖外部链接 | 本地 QRCode 库渲染 |
| 管理后台 UI | 基础功能 | 全新 React + TailwindCSS 界面 |

### 你能得到什么？

- QQ 私聊/群聊 AI 自动回复（对接 OpenClaw Agent，支持任意 AI 模型）
- 防撤回、戳一戳回复、入群欢迎、自动审核等个人号功能
- Web 管理后台：QQ 登录、配置 OpenClaw、管理 QQ Bot、审核请求
- 不需要单独安装 NapCat，一个容器全搞定
- QQ 登录 session 持久化，重启不掉线

## 技术架构

```
┌──────────────────────────────────────────────────┐
│                Docker Container                   │
│                                                   │
│  ┌──────────┐   WS :3001   ┌──────────────────┐  │
│  │  NapCat  │◄────────────►│   管理后台后端    │  │
│  │  (QQ)    │              │   (Express)       │  │
│  └──────────┘              │   :6199           │  │
│       ▲                    │   ├─ API 路由     │  │
│       │                    │   ├─ WS 代理      │  │
│       │                    │   └─ React 前端   │  │
│       │                    └────────┬─────────┘  │
│       │                             │             │
│  ┌────┴─────────────────────────────┴──────────┐  │
│  │           /root/.openclaw/ (挂载)           │  │
│  │   openclaw.json + extensions/qq/ 插件       │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
         ▲                            ▲
         │ WS 代理 /onebot            │ HTTP :6199
         │                            │
    OpenClaw Gateway              浏览器访问
    (宿主机 systemd)              管理后台
```

**关键设计**：
- NapCat 作为容器主进程运行（需要 Xvfb 虚拟显示器运行 QQ 桌面客户端）
- 管理后台作为后台进程，通过容器内部 WS 连接 NapCat
- 管理后台提供 `/onebot` WS 代理路径，让宿主机的 OpenClaw 能连接到容器内的 NapCat
- QQ 登录 session 通过 Docker Volume 持久化

## 环境准备

| 组件 | 要求 |
|------|------|
| 系统 | Linux（推荐 Ubuntu 22.04+），2GB+ 内存 |
| Docker | 20.10+ |
| Docker Compose | v2+ |
| OpenClaw | 已安装并运行 |

> **没装 OpenClaw？** 执行以下命令：
> ```bash
> curl -fsSL https://get.openclaw.ai | bash
> openclaw onboard
> openclaw gateway start
> ```

## 快速部署（5 分钟）

### 第一步：克隆项目

```bash
git clone https://github.com/zhaoxinyi02/openclaw-qq-plugin.git
cd openclaw-qq-plugin
```

### 第二步：配置环境变量

```bash
cp .env.example .env
nano .env
```

**必须修改的配置：**

```env
# 管理后台登录密码（请修改！）
ADMIN_TOKEN=your-secure-password

# NapCat WebUI Token（建议与 ADMIN_TOKEN 一致）
WEBUI_TOKEN=your-secure-password

# 你的 QQ 号（接收通知推送）
OWNER_QQ=123456789
```

### 第三步：一键启动

```bash
docker-compose up -d
```

首次启动需要构建镜像，约 2-5 分钟。容器会自动完成：
1. 解压并配置 NapCat
2. 配置 OneBot11 WebSocket
3. 安装 QQ Channel 插件到 OpenClaw extensions
4. 在 openclaw.json 中注册 QQ 频道配置
5. 启动管理后台

### 第四步：扫码登录 QQ

1. 浏览器打开 `http://你的服务器IP:6199`
2. 输入你设置的 `ADMIN_TOKEN` 密码登录
3. 左侧菜单点击 **「QQ 登录」**
4. 手机 QQ 扫描二维码
5. 登录成功后左上角显示 QQ 昵称和号码

### 第五步：配置 OpenClaw 连接

OpenClaw 需要通过管理后台的 WS 代理连接 NapCat：

```bash
python3 -c "
import json
config_path = '$HOME/.openclaw/openclaw.json'
with open(config_path, 'r') as f:
    c = json.load(f)
if 'channels' not in c:
    c['channels'] = {}
if 'qq' not in c['channels']:
    c['channels']['qq'] = {'enabled': True}
c['channels']['qq']['wsUrl'] = 'ws://127.0.0.1:6199/onebot'
c['channels']['qq']['accessToken'] = ''
with open(config_path, 'w') as f:
    json.dump(c, f, indent=4, ensure_ascii=False)
print('OpenClaw QQ 配置已更新')
"

# 重启 OpenClaw 使配置生效
systemctl restart openclaw
```

### 第六步：测试

用另一个 QQ 号给机器人发私聊消息，收到 AI 回复就说明部署成功！

## 核心技术点

### 1. NapCat 登录 API 代理

NapCat WebUI 使用 `sha256(token + ".napcat")` 进行认证。管理后台代理 NapCat 的 HTTP API，实现登录功能集成：

```typescript
// 认证：生成 NapCat 需要的 hash
const hash = crypto.createHash('sha256')
  .update(token + '.napcat').digest('hex');

// 代理请求到容器内 NapCat WebUI
const res = await napcatProxy('POST', '/api/auth/login', { hash });
```

### 2. OneBot WebSocket 代理

NapCat 的 OneBot WS 只监听容器内 `127.0.0.1:3001`，Docker 端口映射无法转发。解决方案是在管理后台的 HTTP 服务器上添加 `/onebot` 路径的 WS 代理：

```typescript
// 客户端连接 ws://host:6199/onebot
// 管理后台在容器内转发到 ws://127.0.0.1:3001
private proxyOneBot(req, socket, head) {
  const upstream = new WebSocket('ws://127.0.0.1:3001');
  upstream.on('open', () => {
    proxyWss.handleUpgrade(req, socket, head, (clientWs) => {
      // 双向转发
      clientWs.on('message', d => upstream.send(d));
      upstream.on('message', d => clientWs.send(d));
    });
  });
}
```

### 3. QR 码本地渲染

NapCat 返回的是 URL 而非图片，使用 `qrcode` 库在前端将 URL 转为二维码：

```typescript
import QRCode from 'qrcode';
const dataUrl = await QRCode.toDataURL(qrcodeUrl, { width: 280, margin: 2 });
```

### 4. Session 持久化

通过 Docker Volume 持久化 QQ 登录数据，重启不掉线：

```yaml
volumes:
  - qq-session:/app/.config/QQ    # QQ 登录 session
  - napcat-data:/app/napcat/config # NapCat 配置
  - manager-data:/app/manager/data # 管理后台配置
```

## 管理后台功能一览

### 仪表盘
- NapCat 连接状态、Bot 昵称、QQ 号
- 群数量、好友数量
- OpenClaw 配置状态、当前 AI 模型
- 实时事件流

### QQ 登录（v2.0 新增）
集成三种登录方式，无需单独访问 NapCat WebUI：
- **扫码登录**：二维码本地渲染，扫码后自动检测登录状态
- **快速登录**：选择已登录过的账号一键登录
- **账密登录**：输入 QQ 号和密码（MD5 在服务端计算，安全可靠）

### OpenClaw 配置
- 在线查看/编辑 openclaw.json
- 快速查看模型、频道、插件状态

### QQ Bot 管理
- 群列表、好友列表
- 在线发送消息（私聊/群聊）
- 重连 NapCat

### 审核中心
- 好友/入群请求列表
- 一键同意/拒绝

### 设置
- 主人 QQ 号
- 防撤回开关
- 戳一戳回复（开关 + 自定义回复列表）
- 入群欢迎（开关 + 模板 + 延迟）
- 自动审核（好友/群，正则规则）
- 通知开关（成员变动、管理员变动、禁言等）

## 常见问题

### Q: 管理后台显示"NapCat 未连接"？
A: QQ 还没登录。去 QQ 登录页面扫码即可。

### Q: 扫码登录后发消息没有 AI 回复？
A: 检查 OpenClaw 是否正确连接：
```bash
journalctl -u openclaw -f
# 应该看到 "[QQ] Connected to OneBot server"
```
如果没有，确认 `openclaw.json` 中 `channels.qq.wsUrl` 为 `ws://127.0.0.1:6199/onebot`。

### Q: 重启容器后需要重新扫码吗？
A: 不需要，QQ 登录 session 已持久化到 Docker Volume。

### Q: 如何更换 AI 模型？
A: 管理后台 → OpenClaw 配置 → 编辑 `agents.defaults.model.primary` 字段。

### Q: 如何更新到新版本？
```bash
cd openclaw-qq-plugin
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Q: 如何查看日志？
```bash
docker logs -f openclaw-qq
```

## 总结

OpenClaw QQ Manager v2.0 实现了真正的一键部署体验：

1. **克隆项目** → 2. **配置密码** → 3. `docker-compose up -d` → 4. **扫码登录** → 5. **开始使用**

整个过程不超过 5 分钟。

核心亮点：
- **零配置**：自动检测 OpenClaw、自动注册 QQ 插件、自动配置频道
- **一键部署**：`docker-compose up -d` 搞定一切
- **功能完整**：AI 对话 + 防撤回 + 戳一戳 + 欢迎 + 审核 + 通知
- **管理方便**：Web 管理后台，在线配置一切
- **稳定可靠**：Session 持久化，WS 代理解决网络问题

如果觉得有用，欢迎 Star ⭐ 支持：[https://github.com/zhaoxinyi02/openclaw-qq-plugin](https://github.com/zhaoxinyi02/openclaw-qq-plugin)
