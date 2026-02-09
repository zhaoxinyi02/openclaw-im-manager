# OpenClaw QQ Manager v2.0

> **让你的 QQ 个人号秒变 AI 助手 — Docker 一键部署，扫码即用。**

内嵌 NapCat + 管理后台，一个容器搞定：QQ 个人号接入 → AI 对话 → 群管理 → 可视化后台。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![Version](https://img.shields.io/badge/version-2.0.0-orange.svg)

## 效果预览

- 私聊发消息 → AI 自动回复
- 群里 @机器人 → AI 自动回复
- 管理后台一站式管理所有配置

## 功能特性

### AI 对话
- **私聊自动回复** — 发消息给 QQ 号即可与 AI 对话
- **群聊 @回复** — 群里 @机器人触发 AI 回复
- **多模型支持** — 通过 OpenClaw 配置任意 AI 模型

### QQ 个人号增强
- **防撤回** — 消息撤回时通知主人原始内容
- **戳一戳回复** — 被戳时随机回复，可自定义
- **入群欢迎** — 新成员入群自动发送欢迎消息
- **自动审核** — 好友/入群申请按规则自动通过
- **通知推送** — 群成员变动、管理员变动等事件推送

### 管理后台（Web UI）
- **仪表盘** — 连接状态、群/好友数、实时事件流
- **QQ 登录** — 扫码/快速/账密三种登录方式（无需单独访问 NapCat）
- **OpenClaw 配置** — 在线编辑 AI 模型、频道、插件配置
- **QQ Bot 管理** — 群列表、好友列表、在线发消息
- **审核中心** — 好友/入群请求一键同意/拒绝
- **设置** — 所有 QQ 功能开关可视化配置

### 自动化
- 自动安装 QQ Channel 插件到 OpenClaw
- 自动配置 openclaw.json 中的 QQ 频道
- 自动配置 NapCat OneBot11 WebSocket
- QQ 登录 session 持久化，重启不掉线

## 架构

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

## 快速开始

### 前置条件

- **服务器**：Linux（推荐 Ubuntu 22.04+），2GB+ 内存
- **Docker**：Docker + Docker Compose（[安装指南](https://docs.docker.com/engine/install/)）
- **OpenClaw**：已安装并运行（[OpenClaw 官方文档](https://docs.openclaw.ai)）

> 如果还没安装 OpenClaw，请先执行：
> ```bash
> curl -fsSL https://get.openclaw.ai | bash
> openclaw onboard
> openclaw gateway start
> ```

### 第一步：克隆项目

```bash
git clone https://github.com/zhaoxinyi02/openclaw-qq-plugin.git
cd openclaw-qq-plugin
```

### 第二步：配置环境变量

```bash
cp .env.example .env
nano .env   # 或用你喜欢的编辑器
```

**必须修改的配置：**

```env
# 管理后台登录密码（请修改为你自己的密码）
ADMIN_TOKEN=your-secure-password

# NapCat WebUI Token（建议与 ADMIN_TOKEN 保持一致）
WEBUI_TOKEN=your-secure-password

# 你的 QQ 号（用于接收通知推送）
OWNER_QQ=123456789
```

**可选配置：**

```env
# QQ 账号（填写后支持快速登录，首次建议留空用扫码）
QQ_ACCOUNT=

# NapCat OneBot11 Access Token（一般留空即可）
NAPCAT_TOKEN=
```

### 第三步：一键启动

```bash
docker-compose up -d
```

首次启动需要构建镜像，大约 2-5 分钟。

### 第四步：扫码登录 QQ

1. 打开浏览器访问：`http://你的服务器IP:6199`
2. 输入你设置的 `ADMIN_TOKEN` 密码登录
3. 点击左侧菜单 **「QQ 登录」**
4. 用手机 QQ 扫描二维码
5. 登录成功后左上角显示 QQ 昵称和号码

### 第五步：开始使用

登录成功后，直接用另一个 QQ 号给机器人发私聊消息，即可收到 AI 回复！

### 配置 OpenClaw 连接（重要）

OpenClaw 需要通过管理后台的 WS 代理连接 NapCat。启动容器后执行一键配置脚本：

```bash
bash setup-openclaw.sh
```

脚本会自动：
- 在 `openclaw.json` 中配置 QQ 频道（`wsUrl` 指向 `ws://127.0.0.1:6199/onebot`）
- 启用 QQ 插件
- 重启 OpenClaw 服务

## 端口说明

| 端口 | 用途 | 是否必须开放 |
|------|------|-------------|
| 6199 | 管理后台（Web UI + API + WS 代理） | ✅ 必须 |
| 6099 | NapCat WebUI（备用登录入口） | 可选 |

> 管理后台已集成 QQ 登录功能，通常只需开放 6199 端口即可。

## 目录结构

```
openclaw-qq-plugin/
├── server/                  # 后端（Express + TypeScript）
│   └── src/
│       ├── index.ts         # 入口：启动 HTTP/WS 服务
│       ├── core/
│       │   ├── admin-config.ts     # 管理后台配置
│       │   ├── onebot-client.ts    # OneBot11 WS 客户端
│       │   ├── openclaw-config.ts  # OpenClaw 配置读写
│       │   ├── event-router.ts     # QQ 事件路由（防撤回/欢迎等）
│       │   └── ws-manager.ts       # WS 管理 + OneBot 代理
│       └── routes/index.ts  # API 路由 + NapCat 登录代理
├── web/                     # 前端（React + Vite + TailwindCSS）
│   └── src/
│       ├── pages/           # 仪表盘/QQ登录/设置/审核等页面
│       ├── components/      # Layout/通用组件
│       ├── hooks/           # WebSocket Hook
│       └── lib/api.ts       # API 封装
├── docker/
│   ├── entrypoint.sh        # 容器启动脚本（核心）
│   ├── qq-plugin/           # QQ Channel 插件（自动安装到 OpenClaw）
│   └── onebot11.json        # OneBot11 配置模板
├── docs/
│   └── CSDN-blog.md         # CSDN 博客文章
├── Dockerfile               # Docker 镜像构建
├── docker-compose.yml       # Docker Compose 编排
├── .env.example             # 环境变量模板
├── setup-openclaw.sh        # OpenClaw 连接一键配置脚本
└── README.md
```

## API 接口

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录（body: `{ token }`) |

### 状态
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/status` | 系统状态（NapCat/OpenClaw/内存） |

### OpenClaw 配置
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/openclaw/config` | 获取完整配置 |
| PUT | `/api/openclaw/config` | 更新完整配置 |
| GET | `/api/openclaw/models` | 获取模型配置 |
| PUT | `/api/openclaw/models` | 更新模型配置 |

### Bot 操作
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/bot/groups` | 群列表 |
| GET | `/api/bot/friends` | 好友列表 |
| POST | `/api/bot/send` | 发送消息 |
| POST | `/api/bot/reconnect` | 重连 NapCat |

### QQ 登录（NapCat 代理）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/napcat/login-status` | 登录状态 |
| POST | `/api/napcat/qrcode` | 获取登录二维码 |
| POST | `/api/napcat/quick-login` | 快速登录 |
| POST | `/api/napcat/password-login` | 账密登录 |

### WebSocket
| 路径 | 说明 |
|------|------|
| `/ws?token=JWT` | 管理后台实时事件推送 |
| `/onebot` | OneBot11 WS 代理（供 OpenClaw 连接） |

## 常见问题

### Q: 管理后台显示"NapCat 未连接"？
QQ 还没登录。去 **QQ 登录** 页面扫码登录即可。

### Q: 扫码登录后发消息没有 AI 回复？
检查 OpenClaw 是否正确连接：
```bash
# 查看 OpenClaw 日志
journalctl -u openclaw -f
# 应该看到 "[QQ] Connected to OneBot server"
```
如果没有，请确认 `openclaw.json` 中 `channels.qq.wsUrl` 设置为 `ws://127.0.0.1:6199/onebot`。

### Q: 重启容器后需要重新扫码吗？
不需要。QQ 登录 session 已持久化到 Docker Volume，重启后自动恢复登录状态。

### Q: 如何修改 AI 模型？
在管理后台 → **OpenClaw** 页面，修改 `agents.defaults.model.primary` 字段。

### Q: 如何更新到新版本？
```bash
cd openclaw-qq-plugin
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 更新日志

### v2.0.0 (2025-02-09)
- 全新管理后台 UI（React + TailwindCSS）
- 集成 QQ 登录功能（扫码/快速/账密），无需单独访问 NapCat WebUI
- 内置 OneBot WS 代理，解决 Docker 网络隔离问题
- QQ 登录 session 持久化
- NapCat 连接状态实时显示
- 二维码本地生成渲染

### v1.0.0
- 初始版本：基础管理后台 + NapCat Docker 集成

## License

MIT
