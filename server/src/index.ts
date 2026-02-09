import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { AdminConfig } from './core/admin-config.js';
import { OneBotClient } from './core/onebot-client.js';
import { OpenClawConfig } from './core/openclaw-config.js';
import { WsManager } from './core/ws-manager.js';
import { createEventRouter } from './core/event-router.js';
import { createRoutes } from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('[System] OpenClaw QQ Manager 启动中...');

  // Load configs
  const adminConfig = new AdminConfig();
  const cfg = adminConfig.get();
  const openclawConfig = new OpenClawConfig(cfg.openclaw.configPath || undefined);

  // Auto-setup OpenClaw config
  if (cfg.openclaw.autoSetup) {
    openclawConfig.autoSetup(cfg.napcat.wsUrl, cfg.napcat.accessToken, cfg.qq.ownerQQ);
  }

  // Create OneBot client (connects to NapCat in the same container)
  const onebotClient = new OneBotClient(cfg.napcat.wsUrl, cfg.napcat.accessToken);

  // Create event router for QQ features
  const eventRouter = createEventRouter(onebotClient, cfg.qq);

  // Express app
  const app = express();
  app.use(express.json());

  // API routes
  const routes = createRoutes(adminConfig, onebotClient, openclawConfig);
  app.use('/api', routes);

  // Serve frontend
  const webDistPath = path.resolve(__dirname, '../../web/dist');
  app.use(express.static(webDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });

  // HTTP + WebSocket server
  const server = http.createServer(app);
  const wsManager = new WsManager(server);

  // Connect to NapCat
  onebotClient.connect();

  onebotClient.on('connect', () => {
    console.log('[NapCat] 已连接 OneBot11 WebSocket');
    wsManager.broadcast('napcat-status', { connected: true, selfId: onebotClient.selfId, nickname: onebotClient.nickname });
  });

  onebotClient.on('login', (info: any) => {
    console.log(`[NapCat] Bot 登录: ${info.nickname}(${info.selfId})`);
    wsManager.broadcast('napcat-status', { connected: true, ...info });
  });

  onebotClient.on('disconnect', () => {
    console.log('[NapCat] 连接断开，5秒后重连...');
    wsManager.broadcast('napcat-status', { connected: false });
  });

  // Route events
  onebotClient.on('event', (event: any) => {
    eventRouter(event);
    wsManager.broadcast('event', event);
  });

  // Start server
  server.listen(cfg.server.port, cfg.server.host, () => {
    console.log(`[System] 管理后台已启动: http://${cfg.server.host}:${cfg.server.port}`);
    console.log(`[System] NapCat WebSocket: ${cfg.napcat.wsUrl}`);
    console.log(`[System] OpenClaw 配置: ${cfg.openclaw.configPath}`);
  });
}

main().catch(err => {
  console.error('[System] 启动失败:', err);
  process.exit(1);
});
