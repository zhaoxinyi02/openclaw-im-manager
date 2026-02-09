import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Check, X, RefreshCw } from 'lucide-react';

export default function Requests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => { setLoading(true); api.getRequests().then(r => { setRequests(r.requests || []); setLoading(false); }); };
  useEffect(load, []);

  const approve = async (flag: string) => {
    await api.approveRequest(flag);
    load();
  };
  const reject = async (flag: string) => {
    const reason = prompt('拒绝理由（可选）');
    await api.rejectRequest(flag, reason || undefined);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">审核请求</h2>
        <button onClick={load} disabled={loading} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
          <RefreshCw size={14} />刷新
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">暂无待审核请求</div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <div key={req.flag} className="card p-4 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`badge ${req.type === 'group' ? 'badge-blue' : 'badge-green'}`}>
                    {req.type === 'group' ? '入群' : '好友'}
                  </span>
                  <span className="text-sm font-medium">QQ: {req.userId}</span>
                  {req.groupId && <span className="text-xs text-gray-400">群: {req.groupId}</span>}
                </div>
                <p className="text-xs text-gray-500">验证信息: {req.comment || '(空)'}</p>
                <p className="text-xs text-gray-400">{new Date(req.time).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => approve(req.flag)} className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
                  <Check size={16} />
                </button>
                <button onClick={() => reject(req.flag)} className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
