/**
 * Authentication Service
 * ユーザー認証とJWTトークン管理
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { userRepository } from '../db/repositories/UserRepository.js';
import { User, UserRole, JWTPayload } from '../types/index.js';

// JWT秘密鍵（本番環境では環境変数から取得）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export class AuthService {
  /**
   * ユーザー登録
   */
  async register(data: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
  }): Promise<{ user: Omit<User, 'password'>; token: string }> {
    // メールアドレスの重複チェック
    if (userRepository.emailExists(data.email)) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    // パスワードのバリデーション
    if (data.password.length < 8) {
      throw new Error('パスワードは8文字以上である必要があります');
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // ユーザーを作成
    const user = userRepository.create({
      id: randomUUID(),
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role || UserRole.USER,
    });

    // JWTトークンを生成
    const token = this.generateToken(user);

    // パスワードを除外して返す
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * ログイン
   */
  async login(email: string, password: string): Promise<{ user: Omit<User, 'password'>; token: string }> {
    // ユーザーを検索
    const user = userRepository.findByEmail(email);
    if (!user) {
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    // パスワードを検証
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    // JWTトークンを生成
    const token = this.generateToken(user);

    // パスワードを除外して返す
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * JWTトークンを生成
   */
  generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  /**
   * JWTトークンを検証
   */
  verifyToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      throw new Error('無効なトークンです');
    }
  }

  /**
   * リフレッシュトークンを生成
   */
  generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
  }

  /**
   * パスワードを変更
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    // ユーザーを検索
    const user = userRepository.findById(userId);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    // 旧パスワードを検証
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('現在のパスワードが正しくありません');
    }

    // 新パスワードのバリデーション
    if (newPassword.length < 8) {
      throw new Error('パスワードは8文字以上である必要があります');
    }

    // 新パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // パスワードを更新
    userRepository.update(userId, { password: hashedPassword });
  }

  /**
   * パスワードをリセット（管理者用）
   */
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    // ユーザーを検索
    const user = userRepository.findById(userId);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    // 新パスワードのバリデーション
    if (newPassword.length < 8) {
      throw new Error('パスワードは8文字以上である必要があります');
    }

    // 新パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // パスワードを更新
    userRepository.update(userId, { password: hashedPassword });
  }

  /**
   * ユーザー情報を取得
   */
  getUserById(userId: string): Omit<User, 'password'> | null {
    const user = userRepository.findById(userId);
    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

// シングルトンインスタンスをエクスポート
export const authService = new AuthService();
