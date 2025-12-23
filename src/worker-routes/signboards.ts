/**
 * Signboards Routes for Hono
 * 工事看板管理API
 */

import { Hono } from 'hono';
import { Env, HonoVariables } from '../worker-types.js';
import { Signboard, SignboardTemplate } from '../types/index.js';

const signboards = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

/**
 * GET /api/signboards
 * 工事看板一覧を取得
 */
signboards.get('/', async (c) => {
  try {
    const projectId = c.req.query('projectId');

    let query = 'SELECT * FROM signboards';
    const params: any[] = [];

    if (projectId) {
      query += ' WHERE project_id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // content_jsonをパース
    const signboards = result.results.map((row: any) => ({
      ...row,
      content: JSON.parse(row.content_json),
    }));

    return c.json({
      success: true,
      data: signboards,
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
 * GET /api/signboards/:id
 * 特定の工事看板を取得
 */
signboards.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare(
      'SELECT * FROM signboards WHERE id = ?'
    ).bind(id).first() as any;

    if (!row) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '工事看板が見つかりません',
        },
      }, 404);
    }

    // content_jsonをパース
    const signboard = {
      ...row,
      content: JSON.parse(row.content_json),
    };

    return c.json({
      success: true,
      data: signboard,
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
 * POST /api/signboards
 * 新しい工事看板を作成
 */
signboards.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      projectId: string;
      title: string;
      content: any;
      template?: SignboardTemplate;
    }>();

    const { projectId, title, content, template } = body;

    // バリデーション
    if (!projectId || !title || !content) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'プロジェクトID、タイトル、内容は必須です',
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

    // 新しい工事看板を作成
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const contentJson = JSON.stringify(content);

    await c.env.DB.prepare(
      'INSERT INTO signboards (id, project_id, title, content_json, template, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      projectId,
      title,
      contentJson,
      template || SignboardTemplate.STANDARD,
      now,
      now
    ).run();

    // 作成した工事看板を取得
    const row = await c.env.DB.prepare(
      'SELECT * FROM signboards WHERE id = ?'
    ).bind(id).first() as any;

    const signboard = {
      ...row,
      content: JSON.parse(row.content_json),
    };

    return c.json({
      success: true,
      data: signboard,
      message: '工事看板を作成しました',
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }, 400);
  }
});

/**
 * PUT /api/signboards/:id
 * 工事看板を更新
 */
signboards.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json<{
      title?: string;
      content?: any;
      template?: SignboardTemplate;
    }>();

    // 工事看板が存在するか確認
    const existing = await c.env.DB.prepare(
      'SELECT * FROM signboards WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '工事看板が見つかりません',
        },
      }, 404);
    }

    // 更新フィールドを構築
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }
    if (updates.content !== undefined) {
      fields.push('content_json = ?');
      params.push(JSON.stringify(updates.content));
    }
    if (updates.template !== undefined) {
      fields.push('template = ?');
      params.push(updates.template);
    }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    // 更新を実行
    await c.env.DB.prepare(
      `UPDATE signboards SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // 更新後の工事看板を取得
    const row = await c.env.DB.prepare(
      'SELECT * FROM signboards WHERE id = ?'
    ).bind(id).first() as any;

    const signboard = {
      ...row,
      content: JSON.parse(row.content_json),
    };

    return c.json({
      success: true,
      data: signboard,
      message: '工事看板を更新しました',
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
 * DELETE /api/signboards/:id
 * 工事看板を削除
 */
signboards.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // 工事看板が存在するか確認
    const existing = await c.env.DB.prepare(
      'SELECT * FROM signboards WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '工事看板が見つかりません',
        },
      }, 404);
    }

    // 工事看板を削除
    await c.env.DB.prepare(
      'DELETE FROM signboards WHERE id = ?'
    ).bind(id).run();

    return c.json({
      success: true,
      message: '工事看板を削除しました',
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

export default signboards;
