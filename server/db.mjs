import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库文件存放在项目根目录下的 data 目录中
const DATA_DIR = resolve(__dirname, '../data');
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = resolve(DATA_DIR, 'mars.db');
const db = new DatabaseSync(DB_PATH);

// 初始化数据表结构
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

/** 获取最新的一篇文章 */
export function getLatestArticle() {
  const stmt = db.prepare(`
    SELECT id, title, content, created_at as createdAt, updated_at as updatedAt
    FROM articles
    ORDER BY updated_at DESC
    LIMIT 1
  `);
  return stmt.get() || null;
}

/** 保存或更新文章（upsert） */
export function saveArticle({ id, title, content }) {
  const now = Date.now();
  const safeId = id || `draft-${now}`;
  const safeTitle = (title || '未命名文章').trim();
  const safeContent = content || '';

  const stmt = db.prepare(`
    INSERT INTO articles (id, title, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      updated_at = excluded.updated_at
  `);
  stmt.run(safeId, safeTitle, safeContent, now, now);

  return {
    id: safeId,
    title: safeTitle,
    content: safeContent,
    updatedAt: now,
  };
}

/** 获取所有文章列表（简要信息） */
export function getAllArticles() {
  const stmt = db.prepare(`
    SELECT id, title, content, created_at as createdAt, updated_at as updatedAt
    FROM articles
    ORDER BY updated_at DESC
  `);
  return stmt.all();
}

/** 创建会话 Session */
export function createSession(token, username) {
  const stmt = db.prepare(`
    INSERT INTO sessions (token, username, created_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(token, username, Date.now());
}

/** 校验会话 Token */
export function verifySession(token) {
  if (!token) return null;
  const stmt = db.prepare(`
    SELECT username, created_at as createdAt
    FROM sessions
    WHERE token = ?
  `);
  return stmt.get(token) || null;
}

/** 删除会话 Token */
export function removeSession(token) {
  if (!token) return;
  const stmt = db.prepare(`
    DELETE FROM sessions
    WHERE token = ?
  `);
  stmt.run(token);
}

export { db };
