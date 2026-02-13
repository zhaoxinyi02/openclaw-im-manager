import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import QRCode from 'qrcode';
import {
  QrCode, Zap, KeyRound, RefreshCw, CheckCircle, Loader2,
  Users, UserPlus, Send, Bot, LogIn, Settings, Save,
} from 'lucide-react';

type MainTab = 'status' | 'login' | 'settings';
type LoginTab = 'qrcode' | 'quick' | 'password';

export default function QQ() {
  const [mainTab, setMainTab] = useState<MainTab>('status');
  const [groups, setGroups] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const loadGroups = () => { setLoading(true); api.getGroups().then(r => { setGroups(r.groups || []); setLoading(false); }); };
  const loadFriends = () => { setLoading(true); api.getFriends().then(r => { setFriends(r.friends || []); setLoading(false); }); };
  const checkLogin = () => { api.napcatLoginStatus().then(r => { if (r.ok) setLoginStatus(r.data || r); }).catch(() => {}); };
  const loadCfg = () => { api.getAdminConfig().then(r => { if (r.ok) setCfg(r.config); }); };

  useEffect(() => {
    loadGroups(); loadFriends(); checkLogin(); loadCfg();
    const t = setInterval(checkLogin, 5000);
    return () => clearInterval(t);
  }, []);

  const isLoggedIn = loginStatus?.isLogin === true;

  const saveCfg = async () => {
    setSaving(true); setMsg('');
    const r = await api.updateAdminConfig(cfg);
    setMsg(r.ok ? '保存成功' : (r.error || '保存失败'));
    setSaving(false);
  };

  const update = (path: string, val: any) => {
    const next = JSON.parse(JSON.stringify(cfg));
    const parts = path.split('.');
    let obj = next;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = val;
    setCfg(next);
  };

  const qq = cfg?.qq || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">QQ 管理</h2>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${isLoggedIn ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`}>
            <span className={`w-2 h-2 rounded-full ${isLoggedIn ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {isLoggedIn ? '已登录' : '未登录'}
          </span>
          <button onClick={() => api.reconnectBot()} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <RefreshCw size={14} />重连
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {([
          { key: 'status' as MainTab, icon: Bot, label: 'QQ Bot' },
          { key: 'login' as MainTab, icon: LogIn, label: '登录' },
          { key: 'settings' as MainTab, icon: Settings, label: 'QQ 设置' },
        ]).map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${mainTab === t.key ? 'border-indigo-600 text-indigo-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      {/* === Bot Tab === */}
      {mainTab === 'status' && (
        <div className="space-y-4">
          <BotTab groups={groups} friends={friends} loading={loading} loadGroups={loadGroups} loadFriends={loadFriends} />
        </div>
      )}

      {/* === Login Tab === */}
      {mainTab === 'login' && (
        <div className="space-y-4">
          {isLoggedIn ? (
            <div className="card p-6 text-center space-y-3">
              <CheckCircle size={48} className="mx-auto text-emerald-500" />
              <h3 className="text-lg font-bold text-emerald-600">QQ 已登录</h3>
              {loginStatus?.info && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>昵称: {loginStatus.info.nick || loginStatus.info.nickname || '-'}</p>
                  <p>QQ: {loginStatus.info.uin || loginStatus.info.user_id || '-'}</p>
                </div>
              )}
            </div>
          ) : (
            <LoginPanel onSuccess={checkLogin} />
          )}
        </div>
      )}

      {/* === Settings Tab === */}
      {mainTab === 'settings' && cfg && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button onClick={loadCfg} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"><RefreshCw size={14} />刷新</button>
            <button onClick={saveCfg} disabled={saving} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"><Save size={14} />{saving ? '保存中...' : '保存'}</button>
          </div>
          {msg && <p className={`text-xs ${msg.includes('成功') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}

          <CfgSection title="QQ 个人号">
            <CfgField label="主人 QQ" value={qq.ownerQQ} onChange={v => update('qq.ownerQQ', parseInt(v) || 0)} />
          </CfgSection>

          <CfgSection title="戳一戳回复">
            <CfgToggle label="启用" checked={qq.poke?.enabled} onChange={v => update('qq.poke.enabled', v)} />
            <CfgField label="回复列表 (每行一条)" value={(qq.poke?.replies || []).join('\n')} onChange={v => update('qq.poke.replies', v.split('\n').filter(Boolean))} multiline />
          </CfgSection>

          <CfgSection title="入群欢迎">
            <CfgToggle label="启用" checked={qq.welcome?.enabled} onChange={v => update('qq.welcome.enabled', v)} />
            <CfgField label="欢迎模板 ({nickname} = 昵称)" value={qq.welcome?.template} onChange={v => update('qq.welcome.template', v)} />
            <CfgField label="延迟 (ms)" value={qq.welcome?.delayMs} onChange={v => update('qq.welcome.delayMs', parseInt(v) || 1500)} />
          </CfgSection>

          <CfgSection title="自动审核 - 好友">
            <CfgToggle label="启用" checked={qq.autoApprove?.friend?.enabled} onChange={v => update('qq.autoApprove.friend.enabled', v)} />
            <CfgField label="验证正则" value={qq.autoApprove?.friend?.pattern} onChange={v => update('qq.autoApprove.friend.pattern', v)} placeholder="留空则不自动通过" />
          </CfgSection>

          <CfgSection title="自动审核 - 群">
            <CfgToggle label="启用" checked={qq.autoApprove?.group?.enabled} onChange={v => update('qq.autoApprove.group.enabled', v)} />
            <CfgField label="验证正则" value={qq.autoApprove?.group?.pattern} onChange={v => update('qq.autoApprove.group.pattern', v)} placeholder="留空则不自动通过" />
          </CfgSection>

          <CfgSection title="唤醒概率">
            <CfgField label="群消息唤醒概率 (%)" value={qq.rateLimit?.wakeProbability ?? 10} onChange={v => update('qq.rateLimit.wakeProbability', Math.min(100, Math.max(0, parseInt(v) || 0)))} placeholder="0-100，私聊始终100%" />
            <p className="text-xs text-gray-400 ml-40">设为 0 表示仅通过触发条件唤醒，100 表示所有群消息都回复</p>
          </CfgSection>

          <CfgSection title="消息发送间隔">
            <CfgField label="最小间隔 (秒)" value={qq.rateLimit?.minIntervalSec ?? 0} onChange={v => update('qq.rateLimit.minIntervalSec', Math.max(0, parseInt(v) || 0))} placeholder="0=不限制" />
            <p className="text-xs text-gray-400 ml-40">同一对话中两次回复的最小时间间隔，0 表示不限制</p>
          </CfgSection>

          <CfgSection title="唤醒触发方式">
            <CfgField label="多条件逻辑" value={qq.rateLimit?.wakeTrigger?.mode || 'any'} onChange={v => update('qq.rateLimit.wakeTrigger.mode', v)} placeholder="any=满足任一, all=全部满足" />
            <CfgToggle label="@Bot 时唤醒" checked={qq.rateLimit?.wakeTrigger?.atBot !== false} onChange={v => update('qq.rateLimit.wakeTrigger.atBot', v)} />
            <CfgToggle label="提及 Bot 名字时唤醒" checked={qq.rateLimit?.wakeTrigger?.mentionName !== false} onChange={v => update('qq.rateLimit.wakeTrigger.mentionName', v)} />
            <CfgToggle label="私聊消息始终唤醒" checked={qq.rateLimit?.wakeTrigger?.directMessage !== false} onChange={v => update('qq.rateLimit.wakeTrigger.directMessage', v)} />
            <CfgField label="关键词 (每行一个)" value={(qq.rateLimit?.wakeTrigger?.keywords || []).join('\n')} onChange={v => update('qq.rateLimit.wakeTrigger.keywords', v.split('\n').filter(Boolean))} multiline placeholder="消息包含任一关键词时唤醒" />
          </CfgSection>

          <CfgSection title="API 报错去重">
            <CfgToggle label="启用报错去重" checked={qq.rateLimit?.errorDedup?.enabled !== false} onChange={v => update('qq.rateLimit.errorDedup.enabled', v)} />
            <CfgField label="去重时间阈值 (秒)" value={qq.rateLimit?.errorDedup?.thresholdSec ?? 300} onChange={v => update('qq.rateLimit.errorDedup.thresholdSec', Math.max(0, parseInt(v) || 300))} placeholder="同一报错在此时间内仅发送一次" />
          </CfgSection>

          <CfgSection title="通知开关">
            {Object.entries(qq.notifications || {}).map(([k, v]) => (
              <CfgToggle key={k} label={notifLabels[k] || k} checked={v as boolean} onChange={val => update(`qq.notifications.${k}`, val)} />
            ))}
          </CfgSection>
        </div>
      )}
    </div>
  );
}

