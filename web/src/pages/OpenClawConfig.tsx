import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Save, RefreshCw, Eye, Code, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

type Tab = 'visual' | 'json';

export default function OpenClawConfig() {
  const [config, setConfig] = useState<any>(null);
  const [raw, setRaw] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<Tab>('visual');

  const load = () => {
    api.getOpenClawConfig().then(r => {
      if (r.ok) {
        setConfig(r.config);
        setRaw(JSON.stringify(r.config, null, 2));
      }
    });
  };

  useEffect(load, []);

  const saveVisual = async () => {
    setSaving(true); setMsg('');
    try {
      const r = await api.updateOpenClawConfig(config);
      setMsg(r.ok ? '保存成功' : (r.error || '保存失败'));
      if (r.ok) setRaw(JSON.stringify(config, null, 2));
    } catch (e) { setMsg('保存失败: ' + String(e)); }
    setSaving(false);
  };

  const saveJson = async () => {
    setSaving(true); setMsg('');
    try {
      const parsed = JSON.parse(raw);
      const r = await api.updateOpenClawConfig(parsed);
      setMsg(r.ok ? '保存成功' : (r.error || '保存失败'));
      if (r.ok) setConfig(parsed);
    } catch (e) { setMsg('JSON 格式错误'); }
    setSaving(false);
  };

  const update = (path: string, val: any) => {
    const next = JSON.parse(JSON.stringify(config));
    const parts = path.split('.');
    let obj = next;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = val;
    setConfig(next);
  };

  const providers = config?.models?.providers || {};
  const providerKeys = Object.keys(providers);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">OpenClaw 配置</h2>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <RefreshCw size={14} />刷新
          </button>
          <button onClick={tab === 'json' ? saveJson : saveVisual} disabled={saving} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Save size={14} />{saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
      {msg && <p className={`text-xs ${msg.includes('成功') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => setTab('visual')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${tab === 'visual' ? 'border-indigo-600 text-indigo-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Eye size={15} />可视化配置
        </button>
        <button onClick={() => { setTab('json'); setRaw(JSON.stringify(config, null, 2)); }}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${tab === 'json' ? 'border-indigo-600 text-indigo-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Code size={15} />JSON 编辑
        </button>
      </div>

      {!config ? <p className="text-gray-400 text-sm">加载中...</p> : tab === 'visual' ? (
        <div className="space-y-4">
          {/* AI Model */}
          <Section title="AI 模型" defaultOpen>
            <Field label="当前模型" value={config?.agents?.defaults?.model?.primary || ''} onChange={v => update('agents.defaults.model.primary', v)} placeholder="provider/model-name" />
            <Field label="工作目录" value={config?.agents?.defaults?.workspace || ''} onChange={v => update('agents.defaults.workspace', v)} />
            <Field label="最大并发" value={config?.agents?.defaults?.maxConcurrent ?? 4} onChange={v => update('agents.defaults.maxConcurrent', parseInt(v) || 4)} type="number" />
          </Section>

          {/* Model Providers */}
          <Section title="模型提供商" defaultOpen>
            {providerKeys.map(key => {
              const p = providers[key];
              return (
                <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{key}</span>
                  </div>
                  <Field label="API URL" value={p.baseUrl || ''} onChange={v => update(`models.providers.${key}.baseUrl`, v)} placeholder="https://api.openai.com/v1" />
                  <Field label="API Key" value={p.apiKey || ''} onChange={v => update(`models.providers.${key}.apiKey`, v)} type="password" placeholder="sk-..." />
                  <Field label="API 类型" value={p.api || 'openai-completions'} onChange={v => update(`models.providers.${key}.api`, v)} />
                  {p.models && p.models.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      模型: {p.models.map((m: any) => m.id || m.name).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
            {providerKeys.length === 0 && <p className="text-sm text-gray-400">暂无提供商</p>}
          </Section>

          {/* Gateway */}
          <Section title="网关 (Gateway)">
            <Field label="端口" value={config?.gateway?.port ?? 18789} onChange={v => update('gateway.port', parseInt(v) || 18789)} type="number" />
            <Field label="模式" value={config?.gateway?.mode || 'local'} onChange={v => update('gateway.mode', v)} />
            <Field label="绑定" value={config?.gateway?.bind || 'lan'} onChange={v => update('gateway.bind', v)} />
            <Field label="认证模式" value={config?.gateway?.auth?.mode || 'token'} onChange={v => update('gateway.auth.mode', v)} />
            <Field label="Token" value={config?.gateway?.auth?.token || ''} onChange={v => update('gateway.auth.token', v)} type="password" />
          </Section>

          {/* Plugins */}
          <Section title="插件">
            {Object.entries(config?.plugins?.entries || {}).map(([id, p]: [string, any]) => (
              <div key={id} className="flex items-center justify-between py-1">
                <span className="text-sm">{id}</span>
                <Toggle checked={p.enabled !== false} onChange={v => update(`plugins.entries.${id}.enabled`, v)} />
              </div>
            ))}
          </Section>

          {/* Channels */}
          <Section title="频道">
            {Object.entries(config?.channels || {}).map(([id, ch]: [string, any]) => (
              <div key={id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{id}</span>
                  <Toggle checked={ch.enabled !== false} onChange={v => update(`channels.${id}.enabled`, v)} />
                </div>
                {id === 'qq' && (
                  <>
                    <Field label="WebSocket URL" value={ch.wsUrl || ''} onChange={v => update(`channels.${id}.wsUrl`, v)} />
                    <Field label="Access Token" value={ch.accessToken || ''} onChange={v => update(`channels.${id}.accessToken`, v)} />
                    <Field label="主人 QQ" value={ch.ownerQQ || ''} onChange={v => update(`channels.${id}.ownerQQ`, parseInt(v) || 0)} />
                  </>
                )}
                {id === 'feishu' && (
                  <>
                    <Field label="App ID" value={ch.appId || ''} onChange={v => update(`channels.${id}.appId`, v)} />
                    <Field label="App Secret" value={ch.appSecret || ''} onChange={v => update(`channels.${id}.appSecret`, v)} type="password" />
                  </>
                )}
                {id === 'qqbot' && (
                  <>
                    <Field label="App ID" value={ch.appId || ''} onChange={v => update(`channels.${id}.appId`, v)} />
                    <Field label="Client Secret" value={ch.clientSecret || ''} onChange={v => update(`channels.${id}.clientSecret`, v)} type="password" />
                  </>
                )}
              </div>
            ))}
          </Section>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <textarea value={raw} onChange={e => setRaw(e.target.value)}
            className="input font-mono text-xs h-[600px] resize-y" spellCheck={false} />
        </div>
      )}
    </div>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <h3 className="font-semibold text-sm">{title}</h3>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder }: {
  label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <label className="text-sm text-gray-600 dark:text-gray-400 sm:w-32 shrink-0">{label}</label>
      <input type={type || 'text'} value={value ?? ''} onChange={e => onChange(e.target.value)}
        className="input text-sm" placeholder={placeholder} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}
