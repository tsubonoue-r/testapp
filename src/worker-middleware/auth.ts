/**
 * JWT Authentication Middleware for Hono
 * Cloudflare Workers用の認証ミドルウェア
 */

import { Context, Next } from 'hono';
import { Env, HonoVariables } from '../worker-types.js';
import { JWTPayload, UserRole } from '../types/index.js';

/**
 * JWTトークンを検証
 */
async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  // JWT検証用のシークレットキーをUint8Arrayに変換
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  // HMAC-SHA256キーをインポート
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // JWT形式チェック
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 署名を検証
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    data
  );

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  // ペイロードをデコード
  const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
  const payload = JSON.parse(payloadJson) as JWTPayload & { exp?: number };

  // 有効期限チェック
  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}

/**
 * Base64 URL デコード
 */
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * JWT認証ミドルウェア
 * Authorizationヘッダーからトークンを取得し検証
 */
export async function authenticate(
  c: Context<{ Bindings: Env; Variables: HonoVariables }>,
  next: Next
): Promise<Response | void> {
  try {
    // Authorizationヘッダーを取得
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      }, 401);
    }

    // "Bearer <token>" の形式を確認
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'トークンの形式が正しくありません',
        },
      }, 401);
    }

    const token = parts[1];
    const secret = c.env.JWT_SECRET || 'your-secret-key-change-in-production';

    // トークンを検証
    const payload = await verifyJWT(token, secret);

    // コンテキストにユーザー情報を設定
    c.set('user', payload);

    await next();
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: error instanceof Error ? error.message : '無効なトークンです',
      },
    }, 401);
  }
}

/**
 * オプショナルな認証ミドルウェア
 * トークンがあれば検証するが、なくてもエラーにしない
 */
export async function optionalAuthenticate(
  c: Context<{ Bindings: Env; Variables: HonoVariables }>,
  next: Next
): Promise<void> {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      await next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      await next();
      return;
    }

    const token = parts[1];
    const secret = c.env.JWT_SECRET || 'your-secret-key-change-in-production';

    const payload = await verifyJWT(token, secret);
    c.set('user', payload);

    await next();
  } catch (error) {
    // トークンが無効でも次に進む
    await next();
  }
}

/**
 * ロールベースのアクセス制御ミドルウェア
 * 特定のロールを持つユーザーのみアクセスを許可
 */
export function requireRole(...roles: UserRole[]) {
  return async (
    c: Context<{ Bindings: Env; Variables: HonoVariables }>,
    next: Next
  ): Promise<Response | void> => {
    const user = c.get('user');

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'このリソースへのアクセス権限がありません',
        },
      }, 403);
    }

    await next();
  };
}

/**
 * 管理者のみアクセス可能
 */
export const requireAdmin = requireRole(UserRole.ADMIN);
