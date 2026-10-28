import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setToken, type User } from './api';
const Context = createContext<{
  user: User | null;
  loading: boolean;
  expired: boolean;
  login: (id: string) => Promise<void>;
  logout: () => void;
}>(null!);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem('folio-token')) {
      setLoading(false);
      return;
    }
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => {
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const expire = () => {
      setExpired(true);
    };
    window.addEventListener('folio-session-expired', expire);
    return () => window.removeEventListener('folio-session-expired', expire);
  }, []);
  async function login(id: string) {
    const result = await api<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId: id }),
    });
    setToken(result.token);
    setUser(result.user);
    setExpired(false);
  }
  function logout() {
    setToken(null);
    setUser(null);
    setExpired(false);
  }
  return (
    <Context.Provider value={{ user, loading, expired, login, logout }}>
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
