import { Photo, PhotoLocation, PhotoMetadata, ListResult, PhotoProcessCategory, PhotoWorkTypeCategory } from '../types/index.js';
import { PhotoModel } from '../models/Photo.js';

/**
 * 写真管理サービス
 */
export class PhotoService {
  private photos: Map<string, Photo> = new Map();

  /**
   * 新しい写真を作成
   */
  create(data: {
    projectId: string;
    signboardId?: string;
    filename: string;
    filepath: string;
    thumbnailPath?: string;
    caption?: string;
    category?: {
      process?: PhotoProcessCategory;
      location?: string;
      workType?: PhotoWorkTypeCategory;
    };
    location?: PhotoLocation;
    metadata: PhotoMetadata;
    takenAt?: Date;
  }): Photo {
    const validation = PhotoModel.validate(data);
    if (!validation.valid) {
      throw new Error(`バリデーションエラー: ${validation.errors.join(', ')}`);
    }

    const photo = PhotoModel.create(data);
    this.photos.set(photo.id, photo);
    return photo;
  }

  /**
   * IDで写真を取得
   */
  get(id: string): Photo | undefined {
    return this.photos.get(id);
  }

  /**
   * 案件IDで写真を取得
   */
  getByProjectId(projectId: string, options: { page?: number; limit?: number } = {}): ListResult<Photo> {
    const { page = 1, limit = 20 } = options;

    const projectPhotos = Array.from(this.photos.values())
      .filter((p) => p.projectId === projectId)
      .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());

    const total = projectPhotos.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = projectPhotos.slice(start, end);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * 工事看板IDで写真を取得
   */
  getBySignboardId(signboardId: string): Photo[] {
    return Array.from(this.photos.values())
      .filter((p) => p.signboardId === signboardId)
      .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
  }

  /**
   * すべての写真を取得
   */
  list(options: { page?: number; limit?: number } = {}): ListResult<Photo> {
    const { page = 1, limit = 20 } = options;

    const allPhotos = Array.from(this.photos.values()).sort(
      (a, b) => b.takenAt.getTime() - a.takenAt.getTime()
    );

    const total = allPhotos.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = allPhotos.slice(start, end);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * 写真を更新
   */
  update(id: string, updates: Partial<Omit<Photo, 'id' | 'projectId' | 'uploadedAt'>>): Photo {
    const photo = this.photos.get(id);
    if (!photo) {
      throw new Error(`写真が見つかりません: ${id}`);
    }

    const validation = PhotoModel.validate({ ...photo, ...updates });
    if (!validation.valid) {
      throw new Error(`バリデーションエラー: ${validation.errors.join(', ')}`);
    }

    const updated = PhotoModel.update(photo, updates);
    this.photos.set(id, updated);
    return updated;
  }

  /**
   * キャプションを更新
   */
  updateCaption(id: string, caption: string): Photo {
    const photo = this.photos.get(id);
    if (!photo) {
      throw new Error(`写真が見つかりません: ${id}`);
    }

    const updated = PhotoModel.updateCaption(photo, caption);
    this.photos.set(id, updated);
    return updated;
  }

  /**
   * 位置情報を更新
   */
  updateLocation(id: string, location: PhotoLocation): Photo {
    const photo = this.photos.get(id);
    if (!photo) {
      throw new Error(`写真が見つかりません: ${id}`);
    }

    const updated = PhotoModel.updateLocation(photo, location);
    this.photos.set(id, updated);
    return updated;
  }

  /**
   * 工事看板に関連付け
   */
  attachToSignboard(id: string, signboardId: string): Photo {
    const photo = this.photos.get(id);
    if (!photo) {
      throw new Error(`写真が見つかりません: ${id}`);
    }

    const updated = PhotoModel.attachToSignboard(photo, signboardId);
    this.photos.set(id, updated);
    return updated;
  }

  /**
   * 工事看板との関連付けを解除
   */
  detachFromSignboard(id: string): Photo {
    const photo = this.photos.get(id);
    if (!photo) {
      throw new Error(`写真が見つかりません: ${id}`);
    }

    const updated = PhotoModel.detachFromSignboard(photo);
    this.photos.set(id, updated);
    return updated;
  }

  /**
   * 写真を削除
   */
  delete(id: string): boolean {
    return this.photos.delete(id);
  }

  /**
   * 案件の全写真を削除
   */
  deleteByProjectId(projectId: string): number {
    let deleted = 0;
    for (const [id, photo] of this.photos.entries()) {
      if (photo.projectId === projectId) {
        this.photos.delete(id);
        deleted++;
      }
    }
    return deleted;
  }
}
