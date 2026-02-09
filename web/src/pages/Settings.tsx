import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Save, RefreshCw } from 'lucide-react';

export default function Settings() {
  const [cfg, setCfg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => { api.getAdminConfig().then(r => { if (r.ok) setCfg(r.config); }); };
  useEffect(load, []);

  const save = async () => {
    setSaving(true); setMsg('');
    const r = await api.updateAdminConfig(cfg);
    setMsg(r.ok ? '保存成功' : (r.error || '保存失败'));
    setSaving(false);
  };

  if (!cfg) return <p className="text-gray-400 text-sm">加载中...</p>;

  const qq = cfg.qq || {};
  const update = (path: string, val: any) => {
    const next = JSON.parse(JSON.stringify(cfg));
    const parts = path.split('.');
    let obj = next;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = val;
    setCfg(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">设置</h2>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"><RefreshCw size={14} />刷新</button>
          <button onClick={save} disabled={saving} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"><Save size={14} />{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
      {msg && <p className={`text-xs ${msg.includes('成功') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}

      <Section title="服务器">
        <Field label="管理端口" value={cfg.server?.port} onChange={v => update('server.port', parseInt(v) || 6099)} />
        <Field label="管理密码" value={cfg.server?.token} onChange={v => update('server.token', v)} type="password" />
      </Section>

      <Section title="NapCat 连接">
        <Field label="WebSocket 地址" value={cfg.napcat?.wsUrl} onChange={v => update('napcat.wsUrl', v)} />
        <Field label="Access Token" value={cfg.napcat?.accessToken} onChange={v => update('napcat.accessToken', v)} />
      </Section>

      <Section title="QQ 个人号">
        <Field label="主人 QQ" value={qq.ownerQQ} onChange={v => update('qq.ownerQQ', parseInt(v) || 0)} />
      </Section>

      <Section title="戳一戳回复">
        <Toggle label="启用" checked={qq.poke?.enabled} onChange={v => update('qq.poke.enabled', v)} />
        <Field label="回复列表 (每行一条)" value={(qq.poke?.replies || []).join('\n')} onChange={v => update('qq.poke.replies', v.split('\n').filter(Boolean))} multiline />
      </Section>

      <Section title="入群欢迎">
        <Toggle label="启用" checked={qq.welcome?.enabled} onChange={v => update('qq.welcome.enabled', v)} />
        <Field label="欢迎模板 ({nickname} = 昵称)" value={qq.welcome?.template} onChange={v => update('qq.welcome.template', v)} />
        <Field label="延迟 (ms)" value={qq.welcome?.delayMs} onChange={v => update('qq.welcome.delayMs', parseInt(v) || 1500)} />
      </Section>

      <Section title="自动审核 - 好友">
        <Toggle label="启用" checked={qq.autoApprove?.friend?.enabled} onChange={v => update('qq.autoApprove.friend.enabled', v)} />
        <Field label="验证正则" value={qq.autoApprove?.friend?.pattern} onChange={v => update('qq.autoApprove.friend.pattern', v)} placeholder="留空则不自动通过" />
      </Section>

      <Section title="自动审核 - 群">
        <Toggle label="启用" checked={qq.autoApprove?.group?.enabled} onChange={v => update('qq.autoApprove.group.enabled', v)} />
        <Field label="验证正则" value={qq.autoApprove?.group?.pattern} onChange={v => update('qq.autoApprove.group.pattern', v)} placeholder="留空则不自动通过" />
      </Section>

      <Section title="通知开关">
        {Object.entries(qq.notifications || {}).map(([k, v]) => (
          <Toggle key={k} label={notifLabels[k] || k} checked={v as boolean} onChange={val => update(`qq.notifications.${k}`, val)} />
        ))}
      </Section>

      <Section title="OpenClaw">
        <Field label="配置文件路径" value={cfg.openclaw?.configPath} onChange={v => update('openclaw.configPath', v)} />
        <Toggle label="自动配置 QQ 插件" checked={cfg.openclaw?.autoSetup} onChange={v => update('openclaw.autoSetup', v)} />
      </Section>
    </div>
  );
}

const notifLabels: Record<string, string> = {
  memberChange: '群成员变动', adminChange: '管理员变动', banNotice: '禁言通知',
  antiRecall: '防撤回', pokeReply: '戳一戳回复', honorNotice: '群荣誉通知', fileUpload: '文件上传',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder, multiline }: {
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
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
