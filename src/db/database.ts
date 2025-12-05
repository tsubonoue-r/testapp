/**
 * SQLite Database Setup
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/app.db');

// データベース接続
export const db = new Database(dbPath, { verbose: console.log });

// WALモードを有効化（パフォーマンス向上）
db.pragma('journal_mode = WAL');

/**
 * データベース初期化
 */
export function initializeDatabase() {
  console.log('📦 データベースを初期化中...');

  // ユーザーテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 案件テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME,
      status TEXT NOT NULL DEFAULT 'planned',
      archived INTEGER NOT NULL DEFAULT 0,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 既存のprojectsテーブルにarchivedカラムを追加（存在しない場合のみ）
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`);
    console.log('✅ projects テーブルに archived カラムを追加しました');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      // カラムが既に存在する場合はスキップ
    } else {
      throw error;
    }
  }

  // 工事看板テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS signboards (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      template TEXT NOT NULL DEFAULT 'standard',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 写真テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      signboard_id TEXT,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      thumbnail_path TEXT,
      caption TEXT,
      location_json TEXT,
      metadata_json TEXT NOT NULL,
      taken_at DATETIME NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (signboard_id) REFERENCES signboards(id) ON DELETE SET NULL
    )
  `);

  // インデックス作成
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_signboards_project_id ON signboards(project_id);
    CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);
    CREATE INDEX IF NOT EXISTS idx_photos_signboard_id ON photos(signboard_id);
  `);

  console.log('✅ データベース初期化完了');
}

/**
 * データベースをクローズ
 */
export function closeDatabase() {
  db.close();
  console.log('📦 データベース接続をクローズしました');
}

// プロセス終了時にデータベースをクローズ
process.on('exit', closeDatabase);
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});
