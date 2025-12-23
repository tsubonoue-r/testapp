/**
 * Photos Routes for Hono
 * 写真管理API
 */

import { Hono } from 'hono';
import { Env, HonoVariables } from '../worker-types.js';
import { Photo } from '../types/index.js';

const photos = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

/**
 * GET /api/photos
 * 写真一覧を取得
 */
photos.get('/', async (c) => {
  try {
    const projectId = c.req.query('projectId');
    const signboardId = c.req.query('signboardId');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');

    let query = 'SELECT * FROM photos WHERE 1=1';
    const params: any[] = [];

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    }

    if (signboardId) {
      query += ' AND signboard_id = ?';
      params.push(signboardId);
    }

    query += ' ORDER BY taken_at DESC';

    // 総数を取得
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first() as { count: number } | null;
    const total = countResult?.count || 0;

    // ページネーション
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // JSONフィールドをパース
    const items = result.results.map((row: any) => ({
      ...row,
      location: row.location_json ? JSON.parse(row.location_json) : undefined,
      metadata: JSON.parse(row.metadata_json),
    }));

    return c.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }, 500);
  }
});

/**
 * GET /api/photos/:id
 * 特定の写真を取得
 */
photos.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare(
      'SELECT * FROM photos WHERE id = ?'
    ).bind(id).first() as any;

    if (!row) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '写真が見つかりません',
        },
      }, 404);
    }

    // JSONフィールドをパース
    const photo = {
      ...row,
      location: row.location_json ? JSON.parse(row.location_json) : undefined,
      metadata: JSON.parse(row.metadata_json),
    };

    return c.json({
      success: true,
      data: photo,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }, 500);
  }
});

/**
 * POST /api/photos/upload
 * 写真をアップロード
 * 注: R2が未設定のため、メタデータのみ保存
 */
photos.post('/upload', async (c) => {
  try {
    const body = await c.req.json<{
      projectId: string;
      signboardId?: string;
      filename: string;
      filepath: string;
      caption?: string;
      category?: any;
      location?: any;
      metadata: any;
      takenAt?: string;
    }>();

    const {
      projectId,
      signboardId,
      filename,
      filepath,
      caption,
      category,
      location,
      metadata,
      takenAt,
    } = body;

    // バリデーション
    if (!projectId || !filename || !filepath || !metadata) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'プロジェクトID、ファイル名、ファイルパス、メタデータは必須です',
        },
      }, 400);
    }

    // プロジェクトが存在するか確認
    const project = await c.env.DB.prepare(
      'SELECT id FROM projects WHERE id = ?'
    ).bind(projectId).first();

    if (!project) {
      return c.json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
      }, 404);
    }

    // 新しい写真を作成
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const locationJson = location ? JSON.stringify(location) : null;
    const metadataJson = JSON.stringify(metadata);

    await c.env.DB.prepare(
      'INSERT INTO photos (id, project_id, signboard_id, filename, filepath, caption, location_json, metadata_json, taken_at, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      projectId,
      signboardId || null,
      filename,
      filepath,
      caption || null,
      locationJson,
      metadataJson,
      takenAt || now,
      now
    ).run();

    // 作成した写真を取得
    const row = await c.env.DB.prepare(
      'SELECT * FROM photos WHERE id = ?'
    ).bind(id).first() as any;

    const photo = {
      ...row,
      location: row.location_json ? JSON.parse(row.location_json) : undefined,
      metadata: JSON.parse(row.metadata_json),
    };

    return c.json({
      success: true,
      data: photo,
      message: '写真をアップロードしました',
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }, 400);
  }
});

/**
 * PUT /api/photos/:id
 * 写真を更新
 */
photos.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json<{
      caption?: string;
      category?: any;
      location?: any;
    }>();

    // 写真が存在するか確認
    const existing = await c.env.DB.prepare(
      'SELECT * FROM photos WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '写真が見つかりません',
        },
      }, 404);
    }

    // 更新フィールドを構築
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.caption !== undefined) {
      fields.push('caption = ?');
      params.push(updates.caption);
    }
    if (updates.location !== undefined) {
      fields.push('location_json = ?');
      params.push(JSON.stringify(updates.location));
    }

    if (fields.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: '更新する内容がありません',
        },
      }, 400);
    }

    params.push(id);

    // 更新を実行
    await c.env.DB.prepare(
      `UPDATE photos SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // 更新後の写真を取得
    const row = await c.env.DB.prepare(
      'SELECT * FROM photos WHERE id = ?'
    ).bind(id).first() as any;

    const photo = {
      ...row,
      location: row.location_json ? JSON.parse(row.location_json) : undefined,
      metadata: JSON.parse(row.metadata_json),
    };

    return c.json({
      success: true,
      data: photo,
      message: '写真を更新しました',
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }, 400);
  }
});

/**
 * DELETE /api/photos/:id
 * 写真を削除
 */
photos.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // 写真が存在するか確認
    const existing = await c.env.DB.prepare(
      'SELECT * FROM photos WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '写真が見つかりません',
        },
      }, 404);
    }

    // 写真を削除
    await c.env.DB.prepare(
      'DELETE FROM photos WHERE id = ?'
    ).bind(id).run();

    return c.json({
      success: true,
      message: '写真を削除しました',
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }, 500);
  }
});

export default photos;
