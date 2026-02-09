import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { RefreshCw, Send, Users, UserPlus } from 'lucide-react';

export default function QQBot() {
  const [tab, setTab] = useState<'groups' | 'friends' | 'send'>('groups');
  const [groups, setGroups] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGroups = () => { setLoading(true); api.getGroups().then(r => { setGroups(r.groups || []); setLoading(false); }); };
  const loadFriends = () => { setLoading(true); api.getFriends().then(r => { setFriends(r.friends || []); setLoading(false); }); };

  useEffect(() => { loadGroups(); loadFriends(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">QQ Bot</h2>
        <div className="flex gap-2">
          <button onClick={() => api.reconnectBot()} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <RefreshCw size={14} />重连 NapCat
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {[
          { key: 'groups' as const, icon: Users, label: `群列表 (${groups.length})` },
          { key: 'friends' as const, icon: UserPlus, label: `好友 (${friends.length})` },
          { key: 'send' as const, icon: Send, label: '发消息' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${tab === t.key ? 'border-indigo-600 text-indigo-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'groups' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500">共 {groups.length} 个群</span>
            <button onClick={loadGroups} disabled={loading} className="text-xs text-indigo-600 hover:underline">刷新</button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
            {groups.map((g: any) => (
              <div key={g.group_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{g.group_name}</span>
                  <span className="text-gray-400 ml-2 text-xs">({g.group_id})</span>
                </div>
                <span className="text-xs text-gray-400">{g.member_count || '?'} 人</span>
              </div>
            ))}
            {groups.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">暂无群</p>}
          </div>
        </div>
      )}

      {tab === 'friends' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500">共 {friends.length} 个好友</span>
            <button onClick={loadFriends} disabled={loading} className="text-xs text-indigo-600 hover:underline">刷新</button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
            {friends.map((f: any) => (
              <div key={f.user_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{f.nickname || f.remark}</span>
                  {f.remark && f.remark !== f.nickname && <span className="text-gray-400 ml-1 text-xs">({f.remark})</span>}
                </div>
                <span className="text-xs text-gray-400">{f.user_id}</span>
              </div>
            ))}
            {friends.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">暂无好友</p>}
          </div>
        </div>
      )}

      {tab === 'send' && <SendMessage />}
    </div>
  );
}

function SendMessage() {
  const [type, setType] = useState<'private' | 'group'>('private');
  const [id, setId] = useState('');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');

  const send = async () => {
    if (!id || !text) return;
    setMsg('');
    const r = await api.sendMessage(type, parseInt(id), [{ type: 'text', data: { text } }]);
    setMsg(r.ok ? '发送成功' : (r.error || '发送失败'));
    if (r.ok) setText('');
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex gap-3">
        <select value={type} onChange={e => setType(e.target.value as any)} className="input w-28">
          <option value="private">私聊</option>
          <option value="group">群聊</option>
        </select>
        <input value={id} onChange={e => setId(e.target.value)} placeholder={type === 'group' ? '群号' : 'QQ号'} className="input w-40" />
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="消息内容" className="input h-24 resize-y" />
      {msg && <p className={`text-xs ${msg.includes('成功') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}
      <button onClick={send} disabled={!id || !text} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5">
        <Send size={14} />发送
      </button>
    </div>
  );
}
