#!/bin/bash
# ClawPanel v4.2.1 - OpenClaw 连接配置脚本
# 配置 QQ (NapCat OneBot11) 通道连接到 ClawPanel 容器
# 兼容 Linux / macOS

set -e

OPENCLAW_CONFIG="${OPENCLAW_DIR:-${HOME}/.openclaw}/openclaw.json"

echo "=========================================="
echo " ClawPanel v4.2.1 - OpenClaw 连接配置"
echo "=========================================="
echo ""

# 检查 OpenClaw 配置文件
if [ ! -f "${OPENCLAW_CONFIG}" ]; then
    echo "[错误] 未找到 OpenClaw 配置文件: ${OPENCLAW_CONFIG}"
    echo ""
    echo "请先安装 OpenClaw："
    echo "  curl -fsSL https://get.openclaw.ai | bash"
    echo "  openclaw onboard"
    echo "  openclaw gateway start"
    echo ""
    echo "如果配置文件在其他位置，请设置环境变量后重试："
    echo "  OPENCLAW_DIR=/your/path/.openclaw ./setup-openclaw.sh"
    exit 1
fi

echo "[信息] 配置文件: ${OPENCLAW_CONFIG}"
echo ""

# 询问主人 QQ 号
read -p "[输入] 主人 QQ 号（接收通知，留空跳过）: " OWNER_QQ
OWNER_QQ="${OWNER_QQ:-0}"

# 询问 NapCat OneBot WS 端口（默认 3001）
read -p "[输入] NapCat OneBot WS 端口（默认 3001）: " WS_PORT
WS_PORT="${WS_PORT:-3001}"

# 询问 NapCat Access Token（默认为空）
read -p "[输入] NapCat Access Token（留空即可）: " ACCESS_TOKEN
ACCESS_TOKEN="${ACCESS_TOKEN:-}"

echo ""
echo "[1/2] 配置 OpenClaw QQ 通道..."

python3 -c "
import json, sys, os, shutil

config_path = '${OPENCLAW_CONFIG}'
owner_qq = ${OWNER_QQ}
ws_port = '${WS_PORT}'
access_token = '${ACCESS_TOKEN}'

try:
    with open(config_path, 'r') as f:
        c = json.load(f)
except Exception as e:
    print(f'[错误] 读取配置失败: {e}')
    sys.exit(1)

# 备份原始配置
backup_path = config_path + '.bak'
shutil.copy2(config_path, backup_path)
print(f'[备份] 已备份到 {backup_path}')

# === channels.qq ===
if 'channels' not in c:
    c['channels'] = {}
if 'qq' not in c['channels']:
    c['channels']['qq'] = {}

qq = c['channels']['qq']
qq['enabled'] = True
qq['wsUrl'] = f'ws://127.0.0.1:{ws_port}'
if access_token:
    qq['accessToken'] = access_token
elif 'accessToken' not in qq:
    qq['accessToken'] = ''
if owner_qq > 0:
    qq['ownerQQ'] = owner_qq

# 保留用户已有的通知/欢迎等配置，仅设置默认值
if 'notifications' not in qq:
    qq['notifications'] = {
        'memberChange': True,
        'antiRecall': True,
        'adminChange': True,
        'banNotice': True,
        'pokeReply': True,
        'honorNotice': True,
        'fileUpload': True,
    }
if 'welcome' not in qq:
    qq['welcome'] = {'enabled': True, 'template': '欢迎 {nickname} 加入本群！'}

# === plugins.entries.qq ===
if 'plugins' not in c:
    c['plugins'] = {}
if 'entries' not in c['plugins']:
    c['plugins']['entries'] = {}
if 'qq' not in c['plugins']['entries']:
    c['plugins']['entries']['qq'] = {}
c['plugins']['entries']['qq']['enabled'] = True

# === 清理 OpenClaw 不支持的顶层键 ===
for key in ['tools', 'session']:
    if key in c:
        del c[key]
        print(f'[清理] 移除不支持的顶层键: {key}')

# 清理 cron.jobs（应在 cron/jobs.json 中）
if 'cron' in c and 'jobs' in c.get('cron', {}):
    del c['cron']['jobs']
    if not c['cron']:
        del c['cron']
    print('[清理] 移除 cron.jobs（应在 cron/jobs.json 中）')

with open(config_path, 'w') as f:
    json.dump(c, f, indent=4, ensure_ascii=False)

print('')
print('[OK] OpenClaw QQ 通道配置已更新：')
print(f'  channels.qq.enabled: true')
print(f'  channels.qq.wsUrl: ws://127.0.0.1:{ws_port}')
if owner_qq > 0:
    print(f'  channels.qq.ownerQQ: {owner_qq}')
print(f'  plugins.entries.qq.enabled: true')
"

echo ""
echo "[2/2] 重启 OpenClaw 网关..."

if systemctl is-active --quiet openclaw 2>/dev/null; then
    systemctl restart openclaw
    echo "[OK] OpenClaw 服务已重启 (systemctl)"
elif command -v openclaw &>/dev/null; then
    openclaw gateway restart 2>/dev/null && echo "[OK] OpenClaw 网关已重启" || {
        echo "[提示] 自动重启失败，请手动重启："
        echo "  openclaw gateway restart"
    }
else
    echo "[提示] 未检测到 openclaw 命令，请手动重启 OpenClaw 使配置生效："
    echo "  openclaw gateway restart"
fi

echo ""
echo "=========================================="
echo " 配置完成！"
echo "=========================================="
echo ""
echo "接下来："
echo "  1. 访问 ClawPanel: http://你的服务器IP:6199"
echo "  2. 在「通道管理」→ QQ → 扫码/快速登录"
echo "  3. 在「通道管理」→ 微信 → 扫码登录（可选）"
echo "  4. 在「通道管理」中启用/配置其他通道（飞书、钉钉、QQ官方Bot 等）"
echo "  5. 用另一个账号给 Bot 发消息，收到 AI 回复即成功"
echo ""
echo "如需配置其他通道（飞书/钉钉/QQ官方Bot/企业微信等），"
echo "请在 ClawPanel 面板的「通道管理」页面中操作。"
echo ""
