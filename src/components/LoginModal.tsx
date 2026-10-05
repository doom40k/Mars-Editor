import React, { useState } from 'react';
import { LockKey, SignIn, User } from '@phosphor-icons/react';
import { loginApi } from '../api';

interface Props {
  onLoginSuccess: (username: string) => void;
}

export default function LoginModal({ onLoginSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await loginApi(username.trim(), password);
      onLoginSuccess(res.username);
    } catch (err: any) {
      setError(err?.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-backdrop">
      <div className="login-card">
        <div className="login-header">
          <div className="brand login-brand">
            <span className="brand-mark login-mark" aria-hidden="true">
              火
            </span>
            <span className="title login-title">火星编辑器</span>
          </div>
          <p className="login-subtitle">内置 SQLite 数据库已连接 · 请登录工作台</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="login-username">
              用户名
            </label>
            <div className="input-wrap">
              <User size={16} className="input-icon" />
              <input
                id="login-username"
                className="form-input"
                type="text"
                value={username}
                placeholder="请输入用户名"
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              密码
            </label>
            <div className="input-wrap">
              <LockKey size={16} className="input-icon" />
              <input
                id="login-password"
                className="form-input"
                type="password"
                value={password}
                placeholder="请输入密码"
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            <SignIn size={16} weight="bold" />
            {loading ? '正在验证…' : '登录进入'}
          </button>
        </form>
      </div>
    </div>
  );
}
