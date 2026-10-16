import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../lib/api';
import { subscribeNotifications } from '../lib/notificationEvents';
import { useAuthStore } from '../store/authStore';

const ApprovalCounts = createContext({ counts: {}, total: 0, error: '', refresh: async () => {} });
export const useApprovalCounts = () => useContext(ApprovalCounts);

export default function ApprovalCountsProvider({ children }) {
  const ownerId = useAuthStore(state => state.user?.id);
  const role = useAuthStore(state => state.user?.role);
  const [summary, setSummary] = useState({ counts: {}, total: 0 });
  const [error, setError] = useState('');
  const current = useRef(0), controller = useRef(null);
  const refresh = useCallback(async () => {
    if (!ownerId || !['ADMIN', 'SUPERADMIN'].includes(role)) return;
    const revision = ++current.current;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    try {
      const result = await api.getApprovalCounts(request.signal);
      if (revision === current.current) { setSummary(result); setError(''); }
    } catch {
      if (revision === current.current) setError('Pending submission counts could not be refreshed.');
    } finally { clearTimeout(timeout); }
  }, [ownerId, role]);
  useEffect(() => {
    setSummary({ counts: {}, total: 0 }); setError('');
    refresh();
    const unsubscribe = subscribeNotifications(refresh);
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { current.current++; controller.current?.abort(); unsubscribe(); clearInterval(timer); listener.remove(); };
  }, [refresh]);
  return <ApprovalCounts.Provider value={{ ...summary, error, refresh }}>{children}</ApprovalCounts.Provider>;
}
