import fs from 'fs';
import path from 'path';

export interface LogEntry {
  id: string;
  time: number;
  source: 'qq' | 'wechat' | 'system' | 'openclaw';
  type: string;
  summary: string;
  detail?: string;
  raw?: any;
}

const MAX_ENTRIES = 2000;
const MAX_FILE_ENTRIES = 5000;

export class EventLog {
  private entries: LogEntry[] = [];
  private logFile: string;
  private saveTimer: NodeJS.Timeout | null = null;
  public onAdd?: (entry: LogEntry) => void;

  constructor(dataDir: string) {
    this.logFile = path.join(dataDir, 'event-log.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.logFile)) {
        const data = JSON.parse(fs.readFileSync(this.logFile, 'utf-8'));
        this.entries = Array.isArray(data) ? data.slice(-MAX_ENTRIES) : [];
      }
    } catch {
      this.entries = [];
    }
  }

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        const dir = path.dirname(this.logFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const toSave = this.entries.slice(-MAX_FILE_ENTRIES);
        fs.writeFileSync(this.logFile, JSON.stringify(toSave, null, 0));
      } catch (err) {
        console.error('[EventLog] Save error:', err);
      }
    }, 2000);
  }

  add(entry: Omit<LogEntry, 'id'>) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const full: LogEntry = { id, ...entry };
    this.entries.push(full);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
    this.scheduleSave();
    if (this.onAdd) try { this.onAdd(full); } catch {}
    return full;
  }

  addQQEvent(event: any, botSelfId?: number) {
    const { post_type, message_type, notice_type, request_type, raw_message, user_id, group_id, sender } = event;
    let type = post_type || 'unknown';
    let summary = '';
    let detail = '';
    let source: 'qq' | 'openclaw' = 'qq';

    // Detect bot's own sent messages (from reportSelfMessage)
    const isSelfMessage = post_type === 'message_sent' || (post_type === 'message' && botSelfId && user_id === botSelfId);

    if (isSelfMessage) {
      const target = message_type === 'group' ? `群${group_id}` : `私聊${event.target_id || user_id || ''}`;
      const msgText = this.extractMessageText(event);
      summary = `[Bot回复] → ${target}: ${msgText.slice(0, 200)}`;
      type = `outbound.${message_type}`;
      detail = msgText;
      source = 'openclaw';
    } else if (post_type === 'message') {
      const name = sender?.nickname || sender?.card || String(user_id);
      const target = message_type === 'group' ? `群${group_id}` : '私聊';
      summary = `[QQ收信] ${name}(${user_id}) @ ${target}: ${(raw_message || '').slice(0, 200)}`;
      type = `message.${message_type}`;
      detail = raw_message || '';
    } else if (post_type === 'notice') {
      type = `notice.${notice_type}`;
      summary = this.formatNotice(event);
    } else if (post_type === 'request') {
      type = `request.${request_type}`;
      summary = `[QQ请求] ${request_type === 'friend' ? '好友申请' : '入群申请'} from ${user_id}`;
    } else if (post_type === 'meta_event') {
      return null; // skip heartbeat etc.
    } else {
      summary = `[QQ] ${post_type}: ${JSON.stringify(event).slice(0, 150)}`;
    }

    return this.add({ time: (event.time || Math.floor(Date.now() / 1000)) * 1000, source, type, summary, detail: detail || undefined });
  }

  addQQOutbound(action: string, detail: string) {
    return this.add({ time: Date.now(), source: 'openclaw', type: `outbound.${action}`, summary: `[Bot操作] ${detail}` });
  }

  addWeChatEvent(event: any) {
    const { type, content, fromName, isGroup, roomName } = event;
    const target = isGroup ? `群${roomName || ''}` : '私聊';
    const summary = `[微信收信] ${fromName || '?'} @ ${target}: ${(content || '').slice(0, 200)}`;
    return this.add({ time: Date.now(), source: 'wechat', type: `wechat.${type || 'message'}`, summary, detail: content });
  }

  addSystemEvent(summary: string, detail?: string) {
    return this.add({ time: Date.now(), source: 'system', type: 'system', summary: `[系统] ${summary}`, detail });
  }

  addOpenClawEvent(action: string, detail: string) {
    return this.add({ time: Date.now(), source: 'openclaw', type: `openclaw.${action}`, summary: `[OpenClaw] ${detail}` });
  }

  getEntries(opts?: { limit?: number; offset?: number; source?: string; search?: string }): { entries: LogEntry[]; total: number } {
    let filtered = this.entries;
    if (opts?.source) {
      filtered = filtered.filter(e => e.source === opts.source);
    }
    if (opts?.search) {
      const q = opts.search.toLowerCase();
      filtered = filtered.filter(e => e.summary.toLowerCase().includes(q) || (e.detail || '').toLowerCase().includes(q));
    }
    const total = filtered.length;
    const limit = opts?.limit || 100;
    const offset = opts?.offset || 0;
    // Return newest first
    const reversed = [...filtered].reverse();
    return { entries: reversed.slice(offset, offset + limit), total };
  }

  clear() {
    this.entries = [];
    this.scheduleSave();
  }

  private extractMessageText(event: any): string {
    if (event.raw_message) return event.raw_message;
    if (event.message && Array.isArray(event.message)) {
      return event.message.map((seg: any) => {
        if (seg.type === 'text') return seg.data?.text || '';
        if (seg.type === 'image') return '[图片]';
        if (seg.type === 'record') return '[语音]';
        if (seg.type === 'video') return '[视频]';
        if (seg.type === 'at') return `@${seg.data?.qq || ''}`;
        if (seg.type === 'face') return '[表情]';
        if (seg.type === 'file') return `[文件:${seg.data?.name || ''}]`;
        return `[${seg.type}]`;
      }).join('');
    }
    return '';
  }

  private formatNotice(event: any): string {
    const { notice_type, sub_type, user_id, group_id, operator_id, target_id } = event;
    switch (notice_type) {
      case 'group_increase': return `[QQ通知] ${user_id} 加入群 ${group_id}`;
      case 'group_decrease': return `[QQ通知] ${user_id} 离开群 ${group_id} (${sub_type})`;
      case 'group_recall': return `[QQ通知] 群 ${group_id} 消息撤回 by ${operator_id}`;
      case 'friend_recall': return `[QQ通知] 好友 ${user_id} 撤回消息`;
      case 'group_admin': return `[QQ通知] 群 ${group_id}: ${user_id} ${sub_type === 'set' ? '成为管理员' : '取消管理员'}`;
      case 'group_ban': return `[QQ通知] 群 ${group_id}: ${user_id} 被 ${operator_id} ${sub_type === 'ban' ? '禁言' : '解禁'}`;
      case 'notify':
        if (sub_type === 'poke') return `[QQ通知] ${user_id} 戳了 ${target_id}`;
        if (sub_type === 'honor') return `[QQ通知] 群 ${group_id} 荣誉变更`;
        return `[QQ通知] ${sub_type}`;
      default: return `[QQ通知] ${notice_type}.${sub_type || ''} in ${group_id || 'private'}`;
    }
  }
}
