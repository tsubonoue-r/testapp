/**
 * Authentication Routes
 * ユーザー登録・ログイン・トークン管理
 */

import express, { Request, Response } from 'express';
import { authService } from '../services/AuthService.js';
import { authenticate } from '../middleware/auth.js';
import { UserRole } from '../types/index.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * ユーザー登録
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // バリデーション
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレス、パスワード、名前は必須です',
        },
      });
      return;
    }

    // ユーザー登録
    const result = await authService.register({
      email,
      password,
      name,
      role: role || UserRole.USER,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'ユーザー登録が完了しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: error instanceof Error ? error.message : '登録に失敗しました',
      },
    });
  }
});

/**
 * POST /api/auth/login
 * ログイン
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // バリデーション
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレスとパスワードは必須です',
        },
      });
      return;
    }

    // ログイン
    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result,
      message: 'ログインしました',
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: error instanceof Error ? error.message : 'ログインに失敗しました',
      },
    });
  }
});

/**
 * GET /api/auth/me
 * 現在のユーザー情報を取得（要認証）
 */
router.get('/me', authenticate, (req: Request, res: Response) => {
  try {
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

    const user = authService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ユーザー情報の取得に失敗しました',
      },
    });
  }
});

/**
 * POST /api/auth/change-password
 * パスワード変更（要認証）
 */
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
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

    const { oldPassword, newPassword } = req.body;

    // バリデーション
    if (!oldPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '現在のパスワードと新しいパスワードは必須です',
        },
      });
      return;
    }

    // パスワード変更
    await authService.changePassword(req.user.userId, oldPassword, newPassword);

    res.json({
      success: true,
      message: 'パスワードを変更しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_ERROR',
        message: error instanceof Error ? error.message : 'パスワード変更に失敗しました',
      },
    });
  }
});

/**
 * POST /api/auth/refresh
 * トークンのリフレッシュ（要認証）
 */
router.post('/refresh', authenticate, (req: Request, res: Response) => {
  try {
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

    const user = authService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      });
      return;
    }

    // 新しいトークンを生成
    const token = authService.generateToken({
      ...user,
      password: '', // パスワードは不要
    } as any);

    res.json({
      success: true,
      data: { token },
      message: 'トークンをリフレッシュしました',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TOKEN_REFRESH_ERROR',
        message: 'トークンのリフレッシュに失敗しました',
      },
    });
  }
});

export default router;
