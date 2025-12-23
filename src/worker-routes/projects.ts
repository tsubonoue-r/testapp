/**
 * Projects Routes for Hono
 * 案件管理API
 */

import { Hono } from 'hono';
import { Env, HonoVariables } from '../worker-types.js';
import { ProjectStatus, Project } from '../types/index.js';

const projects = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

/**
 * GET /api/projects
 * 案件一覧を取得
 */
projects.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const status = c.req.query('status') as ProjectStatus | undefined;

    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    // 総数を取得
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first() as { count: number } | null;
    const total = countResult?.count || 0;

    // ページネーション
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();
    const items = result.results as unknown as Project[];

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
 * GET /api/projects/:id
 * 特定の案件を取得
 */
projects.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).bind(id).first() as Project | null;

    if (!project) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `案件が見つかりません: ${id}`,
        },
      }, 404);
    }

    return c.json({
      success: true,
      data: project,
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
 * POST /api/projects
 * 新しい案件を作成
 */
projects.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      description?: string;
      location: string;
      startDate: string;
      endDate?: string;
      userId?: string;
    }>();

    const { name, description, location, startDate, endDate, userId } = body;

    // バリデーション
    if (!name || !location || !startDate) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '名前、場所、開始日は必須です',
        },
      }, 400);
    }

    // 新しい案件を作成
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'INSERT INTO projects (id, name, description, location, start_date, end_date, status, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      name,
      description || null,
      location,
      startDate,
      endDate || null,
      ProjectStatus.PLANNED,
      userId || 'system',
      now,
      now
    ).run();

    // 作成した案件を取得
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).bind(id).first() as Project;

    return c.json({
      success: true,
      data: project,
      message: '案件を作成しました',
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
 * PUT /api/projects/:id
 * 案件を更新
 */
projects.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json<Partial<Project>>();

    // 案件が存在するか確認
    const existing = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `案件が見つかりません: ${id}`,
        },
      }, 404);
    }

    // 更新フィールドを構築
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }
    if (updates.location !== undefined) {
      fields.push('location = ?');
      params.push(updates.location);
    }
    if (updates.startDate !== undefined) {
      fields.push('start_date = ?');
      params.push(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      fields.push('end_date = ?');
      params.push(updates.endDate);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    // 更新を実行
    await c.env.DB.prepare(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // 更新後の案件を取得
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).bind(id).first() as Project;

    return c.json({
      success: true,
      data: project,
      message: '案件を更新しました',
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
 * PATCH /api/projects/:id/status
 * 案件のステータスを更新
 */
projects.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<{ status: ProjectStatus }>();
    const { status } = body;

    if (!status) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ステータスは必須です',
        },
      }, 400);
    }

    // 案件が存在するか確認
    const existing = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `案件が見つかりません: ${id}`,
        },
      }, 404);
    }

    // ステータスを更新
    await c.env.DB.prepare(
      'UPDATE projects SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(status, new Date().toISOString(), id).run();

    // 更新後の案件を取得
    const project = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).bind(id).first() as Project;

    return c.json({
      success: true,
      data: project,
      message: 'ステータスを更新しました',
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
 * DELETE /api/projects/:id
 * 案件を削除
 */
projects.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // 案件が存在するか確認
    const existing = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `案件が見つかりません: ${id}`,
        },
      }, 404);
    }

    // 案件を削除
    await c.env.DB.prepare(
      'DELETE FROM projects WHERE id = ?'
    ).bind(id).run();

    return c.json({
      success: true,
      message: '案件を削除しました',
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
 * GET /api/projects/search/query
 * 案件を検索
 */
projects.get('/search/query', async (c) => {
  try {
    const query = c.req.query('q');

    if (!query) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '検索クエリが必要です',
        },
      }, 400);
    }

    const searchPattern = `%${query}%`;
    const result = await c.env.DB.prepare(
      'SELECT * FROM projects WHERE name LIKE ? OR description LIKE ? OR location LIKE ? ORDER BY created_at DESC'
    ).bind(searchPattern, searchPattern, searchPattern).all();

    return c.json({
      success: true,
      data: result.results,
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

export default projects;
