/**
 * Admin API Routes (Cloudflare Workers / Hono)
 * 管理画面用API
 */

import { Hono } from 'hono';
import type { Env, HonoVariables } from '../worker-types.js';

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

/**
 * GET /api/admin/users
 * 全ユーザー一覧を取得
 */
app.get('/users', async (c) => {
  try {
    // TODO: 認証チェック（管理者のみアクセス可能）

    const db = c.env.DB;
    const { results } = await db.prepare(`
      SELECT
        id, email, name, role,
        lark_user_id, lark_open_id, is_from_lark,
        created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    return c.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('ユーザー一覧取得エラー:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_USERS_ERROR',
        message: error.message,
      },
    }, 500);
  }
});

/**
 * GET /api/admin/users/:id
 * ユーザー詳細を取得
 */
app.get('/users/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const db = c.env.DB;

    const user = await db.prepare(`
      SELECT
        id, email, name, role,
        lark_user_id, lark_open_id, is_from_lark,
        created_at, updated_at
      FROM users
      WHERE id = ?
    `).bind(id).first();

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      }, 404);
    }

    return c.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('ユーザー詳細取得エラー:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_USER_ERROR',
        message: error.message,
      },
    }, 500);
  }
});

/**
 * POST /api/admin/users
 * 新規ユーザー作成
 */
app.post('/users', async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, role, password, lark_user_id, lark_open_id } = body;

    if (!email || !name || !password) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'email, name, password は必須です',
        },
      }, 400);
    }

    const db = c.env.DB;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // パスワードハッシュ化（実際にはbcryptを使用するべきだが、Workers環境では代替手段を使用）
    const hashedPassword = await hashPassword(password);

    await db.prepare(`
      INSERT INTO users (
        id, email, password, name, role,
        lark_user_id, lark_open_id, is_from_lark,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      email,
      hashedPassword,
      name,
      role || 'user',
      lark_user_id || null,
      lark_open_id || null,
      lark_user_id ? 1 : 0,
      now,
      now
    ).run();

    return c.json({
      success: true,
      data: {
        id,
        email,
        name,
        role: role || 'user',
        created_at: now,
      },
    }, 201);
  } catch (error: any) {
    console.error('ユーザー作成エラー:', error);
    return c.json({
      success: false,
      error: {
        code: 'CREATE_USER_ERROR',
        message: error.message,
      },
    }, 500);
  }
});

/**
 * PUT /api/admin/users/:id
 * ユーザー情報を更新
 */
app.put('/users/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { email, name, role, lark_user_id, lark_open_id } = body;

    const db = c.env.DB;
    const updates: string[] = [];
    const values: any[] = [];

    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (lark_user_id !== undefined) {
      updates.push('lark_user_id = ?');
      values.push(lark_user_id);
    }
    if (lark_open_id !== undefined) {
      updates.push('lark_open_id = ?');
      values.push(lark_open_id);
    }

    if (updates.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: '更新する項目がありません',
        },
      }, 400);
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run();

    return c.json({
      success: true,
      data: { id, updated_at: now },
    });
  } catch (error: any) {
    console.error('ユーザー更新エラー:', error);
    return c.json({
      success: false,
      error: {
        code: 'UPDATE_USER_ERROR',
        message: error.message,
      },
    }, 500);
  }
});

/**
 * DELETE /api/admin/users/:id
 * ユーザーを削除
 */
app.delete('/users/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const db = c.env.DB;

    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

    return c.json({
      success: true,
      data: { id },
    });
  } catch (error: any) {
    console.error('ユーザー削除エラー:', error);
    return c.json({
      success: false,
      error: {
        code: 'DELETE_USER_ERROR',
        message: error.message,
      },
    }, 500);
  }
});

/**
 * POST /api/admin/users/sync-lark
 * Larkからユーザー情報を同期
 */
app.post('/users/sync-lark', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'email は必須です',
        },
      }, 400);
    }

    // TODO: Lark API連携実装
    // 実際のLark APIを使用してユーザー情報を取得

    const db = c.env.DB;
    const existingUser = await db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first();

    return c.json({
      success: true,
      data: {
        inLark: false, // TODO: 実際のLark APIチェック結果
        user: existingUser || null,
        message: 'Lark API連携は未実装です。手動でユーザーを作成してください。',
      },
    });
  } catch (error: any) {
    console.error('Lark同期エラー:', error);
    return c.json({
      success: false,
      error: {
        code: 'LARK_SYNC_ERROR',
        message: error.message,
      },
    }, 500);
  }
});

/**
 * GET /api/admin/projects
 * 全プロジェクト一覧（管理画面用）
 */
app.get('/projects', async (c) => {
  try {
    const db = c.env.DB;
    const { results } = await db.prepare(`
      SELECT
        p.*,
        u.name as user_name,
        u.email as user_email
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();

    return c.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('プロジェクト一覧取得エラー:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_PROJECTS_ERROR',
        message: error.message,
      },
    }, 500);
  }
});

/**
 * GET /api/admin/stats
 * 管理画面用統計情報
 */
app.get('/stats', async (c) => {
  try {
    const db = c.env.DB;

    const [userCount, projectCount, photoCount] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM users').first(),
      db.prepare('SELECT COUNT(*) as count FROM projects').first(),
      db.prepare('SELECT COUNT(*) as count FROM photos').first(),
    ]);

    return c.json({
      success: true,
      data: {
        users: userCount?.count || 0,
        projects: projectCount?.count || 0,
        photos: photoCount?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('統計情報取得エラー:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_STATS_ERROR',
        message: error.message,
      },
    }, 500);
  }
});

/**
 * パスワードハッシュ化（Web Crypto API使用）
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default app;
