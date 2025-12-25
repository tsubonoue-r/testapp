/**
 * User Model
 * ユーザー管理（Lark連携対応）
 */

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  lark_user_id?: string | null;
  lark_open_id?: string | null;
  is_from_lark: number; // 0 = ローカル登録, 1 = Larkから取得
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
  lark_user_id?: string;
  lark_open_id?: string;
  is_from_lark?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: 'admin' | 'user';
  lark_user_id?: string;
  lark_open_id?: string;
}

export interface LarkUser {
  user_id: string;
  open_id: string;
  name: string;
  email: string;
  mobile?: string;
  department_ids?: string[];
}
