/**
 * 后端 API 客户端封装
 * 支持用户登录认证及文章在 SQLite 中的自动保存与加载
 */

const TOKEN_KEY = 'wechat-mp-editor:token';
const USER_KEY = 'wechat-mp-editor:user';

export interface ArticleRecord {
  id: string;
  title: string;
  content: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface UserInfo {
  username: string;
}

/** 获取本地存储的 Token */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 获取本地存储的用户名 */
export function getSavedUser(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

/** 保存登录凭证 */
export function setAuthSession(token: string, username: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, username);
  } catch {
    // 忽略存储异常
  }
}

/** 清除登录凭证 */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // 忽略
  }
}

/** 统一 fetch 请求封装 */
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error || `请求失败 (${response.status})`;
    throw new Error(errorMsg);
  }

  return data as T;
}

/** 账号密码登录 */
export async function loginApi(username: string, password: string): Promise<{ token: string; username: string }> {
  const res = await request<{ ok: boolean; token: string; username: string; error?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (res.ok && res.token) {
    setAuthSession(res.token, res.username);
    return { token: res.token, username: res.username };
  }
  throw new Error(res.error || '登录失败');
}

/** 检查当前登录状态 */
export async function checkAuthApi(): Promise<UserInfo | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await request<{ ok: boolean; username: string }>('/api/auth/me', {
      method: 'GET',
    });
    if (res.ok && res.username) {
      return { username: res.username };
    }
    return null;
  } catch {
    clearAuthSession();
    return null;
  }
}

/** 退出登录 */
export async function logoutApi(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    // 忽略网络断开等情况
  } finally {
    clearAuthSession();
  }
}

/** 从 SQLite 获取最新一篇文章 */
export async function getLatestArticleApi(): Promise<ArticleRecord | null> {
  const res = await request<{ ok: boolean; article: ArticleRecord | null }>('/api/articles/latest', {
    method: 'GET',
  });
  return res.article || null;
}

/** 自动保存当前文章至 SQLite */
export async function saveArticleApi(article: {
  id: string;
  title: string;
  content: string;
}): Promise<ArticleRecord> {
  const res = await request<{ ok: boolean; article: ArticleRecord }>('/api/articles/save', {
    method: 'POST',
    body: JSON.stringify(article),
  });
  return res.article;
}
