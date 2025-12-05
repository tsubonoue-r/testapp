/**
 * 工事看板写真システム - 型定義
 */

/**
 * 案件（プロジェクト）
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 案件ステータス
 */
export enum ProjectStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * 工事看板
 */
export interface Signboard {
  id: string;
  projectId: string;
  title: string;
  content: SignboardContent;
  template: SignboardTemplate;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 工事看板の内容
 */
export interface SignboardContent {
  projectName: string;
  constructionPeriod: string;
  contractor: string;
  supervisor?: string;
  contact?: string;
  customFields?: Record<string, string>;
}

/**
 * 工事看板テンプレート
 */
export enum SignboardTemplate {
  STANDARD = 'standard',
  DETAILED = 'detailed',
  SIMPLE = 'simple',
  CUSTOM = 'custom',
}

/**
 * 写真カテゴリー種別
 */
export enum PhotoCategoryType {
  PROCESS = 'process', // 工程別
  LOCATION = 'location', // 撮影箇所別
  WORK_TYPE = 'work_type', // 工種別
}

/**
 * 写真カテゴリー（工程別）
 */
export enum PhotoProcessCategory {
  FOUNDATION = 'foundation', // 基礎
  STRUCTURE = 'structure', // 躯体
  FINISHING = 'finishing', // 仕上げ
  COMPLETION = 'completion', // 完成
  INSPECTION = 'inspection', // 検査
  OTHER = 'other', // その他
}

/**
 * 写真カテゴリー（工種別）
 */
export enum PhotoWorkTypeCategory {
  ARCHITECTURE = 'architecture', // 建築
  ELECTRICAL = 'electrical', // 電気
  PLUMBING = 'plumbing', // 設備
  CIVIL = 'civil', // 土木
  LANDSCAPE = 'landscape', // 外構
  OTHER = 'other', // その他
}

/**
 * 写真
 */
export interface Photo {
  id: string;
  projectId: string;
  signboardId?: string;
  filename: string;
  filepath: string;
  thumbnailPath?: string;
  caption?: string;
  category?: {
    process?: PhotoProcessCategory;
    location?: string; // 自由入力
    workType?: PhotoWorkTypeCategory;
  };
  location?: PhotoLocation;
  metadata: PhotoMetadata;
  takenAt: Date;
  uploadedAt: Date;
}

/**
 * 写真の位置情報
 */
export interface PhotoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * 写真のメタデータ
 */
export interface PhotoMetadata {
  width: number;
  height: number;
  size: number;
  format: string;
  deviceInfo?: string;
}

/**
 * API レスポンス
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

/**
 * API エラー
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * ページネーション
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * リスト結果
 */
export interface ListResult<T> {
  items: T[];
  pagination: Pagination;
}

/**
 * ユーザー
 */
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ユーザーロール
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * JWT ペイロード
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}
