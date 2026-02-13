import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useWebSocket } from './hooks/useWebSocket';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OpenClawConfig from './pages/OpenClawConfig';
import QQ from './pages/QQ';
import Requests from './pages/Requests';
import Settings from './pages/Settings';
import WeChatLogin from './pages/WeChatLogin';
import Workspace from './pages/Workspace';

export default function App() {
  const auth = useAuth();
  const ws = useWebSocket();

  if (!auth.isLoggedIn) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={auth.login} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout onLogout={auth.logout} napcatStatus={ws.napcatStatus} wechatStatus={ws.wechatStatus} />}>
        <Route path="/" element={<Dashboard ws={ws} />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/openclaw" element={<OpenClawConfig />} />
        <Route path="/qq" element={<QQ />} />
        <Route path="/wechat" element={<WeChatLogin />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" />} />
      <Route path="/qqbot" element={<Navigate to="/qq" />} />
      <Route path="/qqlogin" element={<Navigate to="/qq" />} />
      <Route path="/wechatlogin" element={<Navigate to="/wechat" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
