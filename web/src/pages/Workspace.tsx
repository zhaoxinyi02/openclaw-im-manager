import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import {
  FolderOpen, File, Trash2, Upload, FolderPlus, RefreshCw,
  ChevronRight, Home, Settings2, Clock, HardDrive, AlertTriangle, Check, X,
  FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode, Download,
} from 'lucide-react';

interface WsFile {
  name: string; path: string; size: number; sizeHuman: string;
  isDirectory: boolean; modifiedAt: string; extension: string; ageDays: number;
}
interface WsConfig { autoCleanEnabled: boolean; autoCleanDays: number; excludePatterns: string[]; }
interface WsStats { totalFiles: number; totalSize: number; totalSizeHuman: string; oldFiles: number; }

const IMG = ['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg','.ico'];
const VID = ['.mp4','.avi','.mov','.mkv','.webm'];
const AUD = ['.mp3','.wav','.ogg','.flac','.amr','.silk'];
const ARC = ['.zip','.tar','.gz','.rar','.7z','.tgz'];
const CODE = ['.ts','.js','.py','.sh','.json','.yaml','.yml','.xml','.html','.css'];
const TXT = ['.md','.txt','.log','.jsonl'];

function FIcon({ f }: { f: WsFile }) {
  if (f.isDirectory) return <FolderOpen size={18} className="text-amber-500" />;
  const e = f.extension;
  if (IMG.includes(e)) return <FileImage size={18} className="text-pink-500" />;
  if (VID.includes(e)) return <FileVideo size={18} className="text-purple-500" />;
  if (AUD.includes(e)) return <FileAudio size={18} className="text-green-500" />;
  if (ARC.includes(e)) return <FileArchive size={18} className="text-orange-500" />;
  if (CODE.includes(e)) return <FileCode size={18} className="text-blue-500" />;
  if (TXT.includes(e)) return <FileText size={18} className="text-gray-500" />;
  return <File size={18} className="text-gray-400" />;
}

function relTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 2592000000) return Math.floor(diff / 86400000) + ' 天前';
  return d.toLocaleDateString();
}

