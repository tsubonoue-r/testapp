/**
 * Authentication Routes for Hono
 * ユーザー登録・ログイン・トークン管理
 */

import { Hono } from 'hono';
import { Env, HonoVariables } from '../worker-types.js';
import { UserRole, User } from '../types/index.js';
import { authenticate } from '../worker-middleware/auth.js';

const auth = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

/**
 * パスワードをハッシュ化（bcrypt互換）
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * パスワードを検証
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

/**
 * JWTトークンを生成
 */
async function generateToken(user: Omit<User, 'password'>, secret: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24時間
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const keyData = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureB64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * POST /api/auth/register
 * ユーザー登録
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      password: string;
      name: string;
      role?: UserRole;
    }>();

    const { email, password, name, role } = body;

    // バリデーション
    if (!email || !password || !name) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレス、パスワード、名前は必須です',
        },
      }, 400);
    }

    if (password.length < 8) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'パスワードは8文字以上である必要があります',
        },
      }, 400);
    }

    // メールアドレスの重複チェック
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existingUser) {
      return c.json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'このメールアドレスは既に登録されています',
        },
      }, 400);
    }

    // パスワードをハッシュ化
    const hashedPassword = await hashPassword(password);

    // ユーザーを作成
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'INSERT INTO users (id, email, password, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(userId, email, hashedPassword, name, role || UserRole.USER, now, now).run();

    // 作成したユーザーを取得
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?'
    ).bind(userId).first() as Omit<User, 'password'>;

    // JWTトークンを生成
    const secret = c.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = await generateToken(user, secret);

    return c.json({
      success: true,
      data: { user, token },
      message: 'ユーザー登録が完了しました',
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: error instanceof Error ? error.message : '登録に失敗しました',
      },
    }, 400);
  }
});

/**
 * POST /api/auth/login
 * ログイン
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      password: string;
    }>();

    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレスとパスワードは必須です',
        },
      }, 400);
    }

    // ユーザーを検索
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first() as User | null;

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
      }, 401);
    }

    // パスワードを検証
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return c.json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
      }, 401);
    }

    // パスワードを除外
    const { password: _, ...userWithoutPassword } = user;

    // JWTトークンを生成
    const secret = c.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = await generateToken(userWithoutPassword, secret);

    return c.json({
      success: true,
      data: { user: userWithoutPassword, token },
      message: 'ログインしました',
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: error instanceof Error ? error.message : 'ログインに失敗しました',
      },
    }, 401);
  }
});

/**
 * GET /api/auth/me
 * 現在のユーザー情報を取得（要認証）
 */
auth.get('/me', authenticate, async (c) => {
  try {
    const currentUser = c.get('user');

    if (!currentUser) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      }, 401);
    }

    const user = await c.env.DB.prepare(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?'
    ).bind(currentUser.userId).first() as Omit<User, 'password'> | null;

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
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ユーザー情報の取得に失敗しました',
      },
    }, 500);
  }
});

/**
 * POST /api/auth/change-password
 * パスワード変更（要認証）
 */
auth.post('/change-password', authenticate, async (c) => {
  try {
    const currentUser = c.get('user');

    if (!currentUser) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      }, 401);
    }

    const body = await c.req.json<{
      oldPassword: string;
      newPassword: string;
    }>();

    const { oldPassword, newPassword } = body;

    // バリデーション
    if (!oldPassword || !newPassword) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '現在のパスワードと新しいパスワードは必須です',
        },
      }, 400);
    }

    if (newPassword.length < 8) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'パスワードは8文字以上である必要があります',
        },
      }, 400);
    }

    // ユーザーを検索
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(currentUser.userId).first() as User | null;

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      }, 404);
    }

    // 旧パスワードを検証
    const isPasswordValid = await verifyPassword(oldPassword, user.password);
    if (!isPasswordValid) {
      return c.json({
        success: false,
        error: {
          code: 'PASSWORD_ERROR',
          message: '現在のパスワードが正しくありません',
        },
      }, 400);
    }

    // 新パスワードをハッシュ化
    const hashedPassword = await hashPassword(newPassword);

    // パスワードを更新
    await c.env.DB.prepare(
      'UPDATE users SET password = ?, updated_at = ? WHERE id = ?'
    ).bind(hashedPassword, new Date().toISOString(), currentUser.userId).run();

    return c.json({
      success: true,
      message: 'パスワードを変更しました',
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_ERROR',
        message: error instanceof Error ? error.message : 'パスワード変更に失敗しました',
      },
    }, 400);
  }
});

/**
 * POST /api/auth/refresh
 * トークンのリフレッシュ（要認証）
 */
auth.post('/refresh', authenticate, async (c) => {
  try {
    const currentUser = c.get('user');

    if (!currentUser) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      }, 401);
    }

    const user = await c.env.DB.prepare(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?'
    ).bind(currentUser.userId).first() as Omit<User, 'password'> | null;

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      }, 404);
    }

    // 新しいトークンを生成
    const secret = c.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = await generateToken(user, secret);

    return c.json({
      success: true,
      data: { token },
      message: 'トークンをリフレッシュしました',
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'TOKEN_REFRESH_ERROR',
        message: 'トークンのリフレッシュに失敗しました',
      },
    }, 500);
  }
});

export default auth;
