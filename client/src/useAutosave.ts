import { useCallback, useEffect, useRef, useState } from 'react';
import { api, message } from './api';
type Pending = { title?: string; content?: () => string };
export function useAutosave(id: string) {
  const pending = useRef<Pending>({});
  const running = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  const [status, setStatus] = useState<'saved' | 'pending' | 'saving' | 'error'>('saved');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const flush = useCallback((): Promise<boolean> => {
    clearTimeout(timer.current);
    if (running.current) return running.current;
    const task = (async () => {
      while (Object.keys(pending.current).length) {
        const batch = pending.current;
        pending.current = {};
        if (alive.current) {
          setStatus('saving');
          setError('');
        }
        try {
          await api(`/documents/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              ...batch,
              ...(batch.content ? { content: batch.content() } : {}),
            }),
          });
        } catch (e) {
          pending.current = { ...batch, ...pending.current };
          if (alive.current) {
            setStatus('error');
            setError(message(e));
          }
          return false;
        }
      }
      if (alive.current) {
        setStatus('saved');
        setDirty(false);
      }
      return true;
    })();
    running.current = task;
    void task.finally(() => {
      running.current = null;
    });
    return task;
  }, [id]);
  const change = useCallback(
    (patch: Pending) => {
      pending.current = { ...pending.current, ...patch };
      setDirty(true);
      setStatus('pending');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void flush();
      }, 1000);
    },
    [flush],
  );
  useEffect(() => {
    alive.current = true;
    const unload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length || running.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [flush]);
  return { status, error, dirty, change, flush };
}
