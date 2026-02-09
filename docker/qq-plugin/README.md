
Clawdbot (Moltbot) is a multi-functional agent. The chat demonstration below is only the most basic functionality.
<img width="1324" height="1000" alt="image" src="https://github.com/user-attachments/assets/00b0f347-be84-4fe0-94f2-456679d84f45" />
<img width="1687" height="1043" alt="PixPin_2026-01-29_16-09-58" src="https://github.com/user-attachments/assets/998a1d42-9566-4d20-8467-39dd1752a035" />
<img width="1380" height="710" alt="image" src="https://github.com/user-attachments/assets/9900b779-732a-4b3e-88a1-b10fe7d555c0" />



# Moltbot QQ Plugin (OneBot v11)

This plugin adds QQ channel support to [Moltbot](https://github.com/moltbot/moltbot) using the OneBot v11 protocol (via WebSocket).

---

<details>
<summary><b>English Guide</b></summary>

## 📋 Prerequisites
You need a running OneBot v11 server. We recommend:
- **[NapCat](https://github.com/NapCatQQ/NapCat-Docker)** (Modern, Docker-friendly)
- **Lagrange** or **Go-CQHTTP**

Ensure the **WebSocket Server** is enabled in your OneBot settings (usually on port 3001).

## 🚀 Installation

### Method A: Source / Official Installation
If you installed Moltbot by cloning the repository:

1. **Navigate to extensions folder**:
   ```bash
   cd moltbot/extensions
   ```
2. **Clone this plugin**:
   ```bash
   git clone https://github.com/constansino/moltbot_qq.git qq
   ```
3. **Install dependencies & Build**:
   Go back to the moltbot root directory:
   ```bash
   cd ..
   pnpm install
   pnpm build
   ```
4. **Restart Moltbot**.

### Method B: Docker Installation (Custom Build)
If you are running Moltbot via Docker and building from source:

1. Place the `moltbot_qq` files into your `extensions/qq` folder within your build context.
2. **Rebuild the image**:
   ```bash
   docker compose build clawdbot-gateway
   ```
3. **Restart the container**:
   ```bash
   docker compose up -d clawdbot-gateway
   ```

## ⚙️ Configuration
Edit your `clawdbot.json` (usually in `~/.clawdbot/clawdbot.json`):

```json
{
  "channels": {
    "qq": {
      "wsUrl": "ws://<YOUR_ONEBOT_IP>:3001",
      "accessToken": "your_token_here"
    }
  },
  "plugins": {
    "entries": {
      "qq": {
        "enabled": true
      }
    }
  }
}
```

## 🛠 Troubleshooting
- **502 Gateway Error**: Usually means Moltbot crashed. Check logs: `docker logs -f clawdbot-gateway`.
- **Session Locked**: If the bot crashes, delete `.lock` files in your config directory: `find . -name "*.lock" -delete`.

</details>

---

<details>
<summary><b>中文使用指南</b></summary>

## 📋 前置条件
你需要一个运行中的 OneBot v11 服务端，推荐：
- **[NapCat](https://github.com/NapCatQQ/NapCat-Docker)** (现代、对 Docker 友好)
- **Lagrange** 或 **Go-CQHTTP**

请确保在 OneBot 设置中开启了 **正向 WebSocket 服务**（通常端口为 3001）。

## 🚀 安装步骤

### 方案 A：源码 / 官方安装版
如果你是通过克隆仓库安装的 Moltbot：

1. **进入扩展目录**：
   ```bash
   cd moltbot/extensions
   ```
2. **克隆此插件**：
   ```bash
   git clone https://github.com/constansino/moltbot_qq.git qq
   ```
3. **安装依赖并编译**：
   回到 Moltbot 根目录执行：
   ```bash
   cd ..
   pnpm install
   pnpm build
   ```
4. **重启 Moltbot**。

### 方案 B：Docker 安装（自定义构建）
如果你使用 Docker 且通过 `docker-compose.yml` 中的 `build` 指令运行：

1. 将 `moltbot_qq` 的文件放入构建上下文中的 `extensions/qq` 目录。
2. **重新构建镜像**：
   ```bash
   docker compose build clawdbot-gateway
   ```
3. **重新启动容器**：
   ```bash
   docker compose up -d clawdbot-gateway
   ```

## ⚙️ 配置方法
编辑您的 `clawdbot.json` 配置文件（通常位于 `~/.clawdbot/clawdbot.json`）：

```json
{
  "channels": {
    "qq": {
      "wsUrl": "ws://<ONEBOT_服务器_IP>:3001",
      "accessToken": "你的安全Token"
    }
  },
  "plugins": {
    "entries": {
      "qq": {
        "enabled": true
      }
    }
  }
}
```

## 🛠 常见问题排除
- **502 Gateway Error**：通常表示 Moltbot 崩溃了。请检查日志：`docker logs -f clawdbot-gateway`。
- **Session Locked (会话锁死)**：如果机器人非正常退出，请删除配置目录下的锁文件：`find . -name "*.lock" -delete`。

</details>
