import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';

const HandoffsContext = createContext(null);

const EMPTY = { handoffs: [], summary: null };

/** Shared handoff list + totals for Home, the handoff list, and each handoff's detail screen. */
export function HandoffsProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(EMPTY);
  latest.current = data;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.getHandoffs());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Saves a change. The UI updates right away and rolls back if the server says no. */
  const update = useCallback(async (activity, patch) => {
    const before = latest.current;
    setData((d) => ({
      ...d,
      handoffs: d.handoffs.map((h) => (h.activity === activity ? { ...h, ...patch } : h)),
    }));
    try {
      const res = await api.updateHandoff(activity, patch);
      setData((d) => ({
        summary: res.summary,
        handoffs: d.handoffs.map((h) => (h.activity === activity ? { ...h, ...res.handoff } : h)),
      }));
      return res;
    } catch (err) {
      setData(before);
      throw err;
    }
  }, []);

  const value = useMemo(() => ({ ...data, loading, error, refresh, update }), [data, loading, error, refresh, update]);
  return <HandoffsContext.Provider value={value}>{children}</HandoffsContext.Provider>;
}

export function useHandoffs() {
  const ctx = useContext(HandoffsContext);
  if (!ctx) throw new Error('useHandoffs must be used inside HandoffsProvider');
  return ctx;
}
