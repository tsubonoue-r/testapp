/**
 * Photo Repository
 * SQLiteデータベースを使用した写真データ管理
 */

import { db } from '../database.js';
import { Photo, PhotoLocation, PhotoMetadata, Pagination, ListResult } from '../../types/index.js';

export class PhotoRepository {
  /**
   * 写真を作成
   */
  create(photo: Omit<Photo, 'uploadedAt'>): Photo {
    const stmt = db.prepare(`
      INSERT INTO photos (id, project_id, signboard_id, filename, filepath, thumbnail_path, caption, location_json, metadata_json, taken_at, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      photo.id,
      photo.projectId,
      photo.signboardId || null,
      photo.filename,
      photo.filepath,
      photo.thumbnailPath || null,
      photo.caption || null,
      photo.location ? JSON.stringify(photo.location) : null,
      JSON.stringify(photo.metadata),
      photo.takenAt.toISOString()
    );

    const created = this.findById(photo.id);
    if (!created) {
      throw new Error('写真の作成に失敗しました');
    }

    return created;
  }

  /**
   * IDで写真を検索
   */
  findById(id: string): Photo | null {
    const stmt = db.prepare('SELECT * FROM photos WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.mapRowToPhoto(row);
  }

  /**
   * 案件IDで写真を取得（ページネーション対応）
   */
  findByProjectId(projectId: string, options: { page?: number; limit?: number } = {}): ListResult<Photo> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    // 総数を取得
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM photos WHERE project_id = ?');
    const countRow = countStmt.get(projectId) as any;
    const total = countRow.count;

    // データを取得
    const dataStmt = db.prepare(`
      SELECT * FROM photos
      WHERE project_id = ?
      ORDER BY taken_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(projectId, limit, offset) as any[];

    const items = rows.map(row => this.mapRowToPhoto(row));

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
   * 工事看板IDで写真を取得
   */
  findBySignboardId(signboardId: string): Photo[] {
    const stmt = db.prepare('SELECT * FROM photos WHERE signboard_id = ? ORDER BY taken_at DESC');
    const rows = stmt.all(signboardId) as any[];

    return rows.map(row => this.mapRowToPhoto(row));
  }

  /**
   * 全写真を取得（ページネーション対応）
   */
  findAll(options: { page?: number; limit?: number } = {}): ListResult<Photo> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    // 総数を取得
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM photos');
    const countRow = countStmt.get() as any;
    const total = countRow.count;

    // データを取得
    const dataStmt = db.prepare(`
      SELECT * FROM photos
      ORDER BY taken_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(limit, offset) as any[];

    const items = rows.map(row => this.mapRowToPhoto(row));

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
   * 写真を更新
   */
  update(id: string, updates: Partial<Omit<Photo, 'id' | 'projectId' | 'uploadedAt'>>): Photo | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.signboardId !== undefined) {
      fields.push('signboard_id = ?');
      values.push(updates.signboardId);
    }
    if (updates.filename !== undefined) {
      fields.push('filename = ?');
      values.push(updates.filename);
    }
    if (updates.filepath !== undefined) {
      fields.push('filepath = ?');
      values.push(updates.filepath);
    }
    if (updates.thumbnailPath !== undefined) {
      fields.push('thumbnail_path = ?');
      values.push(updates.thumbnailPath);
    }
    if (updates.caption !== undefined) {
      fields.push('caption = ?');
      values.push(updates.caption);
    }
    if (updates.location !== undefined) {
      fields.push('location_json = ?');
      values.push(updates.location ? JSON.stringify(updates.location) : null);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata_json = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.takenAt !== undefined) {
      fields.push('taken_at = ?');
      values.push(updates.takenAt.toISOString());
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE photos
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * 写真を削除
   */
  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM photos WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * 案件の写真を全削除
   */
  deleteByProjectId(projectId: string): number {
    const stmt = db.prepare('DELETE FROM photos WHERE project_id = ?');
    const result = stmt.run(projectId);

    return result.changes;
  }

  /**
   * データベース行をPhotoオブジェクトにマッピング
   */
  private mapRowToPhoto(row: any): Photo {
    return {
      id: row.id,
      projectId: row.project_id,
      signboardId: row.signboard_id || undefined,
      filename: row.filename,
      filepath: row.filepath,
      thumbnailPath: row.thumbnail_path || undefined,
      caption: row.caption || undefined,
      location: row.location_json ? JSON.parse(row.location_json) as PhotoLocation : undefined,
      metadata: JSON.parse(row.metadata_json) as PhotoMetadata,
      takenAt: new Date(row.taken_at),
      uploadedAt: new Date(row.uploaded_at),
    };
  }
}

// シングルトンインスタンスをエクスポート
export const photoRepository = new PhotoRepository();