const notifLabels: Record<string, string> = {
  memberChange: '群成员变动', adminChange: '管理员变动', banNotice: '禁言通知',
  antiRecall: '防撤回', pokeReply: '戳一戳回复', honorNotice: '群荣誉通知', fileUpload: '文件上传',
};

// === Bot Sub-components ===

function BotTab({ groups, friends, loading, loadGroups, loadFriends }: any) {
  const [tab, setTab] = useState<'groups' | 'friends' | 'send'>('groups');
  return (
    <>
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
                <div><span className="font-medium">{g.group_name}</span><span className="text-gray-400 ml-2 text-xs">({g.group_id})</span></div>
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
                <div><span className="font-medium">{f.nickname || f.remark}</span>{f.remark && f.remark !== f.nickname && <span className="text-gray-400 ml-1 text-xs">({f.remark})</span>}</div>
                <span className="text-xs text-gray-400">{f.user_id}</span>
              </div>
            ))}
            {friends.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">暂无好友</p>}
          </div>
        </div>
      )}

      {tab === 'send' && <SendMessage />}
    </>
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

// === Login Sub-components ===

function LoginPanel({ onSuccess }: { onSuccess: () => void }) {
  const [tab, setTab] = useState<LoginTab>('qrcode');
  return (
    <>
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {([
          { key: 'qrcode' as LoginTab, icon: QrCode, label: '扫码登录' },
          { key: 'quick' as LoginTab, icon: Zap, label: '快速登录' },
          { key: 'password' as LoginTab, icon: KeyRound, label: '账密登录' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${tab === t.key ? 'border-indigo-600 text-indigo-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>
      {tab === 'qrcode' && <QRCodeLogin onSuccess={onSuccess} />}
      {tab === 'quick' && <QuickLogin onSuccess={onSuccess} />}
      {tab === 'password' && <PasswordLogin onSuccess={onSuccess} />}
    </>
  );
}

function QRCodeLogin({ onSuccess }: { onSuccess: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const timerRef = useRef<any>(null);

  const urlToQrImage = async (url: string) => {
    try { setQrDataUrl(await QRCode.toDataURL(url, { width: 280, margin: 2 })); } catch { setMsg('二维码生成失败'); }
  };

  const getQR = async () => {
    setLoading(true); setMsg(''); setQrDataUrl('');
    try {
      const r = await api.napcatGetQRCode();
      if (r.code === 0 && r.data?.qrcode) { await urlToQrImage(r.data.qrcode); setMsg('请使用手机 QQ 扫描二维码'); startPolling(); }
      else setMsg(r.message || r.error || '获取二维码失败');
    } catch (e) { setMsg('请求失败: ' + String(e)); }
    setLoading(false);
  };

  const refreshQR = async () => {
    setLoading(true); setQrDataUrl('');
    try {
      const r = await api.napcatRefreshQRCode();
      if (r.code === 0 && r.data?.qrcode) { await urlToQrImage(r.data.qrcode); setMsg('二维码已刷新'); }
      else setMsg(r.message || '刷新失败');
    } catch { setMsg('刷新请求失败'); }
    setLoading(false);
  };

  const startPolling = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      const r = await api.napcatLoginStatus();
      if (r.ok && r.data?.isLogin) { clearInterval(timerRef.current); timerRef.current = null; setMsg('登录成功！'); onSuccess(); }
    }, 3000);
  };

  useEffect(() => { getQR(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-col items-center gap-4">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" className="w-52 h-52 rounded-lg border border-gray-200 dark:border-gray-700 bg-white" />
        ) : (
          <div className="w-52 h-52 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
            {loading ? <Loader2 size={32} className="animate-spin text-gray-400" /> : <QrCode size={48} className="text-gray-300" />}
          </div>
        )}
        {msg && <p className={`text-sm ${msg.includes('成功') ? 'text-emerald-600' : 'text-gray-500'}`}>{msg}</p>}
        <div className="flex gap-2">
          <button onClick={getQR} disabled={loading} className="btn-primary text-xs py-1.5 px-4">获取二维码</button>
          <button onClick={refreshQR} disabled={loading || !qrDataUrl} className="btn-secondary text-xs py-1.5 px-4">刷新</button>
        </div>
      </div>
    </div>
  );
}

function QuickLogin({ onSuccess }: { onSuccess: () => void }) {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.napcatQuickLoginList().then(r => {
      if (r.code === 0 && Array.isArray(r.data)) setAccounts(r.data);
      else if (r.data && typeof r.data === 'object') setAccounts(Object.keys(r.data));
    });
  }, []);

  const doLogin = async (uin: string) => {
    setLoading(true); setMsg('');
    const r = await api.napcatQuickLogin(uin);
    if (r.code === 0) { setMsg('登录成功！'); setTimeout(onSuccess, 1000); }
    else setMsg(r.message || r.error || '快速登录失败');
    setLoading(false);
  };

  return (
    <div className="card p-6 space-y-4">
      <p className="text-sm text-gray-500">选择一个已登录过的 QQ 账号快速登录：</p>
      {accounts.length === 0 ? <p className="text-sm text-gray-400">没有可用的快速登录账号</p> : (
        <div className="space-y-2">
          {accounts.map(uin => (
            <button key={uin} onClick={() => doLogin(uin)} disabled={loading}
              className="w-full card p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <span className="font-medium">{uin}</span>
              <span className="text-xs text-indigo-600">点击登录</span>
            </button>
          ))}
        </div>
      )}
      {msg && <p className={`text-sm ${msg.includes('成功') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}
    </div>
  );
}

function PasswordLogin({ onSuccess }: { onSuccess: () => void }) {
  const [uin, setUin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const doLogin = async () => {
    if (!uin || !password) return;
    setLoading(true); setMsg('');
    try {
      const r = await api.napcatPasswordLogin(uin, password);
      if (r.code === 0) { setMsg('登录成功！'); setTimeout(onSuccess, 1000); }
      else setMsg(r.message || r.error || '登录失败');
    } catch (e) { setMsg('请求失败: ' + String(e)); }
    setLoading(false);
  };

  return (
    <div className="card p-6 space-y-4">
      <p className="text-sm text-gray-500">使用 QQ 号和密码登录：</p>
      <input value={uin} onChange={e => setUin(e.target.value)} placeholder="QQ 号" className="input" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" className="input" />
      {msg && <p className={`text-sm ${msg.includes('成功') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}
      <button onClick={doLogin} disabled={loading || !uin || !password} className="btn-primary w-full">
        {loading ? '登录中...' : '登录'}
      </button>
    </div>
  );
}

// === Settings helpers ===

function CfgSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function CfgField({ label, value, onChange, type, placeholder, multiline }: {
  label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string; multiline?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <label className="text-sm text-gray-600 dark:text-gray-400 sm:w-40 shrink-0">{label}</label>
      {multiline ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} className="input text-xs h-24 resize-y" placeholder={placeholder} />
      ) : (
        <input type={type || 'text'} value={value ?? ''} onChange={e => onChange(e.target.value)} className="input" placeholder={placeholder} />
      )}
    </div>
  );
}

function CfgToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}
