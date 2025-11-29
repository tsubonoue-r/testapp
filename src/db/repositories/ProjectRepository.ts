/**
 * Project Repository
 * SQLiteデータベースを使用した案件データ管理
 */

import { db } from '../database.js';
import { Project, ProjectStatus, Pagination, ListResult } from '../../types/index.js';

export class ProjectRepository {
  /**
   * 案件を作成
   */
  create(project: Omit<Project, 'createdAt' | 'updatedAt'> & { userId: string }): Project {
    const stmt = db.prepare(`
      INSERT INTO projects (id, name, description, location, start_date, end_date, status, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      project.id,
      project.name,
      project.description || null,
      project.location,
      project.startDate.toISOString(),
      project.endDate?.toISOString() || null,
      project.status,
      project.userId
    );

    const created = this.findById(project.id);
    if (!created) {
      throw new Error('案件の作成に失敗しました');
    }

    return created;
  }

  /**
   * IDで案件を検索
   */
  findById(id: string): Project | null {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.mapRowToProject(row);
  }

  /**
   * 案件一覧を取得（ページネーション・フィルタリング対応）
   */
  findAll(options: {
    page?: number;
    limit?: number;
    status?: ProjectStatus;
    userId?: string;
  } = {}): ListResult<Project> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    // WHERE句の構築
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }

    if (options.userId) {
      conditions.push('user_id = ?');
      params.push(options.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 総数を取得
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM projects ${whereClause}`);
    const countRow = countStmt.get(...params) as any;
    const total = countRow.count;

    // データを取得
    const dataStmt = db.prepare(`
      SELECT * FROM projects
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(...params, limit, offset) as any[];

    const items = rows.map(row => this.mapRowToProject(row));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 案件を更新
   */
  update(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Project | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.location !== undefined) {
      fields.push('location = ?');
      values.push(updates.location);
    }
    if (updates.startDate !== undefined) {
      fields.push('start_date = ?');
      values.push(updates.startDate.toISOString());
    }
    if (updates.endDate !== undefined) {
      fields.push('end_date = ?');
      values.push(updates.endDate?.toISOString() || null);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE projects
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * 案件のステータスを更新
   */
  updateStatus(id: string, status: ProjectStatus): Project | null {
    return this.update(id, { status });
  }

  /**
   * 案件を削除
   */
  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * 案件を検索（名前、説明、場所で部分一致検索）
   */
  search(query: string, options: { page?: number; limit?: number } = {}): ListResult<Project> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const searchPattern = `%${query}%`;

    // 総数を取得
    const countStmt = db.prepare(`
      SELECT COUNT(*) as count FROM projects
      WHERE name LIKE ? OR description LIKE ? OR location LIKE ?
    `);
    const countRow = countStmt.get(searchPattern, searchPattern, searchPattern) as any;
    const total = countRow.count;

    // データを取得
    const dataStmt = db.prepare(`
      SELECT * FROM projects
      WHERE name LIKE ? OR description LIKE ? OR location LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(searchPattern, searchPattern, searchPattern, limit, offset) as any[];

    const items = rows.map(row => this.mapRowToProject(row));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * データベース行をProjectオブジェクトにマッピング
   */
  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      location: row.location,
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      status: row.status as ProjectStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// シングルトンインスタンスをエクスポート
export const projectRepository = new ProjectRepository();
