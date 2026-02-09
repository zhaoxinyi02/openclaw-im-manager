import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [napcatStatus, setNapcatStatus] = useState<any>({ connected: false });

  // Fetch initial status from API
  useEffect(() => {
    const fetchStatus = () => {
      api.getStatus().then(r => {
        if (r.ok && r.napcat) {
          setNapcatStatus(r.napcat);
        }
      }).catch(() => {});
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    if (!token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'event') {
          setEvents(prev => { const next = [...prev, msg.data]; return next.length > 200 ? next.slice(-200) : next; });
        } else if (msg.type === 'napcat-status') {
          setNapcatStatus(msg.data);
        }
      } catch {}
    };

    ws.onclose = () => {
      setTimeout(() => { if (localStorage.getItem('admin-token')) window.location.reload(); }, 5000);
    };

    return () => { ws.close(); };
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);
  return { events, napcatStatus, clearEvents };
}
