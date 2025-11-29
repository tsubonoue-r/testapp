import { Signboard, SignboardContent, SignboardTemplate } from '../types/index.js';
import { SignboardModel } from '../models/Signboard.js';

/**
 * 工事看板管理サービス
 */
export class SignboardService {
  private signboards: Map<string, Signboard> = new Map();

  /**
   * 新しい工事看板を作成
   */
  create(data: {
    projectId: string;
    title: string;
    content: SignboardContent;
    template?: SignboardTemplate;
  }): Signboard {
    const signboard: Partial<Signboard> = {
      title: data.title,
      content: data.content,
    };

    const validation = SignboardModel.validate(signboard);
    if (!validation.valid) {
      throw new Error(`バリデーションエラー: ${validation.errors.join(', ')}`);
    }

    const newSignboard = SignboardModel.create(data);
    this.signboards.set(newSignboard.id, newSignboard);
    return newSignboard;
  }

  /**
   * IDで工事看板を取得
   */
  get(id: string): Signboard | undefined {
    return this.signboards.get(id);
  }

  /**
   * 案件IDで工事看板を取得
   */
  getByProjectId(projectId: string): Signboard[] {
    return Array.from(this.signboards.values())
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * すべての工事看板を取得
   */
  list(): Signboard[] {
    return Array.from(this.signboards.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * 工事看板を更新
   */
  update(
    id: string,
    updates: Partial<Omit<Signboard, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>
  ): Signboard {
    const signboard = this.signboards.get(id);
    if (!signboard) {
      throw new Error(`工事看板が見つかりません: ${id}`);
    }

    const validation = SignboardModel.validate({ ...signboard, ...updates });
    if (!validation.valid) {
      throw new Error(`バリデーションエラー: ${validation.errors.join(', ')}`);
    }

    const updated = SignboardModel.update(signboard, updates);
    this.signboards.set(id, updated);
    return updated;
  }

  /**
   * 工事看板の内容を更新
   */
  updateContent(id: string, content: Partial<SignboardContent>): Signboard {
    const signboard = this.signboards.get(id);
    if (!signboard) {
      throw new Error(`工事看板が見つかりません: ${id}`);
    }

    const updated = SignboardModel.updateContent(signboard, content);
    this.signboards.set(id, updated);
    return updated;
  }

  /**
   * テンプレートを変更
   */
  changeTemplate(id: string, template: SignboardTemplate): Signboard {
    const signboard = this.signboards.get(id);
    if (!signboard) {
      throw new Error(`工事看板が見つかりません: ${id}`);
    }

    const updated = SignboardModel.changeTemplate(signboard, template);
    this.signboards.set(id, updated);
    return updated;
  }

  /**
   * 工事看板を削除
   */
  delete(id: string): boolean {
    return this.signboards.delete(id);
  }

  /**
   * 工事看板をフォーマット
   */
  format(id: string): string {
    const signboard = this.signboards.get(id);
    if (!signboard) {
      throw new Error(`工事看板が見つかりません: ${id}`);
    }

    return SignboardModel.format(signboard);
  }
}
