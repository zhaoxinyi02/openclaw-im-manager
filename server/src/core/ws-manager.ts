import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'openclaw-qq-jwt-2026';

export class WsManager {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();

  constructor(server: http.Server, private onebotWsUrl = 'ws://127.0.0.1:3001') {
    this.wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '', 'http://localhost');

      // Proxy /onebot to NapCat OneBot WS (for external OpenClaw connections)
      if (url.pathname === '/onebot') {
        this.proxyOneBot(req, socket, head);
        return;
      }

      if (url.pathname !== '/ws') return;
      const token = url.searchParams.get('token');
      if (!token) { socket.destroy(); return; }
      try {
        jwt.verify(token, JWT_SECRET);
      } catch { socket.destroy(); return; }
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.clients.add(ws);
        ws.on('close', () => this.clients.delete(ws));
      });
    });
  }

  private proxyOneBot(req: http.IncomingMessage, socket: any, head: Buffer) {
    const upstream = new WebSocket(this.onebotWsUrl);
    let connected = false;

    upstream.on('open', () => {
      connected = true;
      // Forward the original upgrade to a local WSS for the client side
      const proxyWss = new WebSocketServer({ noServer: true });
      proxyWss.handleUpgrade(req, socket, head, (clientWs) => {
        // Relay: client -> upstream
        clientWs.on('message', (data) => {
          if (upstream.readyState === WebSocket.OPEN) upstream.send(data);
        });
        clientWs.on('close', () => upstream.close());

        // Relay: upstream -> client
        upstream.on('message', (data) => {
          if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data);
        });
        upstream.on('close', () => clientWs.close());
      });
    });

    upstream.on('error', () => {
      if (!connected) socket.destroy();
    });
  }

  broadcast(type: string, data: any) {
    const msg = JSON.stringify({ type, data });
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  }

  get clientCount() { return this.clients.size; }
}

export { JWT_SECRET };
