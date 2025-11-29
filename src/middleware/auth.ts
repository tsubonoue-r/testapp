/**
 * JWT Authentication Middleware
 * リクエストヘッダーからJWTトークンを検証し、ユーザー情報を付与
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService.js';
import { JWTPayload, UserRole } from '../types/index.js';

// Expressの型を拡張してユーザー情報を追加
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * JWT認証ミドルウェア
 * Authorizationヘッダーからトークンを取得し検証
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Authorizationヘッダーを取得
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      });
      return;
    }

    // "Bearer <token>" の形式を確認
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'トークンの形式が正しくありません',
        },
      });
      return;
    }

    const token = parts[1];

    // トークンを検証
    const payload = authService.verifyToken(token);

    // リクエストにユーザー情報を付与
    req.user = payload;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: '無効なトークンです',
      },
    });
  }
}

/**
 * オプショナルな認証ミドルウェア
 * トークンがあれば検証するが、なくてもエラーにしない
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      next();
      return;
    }

    const token = parts[1];
    const payload = authService.verifyToken(token);
    req.user = payload;

    next();
  } catch (error) {
    // トークンが無効でも次に進む
    next();
  }
}

/**
 * ロールベースのアクセス制御ミドルウェア
 * 特定のロールを持つユーザーのみアクセスを許可
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'このリソースへのアクセス権限がありません',
        },
      });
      return;
    }

    next();
  };
}

/**
 * 管理者のみアクセス可能
 */
export const requireAdmin = requireRole(UserRole.ADMIN);
