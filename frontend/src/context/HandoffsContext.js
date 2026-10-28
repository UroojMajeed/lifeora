import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { recordMove } from '../storage/progress';

const HandoffsContext = createContext(null);

const EMPTY = { handoffs: [], fills: [], checkIns: [], summary: null };

/** Shared handoffs, fills and totals for Home, Handoffs, each handoff's detail screen and Fill. */
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
      recordMove();
      setData((d) => ({
        ...d,
        summary: res.summary,
        handoffs: d.handoffs.map((h) => (h.activity === activity ? { ...h, ...res.handoff } : h)),
      }));
      return res;
    } catch (err) {
      setData(before);
      throw err;
    }
  }, []);

  /** A handed-off task came back: it's yours again, its steps open to walk once more. */
  const slipBack = useCallback(async (activity) => {
    const res = await api.slipHandoff(activity);
    setData((d) => ({
      ...d,
      summary: res.summary,
      handoffs: d.handoffs.map((h) => (h.activity === activity ? { ...h, ...res.handoff } : h)),
    }));
    return res;
  }, []);

  /** Replaces the fills (Fill step). Shows right away, rolls back if the server says no. */
  const updateFills = useCallback(async (fills) => {
    const before = latest.current;
    setData((d) => ({ ...d, fills }));
    try {
      const res = await api.updateFills(fills);
      setData(res);
      recordMove();
      return res;
    } catch (err) {
      setData(before);
      throw err;
    }
  }, []);

  /** Saves this week's check-in (handoffs that slipped back become yours again). */
  const saveCheckIn = useCallback(async (checkIn) => {
    const res = await api.saveCheckIn(checkIn);
    setData(res);
    recordMove();
    return res;
  }, []);

  const value = useMemo(
    () => ({ ...data, loading, error, refresh, update, slipBack, updateFills, saveCheckIn }),
    [data, loading, error, refresh, update, slipBack, updateFills, saveCheckIn]
  );
  return <HandoffsContext.Provider value={value}>{children}</HandoffsContext.Provider>;
}

export function useHandoffs() {
  const ctx = useContext(HandoffsContext);
  if (!ctx) throw new Error('useHandoffs must be used inside HandoffsProvider');
  return ctx;
}
