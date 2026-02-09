import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Wifi, WifiOff, Users, MessageSquare, Cpu, Clock } from 'lucide-react';

export default function Dashboard({ ws }: { ws: { events: any[]; napcatStatus: any; clearEvents: () => void } }) {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    api.getStatus().then(r => { if (r.ok) setStatus(r); });
    const t = setInterval(() => { api.getStatus().then(r => { if (r.ok) setStatus(r); }); }, 10000);
    return () => clearInterval(t);
  }, []);

  const nc = status?.napcat || {};
  const oc = status?.openclaw || {};
  const adm = status?.admin || {};

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">仪表盘</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={nc.connected ? Wifi : WifiOff} label="NapCat" value={nc.connected ? `${nc.nickname || 'QQ'} (${nc.selfId})` : '未连接'}
          color={nc.connected ? 'text-emerald-600' : 'text-red-500'} />
        <StatCard icon={Users} label="群/好友" value={`${nc.groupCount || 0} / ${nc.friendCount || 0}`} color="text-blue-600" />
        <StatCard icon={Cpu} label="OpenClaw" value={oc.configured ? (oc.currentModel || '已配置') : '未配置'}
          color={oc.configured ? 'text-emerald-600' : 'text-amber-500'} />
        <StatCard icon={Clock} label="运行时间" value={formatUptime(adm.uptime || 0)} color="text-gray-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">状态详情</h3>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="QQ 插件" value={oc.qqPluginEnabled ? '已启用' : '未启用'} ok={oc.qqPluginEnabled} />
            <Row label="QQ 频道" value={oc.qqChannelEnabled ? '已配置' : '未配置'} ok={oc.qqChannelEnabled} />
            <Row label="AI 模型" value={oc.currentModel || '未设置'} ok={!!oc.currentModel} />
            <Row label="内存" value={`${adm.memoryMB || 0} MB`} ok={true} />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">实时事件</h3>
            <button onClick={ws.clearEvents} className="text-xs text-gray-400 hover:text-gray-600">清空</button>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto text-xs font-mono">
            {ws.events.length === 0 && <p className="text-gray-400">暂无事件</p>}
            {ws.events.slice(-30).reverse().map((ev, i) => (
              <div key={i} className="flex gap-2 text-gray-600 dark:text-gray-400 truncate">
                <span className="text-gray-400 shrink-0">{new Date((ev.time || 0) * 1000).toLocaleTimeString()}</span>
                <span className="badge badge-blue shrink-0">{ev.post_type}</span>
                <span className="truncate">{ev.raw_message || ev.notice_type || ev.request_type || JSON.stringify(ev).slice(0, 80)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <Icon size={20} className={color} />
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-semibold truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{value}</span>
    </div>
  );
}

function formatUptime(s: number) {
  if (s < 60) return `${Math.floor(s)}秒`;
  if (s < 3600) return `${Math.floor(s / 60)}分`;
  if (s < 86400) return `${Math.floor(s / 3600)}时${Math.floor((s % 3600) / 60)}分`;
  return `${Math.floor(s / 86400)}天${Math.floor((s % 86400) / 3600)}时`;
}
