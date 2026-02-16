# ClawPanel v4.2.1 - OpenClaw 连接配置脚本 (Windows PowerShell)
# 配置 QQ (NapCat OneBot11) 通道连接到 ClawPanel 容器

$ErrorActionPreference = "Stop"

$OpenClawDir = if ($env:OPENCLAW_DIR) { $env:OPENCLAW_DIR } else { "$env:USERPROFILE\.openclaw" }
$OpenClawConfig = "$OpenClawDir\openclaw.json"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " ClawPanel v4.2.1 - OpenClaw 连接配置" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $OpenClawConfig)) {
    Write-Host "[错误] 未找到 OpenClaw 配置文件: $OpenClawConfig" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装 OpenClaw："
    Write-Host "  参考 https://openclaw.ai 安装指南"
    Write-Host "  openclaw onboard"
    Write-Host "  openclaw gateway start"
    Write-Host ""
    Write-Host "如果配置文件在其他位置，请设置环境变量后重试："
    Write-Host '  $env:OPENCLAW_DIR="C:\your\path\.openclaw"; .\setup-openclaw.ps1'
    exit 1
}

Write-Host "[信息] 配置文件: $OpenClawConfig"
Write-Host ""

# 询问参数
$OwnerQQ = Read-Host "[输入] 主人 QQ 号（接收通知，留空跳过）"
if (-not $OwnerQQ) { $OwnerQQ = "0" }

$WsPort = Read-Host "[输入] NapCat OneBot WS 端口（默认 3001）"
if (-not $WsPort) { $WsPort = "3001" }

$AccessToken = Read-Host "[输入] NapCat Access Token（留空即可）"
if (-not $AccessToken) { $AccessToken = "" }

Write-Host ""
Write-Host "[1/2] 配置 OpenClaw QQ 通道..."

try {
    # 备份
    $BackupPath = "$OpenClawConfig.bak"
    Copy-Item $OpenClawConfig $BackupPath -Force
    Write-Host "[备份] 已备份到 $BackupPath" -ForegroundColor DarkGray

    $config = Get-Content $OpenClawConfig -Raw | ConvertFrom-Json

    # === channels.qq ===
    if (-not $config.channels) {
        $config | Add-Member -NotePropertyName "channels" -NotePropertyValue ([PSCustomObject]@{}) -Force
    }
    if (-not $config.channels.qq) {
        $config.channels | Add-Member -NotePropertyName "qq" -NotePropertyValue ([PSCustomObject]@{}) -Force
    }
    $config.channels.qq | Add-Member -NotePropertyName "enabled" -NotePropertyValue $true -Force
    $config.channels.qq | Add-Member -NotePropertyName "wsUrl" -NotePropertyValue "ws://127.0.0.1:$WsPort" -Force
    if ($AccessToken) {
        $config.channels.qq | Add-Member -NotePropertyName "accessToken" -NotePropertyValue $AccessToken -Force
    } elseif (-not $config.channels.qq.accessToken) {
        $config.channels.qq | Add-Member -NotePropertyName "accessToken" -NotePropertyValue "" -Force
    }
    if ([int]$OwnerQQ -gt 0) {
        $config.channels.qq | Add-Member -NotePropertyName "ownerQQ" -NotePropertyValue ([int]$OwnerQQ) -Force
    }

    # 默认通知配置（仅在不存在时设置）
    if (-not $config.channels.qq.notifications) {
        $notif = [PSCustomObject]@{
            memberChange = $true; antiRecall = $true; adminChange = $true
            banNotice = $true; pokeReply = $true; honorNotice = $true; fileUpload = $true
        }
        $config.channels.qq | Add-Member -NotePropertyName "notifications" -NotePropertyValue $notif -Force
    }
    if (-not $config.channels.qq.welcome) {
        $welcome = [PSCustomObject]@{ enabled = $true; template = "欢迎 {nickname} 加入本群！" }
        $config.channels.qq | Add-Member -NotePropertyName "welcome" -NotePropertyValue $welcome -Force
    }

    # === plugins.entries.qq ===
    if (-not $config.plugins) {
        $config | Add-Member -NotePropertyName "plugins" -NotePropertyValue ([PSCustomObject]@{}) -Force
    }
    if (-not $config.plugins.entries) {
        $config.plugins | Add-Member -NotePropertyName "entries" -NotePropertyValue ([PSCustomObject]@{}) -Force
    }
    $config.plugins.entries | Add-Member -NotePropertyName "qq" -NotePropertyValue ([PSCustomObject]@{ enabled = $true }) -Force

    # === 清理 OpenClaw 不支持的顶层键 ===
    foreach ($key in @("tools", "session")) {
        if ($config.PSObject.Properties[$key]) {
            $config.PSObject.Properties.Remove($key)
            Write-Host "[清理] 移除不支持的顶层键: $key" -ForegroundColor DarkYellow
        }
    }

    $config | ConvertTo-Json -Depth 10 | Set-Content $OpenClawConfig -Encoding UTF8

    Write-Host ""
    Write-Host "[OK] OpenClaw QQ 通道配置已更新：" -ForegroundColor Green
    Write-Host "  channels.qq.enabled: true"
    Write-Host "  channels.qq.wsUrl: ws://127.0.0.1:$WsPort"
    if ([int]$OwnerQQ -gt 0) {
        Write-Host "  channels.qq.ownerQQ: $OwnerQQ"
    }
    Write-Host "  plugins.entries.qq.enabled: true"
} catch {
    Write-Host "[错误] 配置更新失败: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/2] 重启 OpenClaw 网关..."

$openclawCmd = Get-Command openclaw -ErrorAction SilentlyContinue
if ($openclawCmd) {
    try {
        openclaw gateway restart 2>$null
        Write-Host "[OK] OpenClaw 网关已重启" -ForegroundColor Green
    } catch {
        Write-Host "[提示] 自动重启失败，请手动重启：" -ForegroundColor Yellow
        Write-Host "  openclaw gateway restart"
    }
} else {
    Write-Host "[提示] 未检测到 openclaw 命令，请手动重启 OpenClaw 使配置生效：" -ForegroundColor Yellow
    Write-Host "  openclaw gateway restart"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " 配置完成！" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "接下来："
Write-Host "  1. 访问 ClawPanel: http://你的服务器IP:6199"
Write-Host "  2. 在「通道管理」-> QQ -> 扫码/快速登录"
Write-Host "  3. 在「通道管理」-> 微信 -> 扫码登录（可选）"
Write-Host "  4. 在「通道管理」中启用/配置其他通道（飞书、钉钉、QQ官方Bot 等）"
Write-Host "  5. 用另一个账号给 Bot 发消息，收到 AI 回复即成功"
Write-Host ""
Write-Host "如需配置其他通道（飞书/钉钉/QQ官方Bot/企业微信等），"
Write-Host "请在 ClawPanel 面板的「通道管理」页面中操作。"
Write-Host ""
