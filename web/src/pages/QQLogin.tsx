import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import QRCode from 'qrcode';
import { QrCode, Zap, KeyRound, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';

type Tab = 'qrcode' | 'quick' | 'password';

export default function QQLogin() {
  const [loginStatus, setLoginStatus] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('qrcode');

  const checkStatus = () => {
    api.napcatLoginStatus().then(r => {
      if (r.ok) setLoginStatus(r.data || r);
    }).catch(() => {});
  };

  useEffect(() => {
    checkStatus();
    const t = setInterval(checkStatus, 5000);
    return () => clearInterval(t);
  }, []);

  const isLoggedIn = loginStatus?.isLogin === true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">QQ 登录</h2>
        <button onClick={checkStatus} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
          <RefreshCw size={14} />刷新状态
        </button>
      </div>

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
        <>
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
            {([
              { key: 'qrcode' as Tab, icon: QrCode, label: '扫码登录' },
              { key: 'quick' as Tab, icon: Zap, label: '快速登录' },
              { key: 'password' as Tab, icon: KeyRound, label: '账密登录' },
            ]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${tab === t.key ? 'border-indigo-600 text-indigo-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <t.icon size={15} />{t.label}
              </button>
            ))}
          </div>

          {tab === 'qrcode' && <QRCodeLogin onSuccess={checkStatus} />}
          {tab === 'quick' && <QuickLogin onSuccess={checkStatus} />}
          {tab === 'password' && <PasswordLogin onSuccess={checkStatus} />}
        </>
      )}
    </div>
  );
}

function QRCodeLogin({ onSuccess }: { onSuccess: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const timerRef = useRef<any>(null);

  const urlToQrImage = async (url: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch {
      setMsg('二维码生成失败');
    }
  };

  const getQR = async () => {
    setLoading(true);
    setMsg('');
    setQrDataUrl('');
    try {
      const r = await api.napcatGetQRCode();
      if (r.code === 0 && r.data?.qrcode) {
        await urlToQrImage(r.data.qrcode);
        setMsg('请使用手机 QQ 扫描二维码');
        startPolling();
      } else {
        setMsg(r.message || r.error || '获取二维码失败');
      }
    } catch (e) {
      setMsg('请求失败: ' + String(e));
    }
    setLoading(false);
  };

  const refreshQR = async () => {
    setLoading(true);
    setQrDataUrl('');
    try {
      const r = await api.napcatRefreshQRCode();
      if (r.code === 0 && r.data?.qrcode) {
        await urlToQrImage(r.data.qrcode);
        setMsg('二维码已刷新，请重新扫描');
      } else {
        setMsg(r.message || '刷新失败，请重新获取');
      }
    } catch {
      setMsg('刷新请求失败');
    }
    setLoading(false);
  };

  const startPolling = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      const r = await api.napcatLoginStatus();
      if (r.ok && r.data?.isLogin) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setMsg('登录成功！');
        onSuccess();
      }
    }, 3000);
  };

  useEffect(() => {
    getQR();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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
    setLoading(true);
    setMsg('');
    const r = await api.napcatQuickLogin(uin);
    if (r.code === 0) {
      setMsg('登录成功！');
      setTimeout(onSuccess, 1000);
    } else {
      setMsg(r.message || r.error || '快速登录失败');
    }
    setLoading(false);
  };

  return (
    <div className="card p-6 space-y-4">
      <p className="text-sm text-gray-500">选择一个已登录过的 QQ 账号快速登录：</p>
      {accounts.length === 0 ? (
        <p className="text-sm text-gray-400">没有可用的快速登录账号</p>
      ) : (
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
    setLoading(true);
    setMsg('');
    try {
      const r = await api.napcatPasswordLogin(uin, password);
      if (r.code === 0) {
        setMsg('登录成功！');
        setTimeout(onSuccess, 1000);
      } else {
        setMsg(r.message || r.error || '登录失败');
      }
    } catch (e) {
      setMsg('请求失败: ' + String(e));
    }
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
