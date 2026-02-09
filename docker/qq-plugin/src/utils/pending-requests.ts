// 待审核请求管理 - 存储加群/加好友的待处理请求

export interface PendingRequest {
  type: "group" | "friend";
  subType?: string;       // add / invite (仅group)
  userId?: number;
  groupId?: number;
  flag: string;
  comment?: string;
  time: number;
}

const pending = new Map<string, PendingRequest>();
const EXPIRE_MS = 24 * 60 * 60 * 1000; // 24小时过期

function cleanExpired() {
  const now = Date.now();
  for (const [key, req] of pending) {
    if (now - req.time > EXPIRE_MS) pending.delete(key);
  }
}

export function getPendingRequests() {
  cleanExpired();
  return pending;
}

// 解析主人的审核回复指令
// 格式: "同意入群 <flag>" / "拒绝入群 <flag> [理由]"
//        "同意好友 <flag>" / "拒绝好友 <flag>"
export function parseApprovalCommand(text: string): {
  action: "approve" | "reject";
  type: "group" | "friend";
  flag: string;
  reason?: string;
} | null {
  const trimmed = text.trim();

  // 匹配: 同意入群 xxx / 拒绝入群 xxx 理由 / 同意好友 xxx / 拒绝好友 xxx
  const match = trimmed.match(/^(同意|拒绝)(入群|好友)\s+(\S+)(?:\s+(.+))?$/);
  if (!match) return null;

  return {
    action: match[1] === "同意" ? "approve" : "reject",
    type: match[2] === "入群" ? "group" : "friend",
    flag: match[3],
    reason: match[4],
  };
}
