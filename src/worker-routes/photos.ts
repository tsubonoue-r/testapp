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
 * 写真をアップロード (R2バケット対応)
 *
 * Request Body:
 * - JSON形式の場合: メタデータのみ保存 (従来の動作)
 * - multipart/form-data形式の場合: 実際の画像ファイルをR2に保存
 */
photos.post('/upload', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';

    // Check if this is a multipart upload (actual file)
    if (contentType.includes('multipart/form-data')) {
      // Handle actual file upload to R2
      if (!c.env.UPLOADS) {
        return c.json({
          success: false,
          error: {
            code: 'R2_NOT_CONFIGURED',
            message: 'R2バケットが設定されていません。wrangler.tomlでUPLOADSバインディングを有効にしてください。',
          },
        }, 503);
      }

      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      const projectId = formData.get('projectId') as string;
      const signboardId = formData.get('signboardId') as string | null;
      const caption = formData.get('caption') as string | null;
      const locationStr = formData.get('location') as string | null;
      const metadataStr = formData.get('metadata') as string | null;
      const takenAt = formData.get('takenAt') as string | null;

      // Validation
      if (!file || !projectId) {
        return c.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ファイルとプロジェクトIDは必須です',
          },
        }, 400);
      }

      // Verify project exists
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

      // Generate unique ID for the photo
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Generate R2 key: photos/{projectId}/{id}/{filename}
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const r2Key = `photos/${projectId}/${id}/${id}.${fileExtension}`;

      // Upload to R2
      const arrayBuffer = await file.arrayBuffer();
      await c.env.UPLOADS.put(r2Key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type || 'image/jpeg',
        },
        customMetadata: {
          photoId: id,
          projectId,
          uploadedAt: now,
        },
      });

      // Parse location and metadata
      const location = locationStr ? JSON.parse(locationStr) : null;
      const metadata = metadataStr ? JSON.parse(metadataStr) : {
        size: file.size,
        type: file.type,
        originalFilename: file.name,
      };

      // Save to database
      await c.env.DB.prepare(
        'INSERT INTO photos (id, project_id, signboard_id, filename, filepath, caption, location_json, metadata_json, taken_at, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        id,
        projectId,
        signboardId || null,
        file.name,
        r2Key, // Store R2 key as filepath
        caption || null,
        location ? JSON.stringify(location) : null,
        JSON.stringify(metadata),
        takenAt || now,
        now
      ).run();

      // Get created photo
      const row = await c.env.DB.prepare(
        'SELECT * FROM photos WHERE id = ?'
      ).bind(id).first() as any;

      const photo = {
        ...row,
        location: row.location_json ? JSON.parse(row.location_json) : undefined,
        metadata: JSON.parse(row.metadata_json),
        imageUrl: `/api/photos/${id}/image`, // URL to retrieve the image
      };

      return c.json({
        success: true,
        data: photo,
        message: '写真をR2にアップロードしました',
      }, 201);

    } else {
      // Handle metadata-only upload (JSON format - backward compatibility)
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

      // Validation
      if (!projectId || !filename || !filepath || !metadata) {
        return c.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'プロジェクトID、ファイル名、ファイルパス、メタデータは必須です',
          },
        }, 400);
      }

      // Verify project exists
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

      // Create new photo record
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

      // Get created photo
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
        message: '写真メタデータを保存しました',
      }, 201);
    }
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
 * GET /api/photos/:id/image
 * R2バケットから画像を取得
 */
photos.get('/:id/image', async (c) => {
  try {
    const id = c.req.param('id');

    // Get photo record from database
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

    // Check if R2 is configured
    if (!c.env.UPLOADS) {
      return c.json({
        success: false,
        error: {
          code: 'R2_NOT_CONFIGURED',
          message: 'R2バケットが設定されていません',
        },
      }, 503);
    }

    // Get image from R2
    const r2Object = await c.env.UPLOADS.get(row.filepath);

    if (!r2Object) {
      return c.json({
        success: false,
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: 'R2バケットに画像が見つかりません',
        },
      }, 404);
    }

    // Return image with appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', r2Object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', r2Object.httpEtag);

    // Add CORS headers
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(r2Object.body, {
      headers,
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
 * DELETE /api/photos/:id
 * 写真を削除 (R2バケットからも削除)
 */
photos.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // Get photo record
    const existing = await c.env.DB.prepare(
      'SELECT * FROM photos WHERE id = ?'
    ).bind(id).first() as any;

    if (!existing) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '写真が見つかりません',
        },
      }, 404);
    }

    // Delete from R2 if it exists and R2 is configured
    if (c.env.UPLOADS && existing.filepath) {
      try {
        await c.env.UPLOADS.delete(existing.filepath);
      } catch (error) {
        console.warn('Failed to delete from R2:', error);
        // Continue even if R2 deletion fails
      }
    }

    // Delete from database
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
