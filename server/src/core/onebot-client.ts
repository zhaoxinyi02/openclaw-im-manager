import WebSocket from 'ws';
import EventEmitter from 'events';

export class OneBotClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private accessToken: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private echoCounter = 0;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  public selfId = 0;
  public nickname = '';
  public connected = false;

  constructor(wsUrl: string, accessToken: string) {
    super();
    this.wsUrl = wsUrl;
    this.accessToken = accessToken;
  }

  connect() {
    if (this.ws) return;
    const headers: Record<string, string> = {};
    if (this.accessToken) headers['Authorization'] = 'Bearer ' + this.accessToken;

    try {
      this.ws = new WebSocket(this.wsUrl, { headers });
    } catch (err) {
      console.error('[NapCat] WS connect error:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      this.connected = true;
      this.emit('connect');
      // Get login info
      this.callApi('get_login_info').then(res => {
        if (res?.data) {
          this.selfId = res.data.user_id || 0;
          this.nickname = res.data.nickname || '';
          this.emit('login', { selfId: this.selfId, nickname: this.nickname });
        }
      }).catch(() => {});
    });

    this.ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.echo) {
          const pending = this.pendingRequests.get(payload.echo);
          if (pending) {
            this.pendingRequests.delete(payload.echo);
            if (payload.status === 'ok') pending.resolve(payload);
            else pending.reject(new Error(payload.message || 'API call failed'));
          }
          return;
        }
        if (payload.post_type === 'meta_event' && payload.meta_event_type === 'heartbeat') return;
        this.emit('event', payload);
      } catch {}
    });

    this.ws.on('close', () => {
      this.connected = false;
      this.ws = null;
      this.emit('disconnect');
      this.scheduleReconnect();
    });

    this.ws.on('error', () => {
      this.ws?.close();
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  async callApi<T = any>(action: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      const echo = 'req_' + (++this.echoCounter) + '_' + Date.now();
      this.pendingRequests.set(echo, { resolve, reject });
      this.ws.send(JSON.stringify({ action, params, echo }));
      setTimeout(() => {
        if (this.pendingRequests.has(echo)) {
          this.pendingRequests.delete(echo);
          reject(new Error('API timeout: ' + action));
        }
      }, 30000);
    });
  }

  async sendPrivateMsg(userId: number, message: any[]) {
    return this.callApi('send_private_msg', { user_id: userId, message });
  }
  async sendGroupMsg(groupId: number, message: any[]) {
    return this.callApi('send_group_msg', { group_id: groupId, message });
  }
  async getFriendList() { return this.callApi('get_friend_list'); }
  async getGroupList() { return this.callApi('get_group_list'); }
  async getStrangerInfo(userId: number) { return this.callApi('get_stranger_info', { user_id: userId }); }
  async setFriendAddRequest(flag: string, approve = true, remark = '') {
    return this.callApi('set_friend_add_request', { flag, approve, remark });
  }
  async setGroupAddRequest(flag: string, subType: string, approve = true, reason = '') {
    return this.callApi('set_group_add_request', { flag, sub_type: subType, approve, reason });
  }
  async getLoginInfo() { return this.callApi('get_login_info'); }

  disconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}
