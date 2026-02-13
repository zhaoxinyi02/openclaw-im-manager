import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { Wifi, WifiOff, Users, MessageCircle, Cpu, Clock, RefreshCw, Search, ChevronDown, ChevronRight, Trash2, ArrowDown } from 'lucide-react';
import type { LogEntry } from '../hooks/useWebSocket';

interface DashboardProps {
  ws: {
    events: any[];
    logEntries: LogEntry[];
    napcatStatus: any;
    wechatStatus: any;
    clearEvents: () => void;
    refreshLog: () => void;
  };
}

export default function Dashboard({ ws }: DashboardProps) {
  const [status, setStatus] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getStatus().then(r => { if (r.ok) setStatus(r); });
    const t = setInterval(() => { api.getStatus().then(r => { if (r.ok) setStatus(r); }); }, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [ws.logEntries.length, autoScroll]);

  const nc = status?.napcat || {};
  const wc = status?.wechat || {};
  const oc = status?.openclaw || {};
  const adm = status?.admin || {};

  const filteredLog = ws.logEntries.filter(e => {
    if (sourceFilter && e.source !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.summary.toLowerCase().includes(q) || (e.detail || '').toLowerCase().includes(q);
    }
    return true;
  });

  const sourceCounts = ws.logEntries.reduce((acc, e) => {
    acc[e.source] = (acc[e.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Status cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 shrink-0">
        <StatCard icon={nc.connected ? Wifi : WifiOff} label="QQ (NapCat)" value={nc.connected ? `${nc.nickname || 'QQ'}` : '未连接'}
          sub={nc.connected ? `${nc.selfId}` : ''} color={nc.connected ? 'text-emerald-600' : 'text-red-500'} />
        <StatCard icon={MessageCircle} label="微信" value={wc.loggedIn ? (wc.name || '已登录') : (wc.connected ? '未登录' : '未连接')}
          color={wc.loggedIn ? 'text-emerald-600' : wc.connected ? 'text-amber-500' : 'text-red-500'} />
        <StatCard icon={Users} label="QQ 群/好友" value={`${nc.groupCount || 0} / ${nc.friendCount || 0}`} color="text-blue-600" />
        <StatCard icon={Cpu} label="AI 模型" value={oc.currentModel || '未设置'}
          color={oc.configured ? 'text-emerald-600' : 'text-amber-500'} />
        <StatCard icon={Clock} label="运行时间" value={formatUptime(adm.uptime || 0)} color="text-gray-600" />
        <StatCard icon={Cpu} label="内存" value={`${adm.memoryMB || 0} MB`} color="text-gray-600" />
      </div>

      {/* Activity log - takes remaining space */}
      <div className="card flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm">活动日志</h3>
            <span className="text-[10px] text-gray-400 tabular-nums">{filteredLog.length} 条{sourceFilter ? ` (${sourceLabel(sourceFilter)})` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setAutoScroll(!autoScroll)}
              className={`p-1.5 rounded transition-colors ${autoScroll ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              title={autoScroll ? '自动滚动: 开' : '自动滚动: 关'}>
              <ArrowDown size={13} />
            </button>
            <button onClick={ws.refreshLog} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400" title="刷新">
              <RefreshCw size={13} />
            </button>
            <button onClick={ws.clearEvents} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400" title="清空">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-4 pb-2 shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索日志..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" />
          </div>
          <div className="flex gap-1">
            {[
              { key: '', label: '全部', count: ws.logEntries.length },
              { key: 'qq', label: 'QQ收信', count: sourceCounts['qq'] || 0 },
              { key: 'openclaw', label: 'Bot回复', count: sourceCounts['openclaw'] || 0 },
              { key: 'wechat', label: '微信', count: sourceCounts['wechat'] || 0 },
              { key: 'system', label: '系统', count: sourceCounts['system'] || 0 },
            ].map(f => (
              <button key={f.key} onClick={() => setSourceFilter(f.key)}
                className={`px-2 py-1 text-[10px] rounded-md transition-colors whitespace-nowrap ${sourceFilter === f.key ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {f.label}{f.count > 0 ? ` (${f.count})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Log entries */}
        <div ref={logRef} className="flex-1 overflow-y-auto min-h-0 px-2 pb-2">
          {filteredLog.length === 0 && <p className="text-gray-400 py-8 text-center text-xs">暂无日志</p>}
          {filteredLog.slice(0, 200).map((entry) => (
            <div key={entry.id} className="group">
              <div
                className={`flex items-start gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors text-xs
                  ${expandedId === entry.id ? 'bg-gray-50 dark:bg-gray-800/70' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                {entry.detail ? (
                  expandedId === entry.id
                    ? <ChevronDown size={12} className="shrink-0 mt-0.5 text-gray-400" />
                    : <ChevronRight size={12} className="shrink-0 mt-0.5 text-gray-400" />
                ) : <span className="w-3 shrink-0" />}
                <span className="text-gray-400 shrink-0 tabular-nums text-[11px]">{formatLogTime(entry.time)}</span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${sourceColor(entry.source)}`}>
                  {sourceLabel(entry.source)}
                </span>
                <span className={`break-all leading-relaxed ${entry.source === 'openclaw' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {entry.summary}
                </span>
              </div>
              {expandedId === entry.id && entry.detail && (
                <div className="ml-8 mr-2 mb-1 px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                  {entry.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function sourceColor(s: string) {
  switch (s) {
    case 'qq': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'wechat': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'system': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'openclaw': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function sourceLabel(s: string) {
  switch (s) {
    case 'qq': return 'QQ';
    case 'wechat': return '微信';
    case 'system': return '系统';
    case 'openclaw': return 'Bot';
    default: return s;
  }
}

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2.5">
        <Icon size={18} className={color} />
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
          <p className="text-xs font-semibold truncate leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-gray-400 truncate leading-tight">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function formatLogTime(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatUptime(s: number) {
  if (s < 60) return `${Math.floor(s)}秒`;
  if (s < 3600) return `${Math.floor(s / 60)}分`;
  if (s < 86400) return `${Math.floor(s / 3600)}时${Math.floor((s % 3600) / 60)}分`;
  return `${Math.floor(s / 86400)}天${Math.floor((s % 86400) / 3600)}时`;
}