export default function Workspace() {
  const [files, setFiles] = useState<WsFile[]>([]);
  const [curPath, setCurPath] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [stats, setStats] = useState<WsStats | null>(null);
  const [config, setConfig] = useState<WsConfig | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCfg, setShowCfg] = useState(false);
  const [showMk, setShowMk] = useState(false);
  const [mkName, setMkName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const fRef = useRef<HTMLInputElement>(null);

  const flash = (t: string, ok = true) => { setToast({ t, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async (p?: string) => {
    setLoading(true); setSel(new Set());
    try { const r = await api.workspaceFiles(p || ''); if (r.ok) { setFiles(r.files); setCurPath(r.currentPath); setParentPath(r.parentPath); } } catch {}
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => { try { const r = await api.workspaceStats(); if (r.ok) setStats(r); } catch {} }, []);
  const loadCfg = useCallback(async () => { try { const r = await api.workspaceConfig(); if (r.ok) setConfig(r.config); } catch {} }, []);

  useEffect(() => { load(); loadStats(); loadCfg(); }, [load, loadStats, loadCfg]);

  const nav = (p: string) => load(p);

  const toggle = (p: string) => setSel(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  const selAll = () => setSel(prev => prev.size === files.length ? new Set() : new Set(files.map(f => f.path)));

  const handleDel = async () => {
    if (sel.size === 0) return;
    if (!confirm(`确定删除 ${sel.size} 个文件/文件夹？不可恢复。`)) return;
    const r = await api.workspaceDelete(Array.from(sel));
    if (r.ok) { flash(`已删除 ${r.deleted.length} 个文件`); load(curPath); loadStats(); }
    else flash(r.error || '删除失败', false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files; if (!fl || fl.length === 0) return;
    setUploading(true);
    try {
      const r = await api.workspaceUpload(Array.from(fl), curPath || undefined);
      if (r.ok) { flash(`已上传 ${r.files.length} 个文件`); load(curPath); loadStats(); }
      else flash(r.error || '上传失败', false);
    } catch (err) { flash('上传失败', false); }
    setUploading(false);
    if (fRef.current) fRef.current.value = '';
  };

  const handleMk = async () => {
    if (!mkName.trim()) return;
    const r = await api.workspaceMkdir(mkName.trim(), curPath || undefined);
    if (r.ok) { flash(`已创建: ${mkName}`); setMkName(''); setShowMk(false); load(curPath); }
    else flash(r.error || '创建失败', false);
  };

  const handleClean = async () => {
    if (!confirm('确定立即清理过期文件？不可恢复。')) return;
    const r = await api.workspaceClean();
    if (r.ok) { flash(`已清理 ${r.deleted.length} 个过期文件`); load(curPath); loadStats(); }
    else flash(r.error || '清理失败', false);
  };

  const saveCfg = async () => {
    if (!config) return;
    const r = await api.workspaceUpdateConfig(config);
    if (r.ok) { setConfig(r.config); flash('配置已保存'); loadStats(); }
    else flash(r.error || '保存失败', false);
  };

  const crumbs = () => {
    const parts = curPath ? curPath.split('/').filter(Boolean) : [];
    const c: { l: string; p: string }[] = [{ l: '工作区', p: '' }];
    let acc = '';
    for (const x of parts) { acc = acc ? acc + '/' + x : x; c.push({ l: x, p: acc }); }
    return c;
  };

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">工作区文件管理</h1>
        <button onClick={() => setShowCfg(!showCfg)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
          <Settings2 size={15} /> 设置
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${toast.ok ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'}`}>
          {toast.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {toast.t}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <HardDrive size={13} />, label: '总大小', val: stats.totalSizeHuman },
            { icon: <File size={13} />, label: '文件数', val: String(stats.totalFiles) },
            { icon: <Clock size={13} />, label: '过期文件', val: String(stats.oldFiles) },
            { icon: <AlertTriangle size={13} />, label: '自动清理', val: config?.autoCleanEnabled ? `${config.autoCleanDays} 天` : '关闭' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">{s.icon} {s.label}</div>
              <div className="text-lg font-semibold mt-0.5">{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Config panel */}
      {showCfg && config && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h3 className="font-semibold text-sm">自动清理配置</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={config.autoCleanEnabled} onChange={e => setConfig({ ...config, autoCleanEnabled: e.target.checked })} className="rounded" />
            启用自动清理
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-20">过期天数</span>
            <input type="number" min={1} max={365} value={config.autoCleanDays} onChange={e => setConfig({ ...config, autoCleanDays: parseInt(e.target.value) || 30 })}
              className="w-24 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" />
            <span className="text-xs text-gray-500">天</span>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">排除文件（每行一个模式）</span>
            <textarea value={config.excludePatterns.join('\n')} onChange={e => setConfig({ ...config, excludePatterns: e.target.value.split('\n').filter(Boolean) })}
              rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveCfg} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">保存配置</button>
            <button onClick={handleClean} className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">立即清理过期文件</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-x-auto">
          {crumbs().map((c, i, a) => (
            <span key={c.p + i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight size={13} className="text-gray-400" />}
              <button onClick={() => nav(c.p)} className={`hover:text-indigo-600 dark:hover:text-indigo-400 ${i === a.length - 1 ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {i === 0 ? <Home size={15} /> : c.l}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { load(curPath); loadStats(); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="刷新">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowMk(true)} className="flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
            <FolderPlus size={15} /> 新建
          </button>
          <label className={`flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={15} /> {uploading ? '上传中...' : '上传'}
            <input ref={fRef} type="file" multiple className="hidden" onChange={handleUpload} />
          </label>
          {sel.size > 0 && (
            <button onClick={handleDel} className="flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">
              <Trash2 size={15} /> 删除 ({sel.size})
            </button>
          )}
        </div>
      </div>

      {/* Mkdir */}
      {showMk && (
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
          <FolderPlus size={16} className="text-gray-400 shrink-0" />
          <input autoFocus value={mkName} onChange={e => setMkName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleMk(); if (e.key === 'Escape') { setShowMk(false); setMkName(''); } }}
            placeholder="文件夹名称" className="flex-1 px-2 py-1 text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none" />
          <button onClick={handleMk} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded"><Check size={16} /></button>
          <button onClick={() => { setShowMk(false); setMkName(''); }} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X size={16} /></button>
        </div>
      )}

      {/* File table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[32px_1fr_80px_80px_120px_40px] gap-2 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
          <div><input type="checkbox" checked={files.length > 0 && sel.size === files.length} onChange={selAll} className="rounded" /></div>
          <div>名称</div><div>大小</div><div>天数</div><div>修改时间</div><div></div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400"><RefreshCw size={20} className="animate-spin mx-auto mb-2" /> 加载中...</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-400"><FolderOpen size={24} className="mx-auto mb-2 opacity-50" /> 空文件夹</div>
        ) : (
          files.map(f => (
            <div key={f.path}
              className={`grid grid-cols-[32px_1fr_80px_80px_120px_40px] gap-2 px-4 py-2.5 items-center text-sm border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${sel.has(f.path) ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''}`}>
              <div><input type="checkbox" checked={sel.has(f.path)} onChange={() => toggle(f.path)} className="rounded" /></div>
              <div className="flex items-center gap-2 min-w-0">
                <FIcon f={f} />
                {f.isDirectory ? (
                  <button onClick={() => nav(f.path)} className="truncate text-left hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">{f.name}</button>
                ) : (
                  <span className="truncate">{f.name}</span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{f.isDirectory ? '-' : f.sizeHuman}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{f.ageDays}d</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{relTime(f.modifiedAt)}</div>
              <div>
                {!f.isDirectory && (
                  <a href={api.workspaceDownloadUrl(f.path)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 inline-block" title="下载">
                    <Download size={14} className="text-gray-400" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
