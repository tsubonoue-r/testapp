/**
 * User Repository
 * SQLiteデータベースを使用したユーザーデータ管理
 */

import { db } from '../database.js';
import { User, UserRole } from '../../types/index.js';

export class UserRepository {
  /**
   * ユーザーを作成
   */
  create(user: Omit<User, 'createdAt' | 'updatedAt'>): User {
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    stmt.run(user.id, user.email, user.password, user.name, user.role);

    const created = this.findById(user.id);
    if (!created) {
      throw new Error('ユーザーの作成に失敗しました');
    }

    return created;
  }

  /**
   * IDでユーザーを検索
   */
  findById(id: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.mapRowToUser(row);
  }

  /**
   * メールアドレスでユーザーを検索
   */
  findByEmail(email: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as any;

    if (!row) {
      return null;
    }

    return this.mapRowToUser(row);
  }

  /**
   * 全ユーザーを取得
   */
  findAll(): User[] {
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => this.mapRowToUser(row));
  }

  /**
   * ユーザーを更新
   */
  update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): User | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.password !== undefined) {
      fields.push('password = ?');
      values.push(updates.password);
    }
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * ユーザーを削除
   */
  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * メールアドレスの重複チェック
   */
  emailExists(email: string): boolean {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
    const row = stmt.get(email) as any;

    return row.count > 0;
  }

  /**
   * データベース行をUserオブジェクトにマッピング
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      role: row.role as UserRole,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// シングルトンインスタンスをエクスポート
export const userRepository = new UserRepository();
