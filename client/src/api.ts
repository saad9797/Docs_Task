export type Role = 'OWNER' | 'EDITOR' | 'VIEWER';
export interface User {
  id: string;
  name: string;
  email: string;
}
export interface DocumentMeta {
  id: string;
  title: string;
  ownerId: string;
  owner: User;
  createdAt: string;
  updatedAt: string;
  role: Role;
}
export interface Document extends DocumentMeta {
  content: string;
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
export interface Share {
  id: string;
  role: Exclude<Role, 'OWNER'>;
  user: User;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let token = sessionStorage.getItem('folio-token');
export function setToken(value: string | null) {
  token = value;
  if (value) sessionStorage.setItem('folio-token', value);
  else sessionStorage.removeItem('folio-token');
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    const timeout = AbortSignal.timeout(90000);
    res = await fetch(`/api${path}`, {
      ...options,
      headers,
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof Error && error.name === 'TimeoutError')
      throw new ApiError(0, 'The server is taking too long to respond. Please try again.');
    throw new ApiError(0, 'Unable to connect. Check your connection and try again.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (res.status === 401) window.dispatchEvent(new Event('folio-session-expired'));
    throw new ApiError(res.status, body?.error?.message ?? 'The request failed. Please try again.');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
export const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.';
