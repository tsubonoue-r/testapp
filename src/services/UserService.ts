/**
 * User Service
 * ユーザー管理とLark連携
 */

import { db } from '../db/database.js';
import { User, CreateUserInput, UpdateUserInput } from '../models/User.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export class UserService {
  /**
   * 全ユーザーを取得
   */
  static getAllUsers(): User[] {
    const stmt = db.prepare(`
      SELECT * FROM users
      ORDER BY created_at DESC
    `);
    return stmt.all() as User[];
  }

  /**
   * IDでユーザーを取得
   */
  static getUserById(id: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return (stmt.get(id) as User) || null;
  }

  /**
   * メールアドレスでユーザーを取得
   */
  static getUserByEmail(email: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return (stmt.get(email) as User) || null;
  }

  /**
   * Lark User IDでユーザーを取得
   */
  static getUserByLarkId(larkUserId: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE lark_user_id = ?');
    return (stmt.get(larkUserId) as User) || null;
  }

  /**
   * ユーザーを作成
   */
  static async createUser(input: CreateUserInput): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (
        id, email, password, name, role,
        lark_user_id, lark_open_id, is_from_lark,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.email,
      hashedPassword,
      input.name,
      input.role || 'user',
      input.lark_user_id || null,
      input.lark_open_id || null,
      input.is_from_lark ? 1 : 0,
      now,
      now
    );

    return this.getUserById(id)!;
  }

  /**
   * ユーザーを更新
   */
  static updateUser(id: string, input: UpdateUserInput): User | null {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.email !== undefined) {
      updates.push('email = ?');
      values.push(input.email);
    }
    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.role !== undefined) {
      updates.push('role = ?');
      values.push(input.role);
    }
    if (input.lark_user_id !== undefined) {
      updates.push('lark_user_id = ?');
      values.push(input.lark_user_id);
    }
    if (input.lark_open_id !== undefined) {
      updates.push('lark_open_id = ?');
      values.push(input.lark_open_id);
    }

    if (updates.length === 0) {
      return this.getUserById(id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getUserById(id);
  }

  /**
   * ユーザーを削除
   */
  static deleteUser(id: string): boolean {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Larkユーザーと同期
   * Larkにユーザーが存在すればそのユーザーを、なければローカル登録可能
   */
  static async syncWithLark(email: string): Promise<{ inLark: boolean; user?: User }> {
    // TODO: 実際のLark API連携実装
    // 現時点では仮実装として、Lark APIから取得したと仮定

    const existingUser = this.getUserByEmail(email);

    // Larkに存在すると仮定（実装時にLark APIを呼び出す）
    const larkUserExists = false; // TODO: 実際のLark API チェック

    return {
      inLark: larkUserExists,
      user: existingUser || undefined,
    };
  }

  /**
   * パスワード変更
   */
  static async changePassword(id: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE users
      SET password = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(hashedPassword, now, id);
    return result.changes > 0;
  }
}
