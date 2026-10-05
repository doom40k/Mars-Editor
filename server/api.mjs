import { randomUUID } from 'node:crypto';
import {
  createSession,
  getAllArticles,
  getLatestArticle,
  removeSession,
  saveArticle,
  verifySession,
} from './db.mjs';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'dpp520';

/** 读取请求 Body（JSON） */
async function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

/** 发送 JSON 响应 */
function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(json);
}

/** 从 Header 提取 Bearer Token */
function extractToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return '';
}

/** 认证中间校验 */
function checkAuth(req) {
  const token = extractToken(req);
  if (!token) return null;
  return verifySession(token);
}

/** 主 API 中间件处理器 */
export async function apiMiddleware(req, res, next) {
  const urlObj = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;

  // 非 /api 路径交回给下一个中间件（如静态资源）
  if (!pathname.startsWith('/api')) {
    if (next) return next();
    return;
  }

  // 处理 OPTIONS 跨域预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end();
    return;
  }

  // 1. 用户登录
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBody(req);
    const { username, password } = body;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = randomUUID();
      createSession(token, username);
      sendJson(res, 200, {
        ok: true,
        token,
        username,
        message: '登录成功',
      });
      return;
    }

    sendJson(res, 401, {
      ok: false,
      error: '账号或密码错误',
    });
    return;
  }

  // 2. 检查当前用户登录状态
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const session = checkAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: '未登录或登录已失效' });
      return;
    }
    sendJson(res, 200, { ok: true, username: session.username });
    return;
  }

  // 3. 用户登出
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = extractToken(req);
    if (token) {
      removeSession(token);
    }
    sendJson(res, 200, { ok: true, message: '已退出登录' });
    return;
  }

  // 后续接口均需要登录认证
  const user = checkAuth(req);
  if (!user) {
    sendJson(res, 401, { ok: false, error: '请先登录' });
    return;
  }

  // 4. 获取最新保存的一篇文章
  if (pathname === '/api/articles/latest' && req.method === 'GET') {
    try {
      const article = getLatestArticle();
      sendJson(res, 200, { ok: true, article });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: '读取数据库失败: ' + (err?.message || '') });
    }
    return;
  }

  // 5. 保存或更新当前文章
  if (pathname === '/api/articles/save' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { id, title, content } = body;
      const article = saveArticle({ id, title, content });
      sendJson(res, 200, { ok: true, article, message: '已保存至 SQLite' });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: '保存数据库失败: ' + (err?.message || '') });
    }
    return;
  }

  // 6. 获取文章列表（备用查询）
  if (pathname === '/api/articles' && req.method === 'GET') {
    try {
      const list = getAllArticles();
      sendJson(res, 200, { ok: true, articles: list });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: '查询数据库失败: ' + (err?.message || '') });
    }
    return;
  }

  // 404
  sendJson(res, 404, { ok: false, error: 'API 未找到' });
}
