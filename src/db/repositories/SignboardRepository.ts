/**
 * Signboard Repository
 * SQLiteデータベースを使用した工事看板データ管理
 */

import { db } from '../database.js';
import { Signboard, SignboardContent, SignboardTemplate } from '../../types/index.js';

export class SignboardRepository {
  /**
   * 工事看板を作成
   */
  create(signboard: Omit<Signboard, 'createdAt' | 'updatedAt'>): Signboard {
    const stmt = db.prepare(`
      INSERT INTO signboards (id, project_id, title, content_json, template, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      signboard.id,
      signboard.projectId,
      signboard.title,
      JSON.stringify(signboard.content),
      signboard.template
    );

    const created = this.findById(signboard.id);
    if (!created) {
      throw new Error('工事看板の作成に失敗しました');
    }

    return created;
  }

  /**
   * IDで工事看板を検索
   */
  findById(id: string): Signboard | null {
    const stmt = db.prepare('SELECT * FROM signboards WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.mapRowToSignboard(row);
  }

  /**
   * 案件IDで工事看板を取得
   */
  findByProjectId(projectId: string): Signboard[] {
    const stmt = db.prepare('SELECT * FROM signboards WHERE project_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(projectId) as any[];

    return rows.map(row => this.mapRowToSignboard(row));
  }

  /**
   * 全工事看板を取得
   */
  findAll(): Signboard[] {
    const stmt = db.prepare('SELECT * FROM signboards ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => this.mapRowToSignboard(row));
  }

  /**
   * 工事看板を更新
   */
  update(id: string, updates: Partial<Omit<Signboard, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Signboard | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      fields.push('content_json = ?');
      values.push(JSON.stringify(updates.content));
    }
    if (updates.template !== undefined) {
      fields.push('template = ?');
      values.push(updates.template);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE signboards
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * 工事看板を削除
   */
  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM signboards WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * 案件の工事看板を全削除
   */
  deleteByProjectId(projectId: string): number {
    const stmt = db.prepare('DELETE FROM signboards WHERE project_id = ?');
    const result = stmt.run(projectId);

    return result.changes;
  }

  /**
   * データベース行をSignboardオブジェクトにマッピング
   */
  private mapRowToSignboard(row: any): Signboard {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      content: JSON.parse(row.content_json) as SignboardContent,
      template: row.template as SignboardTemplate,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// シングルトンインスタンスをエクスポート
export const signboardRepository = new SignboardRepository();
