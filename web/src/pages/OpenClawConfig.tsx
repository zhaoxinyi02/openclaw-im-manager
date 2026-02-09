import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Save, RefreshCw } from 'lucide-react';

export default function OpenClawConfig() {
  const [config, setConfig] = useState<any>(null);
  const [raw, setRaw] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    api.getOpenClawConfig().then(r => {
      if (r.ok) {
        setConfig(r.config);
        setRaw(JSON.stringify(r.config, null, 2));
      }
    });
  };

  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const parsed = JSON.parse(raw);
      const r = await api.updateOpenClawConfig(parsed);
      setMsg(r.ok ? '保存成功' : (r.error || '保存失败'));
      if (r.ok) setConfig(parsed);
    } catch (e) {
      setMsg('JSON 格式错误');
    }
    setSaving(false);
  };

  const models = config?.models?.providers || {};
  const currentModel = config?.agents?.defaults?.model?.primary || '';
  const channels = config?.channels || {};
  const plugins = config?.plugins?.entries || {};

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">OpenClaw 配置</h2>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-sm">快速概览</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">当前模型</span>
              <span className="font-medium">{currentModel || '未设置'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">模型提供商</span>
              <span className="font-medium">{Object.keys(models).join(', ') || '无'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">频道</span>
              <span className="font-medium">{Object.keys(channels).join(', ') || '无'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">插件</span>
              <span className="font-medium">{Object.keys(plugins).join(', ') || '无'}</span>
            </div>
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-sm">QQ 频道配置</h3>
          {channels.qq ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">WebSocket</span>
                <span className="font-mono text-xs">{channels.qq.wsUrl || '未设置'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">主人 QQ</span>
                <span>{channels.qq.ownerQQ || '未设置'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">状态</span>
                <span className={channels.qq.enabled !== false ? 'badge badge-green' : 'badge badge-red'}>
                  {channels.qq.enabled !== false ? '已启用' : '已禁用'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">QQ 频道未配置</p>
          )}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">完整配置 (openclaw.json)</h3>
          <div className="flex gap-2">
            <button onClick={load} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
              <RefreshCw size={14} />刷新
            </button>
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
              <Save size={14} />{saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
        {msg && <p className={`text-xs ${msg.includes('成功') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}
        <textarea value={raw} onChange={e => setRaw(e.target.value)}
          className="input font-mono text-xs h-96 resize-y" spellCheck={false} />
      </div>
    </div>
  );
}
